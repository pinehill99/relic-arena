import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ItemDef, ItemStats, TraitName, UnitDef } from "../src/types";
import { COST_NAMES } from "../src/data/balance";
import { BASIC_ITEMS, TIER1_ITEMS, TIER2_ITEMS, getItem } from "../src/data/items";
import { ALL_TRAITS, TRAIT_GLYPH } from "../src/data/traits";
import { UNITS } from "../src/data/units";
import { hashString } from "../src/engine/rng";

const OUT_DIR = "docs/game-data";
const SVG_DIR = join(OUT_DIR, "svg");

function esc(value: unknown): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function seededColor(seed: number, sat = 65, light = 55): string {
  return `hsl(${seed % 360} ${sat}% ${light}%)`;
}

function statText(stats: ItemStats): string {
  const labels: Record<keyof ItemStats, string> = {
    ad: "AD",
    sp: "SP",
    armor: "Armor",
    mr: "MR",
    startMana: "Mana",
    hp: "HP",
    attackSpeed: "AS",
    crit: "Crit",
  };
  return (Object.entries(stats) as [keyof ItemStats, number][])
    .filter(([, v]) => v)
    .map(([k, v]) => `+${v} ${labels[k]}`)
    .join(", ");
}

function effectText(item: ItemDef): string {
  return item.effect
    .replace(/\s+Also:\s*\./g, "")
    .replace(/\s+Also:\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function costLabel(cost: number): string {
  return `${cost}g ${COST_NAMES[cost] ?? ""}`.trim();
}

function glyphPath(kind: string): string {
  switch (kind) {
    case "flame":
      return '<path d="M12 2c2 4-1 5 1 8 1.5 2 0 4-1 5 3-.5 5-3 5-6 0-4-3-5-5-7z" fill="currentColor"/>';
    case "snowflake":
      return '<g stroke="currentColor" stroke-width="1.5"><line x1="12" y1="3" x2="12" y2="21"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/></g>';
    case "leaf":
      return '<path d="M5 19C5 9 13 5 20 5c0 9-7 14-15 14z" fill="currentColor"/>';
    case "bolt":
      return '<path d="M13 2L4 14h6l-2 8 10-13h-7z" fill="currentColor"/>';
    case "shield":
      return '<path d="M12 2l8 3v6c0 5-4 9-8 11-4-2-8-6-8-11V5z" fill="currentColor"/>';
    case "eye":
      return '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="3" fill="currentColor"/>';
    case "star":
      return '<path d="M12 2l3 7 7 .5-5.5 4.5 2 7L12 17l-6.5 4 2-7L2 9.5 9 9z" fill="currentColor"/>';
    case "wave":
      return '<path d="M2 14c3-4 5-4 8 0s5 4 8 0v4c-3 4-5 4-8 0s-5-4-8 0z" fill="currentColor"/>';
    case "dagger":
      return '<path d="M12 2l3 12-3 3-3-3z M9 17h6v2H9z" fill="currentColor"/>';
    case "rune":
      return '<g stroke="currentColor" stroke-width="1.6" fill="none"><polygon points="12,3 20,8 17,19 7,19 4,8"/><line x1="12" y1="3" x2="12" y2="19"/></g>';
    case "tower":
      return '<path d="M6 3h12v4h-3v3h3v11H6V10h3V7H6z" fill="currentColor"/>';
    case "swords":
      return '<g stroke="currentColor" stroke-width="2"><line x1="4" y1="20" x2="18" y2="6"/><line x1="20" y1="20" x2="6" y2="6"/></g>';
    case "arrow":
      return '<path d="M3 21L21 3M21 3h-7M21 3v7" fill="none" stroke="currentColor" stroke-width="2"/>';
    case "orb":
      return '<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/>';
    case "fang":
      return '<path d="M6 4c4 6 8 6 12 0-2 10-4 16-6 16S8 14 6 4z" fill="currentColor"/>';
    case "cross":
      return '<path d="M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7z" fill="currentColor"/>';
    case "gear":
      return '<circle cx="12" cy="12" r="4" fill="currentColor"/><path d="M12 1l2 3h-4zM12 23l-2-3h4zM1 12l3-2v4zM23 12l-3 2v-4z" fill="currentColor"/>';
    case "portal":
      return '<ellipse cx="12" cy="12" rx="5" ry="9" fill="none" stroke="currentColor" stroke-width="2"/>';
    case "aegis":
      return '<path d="M12 2l9 4v6c0 6-5 9-9 10-4-1-9-4-9-10V6z M12 7v9" fill="none" stroke="currentColor" stroke-width="2"/>';
    case "skull":
      return '<circle cx="12" cy="10" r="7" fill="currentColor"/><rect x="8" y="16" width="8" height="4" rx="1" fill="currentColor"/>';
    default:
      return '<circle cx="12" cy="12" r="7" fill="currentColor"/>';
  }
}

function traitGlyph(name: TraitName, x: number, y: number, size: number, color = "#e2e8f0"): string {
  const kind = TRAIT_GLYPH[name] ?? "rune";
  const scale = size / 24;
  return `<g transform="translate(${x} ${y}) scale(${scale})" style="color:${color}">${glyphPath(kind)}</g>`;
}

function unitIcon(def: UnitDef, x: number, y: number, size: number): string {
  const seed = hashString(def.name);
  const frame = def.costColor;
  const accent1 = seededColor(seed, 70, 60);
  const accent2 = seededColor(seed >> 3, 60, 45);
  const scale = size / 48;
  return `<g transform="translate(${x} ${y}) scale(${scale})" aria-label="${esc(def.name)}">
    <rect x="1" y="1" width="46" height="46" rx="8" fill="#0b1220" stroke="${frame}" stroke-width="3"/>
    <path d="M24 10c5 0 8 4 8 9 0 4-2 6-2 9l3 9H17l3-9c0-3-2-5-2-9 0-5 3-9 6-9z" fill="${accent2}"/>
    <circle cx="24" cy="14" r="5" fill="${accent1}"/>
    ${traitGlyph(def.origin, 3, 28, 12, accent1)}
    ${traitGlyph(def.classes[0], 25, 28, 12, "#cbd5e1")}
  </g>`;
}

function itemIcon(item: ItemDef, x: number, y: number, size: number): string {
  const seed = hashString(item.id + item.name);
  const frame = item.background;
  const motif = seededColor(seed, 70, 60);
  const scale = size / 32;
  const shape =
    item.tier === "basic"
      ? `<circle cx="16" cy="16" r="8" fill="${frame}"/>`
      : item.tier === 1
        ? `<path d="M16 5l11 11-11 11L5 16z" fill="${frame}"/>`
        : `<path d="M16 4l10 6v12l-10 6-10-6V10z" fill="${frame}"/>`;
  return `<g transform="translate(${x} ${y}) scale(${scale})" aria-label="${esc(item.name)}">
    <rect x="1" y="1" width="30" height="30" rx="6" fill="#0b1220" stroke="${frame}" stroke-width="2.5"/>
    ${shape}
    <circle cx="16" cy="16" r="3.5" fill="${motif}"/>
    <path d="M16 9l2.2 4.5 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5-3.6-3.5 5-.7z" fill="${motif}" opacity="0.55"/>
  </g>`;
}

function text(x: number, y: number, value: string, size = 12, fill = "#dbeafe", weight = "500"): string {
  return `<text x="${x}" y="${y}" font-family="Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif" font-size="${size}" fill="${fill}" font-weight="${weight}">${esc(value)}</text>`;
}

function sheet<T>(
  title: string,
  entries: T[],
  options: { columns: number; cardWidth: number; cardHeight: number },
  render: (entry: T, x: number, y: number) => string
): string {
  const gap = 12;
  const pad = 24;
  const titleH = 52;
  const rows = Math.ceil(entries.length / options.columns);
  const width = pad * 2 + options.columns * options.cardWidth + (options.columns - 1) * gap;
  const height = pad * 2 + titleH + rows * options.cardHeight + Math.max(0, rows - 1) * gap;
  const cards = entries.map((entry, index) => {
    const col = index % options.columns;
    const row = Math.floor(index / options.columns);
    const x = pad + col * (options.cardWidth + gap);
    const y = pad + titleH + row * (options.cardHeight + gap);
    return render(entry, x, y);
  }).join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(title)}">
  <rect width="100%" height="100%" fill="#07111f"/>
  <rect x="10" y="10" width="${width - 20}" height="${height - 20}" rx="16" fill="#0f172a" stroke="#24324f"/>
  ${text(pad, 42, title, 24, "#fbbf24", "800")}
  ${cards}
</svg>
`;
}

function unitCard(unit: UnitDef, x: number, y: number): string {
  return `<g>
    <rect x="${x}" y="${y}" width="210" height="84" rx="8" fill="#111827" stroke="${unit.costColor}" stroke-width="2"/>
    ${unitIcon(unit, x + 10, y + 18, 48)}
    ${text(x + 68, y + 24, `#${unit.id} ${unit.name}`, 12, "#f8fafc", "800")}
    ${text(x + 68, y + 42, `${costLabel(unit.cost)} · ${unit.origin} / ${unit.classes.join(", ")}`, 10, "#cbd5e1")}
    ${text(x + 68, y + 58, `HP ${unit.hp} · AD ${unit.attackDamage} · Mana ${unit.mana} · R ${unit.range}`, 10, "#93c5fd")}
    ${text(x + 68, y + 74, unit.skillName, 10, "#fef3c7", "700")}
  </g>`;
}

function traitCard(trait: (typeof ALL_TRAITS)[number], x: number, y: number): string {
  const color = trait.kind === "origin" ? "#38bdf8" : "#a78bfa";
  return `<g>
    <rect x="${x}" y="${y}" width="250" height="96" rx="8" fill="#111827" stroke="${color}" stroke-width="2"/>
    ${traitGlyph(trait.name, x + 14, y + 16, 42, color)}
    ${text(x + 70, y + 25, trait.name, 14, "#f8fafc", "800")}
    ${text(x + 70, y + 45, `${trait.kind} · ${trait.thresholds.join(" / ")}`, 11, "#cbd5e1")}
    ${text(x + 16, y + 76, trait.description.slice(0, 72) + (trait.description.length > 72 ? "..." : ""), 10, "#dbeafe")}
  </g>`;
}

function itemCard(item: ItemDef, x: number, y: number): string {
  const tier = item.tier === "basic" ? "Basic" : `Tier ${item.tier}`;
  const effect = effectText(item);
  return `<g>
    <rect x="${x}" y="${y}" width="250" height="82" rx="8" fill="#111827" stroke="${item.background}" stroke-width="2"/>
    ${itemIcon(item, x + 12, y + 17, 42)}
    ${text(x + 66, y + 24, item.name, 12, "#f8fafc", "800")}
    ${text(x + 66, y + 42, `${tier} · ${statText(item.stats) || "effect item"}`, 10, "#cbd5e1")}
    ${text(x + 66, y + 61, effect.slice(0, 62) + (effect.length > 62 ? "..." : ""), 9, "#fde68a")}
  </g>`;
}

function itemRows(items: ItemDef[]): string {
  return items.map((item) => {
    const recipe = item.recipe?.map((id) => getItem(id)?.name ?? id).join(" + ") ?? "-";
    const tier = item.tier === "basic" ? "Basic" : `Tier ${item.tier}`;
    return `| ${item.id} | ${item.name} | ${tier} | ${statText(item.stats) || "-"} | ${recipe} | ${effectText(item)} |`;
  }).join("\n");
}

function unitRows(): string {
  return UNITS.map((unit) => (
    `| ${unit.id} | ${unit.name} | ${unit.cost} | ${unit.origin} | ${unit.classes.join(", ")} | ${unit.hp} | ${unit.attackDamage} | ${unit.mana} | ${unit.range} | ${unit.skillName}: ${unit.skillText} |`
  )).join("\n");
}

function traitRows(kind: "origin" | "class"): string {
  return ALL_TRAITS.filter((trait) => trait.kind === kind).map((trait) => (
    `| ${trait.name} | ${trait.thresholds.join(" / ")} | ${trait.description} |`
  )).join("\n");
}

function readme(): string {
  return `# Relic Arena 데이터 도감

[메인 README](../../README.ko.md) · [패치노트](../../PATCH_NOTES.md) · [온라인 플레이](https://pinehill99.github.io/relic-arena/)

이 문서는 게임 데이터 소스에서 생성한 기물, 시너지, 아이템 도감입니다. SVG 시트는 GitHub README에서 바로 볼 수 있도록 함께 저장합니다.

## 요약

| 항목 | 수량 |
|---|---:|
| 기물 | ${UNITS.length} |
| 기원 시너지 | ${ALL_TRAITS.filter((t) => t.kind === "origin").length} |
| 직업 시너지 | ${ALL_TRAITS.filter((t) => t.kind === "class").length} |
| 기본 아이템 | ${BASIC_ITEMS.length} |
| 1단계 아이템 | ${TIER1_ITEMS.length} |
| 2단계 완성 아이템 | ${TIER2_ITEMS.length} |

## 기물 SVG 시트

![Relic Arena unit SVG sheet](./svg/units.svg)

| ID | 기물 | 비용 | 기원 | 직업 | HP | AD | Mana | Range | 스킬 |
|---:|---|---:|---|---|---:|---:|---:|---:|---|
${unitRows()}

## 시너지 SVG 시트

![Relic Arena trait SVG sheet](./svg/traits.svg)

### 기원

| 기원 | 활성 기준 | 효과 |
|---|---|---|
${traitRows("origin")}

### 직업

| 직업 | 활성 기준 | 효과 |
|---|---|---|
${traitRows("class")}

## 아이템 SVG 시트

### 기본 아이템

![Relic Arena basic item SVG sheet](./svg/items-basic.svg)

| ID | 아이템 | 단계 | 능력치 | 조합식 | 효과 |
|---|---|---|---|---|---|
${itemRows(BASIC_ITEMS)}

### 1단계 아이템

![Relic Arena tier 1 item SVG sheet](./svg/items-tier1.svg)

| ID | 아이템 | 단계 | 능력치 | 조합식 | 효과 |
|---|---|---|---|---|---|
${itemRows(TIER1_ITEMS)}

### 2단계 완성 아이템

![Relic Arena tier 2 item SVG sheet](./svg/items-tier2.svg)

<details>
<summary>2단계 완성 아이템 ${TIER2_ITEMS.length}개 전체 목록</summary>

| ID | 아이템 | 단계 | 능력치 | 조합식 | 효과 |
|---|---|---|---|---|---|
${itemRows(TIER2_ITEMS)}

</details>
`;
}

async function main() {
  await mkdir(SVG_DIR, { recursive: true });
  await writeFile(join(SVG_DIR, "units.svg"), sheet("Relic Arena Units", UNITS, { columns: 5, cardWidth: 210, cardHeight: 84 }, unitCard));
  await writeFile(join(SVG_DIR, "traits.svg"), sheet("Relic Arena Synergies", ALL_TRAITS, { columns: 4, cardWidth: 250, cardHeight: 96 }, traitCard));
  await writeFile(join(SVG_DIR, "items-basic.svg"), sheet("Basic Items", BASIC_ITEMS, { columns: 4, cardWidth: 250, cardHeight: 82 }, itemCard));
  await writeFile(join(SVG_DIR, "items-tier1.svg"), sheet("Tier 1 Items", TIER1_ITEMS, { columns: 4, cardWidth: 250, cardHeight: 82 }, itemCard));
  await writeFile(join(SVG_DIR, "items-tier2.svg"), sheet("Tier 2 Completed Items", TIER2_ITEMS, { columns: 4, cardWidth: 250, cardHeight: 82 }, itemCard));
  await writeFile(join(OUT_DIR, "README.ko.md"), readme());
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
