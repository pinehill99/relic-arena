import type { GameState } from "../types";
import { RNG } from "./rng";
import { isBossRound } from "../data/rounds";
import { BASIC_ITEMS } from "../data/items";

// Normal-round basic item drop schedule.
function normalDropChances(round: number): { first: number; second: number } {
  if (round <= 9) return { first: 0.18, second: 0 };
  if (round <= 29) return { first: 0.35, second: 0 };
  if (round <= 59) return { first: 0.55, second: 0.1 };
  if (round <= 89) return { first: 0.7, second: 0.2 };
  return { first: 1.0, second: 0.25 }; // 91-99 (and any normal at 100+, n/a)
}

const BOSS_DROPS: Record<number, number> = {
  10: 2, 20: 3, 30: 3, 40: 4, 50: 4, 60: 5, 70: 5, 80: 6, 90: 6, 100: 8,
};

// Pick a basic item id, pity-balanced: under round 30, favor types the player has <2 of.
function pickBasic(state: GameState, round: number, rng: RNG): string {
  const ids = BASIC_ITEMS.map((b) => b.id);
  let weights: number[];
  if (round <= 30) {
    weights = ids.map((id) => ((state.basicDropCounts[id] ?? 0) < 2 ? 3 : 1));
  } else {
    weights = ids.map(() => 1);
  }
  return rng.weighted(ids, weights);
}

// Roll item drops for a round. Mutates state.basicDropCounts. Returns dropped item ids.
export function rollDrops(state: GameState, round: number, won: boolean, rng: RNG): string[] {
  if (!won) return [];
  const drops: string[] = [];
  if (isBossRound(round)) {
    const n = BOSS_DROPS[round] ?? 2;
    for (let i = 0; i < n; i++) drops.push(pickBasic(state, round, rng));
  } else {
    const { first, second } = normalDropChances(round);
    if (rng.chance(first)) drops.push(pickBasic(state, round, rng));
    if (second > 0 && rng.chance(second)) drops.push(pickBasic(state, round, rng));
  }
  for (const id of drops) {
    state.basicDropCounts[id] = (state.basicDropCounts[id] ?? 0) + 1;
  }
  return drops;
}
