import {
  Anvil,
  Award,
  Calendar,
  ChevronDown,
  ChevronUp,
  Gavel,
  Hammer,
  Swords,
  Users,
  X,
} from 'lucide-react';
import { BUILDING_CATALOG, BuildingInstance, BuildingType, PlayerProfile } from '../types/game';

export type ActiveModal = 'guild' | 'forge' | 'market' | 'events' | 'leaderboard' | null;

interface BottomDockProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  buildDrawerOpen: boolean;
  onToggleBuildDrawer: () => void;
  placingType: BuildingType | null;
  onSelectPlacingType: (type: BuildingType | null) => void;
  selectedBuilding: BuildingInstance | null;
  movingBuildingId: string | null;
  onStartMoveBuilding: (id: string) => void;
  onUpgradeBuilding: (id: string) => void;
  onClearSelection: () => void;
  onStartPvpBattle: () => void;
  onOpenModal: (modal: ActiveModal) => void;
  player: PlayerProfile;
}

const BUILDABLE_TYPES: BuildingType[] = [
  'gold_mine',
  'crystal_extractor',
  'archer_tower',
  'arcane_cannon',
  'barracks',
  'blacksmith_forge',
  'stone_wall',
];

export function BottomDock({
  collapsed,
  onToggleCollapse,
  buildDrawerOpen,
  onToggleBuildDrawer,
  placingType,
  onSelectPlacingType,
  selectedBuilding,
  movingBuildingId,
  onStartMoveBuilding,
  onUpgradeBuilding,
  onClearSelection,
  onStartPvpBattle,
  onOpenModal,
  player,
}: BottomDockProps) {
  const selectedDef = selectedBuilding ? BUILDING_CATALOG[selectedBuilding.type] : null;
  const upgradeGold = selectedBuilding && selectedDef ? Math.round((selectedDef.costGold || 250) * (selectedBuilding.level + 0.8)) : 0;
  const upgradeCrystals = selectedBuilding && selectedDef ? Math.round((selectedDef.costCrystals || 90) * (selectedBuilding.level + 0.6)) : 0;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-3 z-20 flex flex-col items-center px-3">
      {/* Contextual Selected Building Inspector Strip (only when a building is tapped) */}
      {selectedBuilding && selectedDef && !collapsed && (
        <div className="pointer-events-auto mb-2 flex w-full max-w-xl items-center justify-between gap-3 rounded-xl border border-amber-500/40 bg-slate-950/94 px-4 py-2.5 shadow-xl">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-100">
              <span className="truncate">{selectedDef.name}</span>
              <span className="font-mono text-xs text-amber-400">Lv.{selectedBuilding.level}</span>
            </div>
            <p className="truncate text-xs text-slate-400">
              {selectedDef.category} · {selectedDef.dps > 0 ? `${Math.round(selectedDef.dps * (1 + (selectedBuilding.level - 1) * 0.2))} DPS` : selectedDef.produces ? `Produces ${selectedDef.produces}` : `${Math.round(selectedDef.baseHp * (1 + (selectedBuilding.level - 1) * 0.25))} HP`}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => onStartMoveBuilding(selectedBuilding.id)}
              className={`min-h-[40px] rounded-lg border px-3 text-xs font-semibold transition-colors whitespace-nowrap ${
                movingBuildingId === selectedBuilding.id
                  ? 'border-sky-400 bg-sky-500/20 text-sky-300'
                  : 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800'
              }`}
            >
              {movingBuildingId === selectedBuilding.id ? 'Tap Empty Tile' : 'Move'}
            </button>

            {selectedBuilding.level < 5 && (
              <button
                type="button"
                onClick={() => onUpgradeBuilding(selectedBuilding.id)}
                className="min-h-[40px] rounded-lg bg-amber-500 px-3 text-xs font-bold text-slate-950 transition-colors hover:bg-amber-400 whitespace-nowrap tabular-nums"
              >
                Upgrade ({upgradeGold}G / {upgradeCrystals}C)
              </button>
            )}

            <button
              type="button"
              onClick={onClearSelection}
              aria-label="Close building inspector"
              className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Contextual Build Placement Drawer */}
      {buildDrawerOpen && !collapsed && (
        <div className="pointer-events-auto mb-2 w-full max-w-4xl rounded-xl border border-slate-700/80 bg-slate-950/94 p-3 shadow-2xl">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">
              {placingType
                ? `Tap any empty meadow tile on the 3D island to place ${BUILDING_CATALOG[placingType].name}`
                : 'Select a fortress structure to construct'}
            </span>
            <button
              type="button"
              onClick={() => {
                onSelectPlacingType(null);
                onToggleBuildDrawer();
              }}
              className="flex min-h-[32px] min-w-[32px] items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-white"
              aria-label="Close build menu"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {BUILDABLE_TYPES.map((type) => {
              const def = BUILDING_CATALOG[type];
              const owned = player.buildings.filter((b) => b.type === type).length;
              const maxed = owned >= def.maxCount;
              const active = placingType === type;
              return (
                <button
                  key={type}
                  type="button"
                  disabled={maxed}
                  onClick={() => onSelectPlacingType(active ? null : type)}
                  className={`flex min-h-[56px] flex-col items-start justify-between rounded-lg border p-2 text-left transition-colors ${
                    active
                      ? 'border-sky-400 bg-sky-500/20 text-white'
                      : maxed
                        ? 'cursor-not-allowed border-slate-800 bg-slate-900/50 text-slate-500'
                        : 'border-slate-800 bg-slate-900 text-slate-200 hover:border-slate-600 hover:bg-slate-800'
                  }`}
                >
                  <span className="w-full truncate text-xs font-bold">{def.name}</span>
                  <div className="mt-1 flex w-full items-center justify-between font-mono text-[11px] tabular-nums">
                    <span className="text-amber-400">{def.costGold}G · {def.costCrystals}C</span>
                    <span className="text-slate-400">
                      {owned}/{def.maxCount}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Collapse / Expand Toggle Handle */}
      <button
        type="button"
        onClick={onToggleCollapse}
        className="pointer-events-auto mb-1.5 flex min-h-[32px] items-center gap-1.5 rounded-t-lg border border-b-0 border-slate-700/80 bg-slate-950/92 px-3 py-1 text-[11px] font-semibold text-slate-300 transition-colors hover:text-white"
      >
        {collapsed ? (
          <>
            <ChevronUp className="h-3.5 w-3.5" />
            <span>Show Controls</span>
          </>
        ) : (
          <>
            <ChevronDown className="h-3.5 w-3.5" />
            <span>Hide Controls</span>
          </>
        )}
      </button>

      {/* Main Unified Bottom Control Dock */}
      {!collapsed && (
        <nav
          aria-label="Primary game actions"
          className="pointer-events-auto flex w-full max-w-[940px] items-center justify-between gap-1.5 overflow-x-auto rounded-2xl border border-slate-700/80 bg-slate-950/92 p-1.5 shadow-2xl"
        >
          <button
            type="button"
            onClick={onStartPvpBattle}
            className="flex min-h-[48px] shrink-0 items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-extrabold text-white transition-colors hover:bg-rose-500 active:scale-[0.98] whitespace-nowrap sm:text-sm"
          >
            <Swords className="h-4 w-4 shrink-0" />
            <span>Battle Arena</span>
          </button>

          <button
            type="button"
            onClick={onToggleBuildDrawer}
            className={`flex min-h-[48px] shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap sm:text-sm ${
              buildDrawerOpen
                ? 'bg-sky-500 text-slate-950 font-bold'
                : 'bg-slate-900 text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Hammer className="h-4 w-4 shrink-0" />
            <span>Build</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenModal('guild')}
            className="flex min-h-[48px] shrink-0 items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-800 whitespace-nowrap sm:text-sm"
          >
            <Users className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>Guild & Raid</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenModal('forge')}
            className="flex min-h-[48px] shrink-0 items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-800 whitespace-nowrap sm:text-sm"
          >
            <Anvil className="h-4 w-4 shrink-0 text-amber-400" />
            <span>Forge</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenModal('market')}
            className="flex min-h-[48px] shrink-0 items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-800 whitespace-nowrap sm:text-sm"
          >
            <Gavel className="h-4 w-4 shrink-0 text-sky-400" />
            <span>Market & Auction</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenModal('events')}
            className="flex min-h-[48px] shrink-0 items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-800 whitespace-nowrap sm:text-sm"
          >
            <Calendar className="h-4 w-4 shrink-0 text-violet-400" />
            <span>Quests & League</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenModal('leaderboard')}
            className="flex min-h-[48px] shrink-0 items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-800 whitespace-nowrap sm:text-sm"
          >
            <Award className="h-4 w-4 shrink-0 text-amber-300" />
            <span>Ranks</span>
          </button>
        </nav>
      )}

      <div className="pointer-events-none mt-1.5 text-center text-[11px] font-medium text-slate-200/90 drop-shadow">
        Developer: Vighnesh Kanse ( ANONYMOUS)
      </div>
    </div>
  );
}
