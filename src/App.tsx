import React, { useEffect, useReducer, useRef, useState, useCallback } from "react";
import type { GameState, RoundMonster } from "./types";
import {
  clone,
  createInitialState,
  reroll,
  buyUnit,
  sellUnit,
  buyXP,
  placeOnBoard,
  moveToBench,
  equipItem,
  unequipItem,
  combineInventory,
  applyRoundResult,
  saveState,
  loadState,
  clearSave,
  boardCount,
} from "./game";
import { UNIT_BY_ID } from "./data/units";
import { getItem } from "./data/items";
import { COST_COLORS, COST_NAMES, REROLL_COST, BUY_XP_COST, MAX_LEVEL, BENCH_SLOTS } from "./data/balance";
import { generateRound, isBossRound, roundDifficulty } from "./data/rounds";
import { RNG } from "./engine/rng";
import { Combat } from "./engine/combat";
import { computeActiveTraits } from "./engine/synergies";
import { fieldPower } from "./engine/scoring";
import { sellValue, xpToNext } from "./engine/economy";
import { TRAIT_BY_NAME, TIER_COLORS, TIER_NAMES } from "./data/traits";
import { UnitIcon, ItemIcon, TraitIcon } from "./components/icons";
import type { Inspect } from "./inspect";
import { nextInspectFromHover } from "./inspect";

const CELL = 58;

function monstersForRound(state: GameState, round: number): RoundMonster[] {
  return generateRound(round, new RNG(state.seed + round * 7919));
}

export default function App() {
  const [gs, setGs] = useState<GameState>(() => loadState() ?? createInitialState());
  const [, forceRender] = useReducer((x) => x + 1, 0);
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [inspect, setInspect] = useState<Inspect>(null);
  const [combat, setCombat] = useState<Combat | null>(null);
  const combatRef = useRef<Combat | null>(null);
  const intervalRef = useRef<number | null>(null);

  // commit a mutation to gs then persist + rerender.
  // Clone first so the updater is pure (safe under StrictMode double-invoke).
  const mutate = useCallback((fn: (s: GameState) => void) => {
    setGs((prev) => {
      const next = clone(prev);
      fn(next);
      saveState(next);
      return next;
    });
  }, []);

  const inspectOnHover = useCallback((hovered: NonNullable<Inspect>) => {
    setInspect((current) => nextInspectFromHover(current, hovered, selectedUnit));
  }, [selectedUnit]);

  useEffect(() => {
    saveState(gs);
  }, [gs]);

  // ---- Combat loop ----
  const startCombat = useCallback(() => {
    if (gs.phase !== "prep") return;
    if (gs.board.length === 0) {
      mutate((s) => s.log.unshift("Place at least one unit before fighting."));
      return;
    }
    const monsters = monstersForRound(gs, gs.round);
    const c = new Combat(gs.board, monsters, gs.seed + gs.round * 104729);
    combatRef.current = c;
    setCombat(c);
    setGs((prev) => ({ ...prev, phase: "combat" }));
    setSelectedUnit(null);
    setSelectedItem(null);

    intervalRef.current = window.setInterval(() => {
      const cc = combatRef.current;
      if (!cc) return;
      // step a few ticks per frame for snappier combat
      cc.tick();
      cc.tick();
      cc.tick();
      forceRender();
      if (cc.done) {
        if (intervalRef.current) window.clearInterval(intervalRef.current);
        intervalRef.current = null;
        const res = cc.result!;
        setTimeout(() => {
          setGs((prev) => {
            const next = clone(prev);
            applyRoundResult(next, res.winner === "player", res.survivingEnemies);
            saveState(next);
            return next;
          });
          combatRef.current = null;
          setCombat(null);
        }, 700);
      }
    }, 70);
  }, [gs, mutate]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, []);

  const newRun = useCallback(() => {
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    clearSave();
    const s = createInitialState();
    combatRef.current = null;
    setCombat(null);
    setGs(s);
    setSelectedUnit(null);
    setSelectedItem(null);
    setInspect(null);
  }, []);

  // ---- click handlers ----
  function onCellClick(row: number, col: number) {
    if (gs.phase !== "prep") return;
    const occupant = gs.board.find((u) => u.row === row && u.col === col);
    const itemId = selectedItem ? selectedItem.split("#")[0] : null;
    if (itemId) {
      if (occupant) {
        mutate((s) => equipItem(s, occupant.iid, itemId));
        setSelectedItem(null);
      }
      return;
    }
    if (selectedUnit) {
      mutate((s) => placeOnBoard(s, selectedUnit, row, col));
      setSelectedUnit(null);
      return;
    }
    if (occupant) {
      setSelectedUnit(occupant.iid);
      setInspect({ kind: "unit", inst: occupant });
    }
  }

  function onBenchClick(idx: number) {
    if (gs.phase !== "prep") return;
    const inst = gs.bench[idx];
    const itemId = selectedItem ? selectedItem.split("#")[0] : null;
    if (itemId) {
      if (inst) {
        mutate((s) => equipItem(s, inst.iid, itemId));
        setSelectedItem(null);
      }
      return;
    }
    if (selectedUnit) {
      // move selected board unit to bench
      const sel = gs.board.find((u) => u.iid === selectedUnit);
      if (sel) {
        mutate((s) => moveToBench(s, selectedUnit));
        setSelectedUnit(null);
        return;
      }
      // selected is a bench unit already; just reselect
    }
    if (inst) {
      setSelectedUnit(inst.iid);
      setInspect({ kind: "unit", inst });
    }
  }

  function onInventoryClick(itemId: string, listIndex: number) {
    if (gs.phase !== "prep") return;
    setInspect({ kind: "item", itemId });
    if (selectedItem && selectedItem !== `${itemId}#${listIndex}`) {
      // attempt combine with previously selected (by id)
      const prevId = selectedItem.split("#")[0];
      const ok = tryCombine(prevId, itemId, listIndex);
      if (ok) {
        setSelectedItem(null);
        return;
      }
    }
    setSelectedItem(`${itemId}#${listIndex}`);
  }

  function tryCombine(idA: string, idB: string, _idx: number): boolean {
    let combined = false;
    mutate((s) => {
      const r = combineInventory(s, idA, idB);
      combined = r !== null;
    });
    return combined;
  }

  // selectedItem stored as `${id}#${index}`; expose plain id for equip
  const selectedItemId = selectedItem ? selectedItem.split("#")[0] : null;
  // override equip handlers to use selectedItemId
  // (handlers above used selectedItem directly; patch by wrapping)

  // ---- derived ----
  const activeTraits = computeActiveTraits(gs.board);
  const power = fieldPower(gs.board);
  const nextMonsters = gs.phase === "prep" ? monstersForRound(gs, gs.round) : [];

  // ---- render helpers ----
  function renderBoard() {
    const rows = [];
    const cc = combat;
    for (let r = 0; r < 8; r++) {
      const cells = [];
      for (let c = 0; c < 8; c++) {
        const isPlayerZone = r >= 4;
        let content: React.ReactNode = null;
        let bg = isPlayerZone ? "#0f1830" : "#1a1326";

        if (cc) {
          const ent = cc.entities.find((e) => e.alive && e.row === r && e.col === c);
          if (ent) content = <CombatToken e={ent} />;
        } else if (gs.phase === "prep") {
          if (isPlayerZone) {
            const occ = gs.board.find((u) => u.row === r && u.col === c);
            if (occ) {
              const def = UNIT_BY_ID[occ.defId];
              const sel = selectedUnit === occ.iid;
              content = (
                <div
                  className={"token" + (sel ? " sel" : "")}
                  onMouseEnter={() => inspectOnHover({ kind: "unit", inst: occ })}
                >
                  <UnitIcon def={def} star={occ.star} size={CELL - 12} />
                  {occ.items.length > 0 && <ItemDots items={occ.items} />}
                </div>
              );
            }
          } else {
            // enemy preview: distribute monsters across top rows
            const idx = (3 - r) * 8 + c; // not exact; we will fill by order
            const m = previewAt(nextMonsters, r, c);
            if (m) {
              content = (
                <div
                  className="token enemy"
                  onMouseEnter={() => inspectOnHover({ kind: "monster", m })}
                >
                  <MonsterToken m={m} />
                </div>
              );
            }
            void idx;
          }
        }

        cells.push(
          <div
            key={c}
            className={"cell" + (isPlayerZone ? " player" : " enemy")}
            style={{ width: CELL, height: CELL, background: bg }}
            onClick={() => onCellClick(r, c)}
          >
            {content}
          </div>
        );
      }
      rows.push(
        <div key={r} className="board-row">
          {cells}
        </div>
      );
    }
    return (
      <div className="board-wrap">
        <div className="board">{rows}</div>
        {cc && <CombatOverlay combat={cc} />}
      </div>
    );
  }

  function renderShop() {
    return (
      <div className="shop">
        {gs.shop.map((defId, i) => {
          if (defId == null)
            return <div key={i} className="shop-card empty" />;
          const def = UNIT_BY_ID[defId];
          const affordable = gs.gold >= def.cost && gs.phase === "prep";
          return (
            <div
              key={i}
              className={"shop-card" + (affordable ? "" : " disabled")}
              style={{ borderColor: def.costColor }}
              onClick={() => affordable && mutate((s) => buyUnit(s, i))}
              onMouseEnter={() => inspectOnHover({ kind: "shop", defId })}
            >
              <div className="shop-icon">
                <UnitIcon def={def} size={40} />
              </div>
              <div className="shop-info">
                <div className="shop-name">{def.name}</div>
                <div className="shop-traits">
                  <TraitIcon name={def.origin} size={13} />
                  <span>{def.origin}</span>
                  {def.classes.map((cl) => (
                    <React.Fragment key={cl}>
                      <TraitIcon name={cl} size={13} />
                      <span>{cl}</span>
                    </React.Fragment>
                  ))}
                </div>
              </div>
              <div className="shop-cost" style={{ color: def.costColor }}>
                {def.cost}g
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  function renderBench() {
    const slots = [];
    for (let i = 0; i < BENCH_SLOTS; i++) {
      const inst = gs.bench[i];
      slots.push(
        <div key={i} className="bench-slot" onClick={() => onBenchClick(i)}>
          {inst && (
            <div
              className={"token" + (selectedUnit === inst.iid ? " sel" : "")}
              onMouseEnter={() => inspectOnHover({ kind: "unit", inst })}
            >
              <UnitIcon def={UNIT_BY_ID[inst.defId]} star={inst.star} size={44} />
              {inst.items.length > 0 && <ItemDots items={inst.items} />}
            </div>
          )}
        </div>
      );
    }
    return <div className="bench">{slots}</div>;
  }

  function renderInventory() {
    return (
      <div className="inventory">
        {gs.inventory.length === 0 && <div className="muted small">No items yet. Win rounds to find components.</div>}
        <div className="inv-grid">
          {gs.inventory.map((id, i) => {
            const item = getItem(id)!;
            const sel = selectedItem === `${id}#${i}`;
            return (
              <div
                key={i}
                className={"inv-item" + (sel ? " sel" : "")}
                onMouseEnter={() => inspectOnHover({ kind: "item", itemId: id })}
                onClick={() => onInventoryClick(id, i)}
                title={item.name}
              >
                <ItemIcon item={item} size={30} />
              </div>
            );
          })}
        </div>
        {selectedItemId && (
          <div className="small muted">
            Selected: {getItem(selectedItemId)?.name}. Click a unit to equip, or another item to combine.
          </div>
        )}
      </div>
    );
  }

  function renderSynergies() {
    return (
      <div className="synergies">
        {activeTraits.length === 0 && <div className="muted small">Field units to activate synergies.</div>}
        {activeTraits.map((t) => {
          const active = t.activeTierIndex >= 0;
          const bg = active ? TIER_COLORS[t.activeTierIndex] : "#1e293b";
          return (
            <div
              key={t.name}
              className={"synergy" + (active ? " active" : "")}
              style={{ background: bg }}
              onMouseEnter={() => inspectOnHover({ kind: "trait", name: t.name })}
            >
              <TraitIcon name={t.name} size={16} />
              <span className="syn-name">{t.name}</span>
              <span className="syn-count">
                {t.count}
                {t.nextThreshold ? `/${t.nextThreshold}` : ""}
              </span>
              {active && <span className="syn-tier">{TIER_NAMES[t.activeTierIndex]}</span>}
            </div>
          );
        })}
      </div>
    );
  }

  function renderInspector() {
    if (!inspect) {
      return <div className="muted small">Hover a unit, item, trait, or enemy to inspect it.</div>;
    }
    if (inspect.kind === "unit" || inspect.kind === "shop") {
      const def = inspect.kind === "unit" ? UNIT_BY_ID[inspect.inst.defId] : UNIT_BY_ID[inspect.defId];
      const inst = inspect.kind === "unit" ? inspect.inst : null;
      return (
        <div className="inspect">
          <div className="insp-head">
            <UnitIcon def={def} size={48} star={inst?.star ?? 1} />
            <div>
              <div className="insp-name" style={{ color: def.costColor }}>
                {def.name} {inst && inst.star > 1 ? "★".repeat(inst.star) : ""}
              </div>
              <div className="small">
                {COST_NAMES[def.cost]} · {def.cost}g
              </div>
            </div>
          </div>
          <div className="insp-traits">
            <span><TraitIcon name={def.origin} size={13} /> {def.origin}</span>
            {def.classes.map((c) => (
              <span key={c}><TraitIcon name={c} size={13} /> {c}</span>
            ))}
          </div>
          <div className="stat-row">
            <span>HP {def.hp}</span>
            <span>AD {def.attackDamage}</span>
            <span>Mana {def.mana}</span>
            <span>Range {def.range}</span>
          </div>
          <div className="skill">
            <b>{def.skillName}</b>: {def.skillText}
          </div>
          <div className="small muted">Pool left: {gs.pool[def.id] ?? 0}</div>
          {inst && (
            <>
              <div className="insp-items">
                {inst.items.map((id, k) => (
                  <div key={k} className="insp-item" onClick={() => gs.phase === "prep" && mutate((s) => unequipItem(s, inst.iid, id))} title="Click to unequip">
                    <ItemIcon item={getItem(id)!} size={26} />
                    <span className="small">{getItem(id)?.name}</span>
                  </div>
                ))}
                {inst.items.length === 0 && <span className="small muted">No items equipped.</span>}
              </div>
              {gs.phase === "prep" && (
                <button className="sell-btn" onClick={() => { mutate((s) => sellUnit(s, inst.iid)); setSelectedUnit(null); setInspect(null); }}>
                  Sell for {sellValue(inst)}g
                </button>
              )}
            </>
          )}
        </div>
      );
    }
    if (inspect.kind === "item") {
      const item = getItem(inspect.itemId)!;
      const tierLabel = item.tier === "basic" ? "Basic" : item.tier === 1 ? "Tier 1" : "Tier 2";
      return (
        <div className="inspect">
          <div className="insp-head">
            <ItemIcon item={item} size={42} />
            <div>
              <div className="insp-name">{item.name}</div>
              <div className="small" style={{ color: item.background }}>{tierLabel}</div>
            </div>
          </div>
          <div className="small">{item.effect}</div>
          <StatList stats={item.stats} />
          {item.recipe && (
            <div className="small muted">
              Recipe: {item.recipe.map((r) => getItem(r)?.name ?? r).join(" + ")}
            </div>
          )}
        </div>
      );
    }
    if (inspect.kind === "trait") {
      const t = TRAIT_BY_NAME[inspect.name];
      const at = activeTraits.find((a) => a.name === inspect.name);
      return (
        <div className="inspect">
          <div className="insp-head">
            <TraitIcon name={t.name} size={36} />
            <div>
              <div className="insp-name">{t.name}</div>
              <div className="small">{t.kind} · thresholds {t.thresholds.join(" / ")}</div>
            </div>
          </div>
          <div className="small">{t.description}</div>
          {at && <div className="small muted">Currently fielded: {at.count} unique</div>}
        </div>
      );
    }
    if (inspect.kind === "monster") {
      const m = inspect.m;
      return (
        <div className="inspect">
          <div className="insp-name">{m.name} {m.isBoss ? "(BOSS)" : m.isElite ? "(Elite)" : ""}</div>
          <div className="stat-row">
            <span>HP {m.hp}</span>
            <span>AD {m.attackDamage}</span>
            <span>Range {m.range}</span>
          </div>
          <div className="small">Role: {m.role}</div>
          {m.bossSkill && <div className="small skill">{m.bossSkill}</div>}
        </div>
      );
    }
    return null;
  }

  // ---- end screen ----
  if (gs.phase === "gameover") {
    return (
      <EndScreen gs={gs} power={power} activeTraits={activeTraits} onNewRun={newRun} />
    );
  }

  const boss = isBossRound(gs.round);

  return (
    <div className="app">
      {/* top bar */}
      <div className="topbar">
        <div className="tb-round">
          <span className={"round-badge" + (boss ? " boss" : "")}>Round {gs.round} / 100</span>
          {boss && <span className="boss-tag">BOSS</span>}
          <span className="small muted">Difficulty ×{roundDifficulty(gs.round).toFixed(2)}</span>
        </div>
        <div className="tb-mid">
          <span className="power">⚔ Field Power: {power}</span>
        </div>
        <div className="tb-right">
          <span className="small muted">Seed {gs.seed}</span>
          <button className="ghost" onClick={newRun}>New Run</button>
        </div>
      </div>

      <div className="layout">
        {/* left rail */}
        <div className="rail left">
          <h3>Active Synergies</h3>
          {renderSynergies()}
          <h3>Items ({gs.inventory.length})</h3>
          {renderInventory()}
        </div>

        {/* center */}
        <div className="center">
          <div className="enemy-banner">
            {gs.phase === "combat" ? (
              <span>Combat in progress…</span>
            ) : (
              <span>
                Next: {nextMonsters.length} enemies
                {boss ? ` · Boss: ${nextMonsters[0]?.name}` : ""}
              </span>
            )}
          </div>
          {renderBoard()}
          {renderBench()}
          {gs.lastResult && gs.phase === "prep" && (
            <div className={"result-flash " + gs.lastResult}>
              {gs.lastResult === "win" ? "Round won!" : "Round lost."}
            </div>
          )}
        </div>

        {/* right rail */}
        <div className="rail right">
          <h3>Inspector</h3>
          {renderInspector()}
          <h3>Log</h3>
          <div className="log">
            {gs.log.slice(0, 12).map((l, i) => (
              <div key={i} className="small log-line">{l}</div>
            ))}
          </div>
        </div>
      </div>

      {/* bottom bar */}
      <div className="bottombar">
        <div className="stats-block">
          <div className="stat hp">❤ {gs.hp}</div>
          <div className="stat gold">⛁ {gs.gold}</div>
          <div className="stat lvl">Lv {gs.level}</div>
          <div className="xpbar">
            <div
              className="xpfill"
              style={{ width: `${gs.level >= MAX_LEVEL ? 100 : Math.min(100, (gs.xp / xpToNext(gs)) * 100)}%` }}
            />
            <span className="xptext">
              {gs.level >= MAX_LEVEL ? "MAX" : `${gs.xp}/${xpToNext(gs)} XP`}
            </span>
          </div>
        </div>
        <div className="actions">
          <button
            className="act"
            disabled={gs.gold < BUY_XP_COST || gs.level >= MAX_LEVEL || gs.phase !== "prep"}
            onClick={() => mutate((s) => buyXP(s))}
          >
            Buy XP<br /><span className="small">{BUY_XP_COST}g → 4XP</span>
          </button>
          <button
            className="act"
            disabled={gs.gold < REROLL_COST || gs.phase !== "prep"}
            onClick={() => mutate((s) => reroll(s))}
          >
            Reroll<br /><span className="small">{REROLL_COST}g</span>
          </button>
        </div>
        {renderShop()}
        <div className="fight-block">
          <div className="small muted">Board {boardCount(gs)}/{gs.level}</div>
          <button className="fight-btn" disabled={gs.phase !== "prep"} onClick={startCombat}>
            {gs.phase === "combat" ? "Fighting…" : "▶ Start Combat"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- small presentational components ----
function StatList({ stats }: { stats: import("./types").ItemStats }) {
  const labels: Record<string, string> = {
    ad: "AD", sp: "SP", armor: "Armor", mr: "MR", startMana: "Mana", hp: "HP", attackSpeed: "AS%", crit: "Crit%",
  };
  const entries = Object.entries(stats).filter(([, v]) => v);
  if (!entries.length) return null;
  return (
    <div className="stat-row">
      {entries.map(([k, v]) => (
        <span key={k}>{labels[k] ?? k} +{v}</span>
      ))}
    </div>
  );
}

function ItemDots({ items }: { items: string[] }) {
  return (
    <div className="item-dots">
      {items.map((id, i) => (
        <span key={i} className="dot" style={{ background: getItem(id)?.background }} />
      ))}
    </div>
  );
}

function MonsterToken({ m }: { m: RoundMonster }) {
  const color = m.isBoss ? "#ef4444" : m.isElite ? "#f59e0b" : "#94a3b8";
  return (
    <div className="mon-token" style={{ borderColor: color }}>
      <span className="mon-letter" style={{ color }}>{m.name[0]}</span>
    </div>
  );
}

function CombatToken({ e }: { e: import("./engine/combat").CombatEntity }) {
  const hpPct = Math.max(0, (e.hp / e.maxHP) * 100);
  const manaPct = e.maxMana > 0 ? Math.min(100, (e.mana / e.maxMana) * 100) : 0;
  const isPlayer = e.side === "player";
  return (
    <div className={"combat-token " + (isPlayer ? "ally" : "foe") + (e.isBoss ? " boss" : "")}>
      <div className="bars">
        <div className="hpbar"><div className="hpfill" style={{ width: hpPct + "%" }} /></div>
        {e.maxMana > 0 && <div className="manabar"><div className="manafill" style={{ width: manaPct + "%" }} /></div>}
      </div>
      <div className="ct-body">
        {e.defId ? <UnitIcon def={UNIT_BY_ID[e.defId]} size={CELL - 18} /> : <span className="ct-letter">{e.name[0]}</span>}
        {e.shield > 0 && <div className="shield-ring" />}
      </div>
    </div>
  );
}

function CombatOverlay({ combat }: { combat: Combat }) {
  const W = CELL * 8;
  return (
    <svg className="combat-overlay" width={W} height={W}>
      {combat.projectiles.map((p, i) => {
        const x1 = p.fromCol * CELL + CELL / 2;
        const y1 = p.fromRow * CELL + CELL / 2;
        const x2 = p.toCol * CELL + CELL / 2;
        const y2 = p.toRow * CELL + CELL / 2;
        const color = p.kind === "magic" ? "#a855f7" : p.kind === "heal" ? "#22c55e" : "#fbbf24";
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={p.kind === "attack" ? 2 : 3} opacity={0.85} />;
      })}
      {combat.floats.map((f, i) => {
        const x = f.col * CELL + CELL / 2;
        const y = f.row * CELL + CELL / 2 - (0.5 - f.ttl) * 20;
        const color = f.kind === "heal" ? "#34d399" : f.kind === "crit" ? "#f87171" : "#fde68a";
        return (
          <text key={"f" + i} x={x} y={y} fill={color} fontSize={f.kind === "crit" ? 16 : 12} fontWeight="bold" textAnchor="middle">
            {f.text}
          </text>
        );
      })}
    </svg>
  );
}

function EndScreen({
  gs, power, activeTraits, onNewRun,
}: {
  gs: GameState;
  power: number;
  activeTraits: ReturnType<typeof computeActiveTraits>;
  onNewRun: () => void;
}) {
  return (
    <div className="endscreen">
      <h1 className={gs.cleared ? "win" : "lose"}>
        {gs.cleared ? "Hundred-Round Clear!" : "Defeat"}
      </h1>
      <p className="big">Reached Round {gs.round}{gs.cleared ? "" : ` of 100`}</p>
      <p className="big">Final Field Combat Power: {power}</p>
      <div className="end-section">
        <h3>Final Synergies</h3>
        <div className="synergies">
          {activeTraits.filter((t) => t.activeTierIndex >= 0).map((t) => (
            <div key={t.name} className="synergy active" style={{ background: TIER_COLORS[t.activeTierIndex] }}>
              <TraitIcon name={t.name} size={16} />
              <span className="syn-name">{t.name} {t.count}</span>
            </div>
          ))}
          {activeTraits.filter((t) => t.activeTierIndex >= 0).length === 0 && <span className="muted">None</span>}
        </div>
      </div>
      <div className="end-section">
        <h3>Final Board</h3>
        <div className="end-board">
          {gs.board.map((u) => (
            <div key={u.iid} className="end-unit">
              <UnitIcon def={UNIT_BY_ID[u.defId]} star={u.star} size={44} />
              <span className="small">{UNIT_BY_ID[u.defId].name}</span>
              <div className="item-dots">
                {u.items.map((id, i) => (
                  <span key={i} className="dot" style={{ background: getItem(id)?.background }} title={getItem(id)?.name} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <button className="fight-btn" onClick={onNewRun}>Start New Run</button>
    </div>
  );
}

// Map a monster list to top-row cells for preview (fills rows 0-2, 8 cols).
function previewAt(monsters: RoundMonster[], row: number, col: number): RoundMonster | null {
  if (row > 2) return null;
  const index = row * 8 + col;
  return monsters[index] ?? null;
}
