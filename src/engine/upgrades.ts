import type { UnitInstance, GameState } from "../types";
import { returnToPool } from "./pool";

let iidCounter = 1;
export function newIid(): string {
  return `u${iidCounter++}_${Math.floor(Math.random() * 1e6).toString(36)}`;
}

// Check for and perform 3-into-1 star upgrades across bench+board for a given defId.
// Mutates state's bench/board/pool. Returns true if any upgrade happened.
export function tryUpgrade(state: GameState, defId: number): boolean {
  let upgraded = false;
  for (let star = 1 as 1 | 2; star <= 2; star++) {
    // gather all instances of this def at this star
    let matches = [...state.bench, ...state.board].filter(
      (u) => u.defId === defId && u.star === star
    );
    while (matches.length >= 3) {
      // Pick three to combine; prefer keeping the one with most items / on board.
      matches.sort((a, b) => {
        const score = (x: UnitInstance) =>
          (x.loc === "board" ? 100 : 0) + x.items.length;
        return score(b) - score(a);
      });
      const keep = matches[0];
      const consumed = [matches[1], matches[2]];

      // Collect items from consumed back to inventory.
      const freedItems: string[] = [];
      for (const c of consumed) {
        freedItems.push(...c.items);
      }
      // Return pool copies for consumed (each instance = 3^(star-1) base copies).
      const baseCopies = Math.pow(3, star - 1);
      // Remove consumed from bench/board
      const consumedIids = new Set(consumed.map((c) => c.iid));
      state.bench = state.bench.filter((u) => !consumedIids.has(u.iid));
      state.board = state.board.filter((u) => !consumedIids.has(u.iid));

      // Upgrade keep's star
      keep.star = (star + 1) as 1 | 2 | 3;
      // Items beyond 3 go to inventory; keep already has its own items.
      for (const it of freedItems) {
        if (keep.items.length < 3) keep.items.push(it);
        else state.inventory.push(it);
      }
      upgraded = true;

      // Note: pool copies are NOT returned on upgrade (units are consumed into the upgrade,
      // matching standard auto-battler behavior where the copies stay "out of pool").
      void baseCopies;
      void returnToPool;

      matches = [...state.bench, ...state.board].filter(
        (u) => u.defId === defId && u.star === star
      );
    }
  }
  // After a star-1 -> star-2 upgrade, a new star-2 may complete a star-3; re-run for star 2.
  if (upgraded) {
    const star2 = [...state.bench, ...state.board].filter(
      (u) => u.defId === defId && u.star === 2
    );
    if (star2.length >= 3) tryUpgrade(state, defId);
  }
  return upgraded;
}
