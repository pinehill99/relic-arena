import type { GameState, RoundMonster } from "../types";
import { RNG } from "./rng";
import { BASIC_ITEMS } from "../data/items";

const BOSS_DROP_ROLLS: Record<number, number> = {
  10: 2, 20: 3, 30: 3, 40: 4, 50: 4, 60: 5, 70: 5, 80: 6, 90: 6, 100: 8,
};

// Each killed monster rolls once at its role rate (bosses roll multiple times).
const ROLE_DROP_CHANCE: Record<string, number> = {
  "weak melee": 0.22,
  "melee striker": 0.24,
  "ranged poke": 0.22,
  tank: 0.26,
  caster: 0.24,
  assassin: 0.25,
  "heavy tank": 0.28,
  bruiser: 0.27,
  "ranged magic": 0.24,
  "elite melee": 0.34,
  "elite tank": 0.36,
  "elite caster": 0.35,
  boss: 1.0,
};

export function monsterDropChance(monster: RoundMonster, round: number): number {
  if (monster.isBoss) return 1;
  const base = ROLE_DROP_CHANCE[monster.role] ?? 0.24;
  const scale = 1 + Math.min(0.35, (round - 1) * 0.006);
  return Math.min(0.95, base * scale);
}

export function bossDropRollCount(round: number): number {
  return BOSS_DROP_ROLLS[round] ?? 2;
}

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

/** Roll item drops from monsters killed this round. Mutates state.basicDropCounts. */
export function rollDrops(
  state: GameState,
  round: number,
  monsters: RoundMonster[],
  killedCount: number,
  rng: RNG
): string[] {
  const drops: string[] = [];
  const killed = monsters.slice(0, Math.max(0, Math.min(killedCount, monsters.length)));

  for (const monster of killed) {
    const rolls = monster.isBoss ? bossDropRollCount(round) : 1;
    const chance = monsterDropChance(monster, round);
    for (let i = 0; i < rolls; i++) {
      if (rng.chance(chance)) drops.push(pickBasic(state, round, rng));
    }
  }

  for (const id of drops) {
    state.basicDropCounts[id] = (state.basicDropCounts[id] ?? 0) + 1;
  }
  return drops;
}
