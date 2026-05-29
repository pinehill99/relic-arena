import { UNITS } from "../data/units";
import { POOL_BY_COST } from "../data/balance";

// Initialize the shared unit pool: each unit has POOL_BY_COST[cost].copies copies.
export function initPool(): Record<number, number> {
  const pool: Record<number, number> = {};
  for (const u of UNITS) {
    pool[u.id] = POOL_BY_COST[u.cost].copies;
  }
  return pool;
}

export function poolRemaining(pool: Record<number, number>, defId: number): number {
  return pool[defId] ?? 0;
}

// Return copies to the pool (e.g. when selling).
export function returnToPool(pool: Record<number, number>, defId: number, count: number): void {
  pool[defId] = (pool[defId] ?? 0) + count;
}

export function takeFromPool(pool: Record<number, number>, defId: number, count: number): boolean {
  if ((pool[defId] ?? 0) < count) return false;
  pool[defId] -= count;
  return true;
}
