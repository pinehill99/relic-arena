import type { UnitDef, OriginName, ClassName } from "../types";
import { POOL_BY_COST, COST_COLORS } from "./balance";

interface RawUnit {
  id: number;
  name: string;
  cost: 1 | 2 | 3 | 4 | 5;
  origin: OriginName;
  classes: ClassName[];
  hp: number;
  ad: number;
  mana: number;
  skillName: string;
  skillText: string;
}

// Range inference: Ranger/Mage are ranged (4), Engineer-only ranged (3), else melee (1).
function inferRange(classes: ClassName[]): number {
  if (classes.includes("Ranger") || classes.includes("Mage")) return 4;
  if (classes.includes("Engineer")) return 3;
  return 1;
}

const RAW: RawUnit[] = [
  { id: 1, name: "Ember Squire", cost: 1, origin: "Ember", classes: ["Vanguard"], hp: 650, ad: 48, mana: 70, skillName: "Shield Bash", skillText: "Gain a 160 shield and deal 90 physical damage to current target." },
  { id: 2, name: "Arcane Tinker", cost: 1, origin: "Arcane", classes: ["Engineer"], hp: 540, ad: 42, mana: 80, skillName: "Spark Turret", skillText: "Places a small turret for 6s that attacks for 22 magic damage." },
  { id: 3, name: "Frost Page", cost: 1, origin: "Frost", classes: ["Mage"], hp: 500, ad: 40, mana: 60, skillName: "Ice Dart", skillText: "Fires a bolt for 140 magic damage and 20% slow for 2s." },
  { id: 4, name: "Frost Guard", cost: 1, origin: "Frost", classes: ["Guardian"], hp: 690, ad: 44, mana: 80, skillName: "Cold Cover", skillText: "Shields self and nearest ally for 130." },
  { id: 5, name: "Verdant Scout", cost: 1, origin: "Verdant", classes: ["Ranger"], hp: 520, ad: 55, mana: 70, skillName: "Root Shot", skillText: "Deals 120 physical damage and roots for 0.7s." },
  { id: 6, name: "Verdant Acolyte", cost: 1, origin: "Verdant", classes: ["Cleric"], hp: 560, ad: 38, mana: 70, skillName: "Field Mending", skillText: "Heals lowest-HP ally for 160." },
  { id: 7, name: "Storm Cutter", cost: 1, origin: "Storm", classes: ["Duelist"], hp: 600, ad: 52, mana: 65, skillName: "Static Cut", skillText: "Next 3 attacks gain 35% attack speed and chain 35 magic damage." },
  { id: 8, name: "Storm Adept", cost: 1, origin: "Storm", classes: ["Mage"], hp: 500, ad: 39, mana: 60, skillName: "Jolt", skillText: "Deals 110 magic damage to target and 55 to two nearby enemies." },
  { id: 9, name: "Iron Recruit", cost: 1, origin: "Iron", classes: ["Vanguard"], hp: 720, ad: 45, mana: 80, skillName: "Brace", skillText: "Gains 35 armor and 120 shield for 4s." },
  { id: 10, name: "Iron Crossbow", cost: 1, origin: "Iron", classes: ["Ranger"], hp: 530, ad: 56, mana: 75, skillName: "Piercing Bolt", skillText: "Deals 150 physical damage in a line." },
  { id: 11, name: "Void Imp", cost: 1, origin: "Void", classes: ["Warlock"], hp: 510, ad: 43, mana: 60, skillName: "Gnawing Rift", skillText: "Applies 120 magic damage over 4s." },
  { id: 12, name: "Void Stalker", cost: 1, origin: "Void", classes: ["Assassin"], hp: 560, ad: 58, mana: 70, skillName: "Rift Step", skillText: "Jumps behind target and strikes for 165 physical damage." },
  { id: 13, name: "Celestial Novice", cost: 1, origin: "Celestial", classes: ["Summoner"], hp: 540, ad: 41, mana: 80, skillName: "Star Wisp", skillText: "Summons a wisp with 280 HP for 7s." },
  { id: 14, name: "Shadow Knave", cost: 1, origin: "Shadow", classes: ["Assassin"], hp: 550, ad: 60, mana: 65, skillName: "Backstab", skillText: "Deals 175 physical damage; crits if target is below 50% HP." },
  { id: 15, name: "Celestial Monk", cost: 2, origin: "Celestial", classes: ["Cleric", "Duelist"], hp: 760, ad: 61, mana: 80, skillName: "Radiant Palm", skillText: "Heals self for 180 and strikes target for 170 magic damage." },
  { id: 16, name: "Celestial Archer", cost: 2, origin: "Celestial", classes: ["Ranger"], hp: 610, ad: 70, mana: 70, skillName: "Star Volley", skillText: "Fires 4 arrows for 55 physical damage each." },
  { id: 17, name: "Arcane Scribe", cost: 2, origin: "Arcane", classes: ["Mage"], hp: 590, ad: 48, mana: 60, skillName: "Rune Burst", skillText: "Deals 220 magic damage to the largest enemy cluster." },
  { id: 18, name: "Arcane Binder", cost: 2, origin: "Arcane", classes: ["Warlock"], hp: 650, ad: 50, mana: 70, skillName: "Binding Word", skillText: "Deals 160 magic damage and reduces target mana by 15." },
  { id: 19, name: "Ember Bomber", cost: 2, origin: "Ember", classes: ["Ranger", "Engineer"], hp: 620, ad: 65, mana: 80, skillName: "Fire Mine", skillText: "Throws a mine that deals 210 magic damage in a small area." },
  { id: 20, name: "Frost Trapper", cost: 2, origin: "Frost", classes: ["Ranger"], hp: 640, ad: 66, mana: 75, skillName: "Snare Net", skillText: "Deals 150 physical damage and stuns for 1s." },
  { id: 21, name: "Verdant Brute", cost: 2, origin: "Verdant", classes: ["Vanguard"], hp: 880, ad: 58, mana: 90, skillName: "Thorn Hide", skillText: "Gains 250 shield and reflects 40 damage per hit for 4s." },
  { id: 22, name: "Storm Lancer", cost: 2, origin: "Storm", classes: ["Duelist"], hp: 700, ad: 68, mana: 65, skillName: "Surge Thrust", skillText: "Dashes to target, dealing 190 physical damage." },
  { id: 23, name: "Iron Mechanic", cost: 2, origin: "Iron", classes: ["Engineer"], hp: 680, ad: 55, mana: 80, skillName: "Repair Drone", skillText: "Summons a drone that heals allies for 45 per second." },
  { id: 24, name: "Void Heretic", cost: 2, origin: "Void", classes: ["Mage", "Warlock"], hp: 620, ad: 48, mana: 70, skillName: "Unstable Prayer", skillText: "Deals 180 magic damage plus 8% missing HP." },
  { id: 25, name: "Tidal Warden", cost: 2, origin: "Tidal", classes: ["Guardian"], hp: 820, ad: 54, mana: 85, skillName: "Shell Wall", skillText: "Shields adjacent allies for 220." },
  { id: 26, name: "Tidal Fencer", cost: 2, origin: "Tidal", classes: ["Duelist", "Assassin"], hp: 660, ad: 72, mana: 65, skillName: "Undertow Lunge", skillText: "Strikes twice for 95 physical damage each." },
  { id: 27, name: "Shadow Hexer", cost: 2, origin: "Shadow", classes: ["Warlock"], hp: 630, ad: 52, mana: 70, skillName: "Hex Rot", skillText: "Applies 210 magic damage over 5s and 25% healing reduction." },
  { id: 28, name: "Ember Captain", cost: 3, origin: "Ember", classes: ["Vanguard", "Duelist"], hp: 970, ad: 76, mana: 90, skillName: "Rallying Flame", skillText: "Grants nearby allies 20% attack speed and deals 240 magic damage." },
  { id: 29, name: "Frost Oracle", cost: 3, origin: "Frost", classes: ["Cleric", "Mage"], hp: 760, ad: 56, mana: 80, skillName: "Snow Benediction", skillText: "Heals 2 allies for 260 and slows nearby enemies." },
  { id: 30, name: "Verdant Beastmaster", cost: 3, origin: "Verdant", classes: ["Summoner"], hp: 800, ad: 63, mana: 90, skillName: "Call Briarwolf", skillText: "Summons a wolf with 700 HP and cleave attacks." },
  { id: 31, name: "Shadow Thornblade", cost: 3, origin: "Shadow", classes: ["Assassin"], hp: 780, ad: 84, mana: 70, skillName: "Thorn Ambush", skillText: "Leaps and deals 260 physical damage plus bleed." },
  { id: 32, name: "Storm Artillerist", cost: 3, origin: "Storm", classes: ["Ranger", "Engineer"], hp: 750, ad: 82, mana: 85, skillName: "Thunder Cannon", skillText: "Fires at the farthest enemy for 310 physical damage." },
  { id: 33, name: "Iron Bulwark", cost: 3, origin: "Iron", classes: ["Guardian", "Vanguard"], hp: 1050, ad: 64, mana: 100, skillName: "Fortify", skillText: "Grants team 18 armor and shields self for 420." },
  { id: 34, name: "Void Aberration", cost: 3, origin: "Void", classes: ["Vanguard", "Warlock"], hp: 1030, ad: 70, mana: 95, skillName: "Devour Light", skillText: "Deals 260 magic damage and heals for 60% of damage dealt." },
  { id: 35, name: "Tidal Siren", cost: 3, origin: "Tidal", classes: ["Mage"], hp: 730, ad: 55, mana: 75, skillName: "Siren Wave", skillText: "Wave hits a row for 270 magic damage and 1s silence." },
  { id: 36, name: "Tidal Corsair", cost: 3, origin: "Tidal", classes: ["Duelist", "Assassin"], hp: 820, ad: 86, mana: 70, skillName: "Rip Current", skillText: "3 rapid strikes; final hit deals bonus missing-HP damage." },
  { id: 37, name: "Celestial Judge", cost: 3, origin: "Celestial", classes: ["Guardian"], hp: 960, ad: 68, mana: 90, skillName: "Verdict Halo", skillText: "Shields allies in a circle and deals 180 magic damage to enemies." },
  { id: 38, name: "Arcane Machinist", cost: 3, origin: "Arcane", classes: ["Engineer", "Mage"], hp: 740, ad: 58, mana: 80, skillName: "Mana Engine", skillText: "Empowers turrets and deals 240 magic damage to a cluster." },
  { id: 39, name: "Shadow Reaper", cost: 3, origin: "Shadow", classes: ["Assassin"], hp: 760, ad: 92, mana: 65, skillName: "Reap", skillText: "Executes low-HP target or deals 300 physical damage." },
  { id: 40, name: "Ember Pyromancer", cost: 4, origin: "Ember", classes: ["Mage", "Warlock"], hp: 900, ad: 70, mana: 80, skillName: "Inferno Bloom", skillText: "Large area takes 480 magic damage over 4s." },
  { id: 41, name: "Ember Legionnaire", cost: 4, origin: "Ember", classes: ["Vanguard", "Guardian"], hp: 1250, ad: 82, mana: 100, skillName: "Banner of Coals", skillText: "Shields team for 300 and taunts nearby enemies." },
  { id: 42, name: "Frost Titan", cost: 4, origin: "Frost", classes: ["Vanguard"], hp: 1350, ad: 88, mana: 110, skillName: "Glacial Slam", skillText: "Deals 360 magic damage in a cone and stuns for 1.5s." },
  { id: 43, name: "Verdant Hierophant", cost: 4, origin: "Verdant", classes: ["Cleric", "Summoner"], hp: 980, ad: 66, mana: 90, skillName: "Grove Covenant", skillText: "Summons two saplings and heals all allies for 220." },
  { id: 44, name: "Storm Herald", cost: 4, origin: "Storm", classes: ["Mage"], hp: 880, ad: 72, mana: 75, skillName: "Tempest Field", skillText: "Deals 420 magic damage split among 5 bolts." },
  { id: 45, name: "Iron Siege Master", cost: 4, origin: "Iron", classes: ["Engineer", "Ranger"], hp: 1000, ad: 96, mana: 90, skillName: "Siege Platform", skillText: "Deploys a cannon that shells clusters for 160 physical damage." },
  { id: 46, name: "Void Seer", cost: 4, origin: "Void", classes: ["Mage", "Summoner"], hp: 870, ad: 68, mana: 80, skillName: "Rift Gate", skillText: "Summons a voidling and blasts 3 enemies for 260 magic damage." },
  { id: 47, name: "Tidal Leviathan", cost: 4, origin: "Tidal", classes: ["Guardian", "Vanguard"], hp: 1400, ad: 82, mana: 115, skillName: "Crushing Tide", skillText: "Knocks up nearby enemies and gains 500 shield." },
  { id: 48, name: "Celestial Valkyrie", cost: 4, origin: "Celestial", classes: ["Duelist", "Guardian"], hp: 1080, ad: 94, mana: 85, skillName: "Astral Descent", skillText: "Dives to lowest-HP enemy for 420 physical damage and shields self." },
  { id: 49, name: "Arcane Duelmage", cost: 4, origin: "Arcane", classes: ["Mage", "Duelist"], hp: 900, ad: 83, mana: 70, skillName: "Spellblade Flurry", skillText: "5 magic slashes for 115 damage each." },
  { id: 50, name: "Shadow Revenant", cost: 4, origin: "Shadow", classes: ["Assassin", "Warlock"], hp: 950, ad: 98, mana: 75, skillName: "Dread Return", skillText: "Becomes untargetable, strikes for 460 physical damage, then heals." },
  { id: 51, name: "Ember Phoenix", cost: 5, origin: "Ember", classes: ["Summoner", "Mage"], hp: 1250, ad: 102, mana: 100, skillName: "Rebirth Pyre", skillText: "Massive area burn for 700 magic damage; once per fight revives at 45% HP." },
  { id: 52, name: "Frost Sovereign", cost: 5, origin: "Frost", classes: ["Mage", "Guardian"], hp: 1350, ad: 96, mana: 95, skillName: "Absolute Winter", skillText: "Freezes all enemies for 1s and deals 520 magic damage." },
  { id: 53, name: "Verdant Worldroot", cost: 5, origin: "Verdant", classes: ["Vanguard", "Cleric"], hp: 1600, ad: 92, mana: 120, skillName: "Worldroot Pulse", skillText: "Heals all allies for 420 and roots enemies for 1.5s." },
  { id: 54, name: "Storm Dragonling", cost: 5, origin: "Storm", classes: ["Ranger", "Mage"], hp: 1200, ad: 120, mana: 90, skillName: "Sky Rupture", skillText: "Lightning line deals 650 mixed damage and chains twice." },
  { id: 55, name: "Iron Colossus", cost: 5, origin: "Iron", classes: ["Vanguard", "Engineer"], hp: 1700, ad: 105, mana: 130, skillName: "Colossus Protocol", skillText: "Gains 900 shield and deploys two rail turrets." },
  { id: 56, name: "Void Empress", cost: 5, origin: "Void", classes: ["Summoner", "Warlock"], hp: 1300, ad: 98, mana: 100, skillName: "Empress Rift", skillText: "Summons two void guards and drains 300 HP from 4 enemies." },
  { id: 57, name: "Tidal Oracle", cost: 5, origin: "Tidal", classes: ["Cleric", "Mage"], hp: 1250, ad: 90, mana: 90, skillName: "Moonsea Hymn", skillText: "Heals allies for 350 and deals 480 magic damage to enemies in waves." },
  { id: 58, name: "Celestial Seraph", cost: 5, origin: "Celestial", classes: ["Cleric", "Guardian"], hp: 1450, ad: 95, mana: 110, skillName: "Seraphic Aegis", skillText: "Grants all allies 600 shield and 20% damage reduction for 4s." },
  { id: 59, name: "Arcane Archon", cost: 5, origin: "Arcane", classes: ["Mage", "Warlock"], hp: 1200, ad: 100, mana: 80, skillName: "Final Equation", skillText: "Deals 800 magic damage split across the enemy team, prioritizing carries." },
  { id: 60, name: "Shadow Emperor", cost: 5, origin: "Shadow", classes: ["Assassin", "Duelist"], hp: 1300, ad: 130, mana: 75, skillName: "Imperial Execution", skillText: "Teleports to lowest-HP enemy and deals 900 physical damage; resets on kill." },
];

export const UNITS: UnitDef[] = RAW.map((u) => ({
  id: u.id,
  name: u.name,
  cost: u.cost,
  origin: u.origin,
  classes: u.classes,
  hp: u.hp,
  attackDamage: u.ad,
  mana: u.mana,
  range: inferRange(u.classes),
  skillName: u.skillName,
  skillText: u.skillText,
  poolCount: POOL_BY_COST[u.cost].copies,
  costColor: COST_COLORS[u.cost],
}));

export const UNIT_BY_ID: Record<number, UnitDef> = Object.fromEntries(
  UNITS.map((u) => [u.id, u])
);

export const UNITS_BY_COST: Record<number, UnitDef[]> = {
  1: UNITS.filter((u) => u.cost === 1),
  2: UNITS.filter((u) => u.cost === 2),
  3: UNITS.filter((u) => u.cost === 3),
  4: UNITS.filter((u) => u.cost === 4),
  5: UNITS.filter((u) => u.cost === 5),
};
