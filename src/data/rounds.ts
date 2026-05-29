import type { RoundMonster } from "../types";
import { RNG } from "../engine/rng";

export interface MonsterArchetype {
  name: string;
  baseHP: number;
  baseAD: number;
  baseMana: number;
  range: number;
  role: string;
}

export const MONSTERS: Record<string, MonsterArchetype> = {
  Grub: { name: "Grub", baseHP: 360, baseAD: 32, baseMana: 0, range: 1, role: "weak melee" },
  Raider: { name: "Raider", baseHP: 460, baseAD: 44, baseMana: 60, range: 1, role: "melee striker" },
  Shardling: { name: "Shardling", baseHP: 390, baseAD: 38, baseMana: 70, range: 3, role: "ranged poke" },
  Golem: { name: "Golem", baseHP: 760, baseAD: 38, baseMana: 90, range: 1, role: "tank" },
  "Hex Shaman": { name: "Hex Shaman", baseHP: 520, baseAD: 36, baseMana: 80, range: 3, role: "caster" },
  "Venom Bat": { name: "Venom Bat", baseHP: 430, baseAD: 50, baseMana: 60, range: 1, role: "assassin" },
  Shellback: { name: "Shellback", baseHP: 920, baseAD: 42, baseMana: 100, range: 1, role: "heavy tank" },
  "Rift Hound": { name: "Rift Hound", baseHP: 620, baseAD: 64, baseMana: 70, range: 1, role: "bruiser" },
  "Storm Eye": { name: "Storm Eye", baseHP: 560, baseAD: 52, baseMana: 80, range: 4, role: "ranged magic" },
  "Bone Knight": { name: "Bone Knight", baseHP: 980, baseAD: 70, baseMana: 90, range: 1, role: "elite melee" },
  "Iron Behemoth": { name: "Iron Behemoth", baseHP: 1300, baseAD: 76, baseMana: 120, range: 1, role: "elite tank" },
  "Star Devourer": { name: "Star Devourer", baseHP: 1100, baseAD: 85, baseMana: 100, range: 3, role: "elite caster" },
};

// Role HP/AD modifiers. "heavy tank" and "ranged magic" reuse the closest spec rows.
const ROLE_MOD: Record<string, { hp: number; ad: number }> = {
  "weak melee": { hp: 0.9, ad: 0.9 },
  "melee striker": { hp: 1.0, ad: 1.1 },
  "ranged poke": { hp: 0.85, ad: 1.05 },
  tank: { hp: 1.45, ad: 0.8 },
  caster: { hp: 0.9, ad: 0.95 },
  assassin: { hp: 0.85, ad: 1.3 },
  "heavy tank": { hp: 1.7, ad: 0.85 },
  bruiser: { hp: 1.15, ad: 1.1 },
  "ranged magic": { hp: 0.9, ad: 1.0 },
  "elite melee": { hp: 1.55, ad: 1.35 },
  "elite tank": { hp: 2.1, ad: 1.1 },
  "elite caster": { hp: 1.45, ad: 1.45 },
};

export function roundDifficulty(round: number): number {
  return Math.pow(1.066, round - 1);
}

export function chapterOf(round: number): number {
  return Math.ceil(round / 10);
}

export function isBossRound(round: number): boolean {
  return round % 10 === 0;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function normalEnemyCount(round: number): number {
  return clamp(2 + Math.floor(round / 5) + Math.floor(round / 17), 2, 16);
}

export function bossRoundComposition(round: number) {
  const chapter = chapterOf(round);
  return {
    bossCount: 1,
    eliteCount: clamp(1 + Math.floor(chapter / 2), 1, 6),
    minionCount: clamp(2 + chapter, 3, 12),
  };
}

const CHAPTER_ARCHETYPES: Record<number, string[]> = {
  1: ["Grub", "Raider", "Shardling"],
  2: ["Raider", "Shardling", "Golem", "Hex Shaman"],
  3: ["Golem", "Hex Shaman", "Venom Bat", "Rift Hound"],
  4: ["Shellback", "Rift Hound", "Storm Eye", "Hex Shaman"],
  5: ["Rift Hound", "Storm Eye", "Bone Knight", "Shellback"],
  6: ["Bone Knight", "Iron Behemoth", "Storm Eye", "Venom Bat"],
  7: ["Iron Behemoth", "Star Devourer", "Bone Knight", "Rift Hound"],
  8: ["Star Devourer", "Iron Behemoth", "Storm Eye", "Shellback"],
  9: ["Star Devourer", "Iron Behemoth", "Bone Knight", "Venom Bat"],
  10: ["Star Devourer", "Iron Behemoth", "Bone Knight", "Storm Eye"],
};

export const BOSSES: Record<
  number,
  { name: string; hpMul: number; adMul: number; skill: string }
> = {
  10: { name: "Gate Ogre", hpMul: 5.0, adMul: 2.0, skill: "Stuns current target for 1s." },
  20: { name: "Twin Serpents", hpMul: 5.8, adMul: 2.2, skill: "Splits damage between two nearest units." },
  30: { name: "Brass Hydra", hpMul: 6.6, adMul: 2.5, skill: "Cleaves in a cone every third attack." },
  40: { name: "Frost Matron", hpMul: 7.5, adMul: 2.8, skill: "Slows entire team for 3s." },
  50: { name: "Rift Monarch", hpMul: 8.6, adMul: 3.1, skill: "Summons two rift hounds at 60% HP." },
  60: { name: "Iron Saint", hpMul: 10.0, adMul: 3.5, skill: "Gains a large shield every 12s." },
  70: { name: "Storm Tyrant", hpMul: 11.6, adMul: 4.0, skill: "Chain lightning hits 5 units." },
  80: { name: "Drowned Colossus", hpMul: 13.4, adMul: 4.5, skill: "Knock-up wave across the board." },
  90: { name: "Astral Eater", hpMul: 15.5, adMul: 5.1, skill: "Drains mana from all units." },
  100: { name: "Hundred-Eye Crown", hpMul: 18.0, adMul: 6.0, skill: "Rotates between burn, freeze, summon, and execute phases." },
};

function makeScaledMonster(name: string, round: number): RoundMonster {
  const arch = MONSTERS[name];
  const mod = ROLE_MOD[arch.role] ?? { hp: 1, ad: 1 };
  const diff = roundDifficulty(round);
  const hp = arch.baseHP * diff * mod.hp;
  const ad = arch.baseAD * Math.pow(1.052, round - 1) * mod.ad;
  return {
    name: arch.name,
    baseName: arch.name,
    hp: Math.round(hp),
    attackDamage: Math.round(ad),
    mana: arch.baseMana,
    spellPower: Math.round(30 * diff),
    range: arch.range,
    role: arch.role,
    isBoss: false,
    isElite: arch.role.startsWith("elite"),
  };
}

function makeBoss(round: number): RoundMonster {
  const b = BOSSES[round];
  const diff = roundDifficulty(round);
  // Boss is based on Iron Behemoth-class stats scaled by boss multipliers.
  const baseHP = 1300;
  const baseAD = 76;
  return {
    name: b.name,
    baseName: "Boss",
    hp: Math.round(baseHP * diff * b.hpMul),
    attackDamage: Math.round(baseAD * Math.pow(1.052, round - 1) * b.adMul),
    mana: 120,
    spellPower: Math.round(60 * diff),
    range: 1,
    role: "boss",
    isBoss: true,
    isElite: false,
    bossSkill: b.skill,
  };
}

export function generateNormalRound(round: number, rng: RNG): RoundMonster[] {
  const chapter = chapterOf(round);
  const count = normalEnemyCount(round);
  const pool = CHAPTER_ARCHETYPES[chapter] ?? CHAPTER_ARCHETYPES[10];
  return Array.from({ length: count }, () => makeScaledMonster(rng.pick(pool), round));
}

export function generateBossRound(round: number, rng: RNG): RoundMonster[] {
  const boss = makeBoss(round);
  const comp = bossRoundComposition(round);
  const adds = generateNormalRound(Math.max(1, round - 1), rng).slice(
    0,
    comp.eliteCount + comp.minionCount
  );
  return [boss, ...adds];
}

export function generateRound(round: number, rng: RNG): RoundMonster[] {
  return isBossRound(round) ? generateBossRound(round, rng) : generateNormalRound(round, rng);
}

// Deterministic generator that produces all 100 rounds from a base seed.
export function generateAllRounds(baseSeed = 12345): RoundMonster[][] {
  const out: RoundMonster[][] = [];
  for (let r = 1; r <= 100; r++) {
    out.push(generateRound(r, new RNG(baseSeed + r * 1013)));
  }
  return out;
}
