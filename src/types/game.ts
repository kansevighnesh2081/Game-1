export type BuildingType =
  | 'citadel_keep'
  | 'gold_mine'
  | 'crystal_extractor'
  | 'archer_tower'
  | 'arcane_cannon'
  | 'barracks'
  | 'stone_wall'
  | 'blacksmith_forge';

export type TroopType =
  | 'vanguard_knight'
  | 'ember_archer'
  | 'arcane_golem'
  | 'sky_charger';

export type GearSlot = 'weapon' | 'armor' | 'relic';
export type GearRarity = 'Common' | 'Rare' | 'Epic' | 'Mythic';
export type MaterialId = 'sunstone' | 'arcane_essence' | 'mithril_plate' | 'dragon_scale';

export interface BuildingInstance {
  id: string;
  type: BuildingType;
  gx: number; // Grid X (-6 to +6)
  gz: number; // Grid Z (-6 to +6)
  level: number;
  lastCollectedAt: number;
}

export interface GearItem {
  id: string;
  name: string;
  slot: GearSlot;
  rarity: GearRarity;
  level: number;
  attackBonus: number;
  hpBonus: number;
  lootBonusPct: number;
  runeSocket?: string;
  equipped?: boolean;
  listedInAuction?: boolean;
}

export interface LeagueTier {
  id: string;
  name: string;
  minTrophies: number;
  maxTrophies: number | null;
  color: string;
  lootMultiplier: number;
  seasonCrystalReward: number;
}

export interface DailyChallenge {
  id: string;
  title: string;
  metric: 'battles_won' | 'buildings_upgraded' | 'gear_crafted' | 'raid_damage' | 'market_trades';
  target: number;
  progress: number;
  claimed: boolean;
  rewardGold: number;
  rewardCrystals: number;
  rewardShards: number;
  rewardSeasonPoints: number;
}

export interface PlayerProfile {
  id: string;
  name: string;
  trophies: number;
  gold: number;
  crystals: number;
  shards: number;
  seasonPoints: number;
  seasonTierClaimed: number;
  guildId: string | null;
  raidDamageTotal: number;
  battlesWon: number;
  buildings: BuildingInstance[];
  materials: Record<MaterialId, number>;
  inventory: GearItem[];
  challenges: DailyChallenge[];
  stats: {
    battles_won: number;
    buildings_upgraded: number;
    gear_crafted: number;
    raid_damage: number;
    market_trades: number;
  };
}

export interface GuildChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}

export interface GuildRaidState {
  bossName: string;
  bossLevel: number;
  maxHp: number;
  currentHp: number;
  contributors: Record<string, { name: string; damage: number }>;
  defeatedCount: number;
}

export interface Guild {
  id: string;
  name: string;
  tag: string;
  emblemColor: string;
  description: string;
  level: number;
  treasuryGold: number;
  memberIds: string[];
  memberNames: Record<string, string>;
  memberTrophies: Record<string, number>;
  chat: GuildChatMessage[];
  raid: GuildRaidState;
}

export interface MarketCommodity {
  id: MaterialId;
  name: string;
  basePrice: number;
  currentPrice: number;
  previousPrice: number;
  supply: number;
  demand: number;
  history: number[];
}

export interface AuctionListing {
  id: string;
  sellerId: string;
  sellerName: string;
  item: GearItem;
  startingBid: number;
  currentBid: number;
  buyoutPrice: number;
  highestBidderId: string | null;
  highestBidderName: string | null;
  endsAt: number;
  status: 'active' | 'sold' | 'cancelled';
}

export interface DirectTradeOffer {
  id: string;
  creatorId: string;
  creatorName: string;
  offerMaterial: MaterialId;
  offerQty: number;
  requestMaterial: MaterialId;
  requestQty: number;
  bonusGoldOffer: number;
  status: 'open' | 'completed' | 'cancelled';
  createdAt: number;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  trophies: number;
  leagueName: string;
  guildTag: string | null;
  gearPower: number;
  raidDamage: number;
  isOnline: boolean;
}

export interface GuildLeaderboardEntry {
  id: string;
  name: string;
  tag: string;
  totalTrophies: number;
  memberCount: number;
  raidBossesCleared: number;
  level: number;
}

export interface BattleBuildingState {
  id: string;
  type: BuildingType;
  gx: number;
  gz: number;
  level: number;
  maxHp: number;
  hp: number;
  destroyed: boolean;
  range: number;
  dps: number;
  lastFireAt: number;
}

export interface BattleUnitState {
  id: string;
  ownerId: string;
  type: TroopType;
  x: number;
  z: number;
  hp: number;
  maxHp: number;
  atk: number;
  speed: number;
  range: number;
  targetId: string | null;
  lastAttackAt: number;
}

export interface BattleProjectile {
  id: string;
  fromX: number;
  fromY: number;
  fromZ: number;
  toX: number;
  toY: number;
  toZ: number;
  color: string;
  createdAt: number;
}

export interface BattleSession {
  id: string;
  mode: 'pvp' | 'raid';
  attackerId: string;
  attackerName: string;
  defenderId: string;
  defenderName: string;
  guildId?: string;
  status: 'active' | 'finished';
  startedAt: number;
  endsAt: number;
  destructionPct: number;
  stars: number;
  lootGold: number;
  lootCrystals: number;
  trophyDelta: number;
  buildings: BattleBuildingState[];
  units: BattleUnitState[];
  projectiles: BattleProjectile[];
  boss?: {
    name: string;
    x: number;
    z: number;
    hp: number;
    maxHp: number;
    totalDamageDealtInRun: number;
  };
  availableTroops: Record<TroopType, number>;
}

export interface BuildingDefinition {
  type: BuildingType;
  name: string;
  category: 'Core' | 'Economy' | 'Defense' | 'Military';
  description: string;
  costGold: number;
  costCrystals: number;
  baseHp: number;
  dps: number;
  range: number;
  maxCount: number;
  produces?: 'gold' | 'crystals';
  ratePerMin?: number;
}

export interface TroopDefinition {
  type: TroopType;
  name: string;
  role: string;
  hp: number;
  atk: number;
  speed: number;
  range: number;
  crystalCost: number;
  color: string;
}

export const LEAGUE_TIERS: LeagueTier[] = [
  { id: 'bronze', name: 'Bronze Bastion', minTrophies: 0, maxTrophies: 799, color: '#CD7F32', lootMultiplier: 1.0, seasonCrystalReward: 150 },
  { id: 'silver', name: 'Silver Spire', minTrophies: 800, maxTrophies: 1399, color: '#94A3B8', lootMultiplier: 1.15, seasonCrystalReward: 300 },
  { id: 'gold', name: 'Gold Citadel', minTrophies: 1400, maxTrophies: 1999, color: '#F59E0B', lootMultiplier: 1.35, seasonCrystalReward: 550 },
  { id: 'crystal', name: 'Crystal Vanguard', minTrophies: 2000, maxTrophies: 2599, color: '#38BDF8', lootMultiplier: 1.6, seasonCrystalReward: 900 },
  { id: 'obsidian', name: 'Obsidian Titan', minTrophies: 2600, maxTrophies: 3199, color: '#A855F7', lootMultiplier: 1.9, seasonCrystalReward: 1400 },
  { id: 'sovereign', name: 'Grand Sovereign', minTrophies: 3200, maxTrophies: null, color: '#F43F5E', lootMultiplier: 2.3, seasonCrystalReward: 2200 },
];

export function getLeagueForTrophies(trophies: number): LeagueTier {
  for (let i = LEAGUE_TIERS.length - 1; i >= 0; i--) {
    if (trophies >= LEAGUE_TIERS[i].minTrophies) {
      return LEAGUE_TIERS[i];
    }
  }
  return LEAGUE_TIERS[0];
}

export const BUILDING_CATALOG: Record<BuildingType, BuildingDefinition> = {
  citadel_keep: {
    type: 'citadel_keep',
    name: 'Citadel Keep',
    category: 'Core',
    description: 'Command center of your floating fortress. Protecting it prevents a 2-star defeat.',
    costGold: 0,
    costCrystals: 0,
    baseHp: 1600,
    dps: 35,
    range: 5.5,
    maxCount: 1,
  },
  gold_mine: {
    type: 'gold_mine',
    name: 'Gold Mine',
    category: 'Economy',
    description: 'Extracts sunlit gold ore continuously for upgrades, crafting, and auctions.',
    costGold: 150,
    costCrystals: 50,
    baseHp: 520,
    dps: 0,
    range: 0,
    maxCount: 4,
    produces: 'gold',
    ratePerMin: 180,
  },
  crystal_extractor: {
    type: 'crystal_extractor',
    name: 'Crystal Extractor',
    category: 'Economy',
    description: 'Condenses arcane crystals to train squads and enchant battle gear.',
    costGold: 200,
    costCrystals: 40,
    baseHp: 500,
    dps: 0,
    range: 0,
    maxCount: 4,
    produces: 'crystals',
    ratePerMin: 140,
  },
  archer_tower: {
    type: 'archer_tower',
    name: 'Archer Watchtower',
    category: 'Defense',
    description: 'Rapid-fire elevated lookout firing precision bolts at encroaching raiders.',
    costGold: 280,
    costCrystals: 80,
    baseHp: 680,
    dps: 62,
    range: 6.5,
    maxCount: 5,
  },
  arcane_cannon: {
    type: 'arcane_cannon',
    name: 'Arcane Mortar',
    category: 'Defense',
    description: 'Heavy rune-bound artillery dealing high burst damage to armored golems.',
    costGold: 420,
    costCrystals: 160,
    baseHp: 820,
    dps: 95,
    range: 7.5,
    maxCount: 3,
  },
  barracks: {
    type: 'barracks',
    name: 'War Barracks',
    category: 'Military',
    description: 'Expands squad deployment capacity and trains elite garrison troops.',
    costGold: 260,
    costCrystals: 100,
    baseHp: 740,
    dps: 0,
    range: 0,
    maxCount: 2,
  },
  blacksmith_forge: {
    type: 'blacksmith_forge',
    name: 'Sunforge Anvil',
    category: 'Military',
    description: 'Unlocks higher-tier crafting recipes and boosts alloy forging yield.',
    costGold: 350,
    costCrystals: 140,
    baseHp: 760,
    dps: 0,
    range: 0,
    maxCount: 1,
  },
  stone_wall: {
    type: 'stone_wall',
    name: 'Bastion Rampart',
    category: 'Defense',
    description: 'Reinforced stone barricade that slows enemy vanguard advances.',
    costGold: 60,
    costCrystals: 15,
    baseHp: 900,
    dps: 0,
    range: 0,
    maxCount: 16,
  },
};

export const TROOP_CATALOG: Record<TroopType, TroopDefinition> = {
  vanguard_knight: {
    type: 'vanguard_knight',
    name: 'Vanguard Knight',
    role: 'Frontline Melee',
    hp: 340,
    atk: 46,
    speed: 2.8,
    range: 1.5,
    crystalCost: 25,
    color: '#3B82F6',
  },
  ember_archer: {
    type: 'ember_archer',
    name: 'Ember Ranger',
    role: 'Ranged Marksman',
    hp: 175,
    atk: 54,
    speed: 3.3,
    range: 5.2,
    crystalCost: 30,
    color: '#F59E0B',
  },
  arcane_golem: {
    type: 'arcane_golem',
    name: 'Arcane Golem',
    role: 'Siege Tank',
    hp: 860,
    atk: 78,
    speed: 1.7,
    range: 1.8,
    crystalCost: 75,
    color: '#8B5CF6',
  },
  sky_charger: {
    type: 'sky_charger',
    name: 'Sky Charger',
    role: 'Swift Striker',
    hp: 260,
    atk: 68,
    speed: 4.5,
    range: 2.2,
    crystalCost: 45,
    color: '#06B6D4',
  },
};

export const MATERIAL_NAMES: Record<MaterialId, string> = {
  sunstone: 'Sunstone Ingot',
  arcane_essence: 'Arcane Essence',
  mithril_plate: 'Mithril Plate',
  dragon_scale: 'Dragon Scale',
};

export const CRAFTING_RECIPES: Array<{
  id: string;
  name: string;
  slot: GearSlot;
  rarity: GearRarity;
  baseAttack: number;
  baseHp: number;
  lootBonusPct: number;
  costGold: number;
  materials: Partial<Record<MaterialId, number>>;
}> = [
  {
    id: 'recipe_vanguard_blade',
    name: 'Sunsteel Broadsword',
    slot: 'weapon',
    rarity: 'Rare',
    baseAttack: 18,
    baseHp: 40,
    lootBonusPct: 5,
    costGold: 320,
    materials: { sunstone: 3, arcane_essence: 1 },
  },
  {
    id: 'recipe_bastion_plate',
    name: 'Aegis Bastion Armor',
    slot: 'armor',
    rarity: 'Rare',
    baseAttack: 4,
    baseHp: 140,
    lootBonusPct: 4,
    costGold: 340,
    materials: { sunstone: 2, mithril_plate: 2 },
  },
  {
    id: 'recipe_frostfire_staff',
    name: 'Frostfire Arcanum',
    slot: 'weapon',
    rarity: 'Epic',
    baseAttack: 34,
    baseHp: 70,
    lootBonusPct: 10,
    costGold: 620,
    materials: { arcane_essence: 4, mithril_plate: 2 },
  },
  {
    id: 'recipe_sovereign_crest',
    name: 'Sovereign War Crest',
    slot: 'relic',
    rarity: 'Epic',
    baseAttack: 20,
    baseHp: 110,
    lootBonusPct: 18,
    costGold: 680,
    materials: { sunstone: 3, arcane_essence: 3, dragon_scale: 1 },
  },
  {
    id: 'recipe_sunforge_relic',
    name: 'Sunforged Titanbreaker',
    slot: 'weapon',
    rarity: 'Mythic',
    baseAttack: 58,
    baseHp: 160,
    lootBonusPct: 22,
    costGold: 1200,
    materials: { sunstone: 4, arcane_essence: 4, mithril_plate: 3, dragon_scale: 3 },
  },
];

export const SEASON_TRACK_REWARDS = [
  { tier: 1, pointsRequired: 50, title: 'Vanguard Cache', gold: 450, crystals: 180, shards: 15 },
  { tier: 2, pointsRequired: 150, title: 'Artificer Crate', gold: 850, crystals: 320, shards: 30 },
  { tier: 3, pointsRequired: 300, title: 'Frostfire Vanguard Bundle', gold: 1400, crystals: 520, shards: 55 },
  { tier: 4, pointsRequired: 500, title: 'Obsidian Relic Vault', gold: 2200, crystals: 850, shards: 90 },
  { tier: 5, pointsRequired: 800, title: 'Grand Sovereign Crown', gold: 3800, crystals: 1500, shards: 160 },
];
