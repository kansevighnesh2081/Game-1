import { useState } from 'react';
import { Flame, Mic, MicOff, PhoneCall, PhoneOff, Send, Shield, Swords, Users, X } from 'lucide-react';
import { Guild, PlayerProfile } from '../types/game';
import { VoicePeer } from '../hooks/useVoiceChat';

interface GuildRaidModalProps {
  player: PlayerProfile;
  guilds: Guild[];
  onClose: () => void;
  onJoinGuild: (guildId: string) => void;
  onCreateGuild: (name: string, tag: string) => void;
  onSendChat: (text: string) => void;
  onLaunchRaid: () => void;
  voiceState: {
    joinedRoomId: string | null;
    muted: boolean;
    micLevel: number;
    localSpeaking: boolean;
    peers: VoicePeer[];
    errorMsg: string | null;
    onJoin: (roomId: string) => void;
    onLeave: () => void;
    onToggleMute: () => void;
  };
}

export function GuildRaidModal({
  player,
  guilds,
  onClose,
  onJoinGuild,
  onCreateGuild,
  onSendChat,
  onLaunchRaid,
  voiceState,
}: GuildRaidModalProps) {
  const [tab, setTab] = useState<'raid' | 'chat' | 'browse'>('raid');
  const [chatInput, setChatInput] = useState('');
  const [newName, setNewName] = useState('');
  const [newTag, setNewTag] = useState('');
  const [imgErr, setImgErr] = useState(false);

  const currentGuild = guilds.find((g) => g.id === player.guildId) || null;
  const voiceRoomId = currentGuild ? `guild:${currentGuild.id}` : 'guild:public';
  const inVoice = voiceState.joinedRoomId === voiceRoomId;

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendChat(chatInput.trim());
    setChatInput('');
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim().length < 3 || newTag.trim().length < 2) return;
    onCreateGuild(newName.trim(), newTag.trim());
    setNewName('');
    setNewTag('');
    setTab('raid');
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 p-3 sm:p-6">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div className="min-w-0">
            <h2 className="font-display text-lg font-extrabold text-white sm:text-xl">
              {currentGuild ? `${currentGuild.name} [${currentGuild.tag}]` : 'Guilds & Co-op Raids'}
            </h2>
            <p className="text-xs text-slate-400">
              {currentGuild
                ? `Level ${currentGuild.level} · ${currentGuild.memberIds.length} Members · ${currentGuild.treasuryGold.toLocaleString()} Gold Treasury`
                : 'Join or charter a guild to coordinate large-scale raids with voice chat'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Guild modal"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 border-b border-slate-800 bg-slate-950/60 px-5 py-2">
          <button
            type="button"
            onClick={() => setTab('raid')}
            className={`min-h-[40px] rounded-lg px-4 text-xs font-bold transition-colors ${
              tab === 'raid' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            Guild Raid & Voice
          </button>
          <button
            type="button"
            onClick={() => setTab('chat')}
            className={`min-h-[40px] rounded-lg px-4 text-xs font-bold transition-colors ${
              tab === 'chat' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            Guild Chat & Roster
          </button>
          <button
            type="button"
            onClick={() => setTab('browse')}
            className={`min-h-[40px] rounded-lg px-4 text-xs font-bold transition-colors ${
              tab === 'browse' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            All Guilds ({guilds.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'raid' && currentGuild && (
            <div className="grid gap-5 lg:grid-cols-2">
              {/* Raid Boss Card */}
              <div className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                <div>
                  <div className="flex items-center gap-4">
                    <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-orange-500/40 bg-slate-900">
                      {!imgErr ? (
                        <img
                          src="/src/assets/images/raid_boss_titan_1795320448762.jpg"
                          alt="Obsidian Magma Titan raid boss"
                          referrerPolicy="no-referrer"
                          onError={() => setImgErr(true)}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-orange-950 to-slate-900">
                          <Flame className="h-9 w-9 text-orange-400" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-orange-400">
                        CO-OP RAID BOSS · TIER {currentGuild.raid.bossLevel}
                      </div>
                      <h3 className="font-display text-lg font-extrabold text-white">
                        {currentGuild.raid.bossName}
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-400">
                        Bosses Cleared: {currentGuild.raid.defeatedCount} · Shared Guild HP Pool
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="mb-1 flex items-center justify-between text-xs font-semibold tabular-nums">
                      <span className="text-slate-300">Remaining Titan Health</span>
                      <span className="font-mono text-orange-300">
                        {currentGuild.raid.currentHp.toLocaleString()} / {currentGuild.raid.maxHp.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full bg-gradient-to-r from-orange-600 to-amber-400 transition-all"
                        style={{
                          width: `${Math.max(0, (currentGuild.raid.currentHp / Math.max(1, currentGuild.raid.maxHp)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="mt-4 space-y-1.5 border-t border-slate-800 pt-3">
                    <div className="text-xs font-semibold text-slate-400">Top Guild Raid Contributors</div>
                    {Object.entries(currentGuild.raid.contributors).length === 0 ? (
                      <p className="text-xs text-slate-500">No raid attacks yet. Lead the first assault!</p>
                    ) : (
                      Object.entries(currentGuild.raid.contributors)
                        .sort((a, b) => b[1].damage - a[1].damage)
                        .slice(0, 4)
                        .map(([id, c]) => (
                          <div key={id} className="flex items-center justify-between text-xs tabular-nums">
                            <span className="text-slate-200">{c.name}</span>
                            <span className="font-mono font-bold text-amber-400">{c.damage.toLocaleString()} dmg</span>
                          </div>
                        ))
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onLaunchRaid}
                  className="mt-5 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-extrabold text-slate-950 transition-colors hover:bg-orange-400"
                >
                  <Swords className="h-4 w-4" />
                  <span>Enter 3D Guild Raid Arena</span>
                </button>
              </div>

              {/* Real-Time WebRTC Voice Coordination Panel */}
              <div className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-display text-base font-extrabold text-white">
                        Squad Voice Channel
                      </h3>
                      <p className="text-xs text-slate-400">
                        Peer-to-peer WebRTC audio for real-time raid callouts
                      </p>
                    </div>
                    <span className="font-mono text-xs font-semibold text-emerald-400">
                      {inVoice ? 'Connected' : 'Standby'}
                    </span>
                  </div>

                  {voiceState.errorMsg && (
                    <div className="mt-3 rounded-lg border border-amber-500/40 bg-amber-950/40 p-2.5 text-xs text-amber-200">
                      {voiceState.errorMsg}
                    </div>
                  )}

                  {/* Local Mic Level & Participants */}
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <Shield className={`h-4 w-4 ${voiceState.localSpeaking ? 'text-emerald-400' : 'text-slate-400'}`} />
                        <span className="text-xs font-bold text-slate-100">{player.name} (You)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-16 overflow-hidden rounded-full bg-slate-800">
                          <div
                            className="h-full bg-emerald-400 transition-all duration-100"
                            style={{ width: `${inVoice ? voiceState.micLevel : 0}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-medium text-slate-400">
                          {!inVoice ? 'Off' : voiceState.muted ? 'Muted' : voiceState.localSpeaking ? 'Speaking' : 'Ready'}
                        </span>
                      </div>
                    </div>

                    {voiceState.peers.map((peer) => (
                      <div
                        key={peer.peerId}
                        className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5"
                      >
                        <div className="flex items-center gap-2.5">
                          <Users className={`h-4 w-4 ${peer.speaking ? 'text-emerald-400' : 'text-slate-400'}`} />
                          <span className="text-xs font-semibold text-slate-200">{peer.name}</span>
                        </div>
                        <span className={`text-[11px] font-semibold ${peer.speaking ? 'text-emerald-400' : 'text-slate-500'}`}>
                          {peer.speaking ? 'Speaking' : 'Listening'}
                        </span>
                      </div>
                    ))}

                    {inVoice && voiceState.peers.length === 0 && (
                      <p className="py-2 text-center text-xs text-slate-500">
                        Voice channel active. Guildmates who join Voice Channel will connect automatically.
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-2">
                  {!inVoice ? (
                    <button
                      type="button"
                      onClick={() => voiceState.onJoin(voiceRoomId)}
                      className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-extrabold text-slate-950 transition-colors hover:bg-emerald-400"
                    >
                      <PhoneCall className="h-4 w-4" />
                      <span>Join Voice Channel</span>
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={voiceState.onToggleMute}
                        className={`flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold transition-colors ${
                          voiceState.muted
                            ? 'border-rose-500/50 bg-rose-950/60 text-rose-200 hover:bg-rose-900'
                            : 'border-slate-700 bg-slate-800 text-white hover:bg-slate-700'
                        }`}
                      >
                        {voiceState.muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4 text-emerald-400" />}
                        <span>{voiceState.muted ? 'Unmute Mic' : 'Mute Mic'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={voiceState.onLeave}
                        className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-rose-500"
                      >
                        <PhoneOff className="h-4 w-4" />
                        <span>Leave</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === 'chat' && currentGuild && (
            <div className="grid gap-5 lg:grid-cols-3">
              {/* Live Guild Chat */}
              <div className="flex h-80 flex-col rounded-xl border border-slate-800 bg-slate-950/70 p-4 lg:col-span-2">
                <div className="mb-2 text-xs font-bold text-slate-400">Live Guild War Room</div>
                <div className="flex-1 space-y-2.5 overflow-y-auto pr-1">
                  {currentGuild.chat.map((m) => (
                    <div key={m.id} className="rounded-lg bg-slate-900/90 px-3 py-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-400">{m.senderName}</span>
                        <span className="font-mono text-[10px] text-slate-500">
                          {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="mt-1 text-slate-200">{m.text}</p>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleChatSubmit} className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Coordinate raid timing or trades..."
                    className="min-h-[44px] flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="flex min-h-[44px] items-center gap-1.5 rounded-xl bg-amber-500 px-4 text-xs font-extrabold text-slate-950 hover:bg-amber-400"
                  >
                    <Send className="h-4 w-4" />
                    <span>Send</span>
                  </button>
                </form>
              </div>

              {/* Member Roster */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                <div className="mb-3 text-xs font-bold text-slate-400">
                  Guild Roster ({currentGuild.memberIds.length})
                </div>
                <div className="space-y-2">
                  {currentGuild.memberIds.map((mid) => (
                    <div key={mid} className="flex items-center justify-between border-b border-slate-800/80 pb-2 text-xs">
                      <span className="font-semibold text-slate-200">
                        {currentGuild.memberNames[mid] || mid}
                      </span>
                      <span className="font-mono font-bold text-amber-400 tabular-nums">
                        {(currentGuild.memberTrophies[mid] || 0).toLocaleString()} T
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {(tab === 'browse' || !currentGuild) && (
            <div className="space-y-5">
              <form
                onSubmit={handleCreate}
                className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-4 sm:flex-row sm:items-end"
              >
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-semibold text-slate-300">Guild Name</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Iron Bastion"
                    className="min-h-[44px] w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>
                <div className="w-full sm:w-28">
                  <label className="mb-1 block text-xs font-semibold text-slate-300">Tag (2-4)</label>
                  <input
                    type="text"
                    value={newTag}
                    maxLength={4}
                    onChange={(e) => setNewTag(e.target.value.toUpperCase())}
                    placeholder="IRON"
                    className="min-h-[44px] w-full rounded-xl border border-slate-700 bg-slate-900 px-3 font-mono text-sm uppercase text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="min-h-[44px] shrink-0 rounded-xl bg-emerald-500 px-4 text-xs font-extrabold text-slate-950 hover:bg-emerald-400"
                >
                  Charter Guild (400 Gold)
                </button>
              </form>

              <div className="grid gap-3 sm:grid-cols-2">
                {guilds.map((g) => {
                  const isMember = g.id === player.guildId;
                  return (
                    <div
                      key={g.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-4"
                    >
                      <div className="min-w-0">
                        <div className="font-display text-base font-extrabold text-white">
                          {g.name} <span className="font-mono text-xs text-amber-400">[{g.tag}]</span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-slate-400">{g.description}</p>
                        <div className="mt-1 text-xs text-slate-500 tabular-nums">
                          Lv.{g.level} · {g.memberIds.length} Members · {g.raid.defeatedCount} Bosses Cleared
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={isMember}
                        onClick={() => onJoinGuild(g.id)}
                        className={`min-h-[44px] shrink-0 rounded-xl px-4 text-xs font-bold ${
                          isMember
                            ? 'bg-slate-800 text-slate-400 cursor-default'
                            : 'bg-sky-500 text-slate-950 hover:bg-sky-400'
                        }`}
                      >
                        {isMember ? 'Joined' : 'Join'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
