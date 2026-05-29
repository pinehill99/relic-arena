import React, { useState } from "react";
import type { ActiveTrait, TraitName } from "../types";
import { TRAIT_BY_NAME, TIER_COLORS, TIER_NAMES } from "../data/traits";
import { TraitIcon } from "./icons";

export function TraitEffectPanel({
  name,
  active,
  compact = false,
}: {
  name: TraitName;
  active?: ActiveTrait;
  compact?: boolean;
}) {
  const trait = TRAIT_BY_NAME[name];
  if (!trait) return null;
  const tierIdx = active?.activeTierIndex ?? -1;
  const isActive = tierIdx >= 0;

  return (
    <div className={"trait-effect" + (compact ? " compact" : "")}>
      <div className="trait-effect-head">
        <TraitIcon name={name} size={compact ? 16 : 18} />
        <span className="trait-effect-name">{name}</span>
        {isActive && (
          <span
            className="trait-effect-tier"
            style={{ background: TIER_COLORS[tierIdx] }}
          >
            {TIER_NAMES[tierIdx]}
          </span>
        )}
      </div>
      <div className="trait-effect-desc">{trait.description}</div>
      <div className="trait-effect-meta">
        {trait.kind} · thresholds {trait.thresholds.join(" / ")}
        {active
          ? ` · fielded ${active.count}${active.nextThreshold ? ` / ${active.nextThreshold}` : ""}`
          : " · not active on board"}
      </div>
    </div>
  );
}

export function InspectorTraits({
  traits,
  activeTraits,
}: {
  traits: TraitName[];
  activeTraits: ActiveTrait[];
}) {
  const [hovered, setHovered] = useState<TraitName | null>(null);
  const activeByName = Object.fromEntries(activeTraits.map((t) => [t.name, t]));

  return (
    <div className="insp-trait-block">
      <div className="insp-traits">
        {traits.map((name) => {
          const active = activeByName[name];
          const tierIdx = active?.activeTierIndex ?? -1;
          return (
            <button
              key={name}
              type="button"
              className={
                "insp-trait"
                + (hovered === name ? " hovered" : "")
                + (tierIdx >= 0 ? " active" : "")
              }
              style={tierIdx >= 0 ? { borderColor: TIER_COLORS[tierIdx] } : undefined}
              onMouseEnter={() => setHovered(name)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(name)}
              onBlur={() => setHovered(null)}
            >
              <TraitIcon name={name} size={13} />
              <span>{name}</span>
              {active && (
                <span className="insp-trait-count">
                  {active.count}
                  {active.nextThreshold ? `/${active.nextThreshold}` : ""}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {hovered && (
        <TraitEffectPanel name={hovered} active={activeByName[hovered]} compact />
      )}
    </div>
  );
}

export function SynergyChip({
  trait,
  onInspect,
}: {
  trait: ActiveTrait;
  onInspect: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const active = trait.activeTierIndex >= 0;
  const bg = active ? TIER_COLORS[trait.activeTierIndex] : "#1e293b";

  return (
    <div
      className="synergy-wrap"
      onMouseEnter={() => {
        setHovered(true);
        onInspect();
      }}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className={"synergy" + (active ? " active" : "")}
        style={{ background: bg }}
      >
        <TraitIcon name={trait.name} size={16} />
        <span className="syn-name">{trait.name}</span>
        <span className="syn-count">
          {trait.count}
          {trait.nextThreshold ? `/${trait.nextThreshold}` : ""}
        </span>
        {active && (
          <span className="syn-tier">{TIER_NAMES[trait.activeTierIndex]}</span>
        )}
      </div>
      {hovered && (
        <div className="synergy-popover">
          <TraitEffectPanel name={trait.name} active={trait} compact />
        </div>
      )}
    </div>
  );
}
