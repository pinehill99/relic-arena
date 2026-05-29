import { describe, expect, it } from "vitest";
import type { RoundMonster, UnitInstance } from "./types";
import { boardCount, createInitialState, moveToBench, placeOnBoard, sellUnit } from "./game";
import { Combat } from "./engine/combat";
import { computeTraitCounts } from "./engine/synergies";
import { isEngineerTurret } from "./engine/turrets";

function unit(iid: string, defId: number, row = 4, col = 0): UnitInstance {
  return {
    iid,
    defId,
    star: 1,
    items: [],
    loc: "board",
    row,
    col,
  };
}

function enemy(): RoundMonster {
  return {
    name: "Turret Target",
    baseName: "Turret Target",
    hp: 1200,
    attackDamage: 45,
    mana: 0,
    spellPower: 0,
    range: 1,
    role: "test",
    isBoss: false,
    isElite: false,
  };
}

describe("engineer turrets", () => {
  it("creates a locked board turret during prep when Engineer becomes active", () => {
    const state = createInitialState(123);
    state.level = 2;
    state.bench = [
      { iid: "eng-a", defId: 2, star: 1, items: [], loc: "bench" },
      { iid: "eng-b", defId: 23, star: 1, items: [], loc: "bench" },
    ];

    expect(placeOnBoard(state, "eng-a", 4, 0)).toBe(true);
    expect(placeOnBoard(state, "eng-b", 4, 1)).toBe(true);

    const turrets = state.board.filter(isEngineerTurret);
    expect(turrets).toHaveLength(1);
    expect(turrets[0].loc).toBe("board");
    expect(turrets[0].row).toBeGreaterThanOrEqual(4);
    expect(boardCount(state)).toBe(2);
    expect(computeTraitCounts(state.board).get("Engineer")).toBe(2);
    expect(sellUnit(state, turrets[0].iid)).toBe(false);
    expect(moveToBench(state, turrets[0].iid)).toBe(false);
    expect(placeOnBoard(state, turrets[0].iid, 7, 7)).toBe(true);
    expect(state.board.find((u) => u.iid === turrets[0].iid)?.row).toBe(7);
    expect(state.board.find((u) => u.iid === turrets[0].iid)?.col).toBe(7);

    const combat = new Combat(state.board, [enemy()], 789);
    const turretEntity = combat.entities.find((e) => e.id === `p_${turrets[0].iid}`);
    expect(turretEntity?.name).toBe("Sentry Turret");
    expect(turretEntity?.row).toBe(7);
    expect(turretEntity?.col).toBe(7);
  });

  it("does not create Engineer turrets at combat start from synergy alone", () => {
    const combat = new Combat(
      [
        unit("eng-a", 2, 4, 0),
        unit("eng-b", 23, 4, 1),
      ],
      [enemy()],
      456
    );

    const turrets = combat.entities.filter((e) => e.side === "player" && e.name.includes("Turret"));
    expect(turrets).toHaveLength(0);
  });
});
