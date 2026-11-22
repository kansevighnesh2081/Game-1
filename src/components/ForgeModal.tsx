import { useState } from 'react';
import { Anvil, ArrowUpCircle, Check, Hammer, Shield, Sparkles, Sword, X } from 'lucide-react';
import { CRAFTING_RECIPES, GearItem, MATERIAL_NAMES, MaterialId, PlayerProfile } from '../types/game';

interface ForgeModalProps {
  player: PlayerProfile;
  onClose: () => void;
  onCraft: (recipeId: string) => void;
  onUpgradeItem: (itemId: string) => void;
  onEquipItem: (itemId: string) => void;
}

const RARITY_STYLES: Record<GearItem['rarity'], string> = {
  Common: 'text-slate-300',
  Rare: 'text-sky-400',
  Epic: 'text-violet-400',
  Mythic: 'text-amber-400',
};

export function ForgeModal({ player, onClose, onCraft, onUpgradeItem, onEquipItem }: ForgeModalProps) {
  const [tab, setTab] = useState<'armory' | 'craft'>('armory');
  const [imgErr, setImgErr] = useState(false);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 p-3 sm:p-6">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-amber-500/40 bg-slate-950">
              {!imgErr ? (
                <img
                  src="/src/assets/images/relic_sunforge_blade_1795320448495.jpg"
                  alt="Sunforged blade and shield on anvil"
                  referrerPolicy="no-referrer"
                  onError={() => setImgErr(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Anvil className="h-6 w-6 text-amber-400" />
                </div>
              )}
            </div>
            <div>
              <h2 className="font-display text-lg font-extrabold text-white sm:text-xl">
                Sunforge Crafting & Armory
              </h2>
              <p className="text-xs text-slate-400">
                Forge mythic gear, upgrade levels up to +10, and equip relics to empower your battle squads
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Forge modal"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Materials Strip + Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/60 px-5 py-2.5">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setTab('armory')}
              className={`min-h-[40px] rounded-lg px-4 text-xs font-bold transition-colors ${
                tab === 'armory' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              My Gear ({player.inventory.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('craft')}
              className={`min-h-[40px] rounded-lg px-4 text-xs font-bold transition-colors ${
                tab === 'craft' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              Forge Recipes ({CRAFTING_RECIPES.length})
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 tabular-nums">
            {(Object.keys(MATERIAL_NAMES) as MaterialId[]).map((mat) => (
              <span key={mat} className="font-mono">
                <span className="text-slate-400">{MATERIAL_NAMES[mat].split(' ')[0]}:</span>{' '}
                <strong className="text-white">{player.materials[mat] || 0}</strong>
              </span>
            ))}
            <span className="font-mono text-violet-300">
              Shards: <strong>{player.shards}</strong>
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'armory' && (
            <div className="grid gap-3 sm:grid-cols-2">
              {player.inventory.map((item) => {
                const upGold = item.level * 120;
                const upShards = item.level * 6;
                return (
                  <div
                    key={item.id}
                    className={`flex flex-col justify-between rounded-xl border p-4 ${
                      item.equipped
                        ? 'border-amber-500/50 bg-slate-950/90'
                        : 'border-slate-800 bg-slate-950/60'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className={`text-xs font-bold ${RARITY_STYLES[item.rarity]}`}>
                            {item.rarity} · {item.slot.toUpperCase()}
                          </div>
                          <h3 className="font-display text-base font-extrabold text-white">
                            {item.name} <span className="font-mono text-amber-400">+{item.level}</span>
                          </h3>
                        </div>
                        {item.slot === 'weapon' ? (
                          <Sword className="h-5 w-5 text-amber-400" />
                        ) : item.slot === 'armor' ? (
                          <Shield className="h-5 w-5 text-sky-400" />
                        ) : (
                          <Sparkles className="h-5 w-5 text-violet-400" />
                        )}
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-2 text-xs tabular-nums">
                        <div className="rounded-lg bg-slate-900 p-2">
                          <div className="text-[11px] text-slate-400">Attack</div>
                          <div className="font-mono font-bold text-rose-400">+{item.attackBonus}</div>
                        </div>
                        <div className="rounded-lg bg-slate-900 p-2">
                          <div className="text-[11px] text-slate-400">Squad HP</div>
                          <div className="font-mono font-bold text-emerald-400">+{item.hpBonus}</div>
                        </div>
                        <div className="rounded-lg bg-slate-900 p-2">
                          <div className="text-[11px] text-slate-400">Loot Yield</div>
                          <div className="font-mono font-bold text-amber-400">+{item.lootBonusPct}%</div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      {item.listedInAuction ? (
                        <div className="w-full py-2 text-center text-xs font-semibold text-sky-400">
                          Escrowed in Auction House
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            disabled={item.equipped}
                            onClick={() => onEquipItem(item.id)}
                            className={`flex min-h-[42px] flex-1 items-center justify-center gap-1.5 rounded-xl text-xs font-bold transition-colors ${
                              item.equipped
                                ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/40 cursor-default'
                                : 'bg-slate-800 text-white hover:bg-slate-700'
                            }`}
                          >
                            {item.equipped && <Check className="h-3.5 w-3.5" />}
                            <span>{item.equipped ? 'Equipped' : 'Equip'}</span>
                          </button>

                          {item.level < 10 && (
                            <button
                              type="button"
                              onClick={() => onUpgradeItem(item.id)}
                              className="flex min-h-[42px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-amber-500 px-3 text-xs font-extrabold text-slate-950 transition-colors hover:bg-amber-400 tabular-nums"
                            >
                              <ArrowUpCircle className="h-3.5 w-3.5" />
                              <span>Upgrade ({upGold}G · {upShards}S)</span>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'craft' && (
            <div className="grid gap-3 sm:grid-cols-2">
              {CRAFTING_RECIPES.map((rec) => {
                const canAffordGold = player.gold >= rec.costGold;
                const canAffordMats = Object.entries(rec.materials).every(
                  ([mat, qty]) => (player.materials[mat as MaterialId] || 0) >= (qty || 0),
                );
                const canCraft = canAffordGold && canAffordMats;

                return (
                  <div
                    key={rec.id}
                    className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-950/70 p-4"
                  >
                    <div>
                      <div className={`text-xs font-bold ${RARITY_STYLES[rec.rarity]}`}>
                        {rec.rarity} · {rec.slot.toUpperCase()}
                      </div>
                      <h3 className="font-display text-base font-extrabold text-white">{rec.name}</h3>
                      <p className="mt-1 text-xs text-slate-400 tabular-nums">
                        +{rec.baseAttack} Attack · +{rec.baseHp} HP · +{rec.lootBonusPct}% Loot Bonus
                      </p>

                      <div className="mt-3 space-y-1 border-t border-slate-800 pt-2.5 text-xs tabular-nums">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Forging Fee</span>
                          <span className={`font-mono font-bold ${canAffordGold ? 'text-amber-400' : 'text-rose-400'}`}>
                            {rec.costGold} Gold
                          </span>
                        </div>
                        {Object.entries(rec.materials).map(([mat, qty]) => {
                          const have = player.materials[mat as MaterialId] || 0;
                          const need = qty || 0;
                          return (
                            <div key={mat} className="flex justify-between">
                              <span className="text-slate-400">{MATERIAL_NAMES[mat as MaterialId]}</span>
                              <span className={`font-mono font-bold ${have >= need ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {have}/{need}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!canCraft}
                      onClick={() => onCraft(rec.id)}
                      className={`mt-4 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl text-xs font-extrabold transition-colors ${
                        canCraft
                          ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                          : 'cursor-not-allowed bg-slate-800 text-slate-500'
                      }`}
                    >
                      <Hammer className="h-4 w-4" />
                      <span>{canCraft ? 'Forge Gear' : 'Insufficient Materials'}</span>
                    </button>
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
