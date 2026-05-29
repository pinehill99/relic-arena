import type { UnitInstance, ActiveTrait, TraitName } from "../types";
import { UNIT_BY_ID } from "../data/units";
import { ALL_TRAITS, TRAIT_BY_NAME } from "../data/traits";

// Count unique fielded units per trait (bench does not count).
export function computeTraitCounts(board: UnitInstance[]): Map<TraitName, number> {
  const seenDefs = new Set<number>();
  const counts = new Map<TraitName, number>();
  for (const inst of board) {
    if (seenDefs.has(inst.defId)) continue; // unique units only
    seenDefs.add(inst.defId);
    const def = UNIT_BY_ID[inst.defId];
    if (!def) continue;
    const traits: TraitName[] = [def.origin, ...def.classes];
    for (const t of traits) {
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }
  return counts;
}

export function activeTierIndex(thresholds: number[], count: number): number {
  let idx = -1;
  for (let i = 0; i < thresholds.length; i++) {
    if (count >= thresholds[i]) idx = i;
  }
  return idx;
}

export function computeActiveTraits(board: UnitInstance[]): ActiveTrait[] {
  const counts = computeTraitCounts(board);
  const out: ActiveTrait[] = [];
  for (const def of ALL_TRAITS) {
    const count = counts.get(def.name) ?? 0;
    if (count <= 0) continue;
    const tierIdx = activeTierIndex(def.thresholds, count);
    const next = def.thresholds.find((t) => t > count) ?? null;
    out.push({
      name: def.name,
      kind: def.kind,
      count,
      activeTierIndex: tierIdx,
      nextThreshold: next,
      thresholds: def.thresholds,
      description: def.description,
    });
  }
  // sort: active first (higher tier first), then by count
  out.sort((a, b) => {
    if (a.activeTierIndex !== b.activeTierIndex) return b.activeTierIndex - a.activeTierIndex;
    return b.count - a.count;
  });
  return out;
}

// Number of active trait thresholds (for fieldPower trait multiplier).
export function activeThresholdCount(board: UnitInstance[]): number {
  return computeActiveTraits(board).reduce(
    (s, t) => s + (t.activeTierIndex >= 0 ? t.activeTierIndex + 1 : 0),
    0
  );
}

export { TRAIT_BY_NAME };
