import { describe, expect, it, vi } from "vitest";
import type { RoundMonster } from "../types";
import { createInitialState } from "../game";
import { RNG } from "./rng";
import { bossDropRollCount, monsterDropChance, rollDrops } from "./monsters";

function grub(round = 1): RoundMonster {
  return {
    name: "Grub",
    baseName: "Grub",
    hp: 360,
    attackDamage: 32,
    mana: 0,
    spellPower: 0,
    range: 1,
    role: "weak melee",
    isBoss: false,
    isElite: false,
  };
}

describe("monster drops", () => {
  it("rolls once per killed monster", () => {
    const state = createInitialState(42);
    const rng = new RNG(999);
    vi.spyOn(rng, "chance").mockReturnValue(true);
    const monsters = [grub(), grub(), grub()];
    const drops = rollDrops(state, 5, monsters, 3, rng);
    expect(drops).toHaveLength(3);
    expect(rng.chance).toHaveBeenCalledTimes(3);
  });

  it("awards drops for partially cleared rounds on a loss", () => {
    const state = createInitialState(42);
    const rng = new RNG(1234);
    vi.spyOn(rng, "chance").mockReturnValue(true);
    const monsters = [grub(), grub(), grub(), grub()];
    const drops = rollDrops(state, 5, monsters, 2, rng);
    expect(drops).toHaveLength(2);
  });

  it("does not drop when no monsters were killed", () => {
    const state = createInitialState(42);
    const rng = new RNG(555);
    const drops = rollDrops(state, 5, [grub(), grub()], 0, rng);
    expect(drops).toEqual([]);
  });

  it("bosses use guaranteed multi-roll drops", () => {
    const boss: RoundMonster = { ...grub(), isBoss: true, role: "boss", name: "Gate Ogre" };
    expect(monsterDropChance(boss, 10)).toBe(1);
    expect(bossDropRollCount(10)).toBe(2);
    const state = createInitialState(42);
    const rng = new RNG(777);
    const drops = rollDrops(state, 10, [boss], 1, rng);
    expect(drops).toHaveLength(2);
  });
});
