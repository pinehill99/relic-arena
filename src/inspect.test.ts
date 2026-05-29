import { describe, expect, it } from "vitest";
import type { Inspect } from "./inspect";
import { nextInspectFromHover } from "./inspect";

const selectedUnit = {
  iid: "selected-unit",
  defId: 1,
  star: 1 as const,
  items: [],
  loc: "bench" as const,
};

const hoveredUnit = {
  iid: "hovered-unit",
  defId: 2,
  star: 1 as const,
  items: [],
  loc: "bench" as const,
};

describe("hover inspector locking", () => {
  it("keeps the selected unit inspector while a unit is selected", () => {
    const current: Inspect = { kind: "unit", inst: selectedUnit };
    const hovered: Inspect = { kind: "unit", inst: hoveredUnit };

    expect(nextInspectFromHover(current, hovered, selectedUnit.iid)).toBe(current);
  });

  it("updates the inspector from hover when no unit is selected", () => {
    const current: Inspect = { kind: "unit", inst: selectedUnit };
    const hovered: Inspect = { kind: "unit", inst: hoveredUnit };

    expect(nextInspectFromHover(current, hovered, null)).toBe(hovered);
  });

  it("shows trait details on hover even while a unit is selected", () => {
    const current: Inspect = { kind: "unit", inst: selectedUnit };
    const hovered: Inspect = { kind: "trait", name: "Ember" };

    expect(nextInspectFromHover(current, hovered, selectedUnit.iid)).toBe(hovered);
  });

  it("shows item details on hover even while a unit is selected", () => {
    const current: Inspect = { kind: "unit", inst: selectedUnit };
    const hovered: Inspect = { kind: "item", itemId: "B1" };

    expect(nextInspectFromHover(current, hovered, selectedUnit.iid)).toBe(hovered);
  });
});
