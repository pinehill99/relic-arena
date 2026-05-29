import type { RoundMonster, TraitName, UnitInstance } from "./types";

export type Inspect =
  | { kind: "unit"; inst: UnitInstance }
  | { kind: "summon"; inst: UnitInstance }
  | { kind: "shop"; defId: number }
  | { kind: "item"; itemId: string }
  | { kind: "trait"; name: TraitName }
  | { kind: "monster"; m: RoundMonster }
  | null;

export function nextInspectFromHover(
  current: Inspect,
  hovered: NonNullable<Inspect>,
  selectedUnit: string | null
): Inspect {
  if (hovered.kind === "trait") return hovered;
  return selectedUnit ? current : hovered;
}
