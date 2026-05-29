# Relic Arena — Hundred-Round Gauntlet

[한국어 README](README.ko.md) · [Data compendium](docs/game-data/README.ko.md) · [Patch notes](PATCH_NOTES.md)

Current version: `v1.0.3`

An original single-player PvE auto-battler. Draft units, build origin/class synergies, manage a finite unit pool, forge items, and survive 100 escalating rounds. Fully client-side (Vite + React + TypeScript), deterministic seeded RNG, state persisted to `localStorage`.

All names, units, traits, items, icons, and copy are original. No third-party IP, assets, or references are used. Every icon is procedurally generated SVG — nothing is fetched.

Play online: https://pinehill99.github.io/relic-arena/

## Development process

Relic Arena was built as a fully client-side game prototype, with the core rules separated from the React UI so the game can be tested without a browser. The implementation pass focused on three layers:

- **Game model:** typed unit, trait, item, monster, economy, shop, pool, and round definitions.
- **Simulation engine:** deterministic seeded RNG, auto-combat ticks, synergy scoring, item recipes, star upgrades, and a headless 100-round smoke test.
- **Playable interface:** an 8x8 board, bench, shop, inventory, inspector, event log, local save state, and one-click combat flow.

The balancing data is generated and audited with repeatable checks. The current validation suite confirms the roster counts, 8 basic items, 20 tier-1 items, 100 tier-2 recipes, shop odds, 100 generated rounds, and a full 100-round combat simulation.

## Gameplay videos

The clips below show the public GitHub Pages build in play.

<video src="docs/media/relic-arena-gameplay-overview.mp4" controls width="100%" title="Relic Arena gameplay overview"></video>

[Open gameplay overview video](docs/media/relic-arena-gameplay-overview.mp4)

<video src="docs/media/relic-arena-gameplay-combat.mp4" controls width="100%" title="Relic Arena combat and interface"></video>

[Open combat and interface video](docs/media/relic-arena-gameplay-combat.mp4)

## 1. Run instructions

```bash
npm install
npm run dev      # launches the game at http://localhost:5173
```

Other scripts:

```bash
npm run build    # type-check + production build
npm run verify   # headless: runs all count assertions + a 100-round combat smoke test
npm test         # vitest unit tests (counts, recipes, odds)
```

## 2. Controls and UI

- **Top bar:** current round / 100, difficulty multiplier, field combat power, run seed, **New Run**.
- **Center:** the 8×8 board. The **top 4 rows** are the enemy zone (shows the next round's enemy preview during prep, and live enemies during combat). The **bottom 4 rows** are your placement zone. Below the board is your **9-slot bench**.
- **Left rail:** active synergies (tier-colored when active) and your item inventory.
- **Right rail:** a hover **inspector** (units, shop cards, items, traits, monsters) and a recent-events log.
- **Bottom bar:** HP, gold, level, XP bar, **Buy XP**, **Reroll**, the **5-slot shop**, board count, and **Start Combat**.

**Interactions (all click-based):**
- Click a shop card to **buy** (if affordable and bench has room).
- Click a bench/board unit to **select** it, then click a board cell to **place/move**, or click an empty bench slot to **bench** it. Click an occupied cell to **swap**.
- Click an inventory item to select it, then click a unit to **equip** (max 3 items/unit). Equipping a component that completes a recipe **auto-combines** on the unit.
- Click one inventory item then another to **combine** them in the inventory.
- Hover anything to inspect it. Selecting a unit shows a **Sell** button in the inspector. Click an equipped item in the inspector to unequip.
- Press **Start Combat** to fight the round; combat is automatic.

## 3. Economy and XP

- Start: 100 HP, level 3, 8 gold, 5 shop slots.
- **Reroll** costs 2 gold. **Buy XP** costs 4 gold for 4 XP. Each completed round grants +2 XP automatically.
- Round income: `base(round) + interest + winBonus + bossClearBonus`, where base is 4/5/6/7 by round band, interest is `min(5, floor(gold/10))`, win bonus is +1, and a won boss round adds +4.
- Selling a unit refunds 70% of its total invested cost (min 1 gold).
- Losing a normal round costs HP equal to the number of surviving enemies. Losing a **boss round** (every 10th round) costs exactly 10 HP. HP ≤ 0 ends the run; clearing round 100 wins.

XP-to-next-level by current level: 2, 4, 6, 10, 20, 36, 56, 80, 100, then MAX at level 10. **Board cap equals your level.**

## 4. Unit pool and star-up

Copies are shared across one global pool, per cost:

| Cost | Copies/unit | Unique units |
|---:|---:|---:|
| 1 | 29 | 14 |
| 2 | 22 | 13 |
| 3 | 18 | 12 |
| 4 | 12 | 11 |
| 5 | 10 | 10 |

Three 1-star copies auto-merge into a 2-star; three 2-stars into a 3-star. Star scaling is 1.00× / 1.75× / 2.80× on HP and AD. Selling returns the invested copies to the pool. Shop odds shift toward higher costs as your level rises (each level's odds sum to 100).

## 5. Traits — 10 origins and 10 classes

Synergies count **unique fielded units only** (bench excluded). Active thresholds light up bronze → silver → gold → prismatic.

- **Origins** (2/4/6): Ember (burn), Frost (attack-speed shred / freeze), Verdant (missing-HP heal), Storm (chain lightning), Iron (armor/MR + reflect), Void (resist penetration), Celestial (omnivamp + overheal shield), Tidal (mana on attack + CC), Shadow (crit + execute), Arcane (spell power + spell repeat).
- **Classes** (2/4/6, some 8): Vanguard (HP/armor), Duelist (stacking attack speed), Ranger (range + periodic AD), Mage (spell power + echo), Assassin (leap + crit damage), Cleric (heals), Engineer (turrets), Summoner (summon buffs), Guardian (start-of-combat shields), Warlock (spell vamp). Several units carry two classes; both count.

## 6. Items — why exactly 8 / 20 / 100

- **8 basic components** (Blade, Rod, Vest, Cloak, Tear, Belt, Bow, Glove). Only basics drop from monsters.
- **20 tier-1 items.** Counting a self-pair as two slots, each basic appears in five ingredient slots (self+self plus three distinct non-self partners), which yields exactly `8 × 5 / 2 = 20` unique combinations.
- **100 tier-2 completed items.** Tier-2 recipes are **directional**: `base tier-1 + catalyst tier-1`. Each of the 20 tier-1 bases has exactly 5 allowed catalysts (`baseIndex + {1,3,7,11,15} mod 20`, self excluded), giving `20 × 5 = 100` unique completed items. Names follow `${base.prefix} ${catalyst.suffix}`; stats are `base×1.25 + catalyst×0.75`.

Units hold up to 3 items. Equipping a component that completes a recipe combines automatically.

## 7. Round scaling

Rounds are generated procedurally (not hand-authored). `difficulty = 1.066^(round-1)`, chapter `= ceil(round/10)`. Normal enemy count `= clamp(2 + floor(round/5) + floor(round/17), 2, 16)`. Monster HP scales by difficulty × role modifier; AD by `1.052^(round-1)` × role modifier; spell power by `30 × difficulty`. Every 10th round is a boss (a scaled elite-class statline with a signature skill) plus elites and minions drawn from the previous round.

Item-drop schedule is tuned so an average full run yields ~110–118 basics and a lucky run ~125–130 — roughly 28–32 completed items by round 100, enough to fully itemize a strong 9–10 unit board without flooding early. A per-type pity weight before round 30 prevents component starvation.

## 8. Field combat power

A readable summary score (not used to decide combat): per-unit `(HP·0.16 + AD·4 + SP·3 + armor·1.6 + MR·1.4 + AS%·2 + cost·35 + starBonus) × itemMultiplier`, summed and multiplied by `1 + 0.025 × activeTraitThresholds`.

## 9. Known simplifications vs. production auto-battlers

- Combat is a real-time grid sim on a 100 ms tick with a 45 s timeout, but movement is cell-by-cell (no smooth interpolation) and pathing is greedy-nearest.
- Unit skills are resolved by archetype (damage burst / heal / shield / summon) rather than bespoke scripting for all 60 skills; flavor text matches each unit but mechanics are generalized.
- Origin/class effects implement the impactful subset (burn, slow, chain, heals, shields, pen, vamp, crit/execute, duelist ramp, turrets, summons); a few finer clauses are approximated.
- No PvP, no augments/portals, no carousel; PvE only. One save slot in `localStorage`.
- Boss "phase" skills are represented as a heavy burst plus crowd control rather than scripted multi-phase fights.

Determinism: a run is reproducible from its seed — shop rolls and drops advance a persisted RNG state, and each round's monsters/combat derive from the seed and round number.
