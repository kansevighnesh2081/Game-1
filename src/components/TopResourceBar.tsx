import { Camera, Coins, Gem, Shield, Sparkles, Trophy, Volume2, VolumeX } from 'lucide-react';
import { CameraPreset } from '../engine/CitadelScene';
import { PlayerProfile, getLeagueForTrophies } from '../types/game';

interface TopResourceBarProps {
  player: PlayerProfile;
  muted: boolean;
  onToggleMute: () => void;
  onCameraPreset: (preset: CameraPreset) => void;
  onCollectAll: () => void;
  onOpenProfile: () => void;
  inBattle: boolean;
}

export function TopResourceBar({
  player,
  muted,
  onToggleMute,
  onCameraPreset,
  onCollectAll,
  onOpenProfile,
  inBattle,
}: TopResourceBarProps) {
  const league = getLeagueForTrophies(player.trophies);

  return (
    <header className="pointer-events-auto relative z-20 flex h-14 w-full items-center justify-between gap-4 border-b border-slate-800/90 bg-slate-950/92 px-3 sm:px-6">
      {/* Zone 1: Single-line Brand Wordmark */}
      <button
        type="button"
        onClick={onOpenProfile}
        className="flex min-h-[44px] shrink-0 items-center gap-2.5 text-left transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
      >
        <Shield className="h-5 w-5 text-amber-400" aria-hidden="true" />
        <span className="font-display text-base font-extrabold tracking-tight text-slate-50 whitespace-nowrap sm:text-lg">
          Citadel Clash 3D
        </span>
      </button>

      {/* Zone 2: Live Resource & League Telemetry */}
      <div className="flex min-w-0 items-center gap-2.5 text-xs sm:gap-6 sm:text-sm">
        <div className="flex shrink-0 items-center gap-1 font-mono font-bold text-amber-400 tabular-nums" title="Gold">
          <Coins className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden="true" />
          <span>{player.gold.toLocaleString()}</span>
        </div>

        <div className="flex shrink-0 items-center gap-1 font-mono font-bold text-sky-400 tabular-nums" title="Arcane Crystals">
          <Gem className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden="true" />
          <span>{player.crystals.toLocaleString()}</span>
        </div>

        <div className="hidden shrink-0 items-center gap-1.5 font-mono font-bold text-violet-400 tabular-nums md:flex" title="Sunforge Shards">
          <Sparkles className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{player.shards.toLocaleString()}</span>
        </div>

        <div className="hidden shrink-0 items-center gap-1.5 font-mono font-bold tabular-nums sm:flex" style={{ color: league.color }} title={league.name}>
          <Trophy className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{player.trophies.toLocaleString()}</span>
          <span className="hidden text-xs font-sans font-medium text-slate-400 lg:inline">
            · {league.name}
          </span>
        </div>
      </div>

      {/* Zone 3: Single Primary Action + Compact View/Audio Controls */}
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        {!inBattle && (
          <button
            type="button"
            onClick={onCollectAll}
            className="min-h-[40px] shrink-0 whitespace-nowrap rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950 transition-colors hover:bg-amber-400 active:scale-[0.98]"
          >
            Collect Yield
          </button>
        )}

        <button
          type="button"
          onClick={() => onCameraPreset('isometric')}
          aria-label="Reset camera view"
          title="Reset camera angle"
          className="hidden min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border border-slate-700/80 bg-slate-900 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white sm:flex"
        >
          <Camera className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={onToggleMute}
          aria-label={muted ? 'Unmute game audio' : 'Mute game audio'}
          title={muted ? 'Unmute audio' : 'Mute audio'}
          className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border border-slate-700/80 bg-slate-900 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
        >
          {muted ? <VolumeX className="h-4 w-4 text-rose-400" /> : <Volume2 className="h-4 w-4 text-emerald-400" />}
        </button>
      </div>
    </header>
  );
}
