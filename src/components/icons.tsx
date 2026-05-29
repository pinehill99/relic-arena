import React from "react";
import type { UnitDef, ItemDef, TraitName } from "../types";
import { hashString } from "../engine/rng";
import { TRAIT_GLYPH, TIER_COLORS } from "../data/traits";
import { COST_COLORS } from "../data/balance";

// Deterministic small palette from a seed.
function seededColor(seed: number, sat = 65, light = 55): string {
  const h = seed % 360;
  return `hsl(${h} ${sat}% ${light}%)`;
}

// ---- Trait glyphs ----
function glyphPath(kind: string): React.ReactNode {
  switch (kind) {
    case "flame":
      return <path d="M12 2c2 4-1 5 1 8 1.5 2 0 4-1 5 3-.5 5-3 5-6 0-4-3-5-5-7z" fill="currentColor" />;
    case "snowflake":
      return (
        <g stroke="currentColor" strokeWidth="1.5">
          <line x1="12" y1="3" x2="12" y2="21" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="5" y1="5" x2="19" y2="19" />
          <line x1="19" y1="5" x2="5" y2="19" />
        </g>
      );
    case "leaf":
      return <path d="M5 19C5 9 13 5 20 5c0 9-7 14-15 14z" fill="currentColor" />;
    case "bolt":
      return <path d="M13 2L4 14h6l-2 8 10-13h-7z" fill="currentColor" />;
    case "shield":
      return <path d="M12 2l8 3v6c0 5-4 9-8 11-4-2-8-6-8-11V5z" fill="currentColor" />;
    case "eye":
      return (
        <g>
          <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="12" cy="12" r="3" fill="currentColor" />
        </g>
      );
    case "star":
      return <path d="M12 2l3 7 7 .5-5.5 4.5 2 7L12 17l-6.5 4 2-7L2 9.5 9 9z" fill="currentColor" />;
    case "wave":
      return <path d="M2 14c3-4 5-4 8 0s5 4 8 0v4c-3 4-5 4-8 0s-5-4-8 0z" fill="currentColor" />;
    case "dagger":
      return <path d="M12 2l3 12-3 3-3-3z M9 17h6v2H9z" fill="currentColor" />;
    case "rune":
      return (
        <g stroke="currentColor" strokeWidth="1.6" fill="none">
          <polygon points="12,3 20,8 17,19 7,19 4,8" />
          <line x1="12" y1="3" x2="12" y2="19" />
        </g>
      );
    case "tower":
      return <path d="M6 3h12v4h-3v3h3v11H6V10h3V7H6z" fill="currentColor" />;
    case "swords":
      return (
        <g stroke="currentColor" strokeWidth="2">
          <line x1="4" y1="20" x2="18" y2="6" />
          <line x1="20" y1="20" x2="6" y2="6" />
        </g>
      );
    case "arrow":
      return <path d="M3 21L21 3M21 3h-7M21 3v7" fill="none" stroke="currentColor" strokeWidth="2" />;
    case "orb":
      return <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2" />;
    case "fang":
      return <path d="M6 4c4 6 8 6 12 0-2 10-4 16-6 16S8 14 6 4z" fill="currentColor" />;
    case "cross":
      return <path d="M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7z" fill="currentColor" />;
    case "gear":
      return (
        <g fill="currentColor">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 1l2 3-4 0zM12 23l-2-3 4 0zM1 12l3-2 0 4zM23 12l-3 2 0-4z" />
        </g>
      );
    case "portal":
      return <ellipse cx="12" cy="12" rx="5" ry="9" fill="none" stroke="currentColor" strokeWidth="2" />;
    case "aegis":
      return <path d="M12 2l9 4v6c0 6-5 9-9 10-4-1-9-4-9-10V6z M12 7v9" fill="none" stroke="currentColor" strokeWidth="2" />;
    case "skull":
      return (
        <g fill="currentColor">
          <circle cx="12" cy="10" r="7" />
          <rect x="8" y="16" width="8" height="4" rx="1" />
        </g>
      );
    default:
      return <circle cx="12" cy="12" r="7" fill="currentColor" />;
  }
}

export function TraitIcon({ name, size = 18, color }: { name: TraitName; size?: number; color?: string }) {
  const kind = TRAIT_GLYPH[name] ?? "rune";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ color: color ?? "#e2e8f0" }}>
      {glyphPath(kind)}
    </svg>
  );
}

// ---- Unit icon: silhouette + cost frame + two accent shapes ----
export function UnitIcon({ def, size = 44, star = 1 }: { def: UnitDef; size?: number; star?: number }) {
  const seed = hashString(def.name);
  const frame = COST_COLORS[def.cost];
  const accent1 = seededColor(seed, 70, 60);
  const accent2 = seededColor(seed >> 3, 60, 45);
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-label={def.name}>
      <rect x="1" y="1" width="46" height="46" rx="8" fill="#0b1220" stroke={frame} strokeWidth="3" />
      {/* body silhouette */}
      <path d="M24 10c5 0 8 4 8 9 0 4-2 6-2 9l3 9H17l3-9c0-3-2-5-2-9 0-5 3-9 6-9z" fill={accent2} />
      <circle cx="24" cy="14" r="5" fill={accent1} />
      {/* accent shapes from origin/class */}
      <TraitMini name={def.origin} x={9} y={34} color={accent1} />
      <TraitMini name={def.classes[0]} x={31} y={34} color="#cbd5e1" />
      {star > 1 && (
        <text x="24" y="46" textAnchor="middle" fontSize="9" fill="#fbbf24" fontWeight="bold">
          {"★".repeat(star)}
        </text>
      )}
    </svg>
  );
}

// tiny embedded glyph
function TraitMini({ name, x, y, color }: { name: TraitName; x: number; y: number; color: string }) {
  return (
    <g transform={`translate(${x - 6},${y - 6}) scale(0.5)`} style={{ color }}>
      {glyphPath(TRAIT_GLYPH[name] ?? "rune")}
    </g>
  );
}

// ---- Item icon: geometric base + tier frame + motif ----
export function ItemIcon({ item, size = 30 }: { item: ItemDef; size?: number }) {
  const seed = hashString(item.id + item.name);
  const frame = item.background;
  const motif = seededColor(seed, 70, 60);
  const tierShape = item.tier === "basic" ? "circle" : item.tier === 1 ? "diamond" : "hex";
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-label={item.name}>
      <rect x="1" y="1" width="30" height="30" rx="6" fill="#0b1220" stroke={frame} strokeWidth="2.5" />
      {tierShape === "circle" && <circle cx="16" cy="16" r="8" fill={frame} />}
      {tierShape === "diamond" && <path d="M16 5l11 11-11 11L5 16z" fill={frame} />}
      {tierShape === "hex" && <path d="M16 4l10 6v12l-10 6-10-6V10z" fill={frame} />}
      <circle cx="16" cy="16" r="3.5" fill={motif} />
      <path d="M16 9l2.2 4.5 5 .7-3.6 3.5.9 5-4.5-2.4L11.5 22.7l.9-5L8.8 14.2l5-.7z" fill={motif} opacity="0.55" />
    </svg>
  );
}
