import { Flag, Mic, MicOff, ShieldAlert, Star, Timer } from 'lucide-react';
import { BattleSession, TROOP_CATALOG, TroopType } from '../types/game';

interface BattleHudProps {
  battle: BattleSession;
  selectedTroop: TroopType;
  onSelectTroop: (type: TroopType) => void;
  onEndBattle: () => void;
  onReturnHome: () => void;
  voiceJoined: boolean;
  voiceMuted: boolean;
  onToggleVoiceMute: () => void;
  activeSpeakersCount: number;
}

const TROOP_TYPES: TroopType[] = ['vanguard_knight', 'ember_archer', 'arcane_golem', 'sky_charger'];

export function BattleHud({
  battle,
  selectedTroop,
  onSelectTroop,
  onEndBattle,
  onReturnHome,
  voiceJoined,
  voiceMuted,
  onToggleVoiceMute,
  activeSpeakersCount,
}: BattleHudProps) {
  const secsLeft = Math.max(0, Math.ceil((battle.endsAt - Date.now()) / 1000));

  return (
    <>
      {/* Top Battle Match Banner */}
      <div className="pointer-events-none fixed inset-x-0 top-16 z-20 flex flex-col items-center px-3">
        <div className="pointer-events-auto flex w-full max-w-2xl flex-col gap-2 rounded-xl border border-slate-700/80 bg-slate-950/92 px-3.5 py-2.5 shadow-xl sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400 whitespace-nowrap">
              <span>{battle.mode === 'raid' ? 'GUILD RAID' : 'ARENA CLASH'}</span>
              <span className="text-slate-500">·</span>
              <span className="truncate text-slate-200">vs {battle.defenderName}</span>
            </div>
            {battle.mode === 'raid' && battle.boss ? (
              <div className="mt-1.5 flex items-center gap-2">
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-800 sm:max-w-[220px]">
                  <div
                    className="h-full bg-orange-500 transition-all duration-150"
                    style={{ width: `${Math.max(0, (battle.boss.hp / Math.max(1, battle.boss.maxHp)) * 100)}%` }}
                  />
                </div>
                <span className="shrink-0 font-mono text-[11px] font-bold text-orange-300 tabular-nums whitespace-nowrap">
                  {battle.boss.hp.toLocaleString()} / {battle.boss.maxHp.toLocaleString()}
                </span>
              </div>
            ) : (
              <div className="mt-1 flex items-center gap-3 text-xs text-slate-300 tabular-nums">
                <span className="font-mono font-bold text-amber-400">{battle.destructionPct}% Destroyed</span>
                <span className="flex items-center gap-0.5">
                  {[1, 2, 3].map((s) => (
                    <Star
                      key={s}
                      className={`h-3.5 w-3.5 ${s <= battle.stars ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}`}
                    />
                  ))}
                </span>
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center justify-end gap-2">
            {voiceJoined && (
              <button
                type="button"
                onClick={onToggleVoiceMute}
                className="flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-800"
              >
                {voiceMuted ? <MicOff className="h-4 w-4 text-rose-400" /> : <Mic className="h-4 w-4 text-emerald-400" />}
                <span>{activeSpeakersCount}</span>
              </button>
            )}

            <div className="flex items-center gap-1 font-mono text-sm font-bold text-slate-100 tabular-nums">
              <Timer className="h-4 w-4 text-sky-400" />
              <span>{secsLeft}s</span>
            </div>

            {battle.status === 'active' && (
              <button
                type="button"
                onClick={onEndBattle}
                className="flex min-h-[38px] items-center gap-1.5 rounded-lg border border-rose-500/50 bg-rose-950/60 px-3 text-xs font-bold text-rose-200 hover:bg-rose-900"
              >
                <Flag className="h-3.5 w-3.5" />
                <span>Finish</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Battle Result Summary Modal */}
      {battle.status === 'finished' && (
        <div className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-slate-950/75 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 text-center shadow-2xl">
            <div className="mx-auto mb-3 flex items-center justify-center gap-2">
              {[1, 2, 3].map((s) => (
                <Star
                  key={s}
                  className={`h-9 w-9 ${s <= battle.stars ? 'fill-amber-400 text-amber-400' : 'text-slate-700'}`}
                />
              ))}
            </div>
            <h2 className="font-display text-2xl font-extrabold text-white">
              {battle.mode === 'raid'
                ? 'Raid Assault Complete'
                : battle.stars >= 1
                  ? 'Citadel Victory!'
                  : 'Assault Repelled'}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {battle.mode === 'raid' && battle.boss
                ? `Dealt ${battle.boss.totalDamageDealtInRun.toLocaleString()} damage to ${battle.boss.name}`
                : `${battle.destructionPct}% Citadel Destruction against ${battle.defenderName}`}
            </p>

            <div className="mt-5 grid grid-cols-3 gap-2 rounded-xl border border-slate-800 bg-slate-950 p-3 text-center">
              <div>
                <div className="text-xs text-slate-400">Gold Loot</div>
                <div className="mt-0.5 font-mono text-base font-bold text-amber-400 tabular-nums">
                  +{battle.lootGold.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Crystals</div>
                <div className="mt-0.5 font-mono text-base font-bold text-sky-400 tabular-nums">
                  +{battle.lootCrystals.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">{battle.mode === 'raid' ? 'Raid Status' : 'Trophies'}</div>
                <div
                  className={`mt-0.5 font-mono text-base font-bold tabular-nums ${
                    battle.mode === 'raid'
                      ? 'text-emerald-400'
                      : battle.trophyDelta >= 0
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                  }`}
                >
                  {battle.mode === 'raid'
                    ? 'Synced'
                    : `${battle.trophyDelta >= 0 ? '+' : ''}${battle.trophyDelta}`}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onReturnHome}
              className="mt-5 min-h-[48px] w-full rounded-xl bg-amber-500 px-5 py-3 text-sm font-extrabold text-slate-950 transition-colors hover:bg-amber-400"
            >
              Return to Citadel
            </button>
          </div>
        </div>
      )}

      {/* Bottom Troop Deployment Deck */}
      {battle.status === 'active' && (
        <div className="pointer-events-none fixed inset-x-0 bottom-3 z-20 flex flex-col items-center px-3">
          <div className="pointer-events-auto mb-1.5 flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950/92 px-3 py-1 text-[11px] font-medium text-sky-300">
            <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
            <span>Tap 3D arena ground to deploy selected squad</span>
          </div>

          <div className="pointer-events-auto grid w-full max-w-xl grid-cols-4 gap-1.5 rounded-2xl border border-slate-700/80 bg-slate-950/94 p-1.5 shadow-2xl sm:gap-2 sm:p-2">
            {TROOP_TYPES.map((t) => {
              const def = TROOP_CATALOG[t];
              const count = battle.availableTroops[t] || 0;
              const isSelected = selectedTroop === t;
              const shortName = def.name.split(' ')[1] || def.name;
              const shortRole = def.role.split(' ')[1] || def.role;
              return (
                <button
                  key={t}
                  type="button"
                  disabled={count <= 0}
                  onClick={() => onSelectTroop(t)}
                  className={`flex min-h-[56px] flex-col items-start justify-between rounded-xl border p-2 text-left transition-colors ${
                    isSelected
                      ? 'border-amber-400 bg-amber-500/20 text-white'
                      : count <= 0
                        ? 'cursor-not-allowed border-slate-800 bg-slate-900/40 text-slate-500'
                        : 'border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex w-full items-center justify-between gap-1">
                    <span className="truncate text-xs font-bold">{shortName}</span>
                    <span className="font-mono text-xs font-extrabold text-amber-400 tabular-nums">×{count}</span>
                  </div>
                  <span className="w-full truncate text-[10px] text-slate-400">{shortRole}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
