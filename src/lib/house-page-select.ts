// House standard for in-page filter/select menus.
// SoT: Dashboard All time (period) — quiet trigger, desktop menu, phone bottom sheet,
// trailing Sporty Blue check, flush-left labels. Hairline + air; no drop shadow.
// Consumers: Dashboard period, Home Revenue (phone), Titles / Channels /
// Licensing / Clients status lenses. Do not invent a second grammar —
// never a StatusFilter chip fork or a wrapping Home period row.

import { HOUSE_PHONE_WRAP_CLASS } from "@/lib/house-phone-stack";
import { HOUSE_PERIOD_SELECTED_CLASS } from "@/lib/house-shell";
import { APP_SHEET_HOST_CLASS } from "@/lib/house-sheet";
import { menuHostClass } from "@/lib/menu-host";

export const HOUSE_PAGE_SELECT_SHEET_HOST_CLASS = APP_SHEET_HOST_CLASS;

export const HOUSE_PAGE_SELECT_MENU_DESKTOP_CLASS = menuHostClass("desktop", "panel");

export const HOUSE_PAGE_SELECT_TRIGGER_CLASS =
  "group flex min-w-[10rem] items-center justify-between gap-[var(--space-2)] rounded-[var(--radius-sm)] border border-hairline bg-surface-muted px-[var(--space-4)] py-[var(--space-2)] t-body-sm text-ink max-md:min-w-0 max-md:flex-none max-md:justify-end max-md:border-0 max-md:bg-transparent max-md:px-0 max-md:py-0";

export const HOUSE_PAGE_SELECT_TRIGGER_LABEL_CLASS =
  `${HOUSE_PHONE_WRAP_CLASS} md:truncate`;

export const HOUSE_PAGE_SELECT_CHEVRON_CLASS =
  "size-4 shrink-0 text-ink-3 transition-opacity";

export const HOUSE_PAGE_SELECT_PANEL_CLASS =
  "absolute right-0 top-full z-50 mt-[var(--space-2)] flex max-h-80 min-w-[16rem] flex-col overflow-y-auto rounded-[12px] border border-hairline bg-surface py-[var(--space-2)] shadow-none";

export const HOUSE_PAGE_SELECT_PANEL_ALIGN_START_CLASS =
  "absolute left-0 top-full z-50 mt-[var(--space-2)] flex max-h-80 min-w-[16rem] flex-col overflow-y-auto rounded-[12px] border border-hairline bg-surface py-[var(--space-2)] shadow-none";

export const HOUSE_PAGE_SELECT_GROUP_CLASS =
  "px-[var(--space-4)] pb-[var(--space-1)] pt-[var(--space-2)] t-label text-ink-3";

export const HOUSE_PAGE_SELECT_OPTION_CLASS =
  "flex w-full items-center justify-between gap-[var(--space-2)] px-[var(--space-4)] py-[var(--space-2)] text-left t-body-sm text-ink";

export const HOUSE_PAGE_SELECT_OPTION_SELECTED_CLASS = HOUSE_PERIOD_SELECTED_CLASS;

export const HOUSE_PAGE_SELECT_OPTION_LABEL_CLASS =
  `min-w-0 flex-1 text-left ${HOUSE_PHONE_WRAP_CLASS}`;

export const HOUSE_PAGE_SELECT_OPTION_CHECK_GUTTER_CLASS = "size-4 shrink-0";

export const HOUSE_PAGE_SELECT_OPTION_CHECK_CLASS = "text-accent";

export function housePageSelectOptionClass(selected: boolean): string {
  return selected
    ? `${HOUSE_PAGE_SELECT_OPTION_CLASS} ${HOUSE_PAGE_SELECT_OPTION_SELECTED_CLASS}`
    : HOUSE_PAGE_SELECT_OPTION_CLASS;
}

// The form hover: the muted wash under the pointer and on keyboard focus.
// The form Select (lib/house-form-select) re-exports it under its old name.
export const HOUSE_PAGE_SELECT_OPTION_HOVER_CLASS =
  "hover:bg-surface-muted focus-visible:bg-surface-muted focus-visible:outline-none";

// Inline list (HousePageSelectOptions with `inline`): the same options list
// laid flat in a page or window — the panel's surface without its float
// (no absolute, no max-h, no own scroll). The window body scrolls it.
export const HOUSE_PAGE_SELECT_INLINE_LIST_CLASS =
  "flex w-full flex-col rounded-[12px] border border-hairline bg-surface py-[var(--space-2)] shadow-none";

/** An inline row: the option, the form hover, and a 44 hit. */
export function housePageSelectInlineOptionClass(selected: boolean): string {
  return `${housePageSelectOptionClass(selected)} ${HOUSE_PAGE_SELECT_OPTION_HOVER_CLASS} min-h-11`;
}

// An option's detail line sits under its label in one column: the house
// wrap, never cut.
export const HOUSE_PAGE_SELECT_OPTION_DETAIL_CLASS =
  `block t-body-sm text-ink-3 ${HOUSE_PHONE_WRAP_CLASS}`;

export type HousePageSelectOption = {
  key: string;
  label: string;
  /** A second line under the label (inline lists; e.g. a rights description). */
  detail?: string;
};

export type HousePageSelectGroup = {
  id: string;
  label: string;
  options: readonly HousePageSelectOption[];
  /** When true, omit the group label row (Dashboard all / ytd). */
  hideLabel?: boolean;
};

/** Flat options → one unlabeled group. */
export function housePageSelectFlatGroup(
  options: readonly HousePageSelectOption[],
): HousePageSelectGroup[] {
  return [{ id: "options", label: "", options, hideLabel: true }];
}

/** Every option in the order the list draws them. */
export function housePageSelectOptionsInOrder(
  groups: readonly HousePageSelectGroup[],
): HousePageSelectOption[] {
  return groups.flatMap((group) => group.options);
}

/** The id of an inline group's label, for the group's aria-labelledby.
 *  An id list is space separated, so anything but [A-Za-z0-9_-] in the
 *  group id becomes "-". */
export function housePageSelectGroupLabelId(listId: string, groupId: string): string {
  return `${listId}-${groupId.replace(/[^A-Za-z0-9_-]/g, "-")}`;
}

/** The inline list's one Tab stop (roving tabindex): the option that last
 *  had focus while it is still drawn, else the first chosen option in
 *  order, else the first option. Null for an empty list. */
export function housePageSelectTabStop(
  groups: readonly HousePageSelectGroup[],
  isSelected: (key: string) => boolean,
  focused: string | null,
): string | null {
  const keys = housePageSelectOptionsInOrder(groups).map((option) => option.key);
  if (focused !== null && keys.includes(focused)) return focused;
  return keys.find(isSelected) ?? keys[0] ?? null;
}
