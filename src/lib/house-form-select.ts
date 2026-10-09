import { cn } from "@/lib/cn";
import { FORM_CONTROL_BOX_CLASS, FORM_CONTROL_TEXT_CLASS } from "@/lib/form-control";
import { HOUSE_PHONE_WRAP_CLASS } from "@/lib/house-phone-stack";
import {
  HOUSE_PAGE_SELECT_CHEVRON_CLASS,
  HOUSE_PAGE_SELECT_OPTION_CHECK_CLASS,
  HOUSE_PAGE_SELECT_OPTION_CHECK_GUTTER_CLASS,
  HOUSE_PAGE_SELECT_OPTION_LABEL_CLASS,
  housePageSelectOptionClass,
} from "@/lib/house-page-select";

// House form Select / Listbox. Closed field is the house input box
// (same grammar as Email). Open menu is the HousePageSelect light
// surface — panel, ink type, muted hover, accent check — not a dark
// OS/<select> picker and not a Mercury fork. Settings Dialogs use
// this. Do not invent a Team-Invite twin.

export const HOUSE_FORM_SELECT_TRIGGER_CLASS = cn(
  FORM_CONTROL_TEXT_CLASS,
  FORM_CONTROL_BOX_CLASS,
  "flex items-center justify-between gap-[var(--space-2)] text-left",
);

// The chosen value in the closed field: the house phone wrap at every
// width (gospel 2026-09-19), never an ellipsis in a form. The box grows
// and the chevron stays centred on it.
export const HOUSE_FORM_SELECT_TRIGGER_LABEL_CLASS = `flex-1 ${HOUSE_PHONE_WRAP_CLASS}`;

export const HOUSE_FORM_SELECT_CHEVRON_CLASS = HOUSE_PAGE_SELECT_CHEVRON_CLASS;

export const HOUSE_FORM_SELECT_PANEL_CLASS =
  "absolute left-0 right-0 top-full z-50 mt-[var(--space-2)] flex max-h-80 flex-col overflow-y-auto rounded-[12px] border border-hairline bg-surface py-[var(--space-2)] shadow-none";

export const HOUSE_FORM_SELECT_OPTION_HOVER_CLASS =
  "hover:bg-surface-muted focus-visible:bg-surface-muted focus-visible:outline-none";

export const HOUSE_FORM_SELECT_OPTION_LABEL_CLASS = HOUSE_PAGE_SELECT_OPTION_LABEL_CLASS;

export const HOUSE_FORM_SELECT_OPTION_CHECK_GUTTER_CLASS =
  HOUSE_PAGE_SELECT_OPTION_CHECK_GUTTER_CLASS;

export const HOUSE_FORM_SELECT_OPTION_CHECK_CLASS = HOUSE_PAGE_SELECT_OPTION_CHECK_CLASS;

export function houseFormSelectOptionClass(selected: boolean): string {
  return `${housePageSelectOptionClass(selected)} ${HOUSE_FORM_SELECT_OPTION_HOVER_CLASS}`;
}

export type HouseFormSelectOption = {
  value: string;
  label: string;
};

// Keys on an open menu: arrows step (wrapping), Home and End jump.
export function houseFormSelectStep(index: number, key: string, count: number): number | null {
  if (count === 0) return null;
  if (key === "ArrowDown") return index < 0 ? 0 : (index + 1) % count;
  if (key === "ArrowUp") return index < 0 ? count - 1 : (index - 1 + count) % count;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  return null;
}

/** Type-ahead: the first option after `from` whose label starts with what was
 *  typed (a repeated letter cycles through that letter's options). */
export function houseFormSelectMatch(
  options: readonly HouseFormSelectOption[],
  typed: string,
  from: number,
): number | null {
  const query = typed.toLocaleLowerCase();
  if (!query) return null;
  const repeated = query.length > 1 && [...query].every((c) => c === query[0]);
  const needle = repeated ? query[0] : query;
  const start = repeated || query.length === 1 ? from + 1 : Math.max(from, 0);
  for (let step = 0; step < options.length; step += 1) {
    const at = (start + step) % options.length;
    if (options[at].label.toLocaleLowerCase().startsWith(needle)) return at;
  }
  return null;
}
