import { cn } from "@/lib/cn";
import { FORM_CONTROL_BOX_CLASS, FORM_CONTROL_TEXT_CLASS } from "@/lib/form-control";
import { HOUSE_PHONE_WRAP_CLASS } from "@/lib/house-phone-stack";
import {
  HOUSE_PAGE_SELECT_CHEVRON_CLASS,
  HOUSE_PAGE_SELECT_OPTION_CHECK_CLASS,
  HOUSE_PAGE_SELECT_OPTION_CHECK_GUTTER_CLASS,
  HOUSE_PAGE_SELECT_OPTION_HOVER_CLASS,
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

// Moved to lib/house-page-select (the inline list shares it); same value.
export const HOUSE_FORM_SELECT_OPTION_HOVER_CLASS = HOUSE_PAGE_SELECT_OPTION_HOVER_CLASS;

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
  options: readonly { label: string }[],
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

// Keys on an inline house list (HousePageSelectOptions `inline`), the same
// grammar as the form Select's open menu (ui/select.tsx): ↓ ↑ Home End move
// (wrapping), typing jumps to a label while the keys come within 500ms of
// each other, and Space picks unless a word is being typed. Enter and a
// picking Space stay the option button's own click.
export const HOUSE_FORM_SELECT_TYPE_AHEAD_MS = 500;

export type HouseFormSelectTyped = { text: string; at: number };

export type HouseFormSelectListKey = {
  /** The option index to focus, or null to leave focus where it is. */
  focus: number | null;
  /** True when the key was used here (the caller prevents its default). */
  handled: boolean;
  /** The type-ahead buffer to keep for the next key. */
  typed: HouseFormSelectTyped;
};

export function houseFormSelectListKey(
  options: readonly { label: string }[],
  index: number,
  key: string,
  modified: boolean,
  typed: HouseFormSelectTyped,
  now: number,
): HouseFormSelectListKey {
  const step = houseFormSelectStep(index, key, options.length);
  if (step !== null) return { focus: step, handled: true, typed };
  if (key.length !== 1 || modified) return { focus: null, handled: false, typed };
  const text = now - typed.at > HOUSE_FORM_SELECT_TYPE_AHEAD_MS ? "" : typed.text;
  if (key === " " && text === "") return { focus: null, handled: false, typed: { text, at: typed.at } };
  const next = { text: text + key, at: now };
  return { focus: houseFormSelectMatch(options, next.text, index), handled: true, typed: next };
}

/** An option node an inline list moves focus to (its button). */
export type HouseFormSelectListNode = {
  focus: () => void;
  scrollIntoView?: (options?: ScrollIntoViewOptions) => void;
};

export type HouseFormSelectListKeyEvent = {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  preventDefault: () => void;
};

/** One keydown on an inline house list. `nodes` are the drawn option
 *  buttons in `options` order; `active` is the focused element (the step
 *  starts from it, or from before the first when it is not an option). A
 *  key used here has its default cancelled, so an arrow never scrolls the
 *  page and a Space inside a word never picks; focus moves to the target.
 *  Returns the type-ahead buffer the list keeps for its next key. */
export function houseFormSelectListKeyDown(
  options: readonly { label: string }[],
  nodes: readonly HouseFormSelectListNode[],
  active: unknown,
  event: HouseFormSelectListKeyEvent,
  typed: HouseFormSelectTyped,
  now: number,
): HouseFormSelectTyped {
  const result = houseFormSelectListKey(
    options,
    nodes.findIndex((node) => node === active),
    event.key,
    event.metaKey || event.ctrlKey || event.altKey,
    typed,
    now,
  );
  if (result.handled) event.preventDefault();
  const node = result.focus === null ? undefined : nodes[result.focus];
  if (node) {
    node.focus();
    node.scrollIntoView?.({ block: "nearest" });
  }
  return result.typed;
}
