import { RNG } from "./rng";
import { SHOP_ODDS, SHOP_SLOTS } from "../data/balance";
import { UNITS_BY_COST } from "../data/units";
import { poolRemaining } from "./pool";

// Roll a single shop slot's unit, respecting level odds and pool availability.
function rollSlot(level: number, pool: Record<number, number>, rng: RNG): number | null {
  const odds = SHOP_ODDS[level];
  // Pick a cost tier weighted by odds, but only among tiers with available units.
  const costs = [1, 2, 3, 4, 5];
  const weights = costs.map((c, i) => {
    if (odds[i] <= 0) return 0;
    // total remaining copies at this cost
    const remaining = UNITS_BY_COST[c].reduce((s, u) => s + poolRemaining(pool, u.id), 0);
    return remaining > 0 ? odds[i] : 0;
  });
  const totalW = weights.reduce((a, b) => a + b, 0);
  if (totalW <= 0) return null;
  const cost = rng.weighted(costs, weights);

  // Among units of that cost, weight by remaining copies.
  const units = UNITS_BY_COST[cost].filter((u) => poolRemaining(pool, u.id) > 0);
  if (units.length === 0) return null;
  const uw = units.map((u) => poolRemaining(pool, u.id));
  const unit = rng.weighted(units, uw);
  return unit.id;
}

// Roll a full shop (does NOT mutate the pool; copies are only consumed on buy).
export function rollShop(level: number, pool: Record<number, number>, rng: RNG): (number | null)[] {
  const slots: (number | null)[] = [];
  for (let i = 0; i < SHOP_SLOTS; i++) {
    slots.push(rollSlot(level, pool, rng));
  }
  return slots;
}
