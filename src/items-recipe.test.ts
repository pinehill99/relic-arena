import { describe, expect, it } from "vitest";
import { itemRecipeLines } from "./data/items";

describe("itemRecipeLines", () => {
  it("lists tier-1 outputs for a basic component", () => {
    const lines = itemRecipeLines("B1");
    expect(lines.some((l) => l.label === "combines" && l.text.includes("Greatsword"))).toBe(true);
    expect(lines.some((l) => l.text.includes("Blade + Blade"))).toBe(true);
  });

  it("shows parent recipe for tier-1 items", () => {
    const lines = itemRecipeLines("T1-01");
    expect(lines.some((l) => l.label === "recipe" && l.text === "Blade + Blade")).toBe(true);
  });
});
