import type { BoardSummonTier, GameState, UnitInstance } from "../types";
import { activeTierIndex, computeTraitCounts } from "./synergies";
import { newIid } from "./upgrades";

export const ENGINEER_TURRET_DEF_ID = -100;

export interface EngineerTurretTierDef {
  name: string;
  count: number;
  hp: number;
  adMultiplier: number;
  range: number;
  asBonusPct: number;
  frame: string;
  armor: string;
  accent: string;
}

export const ENGINEER_TURRET_TIERS: EngineerTurretTierDef[] = [
  {
    name: "Sentry Turret",
    count: 1,
    hp: 600,
    adMultiplier: 0.2,
    range: 3,
    asBonusPct: 20,
    frame: "#38bdf8",
    armor: "#475569",
    accent: "#67e8f9",
  },
  {
    name: "Repeater Turret",
    count: 2,
    hp: 600,
    adMultiplier: 0.3,
    range: 3,
    asBonusPct: 20,
    frame: "#a78bfa",
    armor: "#4c1d95",
    accent: "#f0abfc",
  },
  {
    name: "Rail Turret",
    count: 3,
    hp: 600,
    adMultiplier: 0.45,
    range: 3,
    asBonusPct: 20,
    frame: "#f59e0b",
    armor: "#78350f",
    accent: "#fde68a",
  },
];

export function isEngineerTurret(inst: UnitInstance): boolean {
  return inst.summon?.kind === "engineer-turret";
}

export function boardUnitCount(board: UnitInstance[]): number {
  return board.filter((u) => !isEngineerTurret(u)).length;
}

export function fieldedUnits(board: UnitInstance[]): UnitInstance[] {
  return board.filter((u) => !isEngineerTurret(u));
}

export function engineerTurretTier(board: UnitInstance[]): BoardSummonTier | -1 {
  const engineerCount = computeTraitCounts(fieldedUnits(board)).get("Engineer") ?? 0;
  return activeTierIndex([2, 4, 6], engineerCount) as BoardSummonTier | -1;
}

export function engineerTurretStats(tier: BoardSummonTier): EngineerTurretTierDef {
  return ENGINEER_TURRET_TIERS[tier];
}

export function reconcileEngineerTurrets(state: GameState): void {
  state.board = state.board.filter((u) => u.loc === "board");

  const tier = engineerTurretTier(state.board);
  const desired = tier >= 0 ? ENGINEER_TURRET_TIERS[tier].count : 0;
  const turrets = state.board.filter(isEngineerTurret);
  const extras = new Set(turrets.slice(desired).map((u) => u.iid));
  if (extras.size) state.board = state.board.filter((u) => !extras.has(u.iid));

  for (const turret of state.board.filter(isEngineerTurret)) {
    turret.defId = ENGINEER_TURRET_DEF_ID;
    turret.star = 1;
    turret.items = [];
    turret.loc = "board";
    turret.summon = { kind: "engineer-turret", tier: Math.max(0, tier) as BoardSummonTier };
  }

  let current = state.board.filter(isEngineerTurret).length;
  while (current < desired) {
    const pos = firstOpenPlayerCell(state.board);
    if (!pos) break;
    state.board.push({
      iid: `turret_${newIid()}`,
      defId: ENGINEER_TURRET_DEF_ID,
      star: 1,
      items: [],
      summon: { kind: "engineer-turret", tier: tier as BoardSummonTier },
      loc: "board",
      row: pos.row,
      col: pos.col,
    });
    current++;
  }
}

function firstOpenPlayerCell(board: UnitInstance[]): { row: number; col: number } | null {
  const occupied = new Set(
    board
      .filter((u) => u.loc === "board" && u.row !== undefined && u.col !== undefined)
      .map((u) => `${u.row},${u.col}`)
  );
  for (let r = 7; r >= 4; r--) {
    for (let c = 0; c < 8; c++) {
      if (!occupied.has(`${r},${c}`)) return { row: r, col: c };
    }
  }
  return null;
}
