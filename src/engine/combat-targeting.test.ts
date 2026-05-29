import { describe, expect, it } from "vitest";
import type { RoundMonster, UnitInstance } from "../types";
import { Combat } from "./combat";

function unit(iid: string, defId: number, row: number, col: number): UnitInstance {
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

function rangedEnemy(): RoundMonster {
  return {
    name: "Targeting Tester",
    baseName: "Targeting Tester",
    hp: 5000,
    attackDamage: 120,
    mana: 0,
    spellPower: 0,
    range: 4,
    role: "ranged test",
    isBoss: false,
    isElite: false,
  };
}

describe("combat targeting", () => {
  it("does not target assassins during the first combat tick", () => {
    const combat = new Combat(
      [
        unit("assassin", 12, 7, 1),
        unit("frontline", 1, 4, 0),
      ],
      [rangedEnemy()],
      11
    );
    const assassin = combat.entities.find((e) => e.id === "p_assassin")!;
    const frontline = combat.entities.find((e) => e.id === "p_frontline")!;

    combat.tick();

    expect(assassin.hp).toBe(assassin.maxHP);
    expect(frontline.hp).toBeLessThan(frontline.maxHP);
  });

  it("keeps an acquired target while it is alive and targetable", () => {
    const combat = new Combat(
      [
        unit("locked", 1, 4, 0),
        unit("closer", 3, 7, 7),
      ],
      [rangedEnemy()],
      17
    );
    const enemy = combat.entities.find((e) => e.side === "enemy")!;
    const closer = combat.entities.find((e) => e.id === "p_closer")!;

    combat.tick();
    expect(enemy.targetId).toBe("p_locked");

    closer.row = 0;
    closer.col = 1;
    combat.tick();

    expect(enemy.targetId).toBe("p_locked");
  });
});
