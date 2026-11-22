import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import dotenv from 'dotenv';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { WebSocket, WebSocketServer } from 'ws';
import {
  AuctionListing,
  BUILDING_CATALOG,
  BattleBuildingState,
  BattleSession,
  BattleUnitState,
  BuildingInstance,
  BuildingType,
  CRAFTING_RECIPES,
  DailyChallenge,
  DirectTradeOffer,
  GearItem,
  Guild,
  GuildLeaderboardEntry,
  LeaderboardEntry,
  MarketCommodity,
  MaterialId,
  PlayerProfile,
  SEASON_TRACK_REWARDS,
  TROOP_CATALOG,
  TroopType,
  getLeagueForTrophies,
} from './src/types/game.js';

dotenv.config();

const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.resolve(process.cwd(), '.data');
const SNAPSHOT_FILE = path.resolve(DATA_DIR, 'citadel_world.json');

interface WorldState {
  players: Record<string, PlayerProfile>;
  guilds: Record<string, Guild>;
  market: Record<MaterialId, MarketCommodity>;
  auctions: AuctionListing[];
  trades: DirectTradeOffer[];
}

function createInitialChallenges(): DailyChallenge[] {
  return [
    {
      id: 'ch_battles',
      title: 'Win 2 Multiplayer Arena Battles',
      metric: 'battles_won',
      target: 2,
      progress: 0,
      claimed: false,
      rewardGold: 450,
      rewardCrystals: 180,
      rewardShards: 12,
      rewardSeasonPoints: 60,
    },
    {
      id: 'ch_upgrade',
      title: 'Upgrade or Construct 2 Structures',
      metric: 'buildings_upgraded',
      target: 2,
      progress: 0,
      claimed: false,
      rewardGold: 320,
      rewardCrystals: 120,
      rewardShards: 8,
      rewardSeasonPoints: 40,
    },
    {
      id: 'ch_craft',
      title: 'Forge or Upgrade 1 Piece of Gear',
      metric: 'gear_crafted',
      target: 1,
      progress: 0,
      claimed: false,
      rewardGold: 360,
      rewardCrystals: 140,
      rewardShards: 15,
      rewardSeasonPoints: 50,
    },
    {
      id: 'ch_raid',
      title: 'Deal 1,500 Damage in a Guild Raid',
      metric: 'raid_damage',
      target: 1500,
      progress: 0,
      claimed: false,
      rewardGold: 600,
      rewardCrystals: 240,
      rewardShards: 22,
      rewardSeasonPoints: 80,
    },
    {
      id: 'ch_trade',
      title: 'Complete 1 Market or Auction Trade',
      metric: 'market_trades',
      target: 1,
      progress: 0,
      claimed: false,
      rewardGold: 300,
      rewardCrystals: 100,
      rewardShards: 10,
      rewardSeasonPoints: 45,
    },
  ];
}

function createStarterBuildings(): BuildingInstance[] {
  const now = Date.now();
  return [
    { id: 'b_keep', type: 'citadel_keep', gx: 0, gz: 0, level: 2, lastCollectedAt: now },
    { id: 'b_mine_1', type: 'gold_mine', gx: -2, gz: -1, level: 1, lastCollectedAt: now },
    { id: 'b_crys_1', type: 'crystal_extractor', gx: 2, gz: -1, level: 1, lastCollectedAt: now },
    { id: 'b_arch_1', type: 'archer_tower', gx: -2, gz: 2, level: 1, lastCollectedAt: now },
    { id: 'b_cann_1', type: 'arcane_cannon', gx: 2, gz: 2, level: 1, lastCollectedAt: now },
    { id: 'b_barr_1', type: 'barracks', gx: 0, gz: -3, level: 1, lastCollectedAt: now },
    { id: 'b_wall_1', type: 'stone_wall', gx: -1, gz: 3, level: 1, lastCollectedAt: now },
    { id: 'b_wall_2', type: 'stone_wall', gx: 0, gz: 3, level: 1, lastCollectedAt: now },
    { id: 'b_wall_3', type: 'stone_wall', gx: 1, gz: 3, level: 1, lastCollectedAt: now },
  ];
}

function createStarterInventory(prefix: string): GearItem[] {
  return [
    {
      id: `${prefix}_sword`,
      name: 'Vanguard Ironblade',
      slot: 'weapon',
      rarity: 'Common',
      level: 1,
      attackBonus: 12,
      hpBonus: 20,
      lootBonusPct: 2,
      equipped: true,
    },
    {
      id: `${prefix}_armor`,
      name: 'Citadel Guard Cuirass',
      slot: 'armor',
      rarity: 'Common',
      level: 1,
      attackBonus: 2,
      hpBonus: 80,
      lootBonusPct: 2,
      equipped: true,
    },
  ];
}

function seedWorldState(): WorldState {
  const now = Date.now();
  const seededPlayers: Record<string, PlayerProfile> = {
    npc_valerius: {
      id: 'npc_valerius',
      name: 'Lord Valerius',
      trophies: 2840,
      gold: 4200,
      crystals: 1900,
      shards: 85,
      seasonPoints: 460,
      seasonTierClaimed: 3,
      guildId: 'guild_solaris',
      raidDamageTotal: 14200,
      battlesWon: 38,
      buildings: [
        { id: 'v_keep', type: 'citadel_keep', gx: 0, gz: 0, level: 3, lastCollectedAt: now },
        { id: 'v_mine1', type: 'gold_mine', gx: -3, gz: -1, level: 2, lastCollectedAt: now },
        { id: 'v_crys1', type: 'crystal_extractor', gx: 3, gz: -1, level: 2, lastCollectedAt: now },
        { id: 'v_arch1', type: 'archer_tower', gx: -2, gz: 2, level: 2, lastCollectedAt: now },
        { id: 'v_arch2', type: 'archer_tower', gx: 2, gz: -2, level: 2, lastCollectedAt: now },
        { id: 'v_cann1', type: 'arcane_cannon', gx: 2, gz: 2, level: 2, lastCollectedAt: now },
        { id: 'v_barr1', type: 'barracks', gx: -2, gz: -3, level: 2, lastCollectedAt: now },
        { id: 'v_w1', type: 'stone_wall', gx: -1, gz: 3, level: 2, lastCollectedAt: now },
        { id: 'v_w2', type: 'stone_wall', gx: 0, gz: 3, level: 2, lastCollectedAt: now },
        { id: 'v_w3', type: 'stone_wall', gx: 1, gz: 3, level: 2, lastCollectedAt: now },
      ],
      materials: { sunstone: 14, arcane_essence: 12, mithril_plate: 8, dragon_scale: 4 },
      inventory: [
        {
          id: 'val_blade',
          name: 'Sunforged Titanbreaker',
          slot: 'weapon',
          rarity: 'Mythic',
          level: 5,
          attackBonus: 78,
          hpBonus: 210,
          lootBonusPct: 24,
          equipped: true,
        },
      ],
      challenges: createInitialChallenges(),
      stats: { battles_won: 38, buildings_upgraded: 14, gear_crafted: 7, raid_damage: 14200, market_trades: 9 },
    },
    npc_kaelith: {
      id: 'npc_kaelith',
      name: 'Warden Kaelith',
      trophies: 2150,
      gold: 3100,
      crystals: 1450,
      shards: 52,
      seasonPoints: 320,
      seasonTierClaimed: 2,
      guildId: 'guild_frostfire',
      raidDamageTotal: 9850,
      battlesWon: 27,
      buildings: [
        { id: 'k_keep', type: 'citadel_keep', gx: 0, gz: 0, level: 2, lastCollectedAt: now },
        { id: 'k_mine1', type: 'gold_mine', gx: -2, gz: -2, level: 2, lastCollectedAt: now },
        { id: 'k_crys1', type: 'crystal_extractor', gx: 2, gz: -2, level: 2, lastCollectedAt: now },
        { id: 'k_arch1', type: 'archer_tower', gx: -2, gz: 1, level: 2, lastCollectedAt: now },
        { id: 'k_cann1', type: 'arcane_cannon', gx: 2, gz: 1, level: 1, lastCollectedAt: now },
        { id: 'k_w1', type: 'stone_wall', gx: -1, gz: 2, level: 1, lastCollectedAt: now },
        { id: 'k_w2', type: 'stone_wall', gx: 1, gz: 2, level: 1, lastCollectedAt: now },
      ],
      materials: { sunstone: 9, arcane_essence: 11, mithril_plate: 5, dragon_scale: 2 },
      inventory: [
        {
          id: 'kael_staff',
          name: 'Frostfire Arcanum',
          slot: 'weapon',
          rarity: 'Epic',
          level: 4,
          attackBonus: 49,
          hpBonus: 115,
          lootBonusPct: 14,
          equipped: true,
        },
      ],
      challenges: createInitialChallenges(),
      stats: { battles_won: 27, buildings_upgraded: 11, gear_crafted: 5, raid_damage: 9850, market_trades: 6 },
    },
    npc_lyra: {
      id: 'npc_lyra',
      name: 'Aria Sunweaver',
      trophies: 1580,
      gold: 2400,
      crystals: 1100,
      shards: 34,
      seasonPoints: 195,
      seasonTierClaimed: 2,
      guildId: 'guild_solaris',
      raidDamageTotal: 6400,
      battlesWon: 19,
      buildings: createStarterBuildings(),
      materials: { sunstone: 8, arcane_essence: 7, mithril_plate: 3, dragon_scale: 1 },
      inventory: createStarterInventory('lyra'),
      challenges: createInitialChallenges(),
      stats: { battles_won: 19, buildings_upgraded: 8, gear_crafted: 3, raid_damage: 6400, market_trades: 4 },
    },
  };

  const guilds: Record<string, Guild> = {
    guild_solaris: {
      id: 'guild_solaris',
      name: 'Solaris Vanguard',
      tag: 'SOL',
      emblemColor: '#F59E0B',
      description: 'Competitive fortress builders & voice-coordinated raid specialists.',
      level: 5,
      treasuryGold: 8400,
      memberIds: ['npc_valerius', 'npc_lyra'],
      memberNames: { npc_valerius: 'Lord Valerius', npc_lyra: 'Aria Sunweaver' },
      memberTrophies: { npc_valerius: 2840, npc_lyra: 1580 },
      chat: [
        {
          id: 'msg_seed_1',
          senderId: 'npc_valerius',
          senderName: 'Lord Valerius',
          text: 'Welcome to Solaris Vanguard! Join Voice Channel before launching the Obsidian Titan raid.',
          timestamp: now - 180000,
        },
      ],
      raid: {
        bossName: 'Obsidian Magma Titan',
        bossLevel: 4,
        maxHp: 12000,
        currentHp: 8450,
        contributors: {
          npc_valerius: { name: 'Lord Valerius', damage: 2350 },
          npc_lyra: { name: 'Aria Sunweaver', damage: 1200 },
        },
        defeatedCount: 3,
      },
    },
    guild_frostfire: {
      id: 'guild_frostfire',
      name: 'Frostfire Pact',
      tag: 'FFP',
      emblemColor: '#38BDF8',
      description: 'Master crafters and high-league siege raiders.',
      level: 4,
      treasuryGold: 6200,
      memberIds: ['npc_kaelith'],
      memberNames: { npc_kaelith: 'Warden Kaelith' },
      memberTrophies: { npc_kaelith: 2150 },
      chat: [
        {
          id: 'msg_seed_2',
          senderId: 'npc_kaelith',
          senderName: 'Warden Kaelith',
          text: 'Need two more raiders to finish the Season IV Frostfire Titan!',
          timestamp: now - 120000,
        },
      ],
      raid: {
        bossName: 'Obsidian Magma Titan',
        bossLevel: 3,
        maxHp: 10000,
        currentHp: 7800,
        contributors: {
          npc_kaelith: { name: 'Warden Kaelith', damage: 2200 },
        },
        defeatedCount: 2,
      },
    },
  };

  const market: Record<MaterialId, MarketCommodity> = {
    sunstone: {
      id: 'sunstone',
      name: 'Sunstone Ingot',
      basePrice: 85,
      currentPrice: 92,
      previousPrice: 85,
      supply: 120,
      demand: 130,
      history: [80, 84, 86, 85, 89, 92],
    },
    arcane_essence: {
      id: 'arcane_essence',
      name: 'Arcane Essence',
      basePrice: 110,
      currentPrice: 106,
      previousPrice: 112,
      supply: 105,
      demand: 100,
      history: [115, 118, 114, 112, 108, 106],
    },
    mithril_plate: {
      id: 'mithril_plate',
      name: 'Mithril Plate',
      basePrice: 165,
      currentPrice: 178,
      previousPrice: 168,
      supply: 70,
      demand: 82,
      history: [158, 162, 165, 168, 174, 178],
    },
    dragon_scale: {
      id: 'dragon_scale',
      name: 'Dragon Scale',
      basePrice: 310,
      currentPrice: 335,
      previousPrice: 315,
      supply: 36,
      demand: 44,
      history: [295, 305, 310, 315, 326, 335],
    },
  };

  const auctions: AuctionListing[] = [
    {
      id: 'auc_seed_1',
      sellerId: 'npc_valerius',
      sellerName: 'Lord Valerius',
      item: {
        id: 'auc_item_1',
        name: 'Emberforged Siege Blade',
        slot: 'weapon',
        rarity: 'Epic',
        level: 4,
        attackBonus: 44,
        hpBonus: 95,
        lootBonusPct: 12,
        runeSocket: 'Rune of Valor',
      },
      startingBid: 650,
      currentBid: 650,
      buyoutPrice: 1450,
      highestBidderId: null,
      highestBidderName: null,
      endsAt: now + 1000 * 60 * 45,
      status: 'active',
    },
    {
      id: 'auc_seed_2',
      sellerId: 'npc_kaelith',
      sellerName: 'Warden Kaelith',
      item: {
        id: 'auc_item_2',
        name: 'Astral Bastion Shieldplate',
        slot: 'armor',
        rarity: 'Mythic',
        level: 3,
        attackBonus: 14,
        hpBonus: 260,
        lootBonusPct: 15,
        runeSocket: 'Frostfire Core',
      },
      startingBid: 950,
      currentBid: 1050,
      buyoutPrice: 2200,
      highestBidderId: 'npc_lyra',
      highestBidderName: 'Aria Sunweaver',
      endsAt: now + 1000 * 60 * 30,
      status: 'active',
    },
  ];

  const trades: DirectTradeOffer[] = [
    {
      id: 'trd_seed_1',
      creatorId: 'npc_valerius',
      creatorName: 'Lord Valerius',
      offerMaterial: 'dragon_scale',
      offerQty: 1,
      requestMaterial: 'sunstone',
      requestQty: 3,
      bonusGoldOffer: 60,
      status: 'open',
      createdAt: now - 60000,
    },
  ];

  return { players: seededPlayers, guilds, market, auctions, trades };
}

function loadWorldState(): WorldState {
  try {
    if (fs.existsSync(SNAPSHOT_FILE)) {
      const raw = fs.readFileSync(SNAPSHOT_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as WorldState;
      if (parsed && parsed.players && parsed.guilds && parsed.market) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Starting with fresh seeded world state:', err);
  }
  return seedWorldState();
}

const world: WorldState = loadWorldState();
let saveTimer: NodeJS.Timeout | null = null;
function scheduleSaveWorld() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      const resolved = path.resolve(SNAPSHOT_FILE);
      if (!resolved.startsWith(DATA_DIR + path.sep)) return;
      fs.writeFileSync(resolved, JSON.stringify(world), 'utf-8');
    } catch {
      // Ignore disk write issues in read-only environments
    }
  }, 1500);
}

// Active sessions (token -> playerId)
const sessions = new Map<string, string>();
// Live WebSocket connections (ws -> { playerId, voiceRoomId, battleId })
interface ClientConn {
  ws: WebSocket;
  playerId: string | null;
  voiceRoomId: string | null;
  battleId: string | null;
}
const clients = new Map<WebSocket, ClientConn>();
const activeBattles = new Map<string, BattleSession>();

function getPlayerGearBonuses(player: PlayerProfile) {
  let attackBonus = 0;
  let hpBonus = 0;
  let lootBonusPct = 0;
  for (const item of player.inventory) {
    if (item.equipped) {
      attackBonus += item.attackBonus;
      hpBonus += item.hpBonus;
      lootBonusPct += item.lootBonusPct;
    }
  }
  return { attackBonus, hpBonus, lootBonusPct };
}

function getGearPower(player: PlayerProfile): number {
  const { attackBonus, hpBonus } = getPlayerGearBonuses(player);
  const bldgSum = player.buildings.reduce((acc, b) => acc + b.level * 45, 0);
  return Math.round(attackBonus * 5 + hpBonus * 1.2 + bldgSum);
}

function incrementChallenge(player: PlayerProfile, metric: DailyChallenge['metric'], amount: number) {
  player.stats[metric] = (player.stats[metric] || 0) + amount;
  for (const ch of player.challenges) {
    if (ch.metric === metric && !ch.claimed) {
      ch.progress = Math.min(ch.target, ch.progress + amount);
    }
  }
}

function getOnlinePlayerIds(): Set<string> {
  const online = new Set<string>();
  for (const c of clients.values()) {
    if (c.playerId) online.add(c.playerId);
  }
  return online;
}

function buildLeaderboard(): { players: LeaderboardEntry[]; guilds: GuildLeaderboardEntry[] } {
  const online = getOnlinePlayerIds();
  const players: LeaderboardEntry[] = Object.values(world.players)
    .map((p) => {
      const guild = p.guildId ? world.guilds[p.guildId] : null;
      return {
        id: p.id,
        name: p.name,
        trophies: p.trophies,
        leagueName: getLeagueForTrophies(p.trophies).name,
        guildTag: guild ? guild.tag : null,
        gearPower: getGearPower(p),
        raidDamage: p.raidDamageTotal,
        isOnline: online.has(p.id),
      };
    })
    .sort((a, b) => b.trophies - a.trophies)
    .slice(0, 30);

  const guilds: GuildLeaderboardEntry[] = Object.values(world.guilds)
    .map((g) => {
      const totalTrophies = g.memberIds.reduce((sum, id) => sum + (world.players[id]?.trophies ?? 0), 0);
      return {
        id: g.id,
        name: g.name,
        tag: g.tag,
        totalTrophies,
        memberCount: g.memberIds.length,
        raidBossesCleared: g.raid.defeatedCount,
        level: g.level,
      };
    })
    .sort((a, b) => b.totalTrophies - a.totalTrophies);

  return { players, guilds };
}

function sendToClient(ws: WebSocket, type: string, payload: unknown) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, payload }));
  }
}

function sendToPlayer(playerId: string, type: string, payload: unknown) {
  for (const c of clients.values()) {
    if (c.playerId === playerId) {
      sendToClient(c.ws, type, payload);
    }
  }
}

function broadcastAll(type: string, payload: unknown) {
  const msg = JSON.stringify({ type, payload });
  for (const c of clients.values()) {
    if (c.ws.readyState === WebSocket.OPEN) {
      c.ws.send(msg);
    }
  }
}

function broadcastToGuild(guildId: string, type: string, payload: unknown) {
  const guild = world.guilds[guildId];
  if (!guild) return;
  const memberSet = new Set(guild.memberIds);
  const msg = JSON.stringify({ type, payload });
  for (const c of clients.values()) {
    if (c.playerId && memberSet.has(c.playerId) && c.ws.readyState === WebSocket.OPEN) {
      c.ws.send(msg);
    }
  }
}

function broadcastToBattle(battleId: string, type: string, payload: unknown) {
  const msg = JSON.stringify({ type, payload });
  for (const c of clients.values()) {
    if (c.battleId === battleId && c.ws.readyState === WebSocket.OPEN) {
      c.ws.send(msg);
    }
  }
}

function broadcastLeaderboardAndEconomy() {
  broadcastAll('world:sync', {
    leaderboard: buildLeaderboard(),
    market: Object.values(world.market),
    auctions: world.auctions.filter((a) => a.status === 'active'),
    trades: world.trades.filter((t) => t.status === 'open'),
    guilds: Object.values(world.guilds),
  });
}

function settleExpiredAuctions() {
  const now = Date.now();
  let changed = false;
  for (const auc of world.auctions) {
    if (auc.status === 'active' && now >= auc.endsAt) {
      auc.status = 'sold';
      changed = true;
      const seller = world.players[auc.sellerId];
      if (auc.highestBidderId && world.players[auc.highestBidderId]) {
        const winner = world.players[auc.highestBidderId];
        auc.item.listedInAuction = false;
        auc.item.equipped = false;
        winner.inventory.push(auc.item);
        if (seller) {
          seller.gold += auc.currentBid;
          const idx = seller.inventory.findIndex((i) => i.id === auc.item.id);
          if (idx !== -1) seller.inventory.splice(idx, 1);
          sendToPlayer(seller.id, 'player:update', seller);
        }
        sendToPlayer(winner.id, 'player:update', winner);
      } else if (seller) {
        const item = seller.inventory.find((i) => i.id === auc.item.id);
        if (item) item.listedInAuction = false;
        sendToPlayer(seller.id, 'player:update', seller);
      }
    }
  }
  if (changed) {
    scheduleSaveWorld();
    broadcastLeaderboardAndEconomy();
  }
}

function startBattleSession(attacker: PlayerProfile, mode: 'pvp' | 'raid', targetPlayerId?: string): BattleSession {
  const id = `bat_${crypto.randomBytes(6).toString('hex')}`;
  const now = Date.now();

  let defender: PlayerProfile;
  if (mode === 'pvp' && targetPlayerId && world.players[targetPlayerId] && targetPlayerId !== attacker.id) {
    defender = world.players[targetPlayerId];
  } else {
    const candidates = Object.values(world.players).filter((p) => p.id !== attacker.id);
    candidates.sort((a, b) => Math.abs(a.trophies - attacker.trophies) - Math.abs(b.trophies - attacker.trophies));
    defender = candidates[0] || world.players.npc_valerius;
  }

  let buildings: BattleBuildingState[];
  let boss: BattleSession['boss'];

  if (mode === 'raid') {
    const guild = attacker.guildId ? world.guilds[attacker.guildId] : null;
    const bossLevel = guild ? guild.raid.bossLevel : 2;
    const bossMaxHp = guild ? guild.raid.maxHp : 6000;
    const bossHp = guild ? guild.raid.currentHp : 6000;

    buildings = [
      { id: 'raid_twr_1', type: 'arcane_cannon', gx: -3, gz: -2, level: bossLevel, maxHp: 750, hp: 750, destroyed: false, range: 7.5, dps: 82, lastFireAt: 0 },
      { id: 'raid_twr_2', type: 'arcane_cannon', gx: 3, gz: -2, level: bossLevel, maxHp: 750, hp: 750, destroyed: false, range: 7.5, dps: 82, lastFireAt: 0 },
      { id: 'raid_twr_3', type: 'archer_tower', gx: -3, gz: 2, level: bossLevel, maxHp: 620, hp: 620, destroyed: false, range: 6.5, dps: 58, lastFireAt: 0 },
      { id: 'raid_twr_4', type: 'archer_tower', gx: 3, gz: 2, level: bossLevel, maxHp: 620, hp: 620, destroyed: false, range: 6.5, dps: 58, lastFireAt: 0 },
    ];
    boss = {
      name: guild ? guild.raid.bossName : 'Obsidian Magma Titan',
      x: 0,
      z: 0,
      hp: bossHp,
      maxHp: bossMaxHp,
      totalDamageDealtInRun: 0,
    };
  } else {
    buildings = defender.buildings.map((b) => {
      const def = BUILDING_CATALOG[b.type];
      const maxHp = Math.round(def.baseHp * (1 + (b.level - 1) * 0.25));
      return {
        id: b.id,
        type: b.type,
        gx: b.gx,
        gz: b.gz,
        level: b.level,
        maxHp,
        hp: maxHp,
        destroyed: false,
        range: def.range,
        dps: Math.round(def.dps * (1 + (b.level - 1) * 0.2)),
        lastFireAt: 0,
      };
    });
  }

  const barracksCount = attacker.buildings.filter((b) => b.type === 'barracks').reduce((sum, b) => sum + b.level, 0);
  const bonusSquad = Math.min(6, barracksCount);

  const session: BattleSession = {
    id,
    mode,
    attackerId: attacker.id,
    attackerName: attacker.name,
    defenderId: mode === 'raid' ? 'raid_titan' : defender.id,
    defenderName: mode === 'raid' ? 'Obsidian Magma Titan' : defender.name,
    guildId: mode === 'raid' && attacker.guildId ? attacker.guildId : undefined,
    status: 'active',
    startedAt: now,
    endsAt: now + 90_000,
    destructionPct: 0,
    stars: 0,
    lootGold: 0,
    lootCrystals: 0,
    trophyDelta: 0,
    buildings,
    units: [],
    projectiles: [],
    boss,
    availableTroops: {
      vanguard_knight: 6 + bonusSquad,
      ember_archer: 5 + bonusSquad,
      arcane_golem: 2 + Math.floor(bonusSquad / 2),
      sky_charger: 4 + bonusSquad,
    },
  };

  activeBattles.set(id, session);
  return session;
}

function finalizeBattle(battle: BattleSession) {
  if (battle.status === 'finished') return;
  battle.status = 'finished';

  const attacker = world.players[battle.attackerId];
  if (!attacker) return;

  const { lootBonusPct } = getPlayerGearBonuses(attacker);
  const league = getLeagueForTrophies(attacker.trophies);
  const mult = league.lootMultiplier * (1 + lootBonusPct / 100);

  if (battle.mode === 'raid') {
    const dmg = battle.boss?.totalDamageDealtInRun || 0;
    const goldReward = Math.round((150 + dmg * 0.22) * mult);
    const crystalReward = Math.round((80 + dmg * 0.12) * mult);
    const shardReward = Math.max(5, Math.round(dmg / 180));
    attacker.gold += goldReward;
    attacker.crystals += crystalReward;
    attacker.shards += shardReward;
    attacker.seasonPoints += Math.max(15, Math.round(dmg / 100));
    attacker.raidDamageTotal += dmg;
    incrementChallenge(attacker, 'raid_damage', dmg);
    battle.lootGold = goldReward;
    battle.lootCrystals = crystalReward;

    if (battle.guildId && world.guilds[battle.guildId] && battle.boss) {
      const g = world.guilds[battle.guildId];
      if (battle.boss.hp <= 0) {
        g.raid.defeatedCount += 1;
        g.raid.bossLevel += 1;
        g.raid.maxHp = Math.round(g.raid.maxHp * 1.25);
        g.raid.currentHp = g.raid.maxHp;
        g.treasuryGold += 1500;
        g.chat.push({
          id: `msg_${crypto.randomBytes(4).toString('hex')}`,
          senderId: 'system',
          senderName: 'Raid Herald',
          text: `${attacker.name} dealt the final blow to ${g.raid.bossName}! Guild Treasury earned +1,500 Gold.`,
          timestamp: Date.now(),
        });
      }
      broadcastToGuild(g.id, 'guild:update', g);
    }
  } else {
    const won = battle.stars >= 1;
    const trophyDelta = won ? 18 + battle.stars * 9 : -12;
    const goldReward = Math.round((180 + battle.destructionPct * 6.5) * mult);
    const crystalReward = Math.round((90 + battle.destructionPct * 3.4) * mult);
    const shardReward = battle.stars * 6 + 2;

    attacker.trophies = Math.max(0, attacker.trophies + trophyDelta);
    attacker.gold += goldReward;
    attacker.crystals += crystalReward;
    attacker.shards += shardReward;
    attacker.seasonPoints += 20 + battle.stars * 15;
    if (won) {
      attacker.battlesWon += 1;
      incrementChallenge(attacker, 'battles_won', 1);
      // Drop crafting materials on victory
      const mats: MaterialId[] = ['sunstone', 'arcane_essence', 'mithril_plate', 'dragon_scale'];
      const drop = mats[Math.floor(Math.random() * (battle.stars === 3 ? 4 : 3))];
      attacker.materials[drop] = (attacker.materials[drop] || 0) + (battle.stars === 3 ? 2 : 1);
    }

    battle.lootGold = goldReward;
    battle.lootCrystals = crystalReward;
    battle.trophyDelta = trophyDelta;

    if (attacker.guildId && world.guilds[attacker.guildId]) {
      world.guilds[attacker.guildId].memberTrophies[attacker.id] = attacker.trophies;
    }
  }

  scheduleSaveWorld();
  sendToPlayer(attacker.id, 'player:update', attacker);
  broadcastToBattle(battle.id, 'battle:state', battle);
  broadcastLeaderboardAndEconomy();
}

// Authoritative 15Hz Battle Simulation Loop
setInterval(() => {
  const now = Date.now();
  for (const battle of activeBattles.values()) {
    if (battle.status !== 'active') continue;

    // Expire old projectile VFX after 350ms
    battle.projectiles = battle.projectiles.filter((p) => now - p.createdAt < 380);

    const dt = 0.066;

    // Move and attack units
    for (const unit of battle.units) {
      if (unit.hp <= 0) continue;

      let targetBuilding: BattleBuildingState | null = null;
      let minDist = Infinity;

      for (const b of battle.buildings) {
        if (b.destroyed) continue;
        const dx = b.gx * 2 - unit.x;
        const dz = b.gz * 2 - unit.z;
        const dist = Math.hypot(dx, dz);
        if (dist < minDist) {
          minDist = dist;
          targetBuilding = b;
        }
      }

      // In Raid mode, prioritize Boss if closer or no towers remain
      let targetingBoss = false;
      if (battle.mode === 'raid' && battle.boss && battle.boss.hp > 0) {
        const bDist = Math.hypot(battle.boss.x - unit.x, battle.boss.z - unit.z);
        if (!targetBuilding || bDist < minDist + 1.5) {
          targetingBoss = true;
          minDist = bDist;
        }
      }

      const tx = targetingBoss && battle.boss ? battle.boss.x : targetBuilding ? targetBuilding.gx * 2 : 0;
      const tz = targetingBoss && battle.boss ? battle.boss.z : targetBuilding ? targetBuilding.gz * 2 : 0;

      if (minDist > unit.range + 0.7) {
        const dx = tx - unit.x;
        const dz = tz - unit.z;
        const len = Math.max(0.001, Math.hypot(dx, dz));
        unit.x += (dx / len) * unit.speed * dt;
        unit.z += (dz / len) * unit.speed * dt;
      } else if (now - unit.lastAttackAt >= 850) {
        unit.lastAttackAt = now;
        if (targetingBoss && battle.boss) {
          const dmg = unit.atk;
          battle.boss.hp = Math.max(0, battle.boss.hp - dmg);
          battle.boss.totalDamageDealtInRun += dmg;

          if (battle.guildId && world.guilds[battle.guildId]) {
            const g = world.guilds[battle.guildId];
            g.raid.currentHp = Math.max(0, g.raid.currentHp - dmg);
            const attacker = world.players[unit.ownerId];
            if (!g.raid.contributors[unit.ownerId]) {
              g.raid.contributors[unit.ownerId] = { name: attacker?.name || 'Raider', damage: 0 };
            }
            g.raid.contributors[unit.ownerId].damage += dmg;
          }
          battle.projectiles.push({
            id: `prj_${crypto.randomBytes(3).toString('hex')}`,
            fromX: unit.x,
            fromY: 1.0,
            fromZ: unit.z,
            toX: battle.boss.x,
            toY: 1.8,
            toZ: battle.boss.z,
            color: TROOP_CATALOG[unit.type].color,
            createdAt: now,
          });
        } else if (targetBuilding) {
          targetBuilding.hp = Math.max(0, targetBuilding.hp - unit.atk);
          if (targetBuilding.hp <= 0) {
            targetBuilding.destroyed = true;
          }
          battle.projectiles.push({
            id: `prj_${crypto.randomBytes(3).toString('hex')}`,
            fromX: unit.x,
            fromY: 0.9,
            fromZ: unit.z,
            toX: targetBuilding.gx * 2,
            toY: 1.2,
            toZ: targetBuilding.gz * 2,
            color: TROOP_CATALOG[unit.type].color,
            createdAt: now,
          });
        }
      }
    }

    // Defensive buildings fire back
    for (const b of battle.buildings) {
      if (b.destroyed || b.dps <= 0) continue;
      if (now - b.lastFireAt < 1000) continue;

      let closestUnit: BattleUnitState | null = null;
      let bestDist = b.range;
      for (const u of battle.units) {
        if (u.hp <= 0) continue;
        const dist = Math.hypot(u.x - b.gx * 2, u.z - b.gz * 2);
        if (dist <= bestDist) {
          bestDist = dist;
          closestUnit = u;
        }
      }
      if (closestUnit) {
        b.lastFireAt = now;
        closestUnit.hp = Math.max(0, closestUnit.hp - b.dps);
        battle.projectiles.push({
          id: `prj_${crypto.randomBytes(3).toString('hex')}`,
          fromX: b.gx * 2,
          fromY: 2.2,
          fromZ: b.gz * 2,
          toX: closestUnit.x,
          toY: 0.8,
          toZ: closestUnit.z,
          color: b.type === 'arcane_cannon' ? '#EC4899' : '#F59E0B',
          createdAt: now,
        });
      }
    }

    // Raid Boss AoE slam
    if (battle.mode === 'raid' && battle.boss && battle.boss.hp > 0 && now % 1800 < 80) {
      for (const u of battle.units) {
        if (u.hp <= 0) continue;
        const d = Math.hypot(u.x - battle.boss.x, u.z - battle.boss.z);
        if (d < 4.5) {
          u.hp = Math.max(0, u.hp - 48);
        }
      }
    }

    battle.units = battle.units.filter((u) => u.hp > 0);

    // Update destruction % & stars
    if (battle.mode === 'raid' && battle.boss) {
      const dmgPct = Math.round(((battle.boss.maxHp - battle.boss.hp) / Math.max(1, battle.boss.maxHp)) * 100);
      battle.destructionPct = dmgPct;
      battle.stars = battle.boss.hp <= 0 ? 3 : dmgPct >= 50 ? 2 : dmgPct >= 20 ? 1 : 0;
    } else {
      const destroyedCount = battle.buildings.filter((b) => b.destroyed).length;
      const pct = Math.round((destroyedCount / Math.max(1, battle.buildings.length)) * 100);
      const keepDestroyed = battle.buildings.some((b) => b.type === 'citadel_keep' && b.destroyed);
      battle.destructionPct = pct;
      let stars = 0;
      if (pct >= 50) stars += 1;
      if (keepDestroyed) stars += 1;
      if (pct >= 100) stars = 3;
      battle.stars = Math.min(3, stars);
    }

    const totalRemainingTroops = Object.values(battle.availableTroops).reduce((a, b) => a + b, 0);
    const shouldEnd =
      now >= battle.endsAt ||
      (battle.mode === 'pvp' && battle.destructionPct >= 100) ||
      (battle.mode === 'raid' && battle.boss && battle.boss.hp <= 0) ||
      (totalRemainingTroops === 0 && battle.units.length === 0);

    if (shouldEnd) {
      finalizeBattle(battle);
    } else {
      broadcastToBattle(battle.id, 'battle:state', battle);
    }
  }
}, 66);

// Periodic auction expiry check
setInterval(settleExpiredAuctions, 5000);

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '256kb' }));

  function requireAuth(req: express.Request, res: express.Response): PlayerProfile | null {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const playerId = sessions.get(token);
    if (!playerId || !world.players[playerId]) {
      res.status(401).json({ error: 'Unauthorized session' });
      return null;
    }
    return world.players[playerId];
  }

  // Create or resume commander session (returns bearer token for React memory)
  app.post('/api/session', (req, res) => {
    const requestedName = typeof req.body?.name === 'string' ? req.body.name.trim().slice(0, 24) : '';
    const commanderName = requestedName || `Commander ${Math.floor(100 + Math.random() * 900)}`;
    const playerId = `plr_${crypto.randomBytes(6).toString('hex')}`;
    const token = crypto.randomBytes(24).toString('hex');

    const newPlayer: PlayerProfile = {
      id: playerId,
      name: commanderName,
      trophies: 950,
      gold: 1400,
      crystals: 650,
      shards: 25,
      seasonPoints: 35,
      seasonTierClaimed: 0,
      guildId: 'guild_solaris',
      raidDamageTotal: 0,
      battlesWon: 0,
      buildings: createStarterBuildings(),
      materials: { sunstone: 5, arcane_essence: 4, mithril_plate: 2, dragon_scale: 1 },
      inventory: createStarterInventory(playerId),
      challenges: createInitialChallenges(),
      stats: { battles_won: 0, buildings_upgraded: 0, gear_crafted: 0, raid_damage: 0, market_trades: 0 },
    };

    world.players[playerId] = newPlayer;
    const defaultGuild = world.guilds.guild_solaris;
    if (defaultGuild && !defaultGuild.memberIds.includes(playerId)) {
      defaultGuild.memberIds.push(playerId);
      defaultGuild.memberNames[playerId] = newPlayer.name;
      defaultGuild.memberTrophies[playerId] = newPlayer.trophies;
    }

    sessions.set(token, playerId);
    scheduleSaveWorld();
    broadcastLeaderboardAndEconomy();

    res.json({
      token,
      player: newPlayer,
      world: {
        leaderboard: buildLeaderboard(),
        market: Object.values(world.market),
        auctions: world.auctions.filter((a) => a.status === 'active'),
        trades: world.trades.filter((t) => t.status === 'open'),
        guilds: Object.values(world.guilds),
      },
    });
  });

  app.post('/api/player/rename', (req, res) => {
    const player = requireAuth(req, res);
    if (!player) return;
    const name = typeof req.body?.name === 'string' ? req.body.name.trim().slice(0, 24) : '';
    if (name.length < 2) {
      res.status(400).json({ error: 'Name must be at least 2 characters' });
      return;
    }
    player.name = name;
    if (player.guildId && world.guilds[player.guildId]) {
      world.guilds[player.guildId].memberNames[player.id] = name;
    }
    scheduleSaveWorld();
    broadcastLeaderboardAndEconomy();
    res.json({ player });
  });

  // Base-Building Routes
  app.post('/api/base/build', (req, res) => {
    const player = requireAuth(req, res);
    if (!player) return;
    const type = req.body?.type as BuildingType;
    const gx = Number(req.body?.gx);
    const gz = Number(req.body?.gz);
    const def = BUILDING_CATALOG[type];
    if (!def || !Number.isInteger(gx) || !Number.isInteger(gz) || gx < -6 || gx > 6 || gz < -6 || gz > 6) {
      res.status(400).json({ error: 'Invalid building or grid coordinate' });
      return;
    }
    const count = player.buildings.filter((b) => b.type === type).length;
    if (count >= def.maxCount) {
      res.status(400).json({ error: `Max ${def.maxCount} ${def.name}(s) allowed` });
      return;
    }
    if (player.buildings.some((b) => b.gx === gx && b.gz === gz)) {
      res.status(400).json({ error: 'Tile already occupied' });
      return;
    }
    if (player.gold < def.costGold || player.crystals < def.costCrystals) {
      res.status(400).json({ error: 'Insufficient Gold or Crystals' });
      return;
    }
    player.gold -= def.costGold;
    player.crystals -= def.costCrystals;
    player.buildings.push({
      id: `b_${crypto.randomBytes(4).toString('hex')}`,
      type,
      gx,
      gz,
      level: 1,
      lastCollectedAt: Date.now(),
    });
    incrementChallenge(player, 'buildings_upgraded', 1);
    scheduleSaveWorld();
    broadcastLeaderboardAndEconomy();
    res.json({ player });
  });

  app.post('/api/base/upgrade', (req, res) => {
    const player = requireAuth(req, res);
    if (!player) return;
    const buildingId = String(req.body?.buildingId || '');
    const bldg = player.buildings.find((b) => b.id === buildingId);
    if (!bldg) {
      res.status(404).json({ error: 'Building not found' });
      return;
    }
    if (bldg.level >= 5) {
      res.status(400).json({ error: 'Building already at max level 5' });
      return;
    }
    const def = BUILDING_CATALOG[bldg.type];
    const goldCost = Math.round((def.costGold || 250) * (bldg.level + 0.8));
    const crystalCost = Math.round((def.costCrystals || 90) * (bldg.level + 0.6));
    if (player.gold < goldCost || player.crystals < crystalCost) {
      res.status(400).json({ error: `Need ${goldCost} Gold and ${crystalCost} Crystals` });
      return;
    }
    player.gold -= goldCost;
    player.crystals -= crystalCost;
    bldg.level += 1;
    incrementChallenge(player, 'buildings_upgraded', 1);
    scheduleSaveWorld();
    broadcastLeaderboardAndEconomy();
    res.json({ player });
  });

  app.post('/api/base/move', (req, res) => {
    const player = requireAuth(req, res);
    if (!player) return;
    const buildingId = String(req.body?.buildingId || '');
    const gx = Number(req.body?.gx);
    const gz = Number(req.body?.gz);
    if (!Number.isInteger(gx) || !Number.isInteger(gz) || gx < -6 || gx > 6 || gz < -6 || gz > 6) {
      res.status(400).json({ error: 'Invalid coordinate' });
      return;
    }
    const bldg = player.buildings.find((b) => b.id === buildingId);
    if (!bldg) {
      res.status(404).json({ error: 'Building not found' });
      return;
    }
    if (player.buildings.some((b) => b.id !== buildingId && b.gx === gx && b.gz === gz)) {
      res.status(400).json({ error: 'Tile occupied' });
      return;
    }
    bldg.gx = gx;
    bldg.gz = gz;
    scheduleSaveWorld();
    res.json({ player });
  });

  app.post('/api/base/collect', (req, res) => {
    const player = requireAuth(req, res);
    if (!player) return;
    const now = Date.now();
    let collectedGold = 0;
    let collectedCrystals = 0;

    for (const b of player.buildings) {
      const def = BUILDING_CATALOG[b.type];
      if (!def.produces || !def.ratePerMin) continue;
      const elapsedMin = Math.max(0.15, Math.min(30, (now - b.lastCollectedAt) / 60000));
      const amount = Math.round(def.ratePerMin * (1 + (b.level - 1) * 0.35) * elapsedMin);
      b.lastCollectedAt = now;
      if (def.produces === 'gold') collectedGold += amount;
      if (def.produces === 'crystals') collectedCrystals += amount;
    }

    player.gold += collectedGold;
    player.crystals += collectedCrystals;
    scheduleSaveWorld();
    res.json({ player, collectedGold, collectedCrystals });
  });

  // Crafting & Gear Upgrades
  app.post('/api/craft/create', (req, res) => {
    const player = requireAuth(req, res);
    if (!player) return;
    const recipeId = String(req.body?.recipeId || '');
    const recipe = CRAFTING_RECIPES.find((r) => r.id === recipeId);
    if (!recipe) {
      res.status(404).json({ error: 'Recipe not found' });
      return;
    }
    if (player.gold < recipe.costGold) {
      res.status(400).json({ error: 'Insufficient Gold' });
      return;
    }
    for (const [mat, qty] of Object.entries(recipe.materials)) {
      if ((player.materials[mat as MaterialId] || 0) < (qty || 0)) {
        res.status(400).json({ error: `Not enough ${mat}` });
        return;
      }
    }
    player.gold -= recipe.costGold;
    for (const [mat, qty] of Object.entries(recipe.materials)) {
      player.materials[mat as MaterialId] -= qty || 0;
    }
    const item: GearItem = {
      id: `gear_${crypto.randomBytes(5).toString('hex')}`,
      name: recipe.name,
      slot: recipe.slot,
      rarity: recipe.rarity,
      level: 1,
      attackBonus: recipe.baseAttack,
      hpBonus: recipe.baseHp,
      lootBonusPct: recipe.lootBonusPct,
      equipped: false,
    };
    player.inventory.push(item);
    incrementChallenge(player, 'gear_crafted', 1);
    scheduleSaveWorld();
    broadcastLeaderboardAndEconomy();
    res.json({ player, item });
  });

  app.post('/api/craft/upgrade', (req, res) => {
    const player = requireAuth(req, res);
    if (!player) return;
    const itemId = String(req.body?.itemId || '');
    const item = player.inventory.find((i) => i.id === itemId);
    if (!item || item.listedInAuction) {
      res.status(400).json({ error: 'Item unavailable for upgrade' });
      return;
    }
    if (item.level >= 10) {
      res.status(400).json({ error: 'Gear already at max +10' });
      return;
    }
    const shardCost = item.level * 6;
    const goldCost = item.level * 120;
    if (player.shards < shardCost || player.gold < goldCost) {
      res.status(400).json({ error: `Need ${goldCost} Gold and ${shardCost} Shards` });
      return;
    }
    player.shards -= shardCost;
    player.gold -= goldCost;
    item.level += 1;
    item.attackBonus = Math.round(item.attackBonus * 1.18 + 3);
    item.hpBonus = Math.round(item.hpBonus * 1.16 + 10);
    item.lootBonusPct += 1;
    if (item.level >= 5 && item.rarity === 'Common') item.rarity = 'Rare';
    if (item.level >= 8 && item.rarity === 'Rare') item.rarity = 'Epic';
    incrementChallenge(player, 'gear_crafted', 1);
    scheduleSaveWorld();
    broadcastLeaderboardAndEconomy();
    res.json({ player });
  });

  app.post('/api/craft/equip', (req, res) => {
    const player = requireAuth(req, res);
    if (!player) return;
    const itemId = String(req.body?.itemId || '');
    const target = player.inventory.find((i) => i.id === itemId);
    if (!target || target.listedInAuction) {
      res.status(400).json({ error: 'Item cannot be equipped' });
      return;
    }
    for (const item of player.inventory) {
      if (item.slot === target.slot) {
        item.equipped = item.id === target.id;
      }
    }
    scheduleSaveWorld();
    broadcastLeaderboardAndEconomy();
    res.json({ player });
  });

  // Dynamic Market Exchange
  app.post('/api/market/trade', (req, res) => {
    const player = requireAuth(req, res);
    if (!player) return;
    const materialId = req.body?.materialId as MaterialId;
    const action = req.body?.action as 'buy' | 'sell';
    const qty = Math.max(1, Math.min(20, Math.floor(Number(req.body?.qty || 1))));
    const comm = world.market[materialId];
    if (!comm || (action !== 'buy' && action !== 'sell')) {
      res.status(400).json({ error: 'Invalid market order' });
      return;
    }
    const totalGold = comm.currentPrice * qty;
    if (action === 'buy') {
      if (player.gold < totalGold) {
        res.status(400).json({ error: 'Insufficient Gold' });
        return;
      }
      player.gold -= totalGold;
      player.materials[materialId] = (player.materials[materialId] || 0) + qty;
      comm.demand += qty * 3;
      comm.supply = Math.max(10, comm.supply - qty);
    } else {
      if ((player.materials[materialId] || 0) < qty) {
        res.status(400).json({ error: 'Insufficient materials to sell' });
        return;
      }
      player.materials[materialId] -= qty;
      player.gold += Math.round(totalGold * 0.92);
      comm.supply += qty * 3;
      comm.demand = Math.max(10, comm.demand - qty);
    }
    comm.previousPrice = comm.currentPrice;
    const ratio = comm.demand / Math.max(1, comm.supply);
    comm.currentPrice = Math.max(Math.round(comm.basePrice * 0.5), Math.min(Math.round(comm.basePrice * 2.4), Math.round(comm.basePrice * ratio)));
    comm.history = [...comm.history.slice(-11), comm.currentPrice];

    incrementChallenge(player, 'market_trades', 1);
    scheduleSaveWorld();
    broadcastLeaderboardAndEconomy();
    res.json({ player, market: Object.values(world.market) });
  });

  // P2P Direct Trade Offers
  app.post('/api/trade/create', (req, res) => {
    const player = requireAuth(req, res);
    if (!player) return;
    const offerMaterial = req.body?.offerMaterial as MaterialId;
    const requestMaterial = req.body?.requestMaterial as MaterialId;
    const offerQty = Math.max(1, Math.min(20, Math.floor(Number(req.body?.offerQty || 1))));
    const requestQty = Math.max(1, Math.min(20, Math.floor(Number(req.body?.requestQty || 1))));
    const bonusGoldOffer = Math.max(0, Math.min(2000, Math.floor(Number(req.body?.bonusGoldOffer || 0))));

    if (!world.market[offerMaterial] || !world.market[requestMaterial] || offerMaterial === requestMaterial) {
      res.status(400).json({ error: 'Choose two distinct valid materials' });
      return;
    }
    if ((player.materials[offerMaterial] || 0) < offerQty || player.gold < bonusGoldOffer) {
      res.status(400).json({ error: 'Insufficient materials or gold for escrow' });
      return;
    }
    player.materials[offerMaterial] -= offerQty;
    player.gold -= bonusGoldOffer;
    const trade: DirectTradeOffer = {
      id: `trd_${crypto.randomBytes(4).toString('hex')}`,
      creatorId: player.id,
      creatorName: player.name,
      offerMaterial,
      offerQty,
      requestMaterial,
      requestQty,
      bonusGoldOffer,
      status: 'open',
      createdAt: Date.now(),
    };
    world.trades.unshift(trade);
    scheduleSaveWorld();
    broadcastLeaderboardAndEconomy();
    res.json({ player, trade });
  });

  app.post('/api/trade/accept', (req, res) => {
    const player = requireAuth(req, res);
    if (!player) return;
    const tradeId = String(req.body?.tradeId || '');
    const trade = world.trades.find((t) => t.id === tradeId && t.status === 'open');
    if (!trade) {
      res.status(404).json({ error: 'Trade offer unavailable' });
      return;
    }
    if (trade.creatorId === player.id) {
      res.status(400).json({ error: 'Cannot accept your own trade offer' });
      return;
    }
    if ((player.materials[trade.requestMaterial] || 0) < trade.requestQty) {
      res.status(400).json({ error: 'Insufficient requested materials' });
      return;
    }
    player.materials[trade.requestMaterial] -= trade.requestQty;
    player.materials[trade.offerMaterial] = (player.materials[trade.offerMaterial] || 0) + trade.offerQty;
    player.gold += trade.bonusGoldOffer;
    trade.status = 'completed';

    const creator = world.players[trade.creatorId];
    if (creator) {
      creator.materials[trade.requestMaterial] = (creator.materials[trade.requestMaterial] || 0) + trade.requestQty;
      incrementChallenge(creator, 'market_trades', 1);
      sendToPlayer(creator.id, 'player:update', creator);
    }
    incrementChallenge(player, 'market_trades', 1);
    scheduleSaveWorld();
    broadcastLeaderboardAndEconomy();
    res.json({ player });
  });

  // Secure Peer-to-Peer Auction House
  app.post('/api/auction/list', (req, res) => {
    const player = requireAuth(req, res);
    if (!player) return;
    const itemId = String(req.body?.itemId || '');
    const startingBid = Math.max(50, Math.floor(Number(req.body?.startingBid || 200)));
    const buyoutPrice = Math.max(startingBid + 100, Math.floor(Number(req.body?.buyoutPrice || 600)));

    const item = player.inventory.find((i) => i.id === itemId && !i.equipped && !i.listedInAuction);
    if (!item) {
      res.status(400).json({ error: 'Unequip gear before listing in Auction House' });
      return;
    }
    item.listedInAuction = true;
    const listing: AuctionListing = {
      id: `auc_${crypto.randomBytes(5).toString('hex')}`,
      sellerId: player.id,
      sellerName: player.name,
      item: { ...item },
      startingBid,
      currentBid: startingBid,
      buyoutPrice,
      highestBidderId: null,
      highestBidderName: null,
      endsAt: Date.now() + 1000 * 60 * 20,
      status: 'active',
    };
    world.auctions.unshift(listing);
    scheduleSaveWorld();
    broadcastLeaderboardAndEconomy();
    res.json({ player, listing });
  });

  app.post('/api/auction/bid', (req, res) => {
    const player = requireAuth(req, res);
    if (!player) return;
    const listingId = String(req.body?.listingId || '');
    const amount = Math.floor(Number(req.body?.amount || 0));
    const buyout = Boolean(req.body?.buyout);

    const listing = world.auctions.find((a) => a.id === listingId && a.status === 'active');
    if (!listing) {
      res.status(404).json({ error: 'Auction listing ended or not found' });
      return;
    }
    if (listing.sellerId === player.id) {
      res.status(400).json({ error: 'Cannot bid on your own listing' });
      return;
    }

    const effectiveAmount = buyout ? listing.buyoutPrice : amount;
    const minBid = listing.highestBidderId ? listing.currentBid + 25 : listing.startingBid;
    if (!buyout && effectiveAmount < minBid) {
      res.status(400).json({ error: `Minimum bid is ${minBid} Gold` });
      return;
    }
    if (player.gold < effectiveAmount) {
      res.status(400).json({ error: 'Insufficient Gold for bid escrow' });
      return;
    }

    // Refund previous highest bidder immediately
    if (listing.highestBidderId && world.players[listing.highestBidderId]) {
      const prev = world.players[listing.highestBidderId];
      prev.gold += listing.currentBid;
      sendToPlayer(prev.id, 'player:update', prev);
    }

    player.gold -= effectiveAmount;
    listing.currentBid = effectiveAmount;
    listing.highestBidderId = player.id;
    listing.highestBidderName = player.name;

    if (buyout || effectiveAmount >= listing.buyoutPrice) {
      listing.status = 'sold';
      const wonItem: GearItem = { ...listing.item, listedInAuction: false, equipped: false };
      player.inventory.push(wonItem);

      const seller = world.players[listing.sellerId];
      if (seller) {
        seller.gold += effectiveAmount;
        const idx = seller.inventory.findIndex((i) => i.id === listing.item.id);
        if (idx !== -1) seller.inventory.splice(idx, 1);
        sendToPlayer(seller.id, 'player:update', seller);
      }
      incrementChallenge(player, 'market_trades', 1);
    }

    scheduleSaveWorld();
    broadcastLeaderboardAndEconomy();
    res.json({ player });
  });

  // Guilds
  app.post('/api/guild/create', (req, res) => {
    const player = requireAuth(req, res);
    if (!player) return;
    const name = typeof req.body?.name === 'string' ? req.body.name.trim().slice(0, 24) : '';
    const tag = typeof req.body?.tag === 'string' ? req.body.tag.trim().toUpperCase().slice(0, 4) : '';
    if (name.length < 3 || tag.length < 2) {
      res.status(400).json({ error: 'Guild name (3+ chars) and tag (2-4 chars) required' });
      return;
    }
    if (player.gold < 400) {
      res.status(400).json({ error: 'Requires 400 Gold to charter a Guild' });
      return;
    }
    player.gold -= 400;
    // Leave existing guild
    if (player.guildId && world.guilds[player.guildId]) {
      const prev = world.guilds[player.guildId];
      prev.memberIds = prev.memberIds.filter((id) => id !== player.id);
    }
    const guildId = `guild_${crypto.randomBytes(4).toString('hex')}`;
    const newGuild: Guild = {
      id: guildId,
      name,
      tag,
      emblemColor: '#10B981',
      description: `Chartered by ${player.name}. Ready for large-scale Citadel Raids.`,
      level: 1,
      treasuryGold: 400,
      memberIds: [player.id],
      memberNames: { [player.id]: player.name },
      memberTrophies: { [player.id]: player.trophies },
      chat: [
        {
          id: `msg_${crypto.randomBytes(4).toString('hex')}`,
          senderId: 'system',
          senderName: 'Guild Herald',
          text: `${name} [${tag}] has been founded by ${player.name}!`,
          timestamp: Date.now(),
        },
      ],
      raid: {
        bossName: 'Obsidian Magma Titan',
        bossLevel: 1,
        maxHp: 6500,
        currentHp: 6500,
        contributors: {},
        defeatedCount: 0,
      },
    };
    world.guilds[guildId] = newGuild;
    player.guildId = guildId;
    scheduleSaveWorld();
    broadcastLeaderboardAndEconomy();
    res.json({ player, guild: newGuild });
  });

  app.post('/api/guild/join', (req, res) => {
    const player = requireAuth(req, res);
    if (!player) return;
    const guildId = String(req.body?.guildId || '');
    const guild = world.guilds[guildId];
    if (!guild) {
      res.status(404).json({ error: 'Guild not found' });
      return;
    }
    if (player.guildId && world.guilds[player.guildId]) {
      const prev = world.guilds[player.guildId];
      prev.memberIds = prev.memberIds.filter((id) => id !== player.id);
    }
    if (!guild.memberIds.includes(player.id)) {
      guild.memberIds.push(player.id);
    }
    guild.memberNames[player.id] = player.name;
    guild.memberTrophies[player.id] = player.trophies;
    player.guildId = guildId;
    scheduleSaveWorld();
    broadcastLeaderboardAndEconomy();
    res.json({ player, guild });
  });

  // Daily Challenges & Seasonal Track
  app.post('/api/challenges/claim', (req, res) => {
    const player = requireAuth(req, res);
    if (!player) return;
    const challengeId = String(req.body?.challengeId || '');
    const ch = player.challenges.find((c) => c.id === challengeId);
    if (!ch || ch.claimed || ch.progress < ch.target) {
      res.status(400).json({ error: 'Challenge not ready to claim' });
      return;
    }
    ch.claimed = true;
    player.gold += ch.rewardGold;
    player.crystals += ch.rewardCrystals;
    player.shards += ch.rewardShards;
    player.seasonPoints += ch.rewardSeasonPoints;
    scheduleSaveWorld();
    res.json({ player });
  });

  app.post('/api/season/claim', (req, res) => {
    const player = requireAuth(req, res);
    if (!player) return;
    const tier = Number(req.body?.tier);
    const reward = SEASON_TRACK_REWARDS.find((r) => r.tier === tier);
    if (!reward || tier !== player.seasonTierClaimed + 1 || player.seasonPoints < reward.pointsRequired) {
      res.status(400).json({ error: 'Season tier locked or already claimed' });
      return;
    }
    player.seasonTierClaimed = tier;
    player.gold += reward.gold;
    player.crystals += reward.crystals;
    player.shards += reward.shards;
    scheduleSaveWorld();
    res.json({ player });
  });

  // Real-time Battle Start & Retreat
  app.post('/api/battle/start', (req, res) => {
    const player = requireAuth(req, res);
    if (!player) return;
    const mode = req.body?.mode === 'raid' ? 'raid' : 'pvp';
    const targetPlayerId = typeof req.body?.targetPlayerId === 'string' ? req.body.targetPlayerId : undefined;
    const battle = startBattleSession(player, mode, targetPlayerId);
    for (const c of clients.values()) {
      if (c.playerId === player.id) {
        c.battleId = battle.id;
      }
    }
    res.json({ battle });
  });

  app.post('/api/battle/end', (req, res) => {
    const player = requireAuth(req, res);
    if (!player) return;
    const battleId = String(req.body?.battleId || '');
    const battle = activeBattles.get(battleId);
    if (!battle || battle.attackerId !== player.id) {
      res.status(404).json({ error: 'Active battle not found' });
      return;
    }
    finalizeBattle(battle);
    res.json({ battle, player });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    const conn: ClientConn = { ws, playerId: null, voiceRoomId: null, battleId: null };
    clients.set(ws, conn);

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as { type: string; payload?: Record<string, unknown> };
        const p = msg.payload || {};

        if (msg.type === 'auth') {
          const token = String(p.token || '');
          const playerId = sessions.get(token);
          if (playerId && world.players[playerId]) {
            conn.playerId = playerId;
            sendToClient(ws, 'auth:ok', { playerId });
            broadcastLeaderboardAndEconomy();
          }
          return;
        }

        if (!conn.playerId || !world.players[conn.playerId]) return;
        const player = world.players[conn.playerId];

        if (msg.type === 'battle:deploy') {
          const battleId = String(p.battleId || '');
          const troopType = p.troopType as TroopType;
          const x = Number(p.x);
          const z = Number(p.z);
          const battle = activeBattles.get(battleId);
          if (!battle || battle.status !== 'active' || !TROOP_CATALOG[troopType]) return;
          if (battle.attackerId !== player.id) return;
          if ((battle.availableTroops[troopType] || 0) <= 0) return;

          const def = TROOP_CATALOG[troopType];
          const gear = getPlayerGearBonuses(player);
          battle.availableTroops[troopType] -= 1;

          const unit: BattleUnitState = {
            id: `u_${crypto.randomBytes(4).toString('hex')}`,
            ownerId: player.id,
            type: troopType,
            x: Math.max(-13, Math.min(13, x)),
            z: Math.max(-13, Math.min(13, z)),
            hp: def.hp + gear.hpBonus,
            maxHp: def.hp + gear.hpBonus,
            atk: def.atk + gear.attackBonus,
            speed: def.speed,
            range: def.range,
            targetId: null,
            lastAttackAt: 0,
          };
          battle.units.push(unit);
          broadcastToBattle(battle.id, 'battle:state', battle);
        } else if (msg.type === 'guild:chat') {
          const text = typeof p.text === 'string' ? p.text.trim().slice(0, 240) : '';
          if (!text || !player.guildId || !world.guilds[player.guildId]) return;
          const guild = world.guilds[player.guildId];
          const chatMsg = {
            id: `msg_${crypto.randomBytes(4).toString('hex')}`,
            senderId: player.id,
            senderName: player.name,
            text,
            timestamp: Date.now(),
          };
          guild.chat.push(chatMsg);
          if (guild.chat.length > 40) guild.chat = guild.chat.slice(-40);
          scheduleSaveWorld();
          broadcastToGuild(guild.id, 'guild:update', guild);
        } else if (msg.type === 'rtc:join') {
          const roomId = String(p.roomId || '');
          if (!roomId) return;
          conn.voiceRoomId = roomId;
          const peers: Array<{ peerId: string; name: string }> = [];
          for (const other of clients.values()) {
            if (other !== conn && other.voiceRoomId === roomId && other.playerId && world.players[other.playerId]) {
              peers.push({ peerId: other.playerId, name: world.players[other.playerId].name });
              sendToClient(other.ws, 'rtc:peer-joined', { peerId: player.id, name: player.name });
            }
          }
          sendToClient(ws, 'rtc:peers', { roomId, peers });
        } else if (msg.type === 'rtc:leave') {
          if (conn.voiceRoomId) {
            const roomId = conn.voiceRoomId;
            conn.voiceRoomId = null;
            for (const other of clients.values()) {
              if (other !== conn && other.voiceRoomId === roomId) {
                sendToClient(other.ws, 'rtc:peer-left', { peerId: player.id });
              }
            }
          }
        } else if (msg.type === 'rtc:signal') {
          const targetPeerId = String(p.targetPeerId || '');
          for (const other of clients.values()) {
            if (other.playerId === targetPeerId && other.voiceRoomId === conn.voiceRoomId) {
              sendToClient(other.ws, 'rtc:signal', {
                fromPeerId: player.id,
                signal: p.signal,
              });
            }
          }
        } else if (msg.type === 'rtc:speaking') {
          if (!conn.voiceRoomId) return;
          for (const other of clients.values()) {
            if (other !== conn && other.voiceRoomId === conn.voiceRoomId) {
              sendToClient(other.ws, 'rtc:speaking', {
                peerId: player.id,
                speaking: Boolean(p.speaking),
              });
            }
          }
        }
      } catch {
        // Ignore malformed socket frames
      }
    });

    ws.on('close', () => {
      if (conn.voiceRoomId && conn.playerId) {
        for (const other of clients.values()) {
          if (other !== conn && other.voiceRoomId === conn.voiceRoomId) {
            sendToClient(other.ws, 'rtc:peer-left', { peerId: conn.playerId });
          }
        }
      }
      clients.delete(ws);
      broadcastLeaderboardAndEconomy();
    });
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Citadel Clash 3D server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
