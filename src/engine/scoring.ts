import type { UnitInstance } from "../types";
import { UNIT_BY_ID } from "../data/units";
import { getItem } from "../data/items";
import { STAR_SCALING } from "../data/balance";
import { activeThresholdCount } from "./synergies";
import { engineerTurretStats, isEngineerTurret } from "./turrets";

function starBonus(star: number): number {
  return star === 1 ? 0 : star === 2 ? 140 : 420;
}

export function unitFieldPower(inst: UnitInstance): number {
  if (isEngineerTurret(inst)) {
    const def = engineerTurretStats(inst.summon?.tier ?? 0);
    return def.hp * 0.12 + def.adMultiplier * 500 + def.range * 25;
  }

  const def = UNIT_BY_ID[inst.defId];
  if (!def) return 0;
  const scale = STAR_SCALING[inst.star];

  let ad = def.attackDamage * scale;
  let sp = 0;
  let armor = 0;
  let mr = 0;
  let asPct = 0;
  let hp = def.hp * scale;

  let basicCount = 0;
  let t1Count = 0;
  let t2Count = 0;
  for (const id of inst.items) {
    const item = getItem(id);
    if (!item) continue;
    if (item.tier === "basic") basicCount++;
    else if (item.tier === 1) t1Count++;
    else t2Count++;
    const s = item.stats;
    ad += s.ad ?? 0;
    sp += s.sp ?? 0;
    armor += s.armor ?? 0;
    mr += s.mr ?? 0;
    asPct += s.attackSpeed ?? 0;
    hp += s.hp ?? 0;
  }

  const itemMultiplier = 1 + 0.1 * basicCount + 0.18 * t1Count + 0.32 * t2Count;

  const base =
    hp * 0.16 +
    ad * 4.0 +
    sp * 3.0 +
    armor * 1.6 +
    mr * 1.4 +
    asPct * 2.0 +
    def.cost * 35 +
    starBonus(inst.star);

  return base * itemMultiplier;
}

export function fieldPower(board: UnitInstance[]): number {
  const traitMultiplier = 1 + 0.025 * activeThresholdCount(board);
  const sum = board.reduce((s, u) => s + unitFieldPower(u), 0);
  return Math.round(sum * traitMultiplier);
}
