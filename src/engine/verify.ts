// Headless verification: counts + a full 100-round playthrough smoke test.
import { runAssertions } from "./assertions";
import { generateRound } from "../data/rounds";
import { simulateCombat } from "./combat";
import { UNITS } from "../data/units";
import type { UnitInstance } from "../types";
import { newIid } from "./upgrades";
import { RNG } from "./rng";

function makeTestBoard(size: number): UnitInstance[] {
  const picks = UNITS.filter((u) => u.cost >= 3).slice(0, size);
  return picks.map((u, i) => ({
    iid: newIid(),
    defId: u.id,
    star: 2 as const,
    items: [],
    loc: "board" as const,
    row: 6 + (i % 2),
    col: i % 8,
  }));
}

function main() {
  let allOk = true;
  console.log("=== Assertions ===");
  for (const r of runAssertions()) {
    console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.label}${r.detail ? "  (" + r.detail + ")" : ""}`);
    if (!r.ok) allOk = false;
  }

  console.log("\n=== 100-round combat smoke test ===");
  let crashed = false;
  let wins = 0;
  const board = makeTestBoard(10);
  for (let round = 1; round <= 100; round++) {
    try {
      const monsters = generateRound(round, new RNG(999 + round));
      const res = simulateCombat(board, monsters, 12345 + round);
      if (res.winner === "player") wins++;
    } catch (e) {
      console.log(`CRASH at round ${round}:`, e);
      crashed = true;
      allOk = false;
      break;
    }
  }
  console.log(
    `Completed 100 rounds without crash: ${!crashed ? "YES" : "NO"} (sample board won ${wins}/100)`
  );

  console.log(`\nRESULT: ${allOk ? "ALL PASS" : "FAILURES PRESENT"}`);
  process.exit(allOk ? 0 : 1);
}

main();
