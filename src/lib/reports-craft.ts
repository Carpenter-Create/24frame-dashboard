// Reports visual register. House 8 / 16 / 24 / 48 only. No foreign brand,
// no shadows, no Upgrade chrome. Period chips stay muted + type — never
// Sporty Blue fill. Content pills (Titles / Platforms / Users) use ink.
// Download is the one primary when a concrete period can export.

import { HOUSE_MODULE_CLASS } from "@/lib/house-shell";

export const REPORTS_STACK_CLASS = "flex flex-col gap-[var(--space-6)]";
export const REPORTS_SECTION_CLASS = "flex flex-col gap-[var(--space-6)]";
export const REPORTS_RELATED_GAP_CLASS = "gap-[var(--space-2)]";
export const REPORTS_CARD_CLASS = `${HOUSE_MODULE_CLASS} overflow-hidden shadow-none`;
export const REPORTS_CARD_PAD = "px-[var(--space-4)] py-[var(--space-4)]";
export const REPORTS_SECTION_TITLE_CLASS = "t-heading text-ink";
export const REPORTS_TITLE_MOBILE_CLASS = "t-heading text-ink md:hidden";
export const REPORTS_TITLE_DESKTOP_CLASS = "t-title text-ink max-md:hidden";
export const REPORTS_HERO_CLASS =
  "grid grid-cols-1 gap-[var(--space-6)] max-md:flex max-md:flex-col lg:grid-cols-5";
export const REPORTS_HERO_REVENUE_CLASS = "lg:col-span-3";
export const REPORTS_HERO_COMPOSITION_CLASS = "lg:col-span-2";
export const REPORTS_HERO_VALUE_CLASS = "t-display t-data text-ink";
export const REPORTS_HERO_DELTA_CLASS = "t-body-sm text-ink-3";
export const REPORTS_HERO_ASOF_CLASS = "t-body-sm text-ink-3";
export const REPORTS_CHROME_CLASS =
  "flex flex-col gap-[var(--space-4)] md:flex-row md:items-start md:justify-between";
export const REPORTS_CONTROLS_CLASS =
  "flex min-w-0 flex-wrap items-center justify-start gap-[var(--space-2)] md:justify-end";
export const REPORTS_PERIOD_CLUSTER_CLASS =
  "hidden items-center gap-[var(--space-2)] md:flex";
export const REPORTS_PERIOD_CHIP_CLASS =
  "rounded-full bg-surface-muted px-[var(--space-4)] py-[var(--space-2)] t-body-sm shadow-none";
export const REPORTS_PERIOD_CHIP_ON_CLASS = "text-accent";
export const REPORTS_PERIOD_CHIP_OFF_CLASS = "text-ink";
export const REPORTS_PERIOD_CHIP_STUB_CLASS = "cursor-not-allowed text-ink-3";
export const REPORTS_PERIOD_TRIGGER_CLASS =
  "group flex min-w-0 items-center justify-end gap-[var(--space-2)] bg-transparent px-0 py-0 t-body-sm text-ink md:hidden";
export const REPORTS_DOWNLOAD_CLASS =
  "inline-flex items-center justify-center rounded-full bg-accent px-[var(--space-4)] py-[var(--space-2)] t-body-sm font-medium text-accent-contrast";
export const REPORTS_DOWNLOAD_OFF_CLASS =
  "inline-flex items-center justify-center rounded-full bg-surface-muted px-[var(--space-4)] py-[var(--space-2)] t-body-sm text-ink-3";
export const REPORTS_DOWNLOAD_PRIMARY_OFF_CLASS =
  "inline-flex cursor-not-allowed items-center justify-center rounded-full bg-accent px-[var(--space-4)] py-[var(--space-2)] t-body-sm font-medium text-accent-contrast opacity-40";
export const REPORTS_USER_TRIGGER_CLASS =
  "rounded-full bg-surface-muted px-[var(--space-4)] py-[var(--space-2)] t-body-sm text-ink shadow-none";
export const REPORTS_USER_PANEL_CLASS =
  "absolute right-0 top-full z-50 mt-[var(--space-2)] flex max-h-80 min-w-[16rem] flex-col overflow-hidden rounded-[12px] border border-hairline bg-surface shadow-none";
export const REPORTS_CHART_HEIGHT_MOBILE = 240;
export const REPORTS_CHART_HEIGHT_DESKTOP = 280;
export const REPORTS_CHART_FRAME_CLASS = "relative h-[240px] w-full md:h-[280px]";
export const REPORTS_CHART_EMPTY_CLASS =
  "relative flex h-[var(--space-12)] w-full items-center px-[var(--space-4)]";
export const REPORTS_FIXTURE_BANNER_CLASS =
  "rounded-[var(--radius)] border border-hairline bg-surface px-[var(--space-4)] py-[var(--space-2)] t-label text-ink-3 shadow-none max-md:sticky max-md:top-[var(--house-phone-chrome-visible,0px)] max-md:z-20";
export const REPORTS_TABLE_CLASS = "w-full border-t border-hairline text-left";
export const REPORTS_TABLE_HEAD_CLASS = "t-label text-ink-3";
export const REPORTS_TABLE_CELL_CLASS = "t-body-sm text-ink";
