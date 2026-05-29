import { UNITS } from "../data/units";
import { ORIGINS, CLASSES } from "../data/traits";
import { BASIC_ITEMS, TIER1_ITEMS, TIER2_ITEMS } from "../data/items";
import { SHOP_ODDS } from "../data/balance";
import { generateAllRounds } from "../data/rounds";

export interface AssertionResult {
  label: string;
  ok: boolean;
  detail: string;
}

function check(label: string, ok: boolean, detail = ""): AssertionResult {
  return { label, ok, detail };
}

export function runAssertions(): AssertionResult[] {
  const results: AssertionResult[] = [];
  const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

  results.push(check("UNITS.length === 60", UNITS.length === 60, `${UNITS.length}`));
  results.push(
    check("unique unit ids === 60", new Set(UNITS.map((u) => u.id)).size === 60)
  );
  results.push(check("ORIGINS.length === 10", ORIGINS.length === 10, `${ORIGINS.length}`));
  results.push(check("CLASSES.length === 10", CLASSES.length === 10, `${CLASSES.length}`));
  results.push(check("BASIC_ITEMS.length === 8", BASIC_ITEMS.length === 8, `${BASIC_ITEMS.length}`));
  results.push(check("TIER1_ITEMS.length === 20", TIER1_ITEMS.length === 20, `${TIER1_ITEMS.length}`));
  results.push(check("TIER2_ITEMS.length === 100", TIER2_ITEMS.length === 100, `${TIER2_ITEMS.length}`));
  results.push(
    check(
      "unique tier2 ids === 100",
      new Set(TIER2_ITEMS.map((i) => i.id)).size === 100
    )
  );
  results.push(check("all tier2 tier === 2", TIER2_ITEMS.every((i) => i.tier === 2)));
  results.push(check("generateAllRounds().length === 100", generateAllRounds().length === 100));
  results.push(
    check(
      "shop odds rows sum to 100",
      Object.values(SHOP_ODDS).every((row) => sum(row) === 100)
    )
  );
  results.push(check("some unit has 2 classes", UNITS.some((u) => u.classes.length === 2)));
  results.push(check("all units cost 1..5", UNITS.every((u) => u.cost >= 1 && u.cost <= 5)));
  results.push(
    check(
      "all units hp>0 ad>0 mana>=0",
      UNITS.every((u) => u.hp > 0 && u.attackDamage > 0 && u.mana >= 0)
    )
  );
  // origin/class counts: 6 units per origin, etc.
  const originCounts = ORIGINS.map((o) => UNITS.filter((u) => u.origin === o).length);
  results.push(check("each origin has 6 units", originCounts.every((c) => c === 6), originCounts.join(",")));

  return results;
}

export function assertionsPass(): boolean {
  return runAssertions().every((r) => r.ok);
}
