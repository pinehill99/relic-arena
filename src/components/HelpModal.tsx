import React, { useState } from "react";
import { UNITS } from "../data/units";
import { ALL_TRAITS } from "../data/traits";
import { BASIC_ITEMS, TIER1_ITEMS, TIER2_ITEMS } from "../data/items";
import {
  CODEX_TABS,
  ITEM_CODEX_TABS,
  type CodexTab,
  type ItemCodexTab,
} from "../data/help";
import unitsSvg from "../../docs/game-data/svg/units.svg";
import traitsSvg from "../../docs/game-data/svg/traits.svg";
import itemsBasicSvg from "../../docs/game-data/svg/items-basic.svg";
import itemsTier1Svg from "../../docs/game-data/svg/items-tier1.svg";
import itemsTier2Svg from "../../docs/game-data/svg/items-tier2.svg";

const ITEM_SHEETS: Record<ItemCodexTab, string> = {
  basic: itemsBasicSvg,
  tier1: itemsTier1Svg,
  tier2: itemsTier2Svg,
};

const ITEM_SHEET_LABEL: Record<ItemCodexTab, string> = {
  basic: "Basic Items",
  tier1: "Tier 1 Items",
  tier2: "Tier 2 Completed Items",
};

export function HelpModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<CodexTab>("units");
  const [itemTab, setItemTab] = useState<ItemCodexTab>("basic");

  if (!open) return null;

  const summary =
    tab === "units"
      ? `기물 ${UNITS.length}종`
      : tab === "traits"
        ? `시너지 ${ALL_TRAITS.length}종 (기원 ${ALL_TRAITS.filter((t) => t.kind === "origin").length} · 직업 ${ALL_TRAITS.filter((t) => t.kind === "class").length})`
        : `아이템 ${BASIC_ITEMS.length + TIER1_ITEMS.length + TIER2_ITEMS.length}종`;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal codex-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="codex-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <h2 id="codex-title">데이터 도감</h2>
            <p className="small muted codex-subtitle">{summary}</p>
          </div>
          <button type="button" className="ghost modal-close" onClick={onClose} aria-label="Close codex">
            ✕
          </button>
        </div>

        <div className="codex-tabs" role="tablist" aria-label="Codex sections">
          {CODEX_TABS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={tab === entry.id}
              className={"codex-tab" + (tab === entry.id ? " active" : "")}
              onClick={() => setTab(entry.id)}
            >
              {entry.label}
            </button>
          ))}
        </div>

        {tab === "items" && (
          <div className="codex-subtabs" role="tablist" aria-label="Item tiers">
            {ITEM_CODEX_TABS.map((entry) => (
              <button
                key={entry.id}
                type="button"
                role="tab"
                aria-selected={itemTab === entry.id}
                className={"codex-subtab" + (itemTab === entry.id ? " active" : "")}
                onClick={() => setItemTab(entry.id)}
              >
                {entry.label} ({entry.count})
              </button>
            ))}
          </div>
        )}

        <div className="codex-body">
          {tab === "units" && (
            <CodexSheet src={unitsSvg} label="Relic Arena unit sheet" />
          )}
          {tab === "traits" && (
            <CodexSheet src={traitsSvg} label="Relic Arena synergy sheet" />
          )}
          {tab === "items" && (
            <CodexSheet
              src={ITEM_SHEETS[itemTab]}
              label={ITEM_SHEET_LABEL[itemTab]}
            />
          )}
        </div>

        <div className="modal-foot">
          <p className="small muted">
            게임 데이터 소스에서 생성한 SVG 도감입니다. 플레이 중 유닛·아이템·시너지에 마우스를 올리면 Inspector에서도 확인할 수 있습니다.
          </p>
          <button type="button" className="fight-btn" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

function CodexSheet({ src, label }: { src: string; label: string }) {
  return (
    <div className="codex-sheet">
      <img src={src} alt={label} loading="lazy" />
    </div>
  );
}
