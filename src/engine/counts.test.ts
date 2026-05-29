import { describe, it, expect } from "vitest";
import { UNITS } from "../data/units";
import { ORIGINS, CLASSES } from "../data/traits";
import { BASIC_ITEMS, TIER1_ITEMS, TIER2_ITEMS, combineBasics, combineTier1 } from "../data/items";
import { SHOP_ODDS } from "../data/balance";
import { generateAllRounds, generateRound } from "../data/rounds";
import { simulateCombat } from "./combat";
import { RNG } from "./rng";
import { newIid } from "./upgrades";

describe("non-negotiable counts", () => {
  it("has 60 units with unique ids", () => {
    expect(UNITS.length).toBe(60);
    expect(new Set(UNITS.map((u) => u.id)).size).toBe(60);
  });
  it("has 10 origins and 10 classes", () => {
    expect(ORIGINS.length).toBe(10);
    expect(CLASSES.length).toBe(10);
  });
  it("has 8 basic, 20 tier-1, 100 tier-2 items", () => {
    expect(BASIC_ITEMS.length).toBe(8);
    expect(TIER1_ITEMS.length).toBe(20);
    expect(TIER2_ITEMS.length).toBe(100);
    expect(new Set(TIER2_ITEMS.map((i) => i.id)).size).toBe(100);
    expect(TIER2_ITEMS.every((i) => i.tier === 2)).toBe(true);
  });
  it("has 100 rounds and valid shop odds", () => {
    expect(generateAllRounds().length).toBe(100);
    expect(Object.values(SHOP_ODDS).every((r) => r.reduce((a, b) => a + b, 0) === 100)).toBe(true);
  });
  it("has dual-class units and valid stats", () => {
    expect(UNITS.some((u) => u.classes.length === 2)).toBe(true);
    expect(UNITS.every((u) => u.cost >= 1 && u.cost <= 5)).toBe(true);
    expect(UNITS.every((u) => u.hp > 0 && u.attackDamage > 0 && u.mana >= 0)).toBe(true);
  });
});

describe("item recipes", () => {
  it("combines two basics into a tier-1", () => {
    expect(combineBasics("B1", "B1")?.id).toBe("T1-01");
    expect(combineBasics("B1", "B7")?.id).toBe("T1-09");
  });
  it("combines tier-1 + allowed catalyst into a tier-2", () => {
    // base T1-01 (index 0) allows catalysts at +1,+3,+7,+11,+15 => T1-02,04,08,12,16
    expect(combineTier1("T1-01", "T1-02")?.id).toBe("T2-T1-01-T1-02");
    expect(combineTier1("T1-01", "T1-03")).toBeNull(); // not an allowed catalyst
  });
});

describe("combat smoke", () => {
  it("runs 100 rounds without throwing", () => {
    const board = UNITS.filter((u) => u.cost >= 3)
      .slice(0, 8)
      .map((u, i) => ({
        iid: newIid(),
        defId: u.id,
        star: 2 as const,
        items: [],
        loc: "board" as const,
        row: 6 + (i % 2),
        col: i % 8,
      }));
    for (let r = 1; r <= 100; r++) {
      const monsters = generateRound(r, new RNG(7 + r));
      const res = simulateCombat(board, monsters, 999 + r);
      expect(["player", "enemy"]).toContain(res.winner);
    }
  });
});
