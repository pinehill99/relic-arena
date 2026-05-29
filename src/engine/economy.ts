import type { GameState, UnitInstance } from "../types";
import { baseRoundGold, interestGold, XP_THRESHOLDS, MAX_LEVEL } from "../data/balance";
import { UNIT_BY_ID } from "../data/units";
import { isBossRound } from "../data/rounds";

// Compute gold awarded for a completed round.
export function roundGold(round: number, currentGold: number, won: boolean): number {
  const base = baseRoundGold(round);
  const interest = interestGold(currentGold);
  const winBonus = won ? 1 : 0;
  const bossClearBonus = won && isBossRound(round) ? 4 : 0;
  return base + interest + winBonus + bossClearBonus;
}

// Unit sell value = 70% of total purchase cost (cost * copies invested), min 1.
export function sellValue(inst: UnitInstance): number {
  const def = UNIT_BY_ID[inst.defId];
  if (!def) return 1;
  // copies invested = 3^(star-1)
  const copies = Math.pow(3, inst.star - 1);
  const total = def.cost * copies;
  return Math.max(1, Math.floor(total * 0.7));
}

// Apply XP and handle level ups. Mutates state.
export function gainXP(state: GameState, amount: number): void {
  if (state.level >= MAX_LEVEL) return;
  state.xp += amount;
  while (state.level < MAX_LEVEL && state.xp >= XP_THRESHOLDS[state.level]) {
    state.xp -= XP_THRESHOLDS[state.level];
    state.level += 1;
  }
  if (state.level >= MAX_LEVEL) state.xp = 0;
}

export function xpToNext(state: GameState): number {
  return XP_THRESHOLDS[state.level];
}
