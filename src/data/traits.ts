import type { TraitDef, OriginName, ClassName } from "../types";

export const ORIGINS: OriginName[] = [
  "Ember",
  "Frost",
  "Verdant",
  "Storm",
  "Iron",
  "Void",
  "Celestial",
  "Tidal",
  "Shadow",
  "Arcane",
];

export const CLASSES: ClassName[] = [
  "Vanguard",
  "Duelist",
  "Ranger",
  "Mage",
  "Assassin",
  "Cleric",
  "Engineer",
  "Summoner",
  "Guardian",
  "Warlock",
];

export const ORIGIN_DEFS: TraitDef[] = [
  {
    name: "Ember",
    kind: "origin",
    thresholds: [2, 4, 6],
    description:
      "Team attacks burn enemies for 3%/6%/10% of max HP over 4s. At 6, burn can spread once to a nearby enemy.",
  },
  {
    name: "Frost",
    kind: "origin",
    thresholds: [2, 4, 6],
    description:
      "Enemies damaged by Frost units lose 12%/22%/35% attack speed for 3s. At 6, each Frost unit's first spell freezes for 1s.",
  },
  {
    name: "Verdant",
    kind: "origin",
    thresholds: [2, 4, 6],
    description:
      "Every 5s, Verdant units heal for 3%/6%/10% missing HP. At 6, they also gain 12% max HP.",
  },
  {
    name: "Storm",
    kind: "origin",
    thresholds: [2, 4, 6],
    description:
      "Every 4s, Storm units chain lightning for 70/140/240 magic damage. At 6, gain 15% attack speed.",
  },
  {
    name: "Iron",
    kind: "origin",
    thresholds: [2, 4, 6],
    description:
      "Iron units gain 20/45/80 armor and magic resist. At 6, reflect 8% post-mitigation damage.",
  },
  {
    name: "Void",
    kind: "origin",
    thresholds: [2, 4, 6],
    description:
      "Void units ignore 15%/35%/60% of armor and magic resist. At 6, first spell also drains 20 mana.",
  },
  {
    name: "Celestial",
    kind: "origin",
    thresholds: [2, 4, 6],
    description:
      "Team gains 8%/16%/28% omnivamp. At 6, overhealing becomes a shield up to 20% max HP.",
  },
  {
    name: "Tidal",
    kind: "origin",
    thresholds: [2, 4, 6],
    description:
      "Tidal units gain 3/7/12 mana per attack. At 6, crowd-control duration from Tidal units increases by 20%.",
  },
  {
    name: "Shadow",
    kind: "origin",
    thresholds: [2, 4, 6],
    description:
      "Shadow units gain 15%/30%/55% crit chance and execute enemies below 10%/16%/25% HP.",
  },
  {
    name: "Arcane",
    kind: "origin",
    thresholds: [2, 4, 6],
    description:
      "Arcane units gain 15/35/65 spell power. At 6, first spell is repeated at 40% power.",
  },
];

export const CLASS_DEFS: TraitDef[] = [
  {
    name: "Vanguard",
    kind: "class",
    thresholds: [2, 4, 6, 8],
    description: "Vanguards gain 150/350/700/1100 HP and 10/25/45/70 armor.",
  },
  {
    name: "Duelist",
    kind: "class",
    thresholds: [2, 4, 6, 8],
    description:
      "Duelists gain 8% attack speed per attack, stacking up to 4/6/8/10 times.",
  },
  {
    name: "Ranger",
    kind: "class",
    thresholds: [2, 4, 6],
    description:
      "Rangers gain +1 attack range and 15%/35%/65% attack damage every 5s for 3s.",
  },
  {
    name: "Mage",
    kind: "class",
    thresholds: [2, 4, 6, 8],
    description:
      "Mages gain 20/45/80/125 spell power and 10%/20%/35%/50% chance to echo a spell at 35% power.",
  },
  {
    name: "Assassin",
    kind: "class",
    thresholds: [2, 4, 6],
    description:
      "Assassins leap toward the enemy backline at combat start and gain 20%/40%/75% crit damage.",
  },
  {
    name: "Cleric",
    kind: "class",
    thresholds: [2, 4, 6],
    description: "Clerics heal the lowest-HP ally for 5%/9%/14% max HP every 6s.",
  },
  {
    name: "Engineer",
    kind: "class",
    thresholds: [2, 4, 6],
    description:
      "Engineers deploy 1/2/3 turrets. Turrets inherit 20%/30%/45% of average allied AD.",
  },
  {
    name: "Summoner",
    kind: "class",
    thresholds: [2, 4, 6],
    description: "Summoned units gain 25%/60%/110% HP and damage.",
  },
  {
    name: "Guardian",
    kind: "class",
    thresholds: [2, 4, 6],
    description:
      "At combat start, Guardians shield themselves and adjacent allies for 180/420/800.",
  },
  {
    name: "Warlock",
    kind: "class",
    thresholds: [2, 4, 6],
    description:
      "Warlocks gain 12%/25%/45% spell vamp. Their damage-over-time effects tick 1 extra time at 6.",
  },
];

export const ALL_TRAITS: TraitDef[] = [...ORIGIN_DEFS, ...CLASS_DEFS];

export const TRAIT_BY_NAME: Record<string, TraitDef> = Object.fromEntries(
  ALL_TRAITS.map((t) => [t.name, t])
);

// Active synergy tier background colors.
export const TIER_COLORS = ["#8B5A2B", "#7C8798", "#D7A72F", "#9F7AEA"]; // bronze, silver, gold, prismatic
export const TIER_NAMES = ["Bronze", "Silver", "Gold", "Prismatic"];

// Origin/class glyph kind for icon generation.
export const TRAIT_GLYPH: Record<string, string> = {
  Ember: "flame",
  Frost: "snowflake",
  Verdant: "leaf",
  Storm: "bolt",
  Iron: "shield",
  Void: "eye",
  Celestial: "star",
  Tidal: "wave",
  Shadow: "dagger",
  Arcane: "rune",
  Vanguard: "tower",
  Duelist: "swords",
  Ranger: "arrow",
  Mage: "orb",
  Assassin: "fang",
  Cleric: "cross",
  Engineer: "gear",
  Summoner: "portal",
  Guardian: "aegis",
  Warlock: "skull",
};
