// Numeric balance constants, all sourced from AUTO_BATTLER_DESIGN_SPEC.md.

export const STARTING_HP = 100;
export const STARTING_LEVEL = 3;
export const STARTING_GOLD = 8;
export const SHOP_SLOTS = 5;
export const BENCH_SLOTS = 9;
export const REROLL_COST = 2;
export const BUY_XP_COST = 4;
export const XP_PER_BUY = 4;
export const XP_PER_ROUND = 2;
export const MAX_LEVEL = 10;
export const MAX_ITEMS_PER_UNIT = 3;
export const TOTAL_ROUNDS = 100;
export const BOARD_SIZE = 8;

// XP required to move from current level -> next.
export const XP_THRESHOLDS: Record<number, number> = {
  1: 2,
  2: 4,
  3: 6,
  4: 10,
  5: 20,
  6: 36,
  7: 56,
  8: 80,
  9: 100,
  10: Infinity,
};

// Shop odds per level: [cost1, cost2, cost3, cost4, cost5], each row sums to 100.
export const SHOP_ODDS: Record<number, number[]> = {
  1: [100, 0, 0, 0, 0],
  2: [100, 0, 0, 0, 0],
  3: [75, 25, 0, 0, 0],
  4: [55, 30, 15, 0, 0],
  5: [40, 35, 20, 5, 0],
  6: [30, 35, 25, 10, 0],
  7: [20, 30, 33, 15, 2],
  8: [15, 20, 35, 25, 5],
  9: [10, 15, 30, 35, 10],
  10: [5, 10, 20, 40, 25],
};

// Pool copies and unique counts by cost.
export const POOL_BY_COST: Record<number, { copies: number; unique: number }> = {
  1: { copies: 29, unique: 14 },
  2: { copies: 22, unique: 13 },
  3: { copies: 18, unique: 12 },
  4: { copies: 12, unique: 11 },
  5: { copies: 10, unique: 10 },
};

// Cost colors.
export const COST_COLORS: Record<number, string> = {
  1: "#64748B",
  2: "#22C55E",
  3: "#3B82F6",
  4: "#A855F7",
  5: "#F59E0B",
};

export const COST_NAMES: Record<number, string> = {
  1: "Common",
  2: "Uncommon",
  3: "Rare",
  4: "Epic",
  5: "Legendary",
};

// Item tier background colors.
export const ITEM_TIER_COLORS = {
  basic: "#334155",
  1: "#0F766E",
  2: "#B45309",
} as const;

// Star scaling multipliers.
export const STAR_SCALING: Record<number, number> = { 1: 1.0, 2: 1.75, 3: 2.8 };

// Combat tick (ms) and hard timeout (s).
export const COMBAT_TICK_MS = 100;
export const COMBAT_TIMEOUT_S = 45;

// Economy helpers.
export function baseRoundGold(round: number): number {
  if (round <= 10) return 4;
  if (round <= 30) return 5;
  if (round <= 60) return 6;
  return 7;
}

export function interestGold(currentGold: number): number {
  return Math.min(5, Math.floor(currentGold / 10));
}
