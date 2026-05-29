export const HELP_DISMISS_KEY = "relic-arena-help-dismissed";

export type CodexTab = "units" | "traits" | "items";
export type ItemCodexTab = "basic" | "tier1" | "tier2";

export const CODEX_TABS: { id: CodexTab; label: string }[] = [
  { id: "units", label: "기물" },
  { id: "traits", label: "시너지" },
  { id: "items", label: "아이템" },
];

export const ITEM_CODEX_TABS: { id: ItemCodexTab; label: string; count: number }[] = [
  { id: "basic", label: "기본", count: 8 },
  { id: "tier1", label: "1단계", count: 20 },
  { id: "tier2", label: "2단계", count: 100 },
];
