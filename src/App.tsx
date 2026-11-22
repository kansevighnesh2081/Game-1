import { useCallback, useEffect, useRef, useState } from 'react';
import { Shield } from 'lucide-react';
import { soundEngine } from './audio/soundEngine';
import { BattleHud } from './components/BattleHud';
import { ActiveModal, BottomDock } from './components/BottomDock';
import { EventsLeaguesModal } from './components/EventsLeaguesModal';
import { ForgeModal } from './components/ForgeModal';
import { GuildRaidModal } from './components/GuildRaidModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { MarketAuctionModal } from './components/MarketAuctionModal';
import { TopResourceBar } from './components/TopResourceBar';
import { CitadelScene } from './engine/CitadelScene';
import { useVoiceChat } from './hooks/useVoiceChat';
import {
  AuctionListing,
  BattleSession,
  BuildingType,
  DirectTradeOffer,
  Guild,
  GuildLeaderboardEntry,
  LeaderboardEntry,
  MarketCommodity,
  MaterialId,
  PlayerProfile,
  TroopType,
} from './types/game';

interface WorldSyncPayload {
  leaderboard: { players: LeaderboardEntry[]; guilds: GuildLeaderboardEntry[] };
  market: MarketCommodity[];
  auctions: AuctionListing[];
  trades: DirectTradeOffer[];
  guilds: Guild[];
}

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [world, setWorld] = useState<WorldSyncPayload>({
    leaderboard: { players: [], guilds: [] },
    market: [],
    auctions: [],
    trades: [],
    guilds: [],
  });
  const [battle, setBattle] = useState<BattleSession | null>(null);
  const [selectedTroop, setSelectedTroop] = useState<TroopType>('vanguard_knight');

  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [buildDrawerOpen, setBuildDrawerOpen] = useState(false);
  const [placingType, setPlacingType] = useState<BuildingType | null>(null);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [movingBuildingId, setMovingBuildingId] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [audioMuted, setAudioMuted] = useState(false);
  const [toast, setToast] = useState<{ text: string; tone: 'info' | 'error' } | null>(null);
  const [contextLost, setContextLost] = useState(false);

  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<CitadelScene | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const tokenRef = useRef<string | null>(null);
  const battleRef = useRef<BattleSession | null>(null);
  const placingTypeRef = useRef<BuildingType | null>(null);
  const movingBuildingIdRef = useRef<string | null>(null);
  const selectedTroopRef = useRef<TroopType>('vanguard_knight');
  const toastTimerRef = useRef<number | null>(null);

  tokenRef.current = token;
  battleRef.current = battle;
  placingTypeRef.current = placingType;
  movingBuildingIdRef.current = movingBuildingId;
  selectedTroopRef.current = selectedTroop;

  const showToast = useCallback((text: string, tone: 'info' | 'error' = 'info') => {
    setToast({ text, tone });
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3200);
  }, []);

  const apiCall = useCallback(
    async <T,>(url: string, body?: Record<string, unknown>): Promise<T | null> => {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(tokenRef.current ? { Authorization: `Bearer ${tokenRef.current}` } : {}),
          },
          body: JSON.stringify(body || {}),
        });
        const data = await res.json();
        if (!res.ok) {
          showToast(data.error || 'Action failed', 'error');
          return null;
        }
        if (data.player) setPlayer(data.player);
        return data as T;
      } catch {
        showToast('Network connection interrupted', 'error');
        return null;
      }
    },
    [showToast],
  );

  const sendWs = useCallback((type: string, payload?: Record<string, unknown>) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }));
    }
  }, []);

  const voiceChat = useVoiceChat({
    sendWs,
    playerId: player?.id || null,
  });
  const handleVoiceWsRef = useRef(voiceChat.handleVoiceWsMessage);
  handleVoiceWsRef.current = voiceChat.handleVoiceWsMessage;

  // Initialize session and WebSocket connection
  useEffect(() => {
    let cancelled = false;
    let reconnectTimer: number | null = null;

    async function init() {
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok || cancelled) return;
      const data = await res.json();
      if (cancelled) return;
      setToken(data.token);
      tokenRef.current = data.token;
      setPlayer(data.player);
      setWorld(data.world);

      const connectWs = () => {
        if (cancelled) return;
        const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(`${proto}//${window.location.host}`);
        wsRef.current = ws;

        ws.onopen = () => {
          if (tokenRef.current) {
            ws.send(JSON.stringify({ type: 'auth', payload: { token: tokenRef.current } }));
          }
        };

        ws.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data) as { type: string; payload: Record<string, unknown> };
            if (msg.type === 'world:sync') {
              setWorld(msg.payload as unknown as WorldSyncPayload);
            } else if (msg.type === 'player:update') {
              setPlayer(msg.payload as unknown as PlayerProfile);
            } else if (msg.type === 'guild:update') {
              const updated = msg.payload as unknown as Guild;
              setWorld((prev) => ({
                ...prev,
                guilds: prev.guilds.map((g) => (g.id === updated.id ? updated : g)),
              }));
            } else if (msg.type === 'battle:state') {
              const b = msg.payload as unknown as BattleSession;
              setBattle((prev) => {
                if (prev?.status === 'active' && b.status === 'finished') {
                  soundEngine.playVictory();
                }
                return b;
              });
            } else if (msg.type.startsWith('rtc:')) {
              handleVoiceWsRef.current(msg.type, msg.payload);
            }
          } catch {
            // Ignore malformed message
          }
        };

        ws.onclose = () => {
          if (!cancelled) {
            reconnectTimer = window.setTimeout(connectWs, 2000);
          }
        };
      };

      connectWs();
    }

    init();

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, []);

  // Handlers stored in refs for stable WebGL lifecycle
  const handleTileClickRef = useRef<(gx: number, gz: number) => void>(() => {});
  handleTileClickRef.current = async (gx: number, gz: number) => {
    if (movingBuildingIdRef.current) {
      const res = await apiCall<{ player: PlayerProfile }>('/api/base/move', {
        buildingId: movingBuildingIdRef.current,
        gx,
        gz,
      });
      if (res) {
        soundEngine.playBuild();
        setMovingBuildingId(null);
      }
      return;
    }

    if (placingTypeRef.current) {
      const res = await apiCall<{ player: PlayerProfile }>('/api/base/build', {
        type: placingTypeRef.current,
        gx,
        gz,
      });
      if (res) {
        soundEngine.playBuild();
        showToast('Structure constructed!');
      }
      return;
    }

    setSelectedBuildingId(null);
  };

  const handleBuildingClickRef = useRef<(buildingId: string) => void>(() => {});
  handleBuildingClickRef.current = (buildingId: string) => {
    setMovingBuildingId(null);
    setPlacingType(null);
    setSelectedBuildingId(buildingId);
  };

  const handleBattleGroundClickRef = useRef<(x: number, z: number) => void>(() => {});
  handleBattleGroundClickRef.current = (x: number, z: number) => {
    const b = battleRef.current;
    if (!b || b.status !== 'active') return;
    const troop = selectedTroopRef.current;
    if ((b.availableTroops[troop] || 0) <= 0) {
      showToast('No remaining squads of this type — pick another squad!', 'error');
      return;
    }
    soundEngine.playDeploy();
    sendWs('battle:deploy', { battleId: b.id, troopType: troop, x, z });
  };

  // Mount Three.js Scene once
  useEffect(() => {
    if (!canvasMountRef.current) return;
    const scene = new CitadelScene(canvasMountRef.current, {
      onTileClick: (gx, gz) => handleTileClickRef.current(gx, gz),
      onBuildingClick: (id) => handleBuildingClickRef.current(id),
      onBattleGroundClick: (x, z) => handleBattleGroundClickRef.current(x, z),
      onContextLost: () => setContextLost(true),
    });
    sceneRef.current = scene;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'h' && document.activeElement?.tagName !== 'INPUT') {
        setDockCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  // Sync Three.js scene with player buildings and active battle state
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (battle) {
      scene.setMode('battle');
      scene.syncBattleState(battle);
    } else {
      scene.setMode('base');
      scene.syncBattleState(null);
      if (player) {
        scene.syncBaseBuildings(player.buildings);
      }
    }
  }, [battle, player]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    scene.setPlacingActive(Boolean(placingType || movingBuildingId));
  }, [placingType, movingBuildingId]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !player) return;
    const sel = player.buildings.find((b) => b.id === selectedBuildingId);
    scene.setSelectedBuilding(sel ? sel.id : null, sel?.gx, sel?.gz);
  }, [selectedBuildingId, player]);

  // Actions
  const handleCollectYield = async () => {
    const res = await apiCall<{ player: PlayerProfile; collectedGold: number; collectedCrystals: number }>(
      '/api/base/collect',
    );
    if (res) {
      soundEngine.playCollect();
      showToast(`Collected +${res.collectedGold} Gold and +${res.collectedCrystals} Crystals`);
    }
  };

  const handleUpgradeBuilding = async (buildingId: string) => {
    const res = await apiCall<{ player: PlayerProfile }>('/api/base/upgrade', { buildingId });
    if (res) {
      soundEngine.playBuild();
      showToast('Structure upgraded!');
    }
  };

  const handleStartBattle = async (mode: 'pvp' | 'raid', targetPlayerId?: string) => {
    setActiveModal(null);
    setBuildDrawerOpen(false);
    setPlacingType(null);
    setSelectedBuildingId(null);
    const res = await apiCall<{ battle: BattleSession }>('/api/battle/start', { mode, targetPlayerId });
    if (res?.battle) {
      setBattle(res.battle);
      sceneRef.current?.setCameraPreset('isometric');
    }
  };

  const handleEndBattle = async () => {
    if (!battle) return;
    const res = await apiCall<{ battle: BattleSession }>('/api/battle/end', { battleId: battle.id });
    if (res?.battle) {
      soundEngine.playVictory();
      setBattle(res.battle);
    }
  };

  const handleToggleMute = () => {
    soundEngine.muted = !audioMuted;
    setAudioMuted(!audioMuted);
  };

  const selectedBuilding = player ? player.buildings.find((b) => b.id === selectedBuildingId) || null : null;

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-950">
      {/* Isolated 3D WebGL Mount Container (always mounted on first render) */}
      <div ref={canvasMountRef} className="absolute inset-0 h-full w-full" />

      {!player && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/90 text-center">
          <Shield className="h-12 w-12 text-amber-400" />
          <h1 className="mt-4 font-display text-2xl font-extrabold text-white">Citadel Clash 3D</h1>
          <p className="mt-1 text-sm text-slate-400">Connecting to multiplayer citadel realm...</p>
        </div>
      )}

      {contextLost && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/95 p-6 text-center">
          <Shield className="h-12 w-12 text-amber-400" />
          <h2 className="mt-3 font-display text-xl font-bold text-white">3D Viewport Paused</h2>
          <p className="mt-1 text-sm text-slate-400">Graphics context interrupted. Reload to restore your 3D Citadel.</p>
        </div>
      )}

      {player && (
        <>
          {/* Top Resource & Brand Bar */}
          <TopResourceBar
            player={player}
            muted={audioMuted}
            onToggleMute={handleToggleMute}
            onCameraPreset={(p) => sceneRef.current?.setCameraPreset(p)}
            onCollectAll={handleCollectYield}
            onOpenProfile={() => setActiveModal('leaderboard')}
            inBattle={Boolean(battle)}
          />

      {/* Non-intrusive Toast Notification */}
      {toast && (
        <div className="pointer-events-none fixed inset-x-0 top-16 z-30 flex justify-center px-4">
          <div
            className={`rounded-xl border px-4 py-2 text-xs font-bold shadow-xl ${
              toast.tone === 'error'
                ? 'border-rose-500/60 bg-rose-950/95 text-rose-100'
                : 'border-amber-500/50 bg-slate-950/95 text-amber-300'
            }`}
          >
            {toast.text}
          </div>
        </div>
      )}

      {/* Active HUD: Battle Mode vs Base-Building Mode */}
      {battle ? (
        <BattleHud
          battle={battle}
          selectedTroop={selectedTroop}
          onSelectTroop={setSelectedTroop}
          onEndBattle={handleEndBattle}
          onReturnHome={() => setBattle(null)}
          voiceJoined={Boolean(voiceChat.joinedRoomId)}
          voiceMuted={voiceChat.muted}
          onToggleVoiceMute={voiceChat.toggleMute}
          activeSpeakersCount={voiceChat.peers.length + (voiceChat.joinedRoomId ? 1 : 0)}
        />
      ) : (
        <BottomDock
          collapsed={dockCollapsed}
          onToggleCollapse={() => setDockCollapsed((c) => !c)}
          buildDrawerOpen={buildDrawerOpen}
          onToggleBuildDrawer={() => {
            setBuildDrawerOpen((o) => !o);
            setPlacingType(null);
            setSelectedBuildingId(null);
          }}
          placingType={placingType}
          onSelectPlacingType={setPlacingType}
          selectedBuilding={selectedBuilding}
          movingBuildingId={movingBuildingId}
          onStartMoveBuilding={(id) => setMovingBuildingId((prev) => (prev === id ? null : id))}
          onUpgradeBuilding={handleUpgradeBuilding}
          onClearSelection={() => {
            setSelectedBuildingId(null);
            setMovingBuildingId(null);
          }}
          onStartPvpBattle={() => handleStartBattle('pvp')}
          onOpenModal={setActiveModal}
          player={player}
        />
      )}

      {/* Feature Modals */}
      {activeModal === 'guild' && (
        <GuildRaidModal
          player={player}
          guilds={world.guilds}
          onClose={() => setActiveModal(null)}
          onJoinGuild={async (guildId) => {
            const res = await apiCall('/api/guild/join', { guildId });
            if (res) showToast('Joined Guild!');
          }}
          onCreateGuild={async (name, tag) => {
            const res = await apiCall('/api/guild/create', { name, tag });
            if (res) showToast(`Founded ${name} [${tag}]!`);
          }}
          onSendChat={(text) => sendWs('guild:chat', { text })}
          onLaunchRaid={() => handleStartBattle('raid')}
          voiceState={{
            joinedRoomId: voiceChat.joinedRoomId,
            muted: voiceChat.muted,
            micLevel: voiceChat.micLevel,
            localSpeaking: voiceChat.localSpeaking,
            peers: voiceChat.peers,
            errorMsg: voiceChat.errorMsg,
            onJoin: voiceChat.joinVoice,
            onLeave: voiceChat.leaveVoice,
            onToggleMute: voiceChat.toggleMute,
          }}
        />
      )}

      {activeModal === 'forge' && (
        <ForgeModal
          player={player}
          onClose={() => setActiveModal(null)}
          onCraft={async (recipeId) => {
            const res = await apiCall<{ item: { name: string } }>('/api/craft/create', { recipeId });
            if (res) {
              soundEngine.playForge();
              showToast(`Forged ${res.item.name}!`);
            }
          }}
          onUpgradeItem={async (itemId) => {
            const res = await apiCall('/api/craft/upgrade', { itemId });
            if (res) {
              soundEngine.playForge();
              showToast('Gear upgraded!');
            }
          }}
          onEquipItem={async (itemId) => {
            const res = await apiCall('/api/craft/equip', { itemId });
            if (res) showToast('Gear equipped!');
          }}
        />
      )}

      {activeModal === 'market' && (
        <MarketAuctionModal
          player={player}
          market={world.market}
          auctions={world.auctions}
          trades={world.trades}
          onClose={() => setActiveModal(null)}
          onMarketTrade={async (materialId: MaterialId, action, qty) => {
            const res = await apiCall('/api/market/trade', { materialId, action, qty });
            if (res) {
              soundEngine.playCollect();
              showToast(`${action === 'buy' ? 'Purchased' : 'Sold'} ${qty}× ${materialId}`);
            }
          }}
          onAuctionBid={async (listingId, amount, buyout) => {
            const res = await apiCall('/api/auction/bid', { listingId, amount, buyout });
            if (res) {
              soundEngine.playCollect();
              showToast(buyout ? 'Auction buyout complete!' : 'Escrow bid placed!');
            }
          }}
          onAuctionList={async (itemId, startingBid, buyoutPrice) => {
            const res = await apiCall('/api/auction/list', { itemId, startingBid, buyoutPrice });
            if (res) showToast('Item listed on Auction House!');
          }}
          onCreateTrade={async (offerMaterial, offerQty, requestMaterial, requestQty, bonusGoldOffer) => {
            const res = await apiCall('/api/trade/create', {
              offerMaterial,
              offerQty,
              requestMaterial,
              requestQty,
              bonusGoldOffer,
            });
            if (res) showToast('P2P Trade Offer posted!');
          }}
          onAcceptTrade={async (tradeId) => {
            const res = await apiCall('/api/trade/accept', { tradeId });
            if (res) {
              soundEngine.playCollect();
              showToast('Trade swap completed!');
            }
          }}
        />
      )}

      {activeModal === 'events' && (
        <EventsLeaguesModal
          player={player}
          onClose={() => setActiveModal(null)}
          onClaimChallenge={async (challengeId) => {
            const res = await apiCall('/api/challenges/claim', { challengeId });
            if (res) {
              soundEngine.playCollect();
              showToast('Challenge reward claimed!');
            }
          }}
          onClaimSeasonTier={async (tier) => {
            const res = await apiCall('/api/season/claim', { tier });
            if (res) {
              soundEngine.playVictory();
              showToast(`Unlocked Season Tier ${tier} rewards!`);
            }
          }}
        />
      )}

      {activeModal === 'leaderboard' && (
        <LeaderboardModal
          player={player}
          players={world.leaderboard.players}
          guilds={world.leaderboard.guilds}
          onClose={() => setActiveModal(null)}
          onChallengePlayer={(targetId) => handleStartBattle('pvp', targetId)}
          onRenamePlayer={async (name) => {
            const res = await apiCall('/api/player/rename', { name });
            if (res) showToast(`Commander renamed to ${name}`);
          }}
        />
      )}
        </>
      )}
    </div>
  );
}
