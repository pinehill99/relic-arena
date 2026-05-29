// Central type definitions for Relic Arena.

export type OriginName =
  | "Ember"
  | "Frost"
  | "Verdant"
  | "Storm"
  | "Iron"
  | "Void"
  | "Celestial"
  | "Tidal"
  | "Shadow"
  | "Arcane";

export type ClassName =
  | "Vanguard"
  | "Duelist"
  | "Ranger"
  | "Mage"
  | "Assassin"
  | "Cleric"
  | "Engineer"
  | "Summoner"
  | "Guardian"
  | "Warlock";

export type TraitName = OriginName | ClassName;
export type TraitKind = "origin" | "class";

export interface TraitDef {
  name: TraitName;
  kind: TraitKind;
  thresholds: number[];
  description: string;
}

export interface UnitDef {
  id: number;
  name: string;
  cost: 1 | 2 | 3 | 4 | 5;
  origin: OriginName;
  classes: ClassName[];
  hp: number;
  attackDamage: number;
  mana: number;
  range: number;
  skillName: string;
  skillText: string;
  poolCount: number; // copies per unique unit at this cost
  costColor: string;
}

export type ItemTier = "basic" | 1 | 2;

export interface ItemStats {
  ad?: number; // flat attack damage
  sp?: number; // spell power
  armor?: number;
  mr?: number; // magic resist
  startMana?: number;
  hp?: number;
  attackSpeed?: number; // percent, e.g. 15 = +15%
  crit?: number; // percent
}

export interface ItemDef {
  id: string;
  name: string;
  tier: ItemTier;
  stats: ItemStats;
  effect: string;
  background: string;
  // for combination
  recipe?: [string, string]; // basic ids (tier1) or tier1 ids (tier2: [base, catalyst])
  theme?: string; // tier-1/tier-2 theme group
}

// A placed/owned unit instance.
export interface UnitInstance {
  iid: string; // unique instance id
  defId: number;
  star: 1 | 2 | 3;
  items: string[]; // item ids equipped (max 3)
  // location
  loc: "bench" | "board";
  row?: number; // 0..7 (board only); player uses rows 4..7
  col?: number;
}

export interface RoundMonster {
  name: string;
  baseName: string;
  hp: number;
  attackDamage: number;
  mana: number;
  spellPower: number;
  range: number;
  role: string;
  isBoss: boolean;
  isElite: boolean;
  bossSkill?: string;
}

export interface ActiveTrait {
  name: TraitName;
  kind: TraitKind;
  count: number;
  activeTierIndex: number; // -1 none, else index into thresholds
  nextThreshold: number | null;
  thresholds: number[];
  description: string;
}

export type Phase = "prep" | "combat" | "result" | "gameover";

export interface GameState {
  seed: number;
  rngState: number; // persistent RNG state for shop/drops
  round: number; // current round to fight (1..100)
  hp: number;
  gold: number;
  level: number;
  xp: number;
  shop: (number | null)[]; // unit def ids or null (bought/empty)
  bench: UnitInstance[];
  board: UnitInstance[];
  inventory: string[]; // item ids not equipped
  pool: Record<number, number>; // defId -> remaining copies
  phase: Phase;
  lastResult: "win" | "loss" | null;
  log: string[];
  cleared: boolean;
  // pity tracking for item drops
  basicDropCounts: Record<string, number>;
}
