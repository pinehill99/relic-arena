import type { UnitInstance, RoundMonster, TraitName } from "../types";
import { UNIT_BY_ID } from "../data/units";
import { getItem } from "../data/items";
import { STAR_SCALING, COMBAT_TICK_MS, COMBAT_TIMEOUT_S } from "../data/balance";
import { RNG } from "./rng";
import { computeTraitCounts, activeTierIndex } from "./synergies";

const TICK = COMBAT_TICK_MS / 1000; // seconds
const BASE_APS = 0.6;
const MOVE_INTERVAL = 0.3;

type Side = "player" | "enemy";

export interface CombatEntity {
  id: string;
  side: Side;
  name: string;
  defId?: number;
  star: number;
  cost: number;
  row: number;
  col: number;
  maxHP: number;
  hp: number;
  shield: number;
  ad: number;
  sp: number;
  armor: number;
  mr: number;
  range: number;
  maxMana: number;
  mana: number;
  asBonusPct: number; // from items/storm
  asStacks: number; // duelist
  asPerStack: number;
  asStackCap: number;
  critChance: number;
  critDamage: number; // multiplier, e.g. 1.5
  armorPen: number; // 0..1
  magicPen: number; // 0..1
  omnivamp: number; // 0..1
  spellVamp: number; // 0..1
  attackCd: number;
  moveCd: number;
  targetId?: string;
  alive: boolean;
  isSummon: boolean;
  // status
  burnDps: number;
  burnRemaining: number;
  slowPct: number;
  slowRemaining: number;
  stunRemaining: number;
  // trait flags (player)
  emberBurnPct: number; // 0 if inactive
  emberSpread: boolean;
  frostSlowPct: number;
  frostFreeze: boolean;
  ironReflect: boolean;
  shadowExecutePct: number;
  archetype: "heal" | "shield" | "summon" | "damage";
  skillKind: "magic" | "physical";
  skillBurst: number;
  healAmt: number;
  shieldAmt: number;
  isMage: boolean;
  isCaster: boolean;
  isBoss: boolean;
  untargetableUntil?: number;
  hasRevive?: boolean;
  revived?: boolean;
  // verdant
  verdant: boolean;
  verdantHealPct: number;
  // storm
  storm: boolean;
  stormChain: number;
}

export interface Projectile {
  fromRow: number;
  fromCol: number;
  toRow: number;
  toCol: number;
  kind: "attack" | "magic" | "heal";
  ttl: number;
}

export interface FloatText {
  row: number;
  col: number;
  text: string;
  kind: "dmg" | "heal" | "crit";
  ttl: number;
}

export interface CombatResult {
  winner: Side;
  survivingEnemies: number;
}

// --- trait tier tables (origins/classes) ---
const VANGUARD_HP = [150, 350, 700, 1100];
const VANGUARD_ARMOR = [10, 25, 45, 70];
const IRON_DEF = [20, 45, 80];
const ARCANE_SP = [15, 35, 65];
const FROST_AS = [12, 22, 35];
const SHADOW_CRIT = [15, 30, 55];
const SHADOW_EXEC = [10, 16, 25];
const CELESTIAL_VAMP = [8, 16, 28];
const TIDAL_MANA = [3, 7, 12];
const VOID_PEN = [15, 35, 60];
const WARLOCK_VAMP = [12, 25, 45];
const MAGE_SP = [20, 45, 80, 125];
const MAGE_ECHO = [10, 20, 35, 50];
const RANGER_AD = [15, 35, 65];
const ASSASSIN_CRITDMG = [20, 40, 75];
const GUARDIAN_SHIELD = [180, 420, 800];
const SUMMONER_BUFF = [25, 60, 110];
const EMBER_BURN = [3, 6, 10];
const VERDANT_HEAL = [3, 6, 10];
const STORM_CHAIN = [70, 140, 240];
const DUELIST_CAP = [4, 6, 8, 10];

function tierVal(thresholds: number[], count: number, values: number[]): number {
  const idx = activeTierIndex(thresholds, count);
  return idx >= 0 ? values[idx] : 0;
}

interface TraitContext {
  count: (t: TraitName) => number;
}

function aggregateItems(items: string[]) {
  let ad = 0, sp = 0, armor = 0, mr = 0, startMana = 0, hp = 0, as = 0, crit = 0;
  for (const id of items) {
    const it = getItem(id);
    if (!it) continue;
    const s = it.stats;
    ad += s.ad ?? 0;
    sp += s.sp ?? 0;
    armor += s.armor ?? 0;
    mr += s.mr ?? 0;
    startMana += s.startMana ?? 0;
    hp += s.hp ?? 0;
    as += s.attackSpeed ?? 0;
    crit += s.crit ?? 0;
  }
  return { ad, sp, armor, mr, startMana, hp, as, crit };
}

function buildPlayerEntity(inst: UnitInstance, ctx: TraitContext, idx: number): CombatEntity {
  const def = UNIT_BY_ID[inst.defId];
  const scale = STAR_SCALING[inst.star];
  const items = aggregateItems(inst.items);

  const origins = ctx;
  const cls = (c: string) => origins.count(c as TraitName);
  const org = (o: string) => origins.count(o as TraitName);

  const ORIGIN_T = [2, 4, 6];

  let maxHP = def.hp * scale + items.hp;
  let ad = def.attackDamage * scale + items.ad;
  let sp = items.sp;
  let armor = items.armor;
  let mr = items.mr;
  let range = def.range;
  let asBonusPct = items.as;
  let critChance = items.crit;
  let critDamage = 1.5;
  let armorPen = 0;
  let magicPen = 0;
  let omnivamp = 0;
  let spellVamp = 0;

  // Vanguard
  if (def.classes.includes("Vanguard")) {
    const c = cls("Vanguard");
    maxHP += tierVal([2, 4, 6, 8], c, VANGUARD_HP);
    armor += tierVal([2, 4, 6, 8], c, VANGUARD_ARMOR);
  }
  // Iron
  if (def.origin === "Iron") {
    const c = org("Iron");
    const d = tierVal(ORIGIN_T, c, IRON_DEF);
    armor += d;
    mr += d;
  }
  // Arcane
  if (def.origin === "Arcane") {
    sp += tierVal(ORIGIN_T, org("Arcane"), ARCANE_SP);
  }
  // Mage
  let isMage = def.classes.includes("Mage");
  if (isMage) {
    sp += tierVal([2, 4, 6, 8], cls("Mage"), MAGE_SP);
  }
  // Shadow
  let shadowExecutePct = 0;
  if (def.origin === "Shadow") {
    const c = org("Shadow");
    critChance += tierVal(ORIGIN_T, c, SHADOW_CRIT);
    shadowExecutePct = tierVal(ORIGIN_T, c, SHADOW_EXEC) / 100;
  }
  // Assassin
  if (def.classes.includes("Assassin")) {
    critDamage += tierVal(ORIGIN_T, cls("Assassin"), ASSASSIN_CRITDMG) / 100;
  }
  // Celestial
  if (def.origin === "Celestial") {
    omnivamp += tierVal(ORIGIN_T, org("Celestial"), CELESTIAL_VAMP) / 100;
  }
  // Warlock
  if (def.classes.includes("Warlock")) {
    spellVamp += tierVal(ORIGIN_T, cls("Warlock"), WARLOCK_VAMP) / 100;
  }
  // Void
  if (def.origin === "Void") {
    const p = tierVal(ORIGIN_T, org("Void"), VOID_PEN) / 100;
    armorPen += p;
    magicPen += p;
  }
  // Ranger
  if (def.classes.includes("Ranger")) {
    const c = cls("Ranger");
    if (activeTierIndex(ORIGIN_T, c) >= 0) range += 1;
  }
  // Storm AS at tier3
  let storm = def.origin === "Storm";
  let stormChain = 0;
  if (storm) {
    const c = org("Storm");
    stormChain = tierVal(ORIGIN_T, c, STORM_CHAIN);
    if (activeTierIndex(ORIGIN_T, c) >= 2) asBonusPct += 15;
  }
  // Ember burn
  let emberBurnPct = 0;
  let emberSpread = false;
  if (def.origin === "Ember") {
    const c = org("Ember");
    emberBurnPct = tierVal(ORIGIN_T, c, EMBER_BURN) / 100;
    emberSpread = activeTierIndex(ORIGIN_T, c) >= 2;
  }
  // Frost
  let frostSlowPct = 0;
  let frostFreeze = false;
  if (def.origin === "Frost") {
    const c = org("Frost");
    frostSlowPct = tierVal(ORIGIN_T, c, FROST_AS);
    frostFreeze = activeTierIndex(ORIGIN_T, c) >= 2;
  }
  // Verdant
  let verdant = def.origin === "Verdant";
  let verdantHealPct = 0;
  if (verdant) {
    const c = org("Verdant");
    verdantHealPct = tierVal(ORIGIN_T, c, VERDANT_HEAL) / 100;
    if (activeTierIndex(ORIGIN_T, c) >= 2) maxHP *= 1.12;
  }
  // Iron reflect
  const ironReflect = def.origin === "Iron" && activeTierIndex(ORIGIN_T, org("Iron")) >= 2;

  // Tidal mana per attack handled in attack via flag
  const tidalMana = def.origin === "Tidal" ? tierVal(ORIGIN_T, org("Tidal"), TIDAL_MANA) : 0;

  // Mage echo
  const mageEcho = isMage ? tierVal([2, 4, 6, 8], cls("Mage"), MAGE_ECHO) / 100 : 0;

  // archetype
  let archetype: CombatEntity["archetype"] = "damage";
  if (def.classes.includes("Cleric")) archetype = "heal";
  else if (def.classes.includes("Guardian")) archetype = "shield";
  else if (def.classes.includes("Summoner")) archetype = "summon";

  const isCaster =
    isMage ||
    def.classes.includes("Warlock") ||
    ["Arcane", "Frost", "Void", "Ember", "Storm", "Tidal"].includes(def.origin) &&
      (isMage || def.classes.includes("Warlock"));
  const skillKind: "magic" | "physical" = isMage || def.classes.includes("Warlock") ? "magic" : "physical";

  let skillBurst = (def.attackDamage * 2.2 + 160) * scale + sp * 1.6;
  skillBurst *= 1 + mageEcho * 0.35;
  const healAmt = (180 + def.hp * 0.12) * scale + sp;
  const shieldAmt = (200 + def.hp * 0.25) * scale +
    (def.classes.includes("Guardian") ? tierVal(ORIGIN_T, cls("Guardian"), GUARDIAN_SHIELD) : 0);

  const startMana = items.startMana;
  const row = inst.row ?? 5;
  const col = inst.col ?? idx % 8;

  const e: CombatEntity = {
    id: `p_${inst.iid}`,
    side: "player",
    name: def.name,
    defId: def.id,
    star: inst.star,
    cost: def.cost,
    row,
    col,
    maxHP: Math.round(maxHP),
    hp: Math.round(maxHP),
    shield: 0,
    ad: Math.round(ad),
    sp: Math.round(sp),
    armor,
    mr,
    range,
    maxMana: def.mana,
    mana: Math.min(def.mana, startMana),
    asBonusPct,
    asStacks: 0,
    asPerStack: def.classes.includes("Duelist") ? 8 : 0,
    asStackCap: def.classes.includes("Duelist") ? tierVal([2, 4, 6, 8], cls("Duelist"), DUELIST_CAP) : 0,
    critChance,
    critDamage,
    armorPen,
    magicPen,
    omnivamp,
    spellVamp,
    attackCd: 0,
    moveCd: 0,
    alive: true,
    isSummon: false,
    burnDps: 0,
    burnRemaining: 0,
    slowPct: 0,
    slowRemaining: 0,
    stunRemaining: 0,
    emberBurnPct,
    emberSpread,
    frostSlowPct,
    frostFreeze,
    ironReflect,
    shadowExecutePct,
    archetype,
    skillKind,
    skillBurst: Math.round(skillBurst),
    healAmt: Math.round(healAmt),
    shieldAmt: Math.round(shieldAmt),
    isMage,
    isCaster,
    isBoss: false,
    hasRevive: def.id === 51, // Ember Phoenix
    verdant,
    verdantHealPct,
    storm,
    stormChain,
  };
  // tidal mana stored via asPerStack? use separate via closure: attach
  (e as any).tidalMana = tidalMana;
  return e;
}

function buildEnemyEntity(m: RoundMonster, idx: number): CombatEntity {
  const isCaster = m.range >= 3 || m.role.includes("caster") || m.role.includes("magic");
  const e: CombatEntity = {
    id: `e_${idx}`,
    side: "enemy",
    name: m.name,
    star: 1,
    cost: m.isBoss ? 5 : m.isElite ? 3 : 1,
    row: 0,
    col: 0,
    maxHP: m.hp,
    hp: m.hp,
    shield: 0,
    ad: m.attackDamage,
    sp: m.spellPower,
    armor: m.isBoss ? 40 : m.isElite ? 25 : 10,
    mr: m.isBoss ? 40 : m.isElite ? 25 : 10,
    range: m.range,
    maxMana: m.mana,
    mana: 0,
    asBonusPct: 0,
    asStacks: 0,
    asPerStack: 0,
    asStackCap: 0,
    critChance: 0,
    critDamage: 1.5,
    armorPen: 0,
    magicPen: 0,
    omnivamp: 0,
    spellVamp: 0,
    attackCd: 0,
    moveCd: 0,
    alive: true,
    isSummon: false,
    burnDps: 0,
    burnRemaining: 0,
    slowPct: 0,
    slowRemaining: 0,
    stunRemaining: 0,
    emberBurnPct: 0,
    emberSpread: false,
    frostSlowPct: 0,
    frostFreeze: false,
    ironReflect: false,
    shadowExecutePct: 0,
    archetype: "damage",
    skillKind: isCaster ? "magic" : "physical",
    skillBurst: Math.round((m.attackDamage * 1.8 + 120) + m.spellPower * 1.5),
    healAmt: 0,
    shieldAmt: m.isBoss ? m.hp * 0.25 : 0,
    isMage: isCaster,
    isCaster,
    isBoss: m.isBoss,
    verdant: false,
    verdantHealPct: 0,
    storm: false,
    stormChain: 0,
  };
  return e;
}

function cheby(a: CombatEntity, b: CombatEntity): number {
  return Math.max(Math.abs(a.row - b.row), Math.abs(a.col - b.col));
}

export class Combat {
  rng: RNG;
  entities: CombatEntity[] = [];
  projectiles: Projectile[] = [];
  floats: FloatText[] = [];
  time = 0;
  done = false;
  result: CombatResult | null = null;
  private occupied = new Set<string>();
  private verdantTimer = 0;
  private stormTimer = 0;

  constructor(playerBoard: UnitInstance[], monsters: RoundMonster[], seed: number) {
    this.rng = new RNG(seed);
    const counts = computeTraitCounts(playerBoard);
    const ctx: TraitContext = { count: (t) => counts.get(t) ?? 0 };

    playerBoard.forEach((inst, i) => {
      const e = buildPlayerEntity(inst, ctx, i);
      this.entities.push(e);
    });

    // Place enemies in top rows 0-3.
    monsters.forEach((m, i) => {
      const e = buildEnemyEntity(m, i);
      if (m.isBoss) {
        e.row = 0;
        e.col = 3 + (i % 2);
      } else {
        e.row = (i % 3) ; // rows 0..2
        e.col = i % 8;
      }
      this.entities.push(e);
    });

    this.resolveInitialPlacement();
    this.applyCombatStart(playerBoard, ctx);
  }

  private cellKey(r: number, c: number) {
    return `${r},${c}`;
  }

  private resolveInitialPlacement() {
    // Ensure unique cells; if collision, nudge.
    this.occupied.clear();
    for (const e of this.entities) {
      let r = Math.max(0, Math.min(7, Math.round(e.row)));
      let c = Math.max(0, Math.min(7, Math.round(e.col)));
      let tries = 0;
      while (this.occupied.has(this.cellKey(r, c)) && tries < 64) {
        c = (c + 1) % 8;
        if (c === 0) r = e.side === "player" ? Math.min(7, r + 1) : (r + 1) % 4;
        tries++;
      }
      e.row = r;
      e.col = c;
      this.occupied.add(this.cellKey(r, c));
    }
  }

  private applyCombatStart(playerBoard: UnitInstance[], ctx: TraitContext) {
    // Guardian shields at start
    for (const e of this.entities) {
      if (e.side === "player" && e.archetype === "shield") {
        e.shield += e.shieldAmt * 0.5;
      }
      // Assassin leap toward enemy backline
      if (e.side === "player" && e.defId && UNIT_BY_ID[e.defId].classes.includes("Assassin")) {
        this.occupied.delete(this.cellKey(e.row, e.col));
        let r = 0;
        let c = e.col;
        let tries = 0;
        while (this.occupied.has(this.cellKey(r, c)) && tries < 16) {
          c = (c + 1) % 8;
          tries++;
        }
        e.row = r;
        e.col = c;
        e.untargetableUntil = TICK;
        this.occupied.add(this.cellKey(r, c));
      }
    }

    // Engineer turrets & Summoner pre-summons
    const players = this.entities.filter((e) => e.side === "player" && !e.isSummon);
    const avgAD = players.length ? players.reduce((s, e) => s + e.ad, 0) / players.length : 50;
    const engineerCount = ctx.count("Engineer");
    const engTier = activeTierIndex([2, 4, 6], engineerCount);
    if (engTier >= 0) {
      const turrets = [1, 2, 3][engTier];
      const pct = [0.2, 0.3, 0.45][engTier];
      for (let i = 0; i < turrets; i++) {
        this.spawnSummon("Turret", avgAD * pct, 600, 3, true);
      }
    }
  }

  private spawnSummon(name: string, ad: number, hp: number, range: number, isTurret: boolean) {
    // find empty player cell in rows 5-7
    let placed = false;
    let row = 6, col = 0;
    for (let r = 7; r >= 4 && !placed; r--) {
      for (let c = 0; c < 8; c++) {
        if (!this.occupied.has(this.cellKey(r, c))) {
          row = r;
          col = c;
          placed = true;
          break;
        }
      }
    }
    if (!placed) return;
    const e: CombatEntity = {
      id: `sum_${name}_${this.rng.int(1e6)}`,
      side: "player",
      name,
      star: 1,
      cost: 0,
      row,
      col,
      maxHP: hp,
      hp,
      shield: 0,
      ad,
      sp: 0,
      armor: 0,
      mr: 0,
      range,
      maxMana: 0,
      mana: 0,
      asBonusPct: isTurret ? 20 : 0,
      asStacks: 0,
      asPerStack: 0,
      asStackCap: 0,
      critChance: 0,
      critDamage: 1.5,
      armorPen: 0,
      magicPen: 0,
      omnivamp: 0,
      spellVamp: 0,
      attackCd: 0,
      moveCd: 0,
      alive: true,
      isSummon: true,
      burnDps: 0,
      burnRemaining: 0,
      slowPct: 0,
      slowRemaining: 0,
      stunRemaining: 0,
      emberBurnPct: 0,
      emberSpread: false,
      frostSlowPct: 0,
      frostFreeze: false,
      ironReflect: false,
      shadowExecutePct: 0,
      archetype: "damage",
      skillKind: "physical",
      skillBurst: 0,
      healAmt: 0,
      shieldAmt: 0,
      isMage: false,
      isCaster: false,
      isBoss: false,
      verdant: false,
      verdantHealPct: 0,
      storm: false,
      stormChain: 0,
    };
    this.occupied.add(this.cellKey(row, col));
    this.entities.push(e);
  }

  private aps(e: CombatEntity): number {
    const bonus = e.asBonusPct + e.asStacks * e.asPerStack - e.slowPct;
    return Math.max(0.2, BASE_APS * (1 + bonus / 100));
  }

  private enemiesOf(e: CombatEntity): CombatEntity[] {
    return this.entities.filter((o) => o.alive && o.side !== e.side);
  }

  private nearestEnemy(e: CombatEntity): CombatEntity | null {
    let best: CombatEntity | null = null;
    let bestD = Infinity;
    for (const o of this.entities) {
      if (!this.canTarget(e, o)) continue;
      const d = cheby(e, o);
      if (d < bestD) {
        bestD = d;
        best = o;
      }
    }
    return best;
  }

  private canTarget(e: CombatEntity, target: CombatEntity): boolean {
    if (!target.alive || target.side === e.side) return false;
    if (target.untargetableUntil !== undefined && this.time <= target.untargetableUntil) {
      return false;
    }
    return true;
  }

  private targetFor(e: CombatEntity): CombatEntity | null {
    const locked = e.targetId ? this.entities.find((o) => o.id === e.targetId) : null;
    if (locked && this.canTarget(e, locked)) return locked;

    const next = this.nearestEnemy(e);
    e.targetId = next?.id;
    return next;
  }

  private lowestAlly(e: CombatEntity): CombatEntity | null {
    let best: CombatEntity | null = null;
    let bestR = Infinity;
    for (const o of this.entities) {
      if (!o.alive || o.side !== e.side) continue;
      const r = o.hp / o.maxHP;
      if (r < bestR) {
        bestR = r;
        best = o;
      }
    }
    return best;
  }

  private moveToward(e: CombatEntity, target: CombatEntity) {
    if (e.isSummon && e.name === "Turret") return; // turrets stationary
    if (e.moveCd > 0) return;
    let bestR = e.row;
    let bestC = e.col;
    let bestD = cheby(e, target);
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = e.row + dr;
        const nc = e.col + dc;
        if (nr < 0 || nr > 7 || nc < 0 || nc > 7) continue;
        if (this.occupied.has(this.cellKey(nr, nc))) continue;
        const d = Math.max(Math.abs(nr - target.row), Math.abs(nc - target.col));
        if (d < bestD) {
          bestD = d;
          bestR = nr;
          bestC = nc;
        }
      }
    }
    if (bestR !== e.row || bestC !== e.col) {
      this.occupied.delete(this.cellKey(e.row, e.col));
      e.row = bestR;
      e.col = bestC;
      this.occupied.add(this.cellKey(e.row, e.col));
      e.moveCd = MOVE_INTERVAL;
    }
  }

  private dealDamage(
    source: CombatEntity | null,
    target: CombatEntity,
    raw: number,
    kind: "physical" | "magic",
    isCrit = false
  ) {
    if (!target.alive) return 0;
    let pen = 0;
    if (source) pen = kind === "physical" ? source.armorPen : source.magicPen;
    const defStat = kind === "physical" ? target.armor : target.mr;
    const effDef = defStat * (1 - pen);
    let dmg = raw * (100 / (100 + Math.max(0, effDef)));
    // shield absorb
    if (target.shield > 0) {
      const absorbed = Math.min(target.shield, dmg);
      target.shield -= absorbed;
      dmg -= absorbed;
    }
    target.hp -= dmg;
    // mana on taking damage
    target.mana = Math.min(target.maxMana, target.mana + Math.max(1, Math.min(10, dmg / 50)));
    // float text
    this.floats.push({
      row: target.row,
      col: target.col,
      text: Math.round(dmg).toString(),
      kind: isCrit ? "crit" : "dmg",
      ttl: 0.5,
    });
    // lifesteal for source
    if (source && dmg > 0) {
      const vampFrac = source.omnivamp + (kind === "magic" ? source.spellVamp : 0);
      if (vampFrac > 0) this.heal(source, dmg * vampFrac);
    }
    // iron reflect
    if (target.ironReflect && source && dmg > 0) {
      source.hp -= dmg * 0.08;
    }
    // shadow execute (only player attackers)
    if (source && source.shadowExecutePct > 0 && target.alive) {
      if (target.hp / target.maxHP < source.shadowExecutePct) {
        target.hp = -1;
      }
    }
    if (target.hp <= 0) this.kill(target);
    return dmg;
  }

  private heal(target: CombatEntity, amount: number) {
    if (!target.alive) return;
    const before = target.hp;
    target.hp = Math.min(target.maxHP, target.hp + amount);
    const healed = target.hp - before;
    if (healed > 1) {
      this.floats.push({ row: target.row, col: target.col, text: `+${Math.round(healed)}`, kind: "heal", ttl: 0.5 });
    }
  }

  private kill(e: CombatEntity) {
    if (e.hasRevive && !e.revived) {
      e.revived = true;
      e.hp = e.maxHP * 0.45;
      e.shield = 0;
      return;
    }
    e.alive = false;
    for (const other of this.entities) {
      if (other.targetId === e.id) other.targetId = undefined;
    }
    this.occupied.delete(this.cellKey(e.row, e.col));
  }

  private applyOnHit(source: CombatEntity, target: CombatEntity) {
    // Ember burn
    if (source.emberBurnPct > 0) {
      const total = target.maxHP * source.emberBurnPct;
      target.burnDps = total / 4;
      target.burnRemaining = 4;
    }
    // Frost slow
    if (source.frostSlowPct > 0) {
      target.slowPct = Math.max(target.slowPct, source.frostSlowPct);
      target.slowRemaining = 3;
    }
  }

  private attack(e: CombatEntity, target: CombatEntity) {
    let crit = false;
    let dmg = e.ad;
    if (e.critChance > 0 && this.rng.chance(e.critChance / 100)) {
      crit = true;
      dmg *= e.critDamage;
    }
    this.projectiles.push({
      fromRow: e.row,
      fromCol: e.col,
      toRow: target.row,
      toCol: target.col,
      kind: "attack",
      ttl: 0.15,
    });
    this.dealDamage(e, target, dmg, "physical", crit);
    this.applyOnHit(e, target);
    // mana on attack
    const tidal = (e as any).tidalMana ?? 0;
    e.mana = Math.min(e.maxMana, e.mana + 10 + tidal);
    // duelist stacks
    if (e.asPerStack > 0 && e.asStacks < e.asStackCap) e.asStacks++;
    e.attackCd = 1 / this.aps(e);
  }

  private cast(e: CombatEntity, target: CombatEntity | null) {
    e.mana = 0;
    if (e.archetype === "heal") {
      const ally = this.lowestAlly(e);
      if (ally) {
        this.heal(ally, e.healAmt);
        this.projectiles.push({ fromRow: e.row, fromCol: e.col, toRow: ally.row, toCol: ally.col, kind: "heal", ttl: 0.3 });
      }
      if (target) this.dealDamage(e, target, e.skillBurst * 0.4, e.skillKind);
      return;
    }
    if (e.archetype === "shield") {
      e.shield += e.shieldAmt;
      // adjacent allies
      for (const o of this.entities) {
        if (o.alive && o.side === e.side && o.id !== e.id && cheby(e, o) <= 1) {
          o.shield += e.shieldAmt * 0.5;
        }
      }
      if (target) this.dealDamage(e, target, e.skillBurst * 0.5, e.skillKind);
      return;
    }
    if (e.archetype === "summon") {
      this.spawnSummon("Summon", e.ad * 0.6, e.maxHP * 0.5, 1, false);
      if (target) this.dealDamage(e, target, e.skillBurst * 0.6, e.skillKind);
      return;
    }
    // damage
    if (!target) return;
    this.projectiles.push({ fromRow: e.row, fromCol: e.col, toRow: target.row, toCol: target.col, kind: "magic", ttl: 0.3 });
    this.dealDamage(e, target, e.skillBurst, e.skillKind);
    // Mage AoE splash
    if (e.isMage) {
      const others = this.enemiesOf(e)
        .filter((o) => o.id !== target.id)
        .sort((a, b) => cheby(e, a) - cheby(e, b))
        .slice(0, 2);
      for (const o of others) this.dealDamage(e, o, e.skillBurst * 0.5, e.skillKind);
    }
    // Boss CC
    if (e.isBoss && target) {
      target.stunRemaining = Math.max(target.stunRemaining, 1);
      target.slowPct = Math.max(target.slowPct, 30);
      target.slowRemaining = 3;
    }
  }

  private periodicTraits() {
    // Verdant heal every 5s
    if (this.verdantTimer >= 5) {
      this.verdantTimer -= 5;
      for (const e of this.entities) {
        if (e.alive && e.verdant && e.verdantHealPct > 0) {
          this.heal(e, (e.maxHP - e.hp) * e.verdantHealPct);
        }
      }
    }
    // Storm chain every 4s
    if (this.stormTimer >= 4) {
      this.stormTimer -= 4;
      for (const e of this.entities) {
        if (e.alive && e.storm && e.stormChain > 0) {
          const tgt = this.nearestEnemy(e);
          if (tgt) {
            this.projectiles.push({ fromRow: e.row, fromCol: e.col, toRow: tgt.row, toCol: tgt.col, kind: "magic", ttl: 0.25 });
            this.dealDamage(e, tgt, e.stormChain, "magic");
          }
        }
      }
    }
  }

  tick(): void {
    if (this.done) return;
    const dt = TICK;
    this.time += dt;
    this.verdantTimer += dt;
    this.stormTimer += dt;

    // expire projectiles/floats
    this.projectiles = this.projectiles.filter((p) => (p.ttl -= dt) > 0);
    this.floats = this.floats.filter((f) => (f.ttl -= dt) > 0);

    this.periodicTraits();

    for (const e of this.entities) {
      if (!e.alive) continue;
      // status timers
      if (e.attackCd > 0) e.attackCd -= dt;
      if (e.moveCd > 0) e.moveCd -= dt;
      if (e.slowRemaining > 0) {
        e.slowRemaining -= dt;
        if (e.slowRemaining <= 0) e.slowPct = 0;
      }
      if (e.burnRemaining > 0) {
        this.dealDamage(null, e, e.burnDps * dt, "magic");
        e.burnRemaining -= dt;
      }
      if (e.stunRemaining > 0) {
        e.stunRemaining -= dt;
        continue;
      }
      if (!e.alive) continue;

      const target = this.targetFor(e);
      if (!target) continue;

      // cast if full mana
      if (e.maxMana > 0 && e.mana >= e.maxMana) {
        this.cast(e, target);
        continue;
      }

      const d = cheby(e, target);
      if (d <= e.range) {
        if (e.attackCd <= 0) this.attack(e, target);
      } else {
        this.moveToward(e, target);
      }
    }

    this.checkEnd();
  }

  private checkEnd() {
    const playerAlive = this.entities.some((e) => e.alive && e.side === "player" && !e.isSummon);
    const enemyAlive = this.entities.filter((e) => e.alive && e.side === "enemy");
    if (!playerAlive) {
      this.finish("enemy");
      return;
    }
    if (enemyAlive.length === 0) {
      this.finish("player");
      return;
    }
    if (this.time >= COMBAT_TIMEOUT_S) {
      // higher total remaining HP% wins; tie -> player loses
      const sidePct = (side: Side) => {
        const es = this.entities.filter((e) => e.side === side && !e.isSummon);
        if (es.length === 0) return 0;
        return es.reduce((s, e) => s + Math.max(0, e.hp) / e.maxHP, 0) / es.length;
      };
      const p = sidePct("player");
      const en = sidePct("enemy");
      this.finish(p > en ? "player" : "enemy");
    }
  }

  private finish(winner: Side) {
    this.done = true;
    const survivingEnemies = this.entities.filter((e) => e.alive && e.side === "enemy").length;
    this.result = { winner, survivingEnemies };
  }

  runToCompletion(maxTicks = Math.ceil(COMBAT_TIMEOUT_S / TICK) + 5): CombatResult {
    let t = 0;
    while (!this.done && t < maxTicks) {
      this.tick();
      t++;
    }
    if (!this.done) this.finish("enemy");
    return this.result!;
  }
}

// Headless simulate for non-UI use.
export function simulateCombat(
  playerBoard: UnitInstance[],
  monsters: RoundMonster[],
  seed: number
): CombatResult {
  const c = new Combat(playerBoard, monsters, seed);
  return c.runToCompletion();
}
