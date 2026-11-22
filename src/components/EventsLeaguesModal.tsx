import { useState } from 'react';
import { Award, CheckCircle2, Flame, Trophy, X } from 'lucide-react';
import {
  LEAGUE_TIERS,
  PlayerProfile,
  SEASON_TRACK_REWARDS,
  getLeagueForTrophies,
} from '../types/game';

interface EventsLeaguesModalProps {
  player: PlayerProfile;
  onClose: () => void;
  onClaimChallenge: (challengeId: string) => void;
  onClaimSeasonTier: (tier: number) => void;
}

export function EventsLeaguesModal({
  player,
  onClose,
  onClaimChallenge,
  onClaimSeasonTier,
}: EventsLeaguesModalProps) {
  const [tab, setTab] = useState<'season' | 'challenges' | 'leagues'>('season');
  const [imgErr, setImgErr] = useState(false);

  const currentLeague = getLeagueForTrophies(player.trophies);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 p-3 sm:p-6">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-extrabold text-white sm:text-xl">
              Seasonal Events, Daily Quests & Leagues
            </h2>
            <p className="text-xs text-slate-400">
              Current League: <strong style={{ color: currentLeague.color }}>{currentLeague.name}</strong> · Season Points: {player.seasonPoints}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Events modal"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-slate-800 bg-slate-950/60 px-5 py-2">
          <button
            type="button"
            onClick={() => setTab('season')}
            className={`min-h-[40px] rounded-lg px-4 text-xs font-bold transition-colors ${
              tab === 'season' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            Frostfire Event
          </button>
          <button
            type="button"
            onClick={() => setTab('challenges')}
            className={`min-h-[40px] rounded-lg px-4 text-xs font-bold transition-colors ${
              tab === 'challenges' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            Daily Challenges ({player.challenges.filter((c) => !c.claimed && c.progress >= c.target).length})
          </button>
          <button
            type="button"
            onClick={() => setTab('leagues')}
            className={`min-h-[40px] rounded-lg px-4 text-xs font-bold transition-colors ${
              tab === 'leagues' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            League Tiers
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'season' && (
            <div className="space-y-5">
              {/* Hero Seasonal Banner */}
              <div className="relative overflow-hidden rounded-2xl border border-sky-500/30 bg-slate-950">
                <div className="aspect-[16/7] w-full overflow-hidden">
                  {!imgErr ? (
                    <img
                      src="/src/assets/images/season_frostfire_event_1795320449111.jpg"
                      alt="Season IV Frostfire Citadel Siege artwork"
                      referrerPolicy="no-referrer"
                      onError={() => setImgErr(true)}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sky-950 via-slate-900 to-orange-950">
                      <Flame className="h-14 w-14 text-amber-400" />
                    </div>
                  )}
                </div>
                <div className="bg-gradient-to-t from-slate-950 via-slate-950/85 to-transparent p-4 sm:absolute sm:inset-x-0 sm:bottom-0">
                  <div className="text-xs font-bold text-sky-400">SEASON IV EVENT · 14 DAYS REMAINING</div>
                  <h3 className="font-display text-xl font-extrabold text-white">
                    Frostfire Citadel Siege
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-300">
                    Earn Season Points from Multiplayer Battles, Guild Raids, and Daily Quests to unlock Sovereign caches.
                  </p>
                </div>
              </div>

              {/* Season Pass Track */}
              <div className="space-y-2.5">
                {SEASON_TRACK_REWARDS.map((rew) => {
                  const claimed = player.seasonTierClaimed >= rew.tier;
                  const canClaim = !claimed && player.seasonTierClaimed + 1 === rew.tier && player.seasonPoints >= rew.pointsRequired;
                  return (
                    <div
                      key={rew.tier}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-4"
                    >
                      <div>
                        <div className="text-xs font-bold text-sky-400 tabular-nums">
                          Tier {rew.tier} · Requires {rew.pointsRequired} Season Points
                        </div>
                        <div className="font-display text-base font-extrabold text-white">{rew.title}</div>
                        <div className="mt-0.5 font-mono text-xs text-slate-400 tabular-nums">
                          +{rew.gold} Gold · +{rew.crystals} Crystals · +{rew.shards} Shards
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={!canClaim}
                        onClick={() => onClaimSeasonTier(rew.tier)}
                        className={`min-h-[42px] rounded-xl px-4 text-xs font-extrabold ${
                          claimed
                            ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/40'
                            : canClaim
                              ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        {claimed ? 'Claimed' : canClaim ? 'Claim Reward' : `${player.seasonPoints}/${rew.pointsRequired} pts`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'challenges' && (
            <div className="space-y-3">
              {player.challenges.map((ch) => {
                const pct = Math.min(100, Math.round((ch.progress / Math.max(1, ch.target)) * 100));
                const ready = !ch.claimed && ch.progress >= ch.target;
                return (
                  <div
                    key={ch.id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950/70 p-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-display text-sm font-extrabold text-white sm:text-base">{ch.title}</div>
                      <div className="mt-1 font-mono text-xs text-slate-400 tabular-nums">
                        +{ch.rewardGold}G · +{ch.rewardCrystals}C · +{ch.rewardShards} Shards · +{ch.rewardSeasonPoints} Season Pts
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
                          <div className="h-full bg-sky-400 transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="font-mono text-xs font-bold text-slate-300 tabular-nums">
                          {ch.progress}/{ch.target}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!ready}
                      onClick={() => onClaimChallenge(ch.id)}
                      className={`flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl px-4 text-xs font-extrabold ${
                        ch.claimed
                          ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/40'
                          : ready
                            ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {ch.claimed && <CheckCircle2 className="h-4 w-4" />}
                      <span>{ch.claimed ? 'Claimed' : ready ? 'Claim' : 'In Progress'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'leagues' && (
            <div className="grid gap-3 sm:grid-cols-2">
              {LEAGUE_TIERS.map((tier) => {
                const isCurrent = tier.id === currentLeague.id;
                return (
                  <div
                    key={tier.id}
                    className={`rounded-xl border p-4 ${
                      isCurrent
                        ? 'border-amber-400 bg-slate-950'
                        : 'border-slate-800 bg-slate-950/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Trophy className="h-5 w-5" style={{ color: tier.color }} />
                        <h3 className="font-display text-base font-extrabold text-white">{tier.name}</h3>
                      </div>
                      {isCurrent && (
                        <span className="text-xs font-bold text-amber-400">Your Division</span>
                      )}
                    </div>
                    <div className="mt-2 font-mono text-xs text-slate-400 tabular-nums">
                      {tier.minTrophies.toLocaleString()} {tier.maxTrophies ? `– ${tier.maxTrophies.toLocaleString()}` : '+'} Trophies
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-slate-800 pt-2.5 text-xs tabular-nums">
                      <span className="text-slate-300">
                        Battle Loot Multiplier: <strong className="text-emerald-400">{tier.lootMultiplier.toFixed(2)}×</strong>
                      </span>
                      <span className="flex items-center gap-1 font-mono text-sky-400">
                        <Award className="h-3.5 w-3.5" />
                        +{tier.seasonCrystalReward}C
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
