// Game orchestration: state creation, actions, persistence.
import type { GameState, RoundMonster, UnitInstance } from "./types";
import { RNG } from "./engine/rng";
import { initPool, returnToPool } from "./engine/pool";
import { rollShop } from "./engine/shop";
import { tryUpgrade, newIid } from "./engine/upgrades";
import { gainXP, sellValue } from "./engine/economy";
import { boardUnitCount, isEngineerTurret, reconcileEngineerTurrets } from "./engine/turrets";
import { combineBasics, combineTier1, getItem, TIER1_BY_ID } from "./data/items";
import { UNIT_BY_ID } from "./data/units";
import { generateRound } from "./data/rounds";
import {
  STARTING_HP,
  STARTING_LEVEL,
  STARTING_GOLD,
  REROLL_COST,
  BUY_XP_COST,
  XP_PER_BUY,
  BENCH_SLOTS,
  MAX_ITEMS_PER_UNIT,
  MAX_LEVEL,
} from "./data/balance";

const STORAGE_KEY = "relic-arena-save-v1";

// ---- RNG bound to state ----
function withRng(state: GameState): RNG {
  const rng = new RNG(state.rngState);
  return rng;
}
function commitRng(state: GameState, rng: RNG): void {
  state.rngState = rng.getState();
}

export function monstersForRound(state: GameState, round: number): RoundMonster[] {
  return generateRound(round, new RNG(state.seed + round * 7919));
}

export function createInitialState(seed = Math.floor(Math.random() * 1e9)): GameState {
  const state: GameState = {
    seed,
    rngState: seed ^ 0x5deece66,
    round: 1,
    hp: STARTING_HP,
    gold: STARTING_GOLD,
    level: STARTING_LEVEL,
    xp: 0,
    shop: [],
    bench: [],
    board: [],
    inventory: [],
    pool: initPool(),
    phase: "prep",
    lastResult: null,
    log: ["Run started. Survive 100 rounds."],
    cleared: false,
    basicDropCounts: {},
  };
  const rng = withRng(state);
  state.shop = rollShop(state.level, state.pool, rng);
  commitRng(state, rng);
  return state;
}

export function clone(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state));
}

export function logMsg(state: GameState, msg: string): void {
  state.log.unshift(msg);
  if (state.log.length > 60) state.log.pop();
}

// ---- Board/bench helpers ----
export function boardCount(state: GameState): number {
  return boardUnitCount(state.board);
}

export function benchFull(state: GameState): boolean {
  return state.bench.length >= BENCH_SLOTS;
}

function findUnit(state: GameState, iid: string): UnitInstance | undefined {
  return state.board.find((u) => u.iid === iid) ?? state.bench.find((u) => u.iid === iid);
}

function cellOccupied(state: GameState, row: number, col: number): UnitInstance | undefined {
  return state.board.find((u) => u.row === row && u.col === col);
}

// ---- Actions (mutate state) ----
export function reroll(state: GameState): boolean {
  if (state.gold < REROLL_COST) return false;
  state.gold -= REROLL_COST;
  const rng = withRng(state);
  state.shop = rollShop(state.level, state.pool, rng);
  commitRng(state, rng);
  return true;
}

export function buyUnit(state: GameState, slot: number): boolean {
  const defId = state.shop[slot];
  if (defId == null) return false;
  const def = UNIT_BY_ID[defId];
  if (state.gold < def.cost) return false;
  if (benchFull(state)) {
    // allow if it would immediately upgrade (handled after add); for simplicity require bench space
    return false;
  }
  if ((state.pool[defId] ?? 0) <= 0) return false;

  state.gold -= def.cost;
  state.pool[defId] -= 1;
  state.shop[slot] = null;
  const inst: UnitInstance = {
    iid: newIid(),
    defId,
    star: 1,
    items: [],
    loc: "bench",
  };
  state.bench.push(inst);
  logMsg(state, `Bought ${def.name}.`);
  tryUpgrade(state, defId);
  reconcileEngineerTurrets(state);
  return true;
}

export function sellUnit(state: GameState, iid: string): boolean {
  const inst = findUnit(state, iid);
  if (!inst) return false;
  if (isEngineerTurret(inst)) return false;
  const value = sellValue(inst);
  state.gold += value;
  // return items to inventory
  state.inventory.push(...inst.items);
  // return pool copies
  const copies = Math.pow(3, inst.star - 1);
  returnToPool(state.pool, inst.defId, copies);
  state.board = state.board.filter((u) => u.iid !== iid);
  state.bench = state.bench.filter((u) => u.iid !== iid);
  reconcileEngineerTurrets(state);
  logMsg(state, `Sold ${UNIT_BY_ID[inst.defId].name} for ${value}g.`);
  return true;
}

export function buyXP(state: GameState): boolean {
  if (state.level >= MAX_LEVEL) return false;
  if (state.gold < BUY_XP_COST) return false;
  state.gold -= BUY_XP_COST;
  gainXP(state, XP_PER_BUY);
  return true;
}

// Move a unit to a board cell (row 4-7) or to bench.
export function placeOnBoard(state: GameState, iid: string, row: number, col: number): boolean {
  if (row < 4 || row > 7 || col < 0 || col > 7) return false;
  const inst = findUnit(state, iid);
  if (!inst) return false;

  const occupant = cellOccupied(state, row, col);
  const movingFromBench = inst.loc === "bench";

  if (occupant && occupant.iid !== iid) {
    // swap
    if (movingFromBench) {
      if (isEngineerTurret(occupant)) return false;
      // bench<->board swap: occupant goes to bench, inst to board
      if (state.bench.length >= BENCH_SLOTS) return false;
      occupant.loc = "bench";
      occupant.row = undefined;
      occupant.col = undefined;
      state.board = state.board.filter((u) => u.iid !== occupant.iid);
      state.bench.push(occupant);
      state.bench = state.bench.filter((u) => u.iid !== iid);
      inst.loc = "board";
      inst.row = row;
      inst.col = col;
      state.board.push(inst);
    } else {
      // board<->board swap positions
      const tmpR = inst.row;
      const tmpC = inst.col;
      occupant.row = tmpR;
      occupant.col = tmpC;
      inst.row = row;
      inst.col = col;
    }
    reconcileEngineerTurrets(state);
    return true;
  }

  // empty target
  if (movingFromBench) {
    if (!isEngineerTurret(inst) && boardCount(state) >= state.level) return false; // board cap = level
    state.bench = state.bench.filter((u) => u.iid !== iid);
    inst.loc = "board";
    inst.row = row;
    inst.col = col;
    state.board.push(inst);
  } else {
    inst.row = row;
    inst.col = col;
  }
  reconcileEngineerTurrets(state);
  return true;
}

export function moveToBench(state: GameState, iid: string): boolean {
  const inst = state.board.find((u) => u.iid === iid);
  if (!inst) return false;
  if (isEngineerTurret(inst)) return false;
  if (state.bench.length >= BENCH_SLOTS) return false;
  state.board = state.board.filter((u) => u.iid !== iid);
  inst.loc = "bench";
  inst.row = undefined;
  inst.col = undefined;
  state.bench.push(inst);
  reconcileEngineerTurrets(state);
  return true;
}

// Equip an item from inventory onto a unit.
export function equipItem(state: GameState, iid: string, itemId: string): boolean {
  const inst = findUnit(state, iid);
  if (!inst) return false;
  if (isEngineerTurret(inst)) return false;
  if (!state.inventory.includes(itemId)) return false;
  if (inst.items.length >= MAX_ITEMS_PER_UNIT) return false;

  const incoming = getItem(itemId);
  if (!incoming) return false;

  // Auto-combine: if incoming is basic and unit holds a basic that forms a tier-1, combine.
  if (incoming.tier === "basic") {
    const basicOnUnit = inst.items.find((id) => {
      const it = getItem(id);
      return it?.tier === "basic" && combineBasics(id, itemId);
    });
    if (basicOnUnit) {
      const combined = combineBasics(basicOnUnit, itemId)!;
      inst.items = inst.items.filter((id) => id !== basicOnUnit);
      inst.items.push(combined.id);
      state.inventory = removeOne(state.inventory, itemId);
      logMsg(state, `Built ${combined.name}.`);
      return true;
    }
  }
  // Auto-combine tier1 + tier1 -> tier2 (directional: unit's existing tier1 is base)
  if (incoming.tier === 1) {
    const t1OnUnit = inst.items.find((id) => {
      const it = getItem(id);
      return it?.tier === 1 && combineTier1(id, itemId);
    });
    if (t1OnUnit) {
      const combined = combineTier1(t1OnUnit, itemId)!;
      inst.items = inst.items.filter((id) => id !== t1OnUnit);
      inst.items.push(combined.id);
      state.inventory = removeOne(state.inventory, itemId);
      logMsg(state, `Forged ${combined.name}.`);
      return true;
    }
  }

  // plain equip
  inst.items.push(itemId);
  state.inventory = removeOne(state.inventory, itemId);
  return true;
}

export function unequipItem(state: GameState, iid: string, itemId: string): boolean {
  const inst = findUnit(state, iid);
  if (!inst) return false;
  if (isEngineerTurret(inst)) return false;
  const idx = inst.items.indexOf(itemId);
  if (idx < 0) return false;
  inst.items.splice(idx, 1);
  state.inventory.push(itemId);
  return true;
}

// Combine two inventory items (basics->tier1, tier1->tier2 directional baseId+catalystId).
export function combineInventory(state: GameState, idA: string, idB: string): string | null {
  if (!state.inventory.includes(idA) || !state.inventory.includes(idB)) return null;
  const a = getItem(idA);
  const b = getItem(idB);
  if (!a || !b) return null;
  let result = null as ReturnType<typeof getItem> | null;
  if (a.tier === "basic" && b.tier === "basic") {
    result = combineBasics(idA, idB) ?? null;
  } else if (a.tier === 1 && b.tier === 1) {
    result = combineTier1(idA, idB) ?? combineTier1(idB, idA) ?? null;
  }
  if (!result) return null;
  state.inventory = removeOne(removeOne(state.inventory, idA), idB);
  state.inventory.push(result.id);
  logMsg(state, `Combined into ${result.name}.`);
  return result.id;
}

function removeOne(arr: string[], val: string): string[] {
  const idx = arr.indexOf(val);
  if (idx < 0) return arr.slice();
  const copy = arr.slice();
  copy.splice(idx, 1);
  return copy;
}

// ---- Round resolution (post-combat) ----
import { roundGold } from "./engine/economy";
import { rollDrops } from "./engine/monsters";
import { isBossRound } from "./data/rounds";
import { XP_PER_ROUND } from "./data/balance";

export function applyRoundResult(state: GameState, won: boolean, survivingEnemies: number): void {
  const round = state.round;
  state.lastResult = won ? "win" : "loss";

  if (!won) {
    const dmg = isBossRound(round) ? 10 : survivingEnemies;
    state.hp -= dmg;
    logMsg(state, `Lost round ${round}: -${dmg} HP.`);
  } else {
    logMsg(state, `Won round ${round}!`);
  }

  // gold
  const g = roundGold(round, state.gold, won);
  state.gold += g;

  // xp
  gainXP(state, XP_PER_ROUND);

  // drops — each killed monster rolls individually
  const rng = withRng(state);
  const roundMonsters = monstersForRound(state, round);
  const killedCount = won
    ? roundMonsters.length
    : Math.max(0, roundMonsters.length - survivingEnemies);
  const drops = rollDrops(state, round, roundMonsters, killedCount, rng);
  commitRng(state, rng);
  if (drops.length) {
    state.inventory.push(...drops);
    const names = drops.map((id) => getItem(id)?.name ?? id).join(", ");
    logMsg(state, `Dropped: ${names}.`);
  }

  // game over / clear checks
  if (state.hp <= 0) {
    state.phase = "gameover";
    state.cleared = false;
    return;
  }
  if (won && round >= 100) {
    state.phase = "gameover";
    state.cleared = true;
    return;
  }

  // advance round
  state.round = round + 1;
  state.phase = "prep";
  // refresh shop for new prep
  const rng2 = withRng(state);
  state.shop = rollShop(state.level, state.pool, rng2);
  commitRng(state, rng2);
  reconcileEngineerTurrets(state);
}

// ---- Persistence ----
export function saveState(state: GameState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export function loadState(): GameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameState;
    if (!parsed || typeof parsed.round !== "number") return null;
    if (parsed.phase === "prep") reconcileEngineerTurrets(parsed);
    return parsed;
  } catch {
    return null;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export { TIER1_BY_ID };
