import type { ItemDef, ItemStats } from "../types";
import { ITEM_TIER_COLORS } from "./balance";
import { hashString } from "../engine/rng";

// ---- 8 Basic items ----
export const BASIC_ITEMS: ItemDef[] = [
  { id: "B1", name: "Blade", tier: "basic", stats: { ad: 15 }, effect: "+15 attack damage", background: ITEM_TIER_COLORS.basic },
  { id: "B2", name: "Rod", tier: "basic", stats: { sp: 20 }, effect: "+20 spell power", background: ITEM_TIER_COLORS.basic },
  { id: "B3", name: "Vest", tier: "basic", stats: { armor: 25 }, effect: "+25 armor", background: ITEM_TIER_COLORS.basic },
  { id: "B4", name: "Cloak", tier: "basic", stats: { mr: 25 }, effect: "+25 magic resist", background: ITEM_TIER_COLORS.basic },
  { id: "B5", name: "Tear", tier: "basic", stats: { startMana: 20 }, effect: "+20 starting mana", background: ITEM_TIER_COLORS.basic },
  { id: "B6", name: "Belt", tier: "basic", stats: { hp: 200 }, effect: "+200 HP", background: ITEM_TIER_COLORS.basic },
  { id: "B7", name: "Bow", tier: "basic", stats: { attackSpeed: 15 }, effect: "+15% attack speed", background: ITEM_TIER_COLORS.basic },
  { id: "B8", name: "Glove", tier: "basic", stats: { crit: 15 }, effect: "+15% crit chance", background: ITEM_TIER_COLORS.basic },
];

export const BASIC_BY_ID: Record<string, ItemDef> = Object.fromEntries(
  BASIC_ITEMS.map((i) => [i.id, i])
);

// ---- 20 Tier-1 combination items ----
// recipe is a sorted pair of basic item ids.
interface RawTier1 {
  id: string;
  recipe: [string, string];
  name: string;
  stats: ItemStats;
  effect: string;
  prefix: string;
  suffix: string;
  theme: string;
}

const RAW_TIER1: RawTier1[] = [
  { id: "T1-01", recipe: ["B1", "B1"], name: "Greatsword", stats: { ad: 35 }, effect: "+35 AD. Attacks deal +8 bonus physical damage.", prefix: "Ruin", suffix: "Blade", theme: "physical carry" },
  { id: "T1-02", recipe: ["B2", "B2"], name: "Staff of Cinders", stats: { sp: 45 }, effect: "+45 spell power. Spell hits burn for 40 magic damage over 3s.", prefix: "Cinder", suffix: "Star", theme: "spell carry" },
  { id: "T1-03", recipe: ["B3", "B3"], name: "Bastion Plate", stats: { armor: 50 }, effect: "+50 armor. First time below 50% HP, gain 250 shield.", prefix: "Bastion", suffix: "Plate", theme: "armor tank" },
  { id: "T1-04", recipe: ["B4", "B4"], name: "Mirror Mantle", stats: { mr: 50 }, effect: "+50 MR. Reduce first spell hit by 35%.", prefix: "Mirror", suffix: "Veil", theme: "magic tank" },
  { id: "T1-05", recipe: ["B5", "B5"], name: "Blue Core", stats: { startMana: 40 }, effect: "+40 starting mana. Gain 5 mana after casting.", prefix: "Azure", suffix: "Core", theme: "mana caster" },
  { id: "T1-06", recipe: ["B6", "B6"], name: "Giant's Heart", stats: { hp: 450 }, effect: "+450 HP. Regenerate 1% max HP per second.", prefix: "Giant", suffix: "Heart", theme: "HP tank" },
  { id: "T1-07", recipe: ["B7", "B7"], name: "Rapid Gears", stats: { attackSpeed: 35 }, effect: "+35% attack speed. Every 6th attack deals +60 magic damage.", prefix: "Rapid", suffix: "Engine", theme: "attack-speed carry" },
  { id: "T1-08", recipe: ["B8", "B8"], name: "Fate Dice", stats: { crit: 35 }, effect: "+35% crit chance. Critical hits grant 3 mana.", prefix: "Fated", suffix: "Dice", theme: "crit carry" },
  { id: "T1-09", recipe: ["B1", "B7"], name: "Recurve Edge", stats: { ad: 20, attackSpeed: 20 }, effect: "+20 AD, +20% attack speed.", prefix: "Recurve", suffix: "Edge", theme: "hybrid AD/AS" },
  { id: "T1-10", recipe: ["B1", "B8"], name: "Executioner's Mark", stats: { ad: 20, crit: 20 }, effect: "+20 AD, +20% crit chance. Crits deal +20% damage.", prefix: "Execution", suffix: "Mark", theme: "burst finisher" },
  { id: "T1-11", recipe: ["B1", "B6"], name: "Titan Cleaver", stats: { ad: 18, hp: 250 }, effect: "+18 AD, +250 HP. Attacks cleave for 20% damage.", prefix: "Titan", suffix: "Cleaver", theme: "bruiser" },
  { id: "T1-12", recipe: ["B2", "B5"], name: "Spell Battery", stats: { sp: 25, startMana: 25 }, effect: "+25 spell power, +25 starting mana.", prefix: "Arcflow", suffix: "Battery", theme: "mana/AP" },
  { id: "T1-13", recipe: ["B2", "B8"], name: "Hexfire Orb", stats: { sp: 25, crit: 20 }, effect: "+25 spell power, +20% crit chance. Spells can crit.", prefix: "Hexfire", suffix: "Orb", theme: "crit spell" },
  { id: "T1-14", recipe: ["B2", "B4"], name: "Nullflame Wand", stats: { sp: 25, mr: 25 }, effect: "+25 spell power, +25 MR. Spells shred 10 MR for 4s.", prefix: "Nullflame", suffix: "Wand", theme: "anti-magic shred" },
  { id: "T1-15", recipe: ["B3", "B4"], name: "Aegis Shell", stats: { armor: 30, mr: 30 }, effect: "+30 armor, +30 MR. Nearby allies gain 10 armor/MR.", prefix: "Aegis", suffix: "Shell", theme: "aura defense" },
  { id: "T1-16", recipe: ["B3", "B6"], name: "Stoneguard Mail", stats: { armor: 30, hp: 300 }, effect: "+30 armor, +300 HP. Taunt nearby enemies for 1s at combat start.", prefix: "Stoneguard", suffix: "Mail", theme: "front-line control" },
  { id: "T1-17", recipe: ["B3", "B5"], name: "Ward Engine", stats: { armor: 25, startMana: 25 }, effect: "+25 armor, +25 starting mana. First cast grants 220 shield.", prefix: "Ward", suffix: "Engine", theme: "shield/mana" },
  { id: "T1-18", recipe: ["B4", "B6"], name: "Spirit Bulwark", stats: { mr: 30, hp: 300 }, effect: "+30 MR, +300 HP. Heal for 120 after taking spell damage.", prefix: "Spirit", suffix: "Bulwark", theme: "sustain tank" },
  { id: "T1-19", recipe: ["B5", "B7"], name: "Tempo Lens", stats: { startMana: 20, attackSpeed: 20 }, effect: "+20 starting mana, +20% attack speed. Attacks grant +1 extra mana.", prefix: "Tempo", suffix: "Lens", theme: "ramping tempo" },
  { id: "T1-20", recipe: ["B7", "B8"], name: "Deadeye Scope", stats: { attackSpeed: 20, crit: 20 }, effect: "+20% attack speed, +20% crit chance. +1 range if ranged.", prefix: "Deadeye", suffix: "Scope", theme: "ranged crit" },
];

export const TIER1_ITEMS: ItemDef[] = RAW_TIER1.map((t) => ({
  id: t.id,
  name: t.name,
  tier: 1,
  stats: t.stats,
  effect: t.effect,
  background: ITEM_TIER_COLORS[1],
  recipe: t.recipe,
  theme: t.theme,
}));

export const TIER1_BY_ID: Record<string, ItemDef> = Object.fromEntries(
  TIER1_ITEMS.map((i) => [i.id, i])
);

// Map a sorted basic pair to its tier-1 item.
const TIER1_BY_RECIPE: Record<string, ItemDef> = {};
for (const t of RAW_TIER1) {
  const key = [...t.recipe].sort().join("+");
  TIER1_BY_RECIPE[key] = TIER1_BY_ID[t.id];
}

export function combineBasics(a: string, b: string): ItemDef | null {
  const key = [a, b].sort().join("+");
  return TIER1_BY_RECIPE[key] ?? null;
}

// ---- 100 Tier-2 completed items ----
const tier1Ids = RAW_TIER1.map((t) => t.id);
const RAW_BY_ID: Record<string, RawTier1> = Object.fromEntries(
  RAW_TIER1.map((t) => [t.id, t])
);

export function allowedCatalysts(baseIndex: number): string[] {
  return [
    tier1Ids[(baseIndex + 1) % 20],
    tier1Ids[(baseIndex + 3) % 20],
    tier1Ids[(baseIndex + 7) % 20],
    tier1Ids[(baseIndex + 11) % 20],
    tier1Ids[(baseIndex + 15) % 20],
  ];
}

function combineStats(a: ItemStats, mulA: number, b: ItemStats, mulB: number): ItemStats {
  const keys: (keyof ItemStats)[] = ["ad", "sp", "armor", "mr", "startMana", "hp", "attackSpeed", "crit"];
  const out: ItemStats = {};
  for (const k of keys) {
    const v = (a[k] ?? 0) * mulA + (b[k] ?? 0) * mulB;
    if (v !== 0) out[k] = Math.round(v);
  }
  return out;
}

const EFFECT_FAMILY: Record<string, string> = {
  "physical carry": "Attacks deal +12% bonus physical damage and execute enemies below 12% HP.",
  "spell carry": "Spells deal +15% bonus magic damage and burn the area for 60 magic damage over 3s.",
  "armor tank": "Gain a 320 shield at combat start and 12% damage reduction while shielded.",
  "magic tank": "Reduce incoming spell damage by 18% and reflect 60 magic damage on spell hit.",
  "mana caster": "Start with 30 bonus mana and gain 8 mana per cast.",
  "HP tank": "Gain 12% bonus max HP and a 300 shield when first below 50% HP.",
  "attack-speed carry": "Gain 6% attack speed per attack, stacking up to 10 times.",
  "crit carry": "Gain 25% crit chance; critical hits grant 4 mana.",
  "bruiser": "Gain up to 90 AD scaling with missing HP and heal 8% of damage dealt.",
  "aura defense": "Nearby allies gain 20 armor and 20 magic resist.",
  "front-line control": "Taunt nearby enemies for 1.5s and slow them by 25% at combat start.",
  "ranged crit": "Gain +1 range and attacks bounce to a second target for 40% damage.",
};

function generateFinalEffect(baseTheme: string, catalystTheme: string): string {
  const base = EFFECT_FAMILY[baseTheme] ?? EFFECT_FAMILY["physical carry"];
  // light flavor blend from the catalyst's family without duplicating full text
  const cat = EFFECT_FAMILY[catalystTheme] ?? "";
  const catShort = cat.split(".")[0];
  return `${base} Also: ${catShort.toLowerCase()}.`;
}

function buildTier2(): ItemDef[] {
  const out: ItemDef[] = [];
  for (let i = 0; i < tier1Ids.length; i++) {
    const baseId = tier1Ids[i];
    const base = RAW_BY_ID[baseId];
    const cats = allowedCatalysts(i);
    for (const catId of cats) {
      const cat = RAW_BY_ID[catId];
      const id = `T2-${baseId}-${catId}`;
      const name = `${base.prefix} ${cat.suffix}`;
      out.push({
        id,
        name,
        tier: 2,
        stats: combineStats(base.stats, 1.25, cat.stats, 0.75),
        effect: generateFinalEffect(base.theme, cat.theme),
        background: ITEM_TIER_COLORS[2],
        recipe: [baseId, catId],
        theme: base.theme,
      });
    }
  }
  return out;
}

export const TIER2_ITEMS: ItemDef[] = buildTier2();

export const TIER2_BY_ID: Record<string, ItemDef> = Object.fromEntries(
  TIER2_ITEMS.map((i) => [i.id, i])
);

// Directional combine of two tier-1 items -> tier-2 (base + catalyst).
export function combineTier1(baseId: string, catalystId: string): ItemDef | null {
  const baseIndex = tier1Ids.indexOf(baseId);
  if (baseIndex < 0) return null;
  if (!allowedCatalysts(baseIndex).includes(catalystId)) return null;
  return TIER2_BY_ID[`T2-${baseId}-${catalystId}`] ?? null;
}

export const ALL_ITEMS_BY_ID: Record<string, ItemDef> = {
  ...BASIC_BY_ID,
  ...TIER1_BY_ID,
  ...TIER2_BY_ID,
};

export function getItem(id: string): ItemDef | undefined {
  return ALL_ITEMS_BY_ID[id];
}

export function formatRecipeInputs(recipe: [string, string]): string {
  return recipe.map((id) => getItem(id)?.name ?? id).join(" + ");
}

/** Recipes that produce this item (parents) or use it as a component (children). */
export function itemRecipeLines(itemId: string): { label: "recipe" | "combines"; text: string }[] {
  const item = getItem(itemId);
  if (!item) return [];

  const lines: { label: "recipe" | "combines"; text: string }[] = [];
  if (item.recipe) {
    lines.push({ label: "recipe", text: formatRecipeInputs(item.recipe) });
  }

  const combines = new Set<string>();
  for (const other of [...TIER1_ITEMS, ...TIER2_ITEMS]) {
    if (!other.recipe?.includes(itemId)) continue;
    combines.add(`${formatRecipeInputs(other.recipe)} → ${other.name}`);
  }
  for (const text of [...combines].sort()) {
    lines.push({ label: "combines", text });
  }
  return lines;
}

export function itemTierRank(item: ItemDef): number {
  return item.tier === "basic" ? 0 : item.tier;
}
