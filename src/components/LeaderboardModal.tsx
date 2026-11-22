import { useState } from 'react';
import { Award, Swords, Trophy, Users, X } from 'lucide-react';
import { GuildLeaderboardEntry, LeaderboardEntry, PlayerProfile } from '../types/game';

interface LeaderboardModalProps {
  player: PlayerProfile;
  players: LeaderboardEntry[];
  guilds: GuildLeaderboardEntry[];
  onClose: () => void;
  onChallengePlayer: (targetPlayerId: string) => void;
  onRenamePlayer: (name: string) => void;
}

export function LeaderboardModal({
  player,
  players,
  guilds,
  onClose,
  onChallengePlayer,
  onRenamePlayer,
}: LeaderboardModalProps) {
  const [tab, setTab] = useState<'players' | 'guilds'>('players');
  const [nameInput, setNameInput] = useState(player.name);

  const handleRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameInput.trim().length >= 2) {
      onRenamePlayer(nameInput.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 p-3 sm:p-6">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-extrabold text-white sm:text-xl">
              Global Rankings & Commander Profile
            </h2>
            <p className="text-xs text-slate-400">
              Real-time server leaderboard · Citadel Clash 3D developed by <strong className="text-amber-400">Vighnesh Kanse ( ANONYMOUS)</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Leaderboard modal"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Commander Rename + Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/60 px-5 py-2.5">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setTab('players')}
              className={`min-h-[40px] rounded-lg px-4 text-xs font-bold transition-colors ${
                tab === 'players' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              Top Commanders ({players.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('guilds')}
              className={`min-h-[40px] rounded-lg px-4 text-xs font-bold transition-colors ${
                tab === 'guilds' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              Top Guilds ({guilds.length})
            </button>
          </div>

          <form onSubmit={handleRename} className="flex items-center gap-2">
            <input
              type="text"
              value={nameInput}
              maxLength={24}
              onChange={(e) => setNameInput(e.target.value)}
              aria-label="Commander Name"
              className="min-h-[38px] w-40 rounded-lg border border-slate-700 bg-slate-900 px-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
            />
            <button
              type="submit"
              className="min-h-[38px] rounded-lg bg-slate-800 px-3 text-xs font-bold text-slate-200 hover:bg-slate-700"
            >
              Update Name
            </button>
          </form>
        </div>

        {/* Rankings Table */}
        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'players' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="pb-2.5 font-semibold">Rank</th>
                    <th className="pb-2.5 font-semibold">Commander</th>
                    <th className="pb-2.5 font-semibold">League</th>
                    <th className="pb-2.5 text-right font-semibold">Power</th>
                    <th className="pb-2.5 text-right font-semibold">Trophies</th>
                    <th className="pb-2.5 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 tabular-nums">
                  {players.map((entry, idx) => {
                    const isSelf = entry.id === player.id;
                    return (
                      <tr key={entry.id} className={isSelf ? 'bg-amber-500/10' : ''}>
                        <td className="py-3 font-mono font-bold text-slate-300">#{idx + 1}</td>
                        <td className="py-3">
                          <div className="flex items-center gap-2 font-bold text-white">
                            <span>{entry.name}</span>
                            {entry.guildTag && (
                              <span className="font-mono text-xs text-sky-400">[{entry.guildTag}]</span>
                            )}
                            {entry.isOnline && (
                              <span className="text-[11px] font-medium text-emerald-400">· Online</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 text-slate-300">{entry.leagueName}</td>
                        <td className="py-3 text-right font-mono text-slate-300">
                          {entry.gearPower.toLocaleString()}
                        </td>
                        <td className="py-3 text-right font-mono font-bold text-amber-400">
                          {entry.trophies.toLocaleString()}
                        </td>
                        <td className="py-3 text-right">
                          {isSelf ? (
                            <span className="text-xs font-semibold text-amber-300">You</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onChallengePlayer(entry.id)}
                              className="inline-flex min-h-[36px] items-center gap-1 rounded-lg bg-rose-600 px-3 text-xs font-bold text-white hover:bg-rose-500"
                            >
                              <Swords className="h-3.5 w-3.5" />
                              <span>Attack</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'guilds' && (
            <div className="space-y-2.5">
              {guilds.map((g, idx) => (
                <div
                  key={g.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-4 tabular-nums"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-base font-extrabold text-amber-400">#{idx + 1}</span>
                    <div>
                      <div className="font-display text-base font-extrabold text-white">
                        {g.name} <span className="font-mono text-xs text-sky-400">[{g.tag}]</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" /> {g.memberCount} Members
                        </span>
                        <span className="flex items-center gap-1">
                          <Award className="h-3.5 w-3.5" /> {g.raidBossesCleared} Raids Cleared
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-base font-extrabold text-amber-400">
                    <Trophy className="h-4 w-4" />
                    <span>{g.totalTrophies.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Developer Credit */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950 px-5 py-3 text-xs text-slate-400">
          <span>Citadel Clash 3D · Real-Time Multiplayer Strategy</span>
          <span>Developer: <strong className="text-slate-200">Vighnesh Kanse ( ANONYMOUS)</strong></span>
        </div>
      </div>
    </div>
  );
}
