"use client";

import { CaretDoubleLeft, CaretDoubleRight } from "@phosphor-icons/react";

import {
  RAIL_COLLAPSE_CHEVRON,
  RAIL_COLLAPSE_CHEVRON_CLASS,
  RAIL_COLLAPSE_CHEVRON_ICON_CLASS,
  RAIL_COLLAPSE_CHEVRON_ICON_WEIGHT,
  RAIL_EXPAND_CHEVRON_CLASS,
} from "@/lib/rail-collapse";

// One house collapse control. Aggregation · Education · Social · Staff ·
// Home all mount this — do not invent a Social-only sticker chevron.
// Screening chrome: SideNav places it in the menu's top row beside the
// workspace eyebrow (28 box); collapsed, it heads the 64 column (40×32).
export function RailCollapse({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  if (!collapsed) {
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-label="Collapse sidebar"
        title="Collapse sidebar"
        aria-pressed={false}
        data-rail-collapse={RAIL_COLLAPSE_CHEVRON}
        className={RAIL_COLLAPSE_CHEVRON_CLASS}
      >
        <CaretDoubleLeft
          className={RAIL_COLLAPSE_CHEVRON_ICON_CLASS}
          weight={RAIL_COLLAPSE_CHEVRON_ICON_WEIGHT}
        />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label="Expand sidebar"
      title="Expand sidebar"
      aria-pressed={true}
      data-rail-collapse={RAIL_COLLAPSE_CHEVRON}
      className={RAIL_EXPAND_CHEVRON_CLASS}
    >
      <CaretDoubleRight
        className={RAIL_COLLAPSE_CHEVRON_ICON_CLASS}
        weight={RAIL_COLLAPSE_CHEVRON_ICON_WEIGHT}
      />
    </button>
  );
}
