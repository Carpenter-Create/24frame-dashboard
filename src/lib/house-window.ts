import { HOUSE_DIALOG_WINDOW_CLASS } from "@/lib/house-overlay";

// The house window: one object edited over the page that shows it
// (docs/design-locks/house-overlay-dual-host-v1.md, the object-edit job;
// first built as Edit profile, social-profile-edit-window-lock-v1). The
// composer's 600 geometry with no pad of its own: a 64 header (close or back ·
// title · Done) over a wash body whose faces slide in one still frame, and
// an ask that rises at the foot when leaving would lose changes.

export const HOUSE_WINDOW_PANEL_CLASS = `${HOUSE_DIALOG_WINDOW_CLASS} relative flex flex-col overflow-hidden p-0`;

/** The frame holds the height it opens at (up to 80vh). */
export const HOUSE_WINDOW_FRAME_CLASS = "flex max-h-[80vh] min-h-0 flex-col outline-none";

// Optional parts, absent for every window before them
// (docs/design-locks/social-comments-window-lock-v1.md). A window whose
// content arrives after it opens (Comments), or whose faces hold long lists
// (Add right, aggregation-add-right-window-lock-v1), fills 80vh and never
// takes the held px height, so a resize never clips its pinned foot.
export const HOUSE_WINDOW_FRAME_FILL_CLASS = "flex h-[80vh] min-h-0 flex-col outline-none";

// A foot pinned under the scrolling body (the comments composer).
export const HOUSE_WINDOW_FOOT_CLASS = "shrink-0 border-t border-hairline bg-surface";

// A window with no Done: a 44 spacer (the X's size) keeps the title centred.
export const HOUSE_WINDOW_HEADER_SPACER_CLASS = "size-[var(--header-control-size)] shrink-0";

// Phone, for a window that opts in: the same header and body filling the
// full AppSheet, clear of the status bar and the home indicator.
export const HOUSE_WINDOW_SHEET_FRAME_CLASS = "flex h-full min-h-0 flex-col pt-[env(safe-area-inset-top)] outline-none";

// close or back · title · Done, the composer's measures: round grey 44,
// 17/600 title, the accent Done pill 40 tall.
export const HOUSE_WINDOW_HEADER_CLASS =
  "flex h-16 shrink-0 items-center gap-[var(--space-3)] border-b border-hairline bg-surface px-[var(--space-4)]";

export const HOUSE_WINDOW_TITLE_CLASS = "min-w-0 flex-1 text-center text-[17px] font-semibold text-ink";

export const HOUSE_WINDOW_DONE_CLASS = "min-h-10 shrink-0 px-5 focus-visible:rounded-full!";

// The body holds one height while open (the index's, up to 80vh less the
// header); taller faces scroll inside it.
export const HOUSE_WINDOW_BODY_CLASS = "relative min-h-0 flex-1 overflow-y-auto bg-bg";

export const HOUSE_WINDOW_SHEET_BODY_CLASS = `${HOUSE_WINDOW_BODY_CLASS} pb-[env(safe-area-inset-bottom)]`;

export const HOUSE_WINDOW_FACE_CLASS = "flex flex-col gap-[var(--space-4)] p-[var(--space-6)]";

// The index's rows sit on one card (Edit profile's measures).
export const HOUSE_WINDOW_CARD_CLASS =
  "flex w-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-hairline bg-surface px-4";

// Leaving with changes: a strip rises at the foot, inside the window.
export const HOUSE_WINDOW_ASK_STRIP_CLASS =
  "absolute inset-x-0 bottom-0 z-20 flex flex-col gap-[var(--space-3)] border-t border-hairline bg-surface p-[var(--space-6)] app-sheet-rise";

export const HOUSE_WINDOW_ASK_TITLE_CLASS = "t-body font-semibold text-ink";

export const HOUSE_WINDOW_ASK_LINE_CLASS = "t-body-sm text-ink-2";

export const HOUSE_WINDOW_ASK_ACTIONS_CLASS = "flex flex-wrap items-center justify-end gap-[var(--space-2)]";

// Phone: the same ask as the house AppSheet card, actions stacked full width.
export const HOUSE_WINDOW_ASK_SHEET_ACTIONS_CLASS = "flex flex-col gap-[var(--space-2)]";

export const HOUSE_WINDOW_ASK_BUTTON_CLASS = "min-h-11 px-5 focus-visible:rounded-full!";

/** What Tab moves between inside the window. */
export const HOUSE_WINDOW_FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

type HouseWindowControl = HTMLElement & { type?: string; name?: string; checked?: boolean; form?: unknown };

/** A named radio: one of a group the browser treats as one Tab stop. */
function namedRadio(node: unknown): HouseWindowControl | null {
  const control = node as HouseWindowControl | null;
  return control?.type === "radio" && control.name ? control : null;
}

/** The same Tab stop: the same node, or two radios of one group (the same
 *  name and form). Tab leaves a radio group after any of its radios. */
export function houseWindowSameStop(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  const radioA = namedRadio(a);
  const radioB = namedRadio(b);
  return radioA !== null && radioB !== null && radioA.name === radioB.name && radioA.form === radioB.form;
}

/** The window's real Tab stops, in order: never under [inert], never an
 *  .sr-only input, and never tabindex="-1" (a roving list's other options,
 *  reached with the arrows; HousePageSelectOptions `inline`). A radio group
 *  is one stop, as the browser has it: its checked radio, else its first. */
export function houseWindowFocusables(root: HTMLElement): HTMLElement[] {
  const nodes = [...root.querySelectorAll<HTMLElement>(HOUSE_WINDOW_FOCUSABLE)].filter(
    (node) =>
      !node.closest("[inert]") && !node.classList.contains("sr-only") && node.getAttribute("tabindex") !== "-1",
  );
  return nodes.filter((node) => {
    if (!namedRadio(node)) return true;
    const group = nodes.filter((other) => houseWindowSameStop(other, node));
    return (group.find((radio) => (radio as HouseWindowControl).checked) ?? group[0]) === node;
  });
}

/** Where Tab goes when it would leave the window (from its last stop, or
 *  Shift+Tab from its first, or from outside it), or null to let the
 *  browser move between stops inside. */
export function houseWindowTabTarget(
  stops: readonly HTMLElement[],
  active: unknown,
  shift: boolean,
  inside: boolean,
): HTMLElement | null {
  const first = stops[0];
  const last = stops[stops.length - 1];
  if (!first || !last) return null;
  if (shift) return !inside || houseWindowSameStop(active, first) ? last : null;
  return !inside || houseWindowSameStop(active, last) ? first : null;
}

/** A face's first field: the first real Tab stop that is an input (never a
 *  file input) or a textarea, else its first stop. A radio group offers its
 *  checked radio (its first while none is checked), so a face never opens on
 *  an unchosen radio beside the chosen one. */
export function houseWindowFirstField(root: HTMLElement): HTMLElement | null {
  const stops = houseWindowFocusables(root);
  const field = stops.find(
    (node) => node.tagName === "TEXTAREA" || (node.tagName === "INPUT" && (node as HouseWindowControl).type !== "file"),
  );
  return field ?? stops[0] ?? null;
}

export type HouseWindowMotion = "push" | "pop" | null;

/** A face slides in from the right (push) or the left (pop), 220ms ease-out;
 *  none under reduced motion (globals.css). */
export function houseWindowMotionClass(motion: HouseWindowMotion): string | null {
  if (motion === "push") return "house-window-push";
  if (motion === "pop") return "house-window-pop";
  return null;
}

function paramsOf(search: string): URLSearchParams {
  return new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
}

/** The face a window's query names (`?param` is the index), or null when the
 *  query is absent. `parseFace` maps an unknown value to the index. */
export function parseHouseWindowParam<F extends string>(
  search: string,
  param: string,
  parseFace: (value: string | null) => F,
): F | null {
  const params = paramsOf(search);
  if (!params.has(param)) return null;
  return parseFace(params.get(param));
}

/** The address with the window open at `face` (every other param kept, so
 *  the page behind it does not change). */
export function houseWindowOpenHref(
  pathname: string,
  search: string,
  param: string,
  face: string,
  indexFace: string,
): string {
  const params = paramsOf(search);
  params.delete(param);
  const rest = params.toString();
  const value = face === indexFace ? "" : `=${encodeURIComponent(face)}`;
  return `${pathname}?${rest ? `${rest}&` : ""}${param}${value}`;
}

/** The address with the window's query removed (every other param kept).
 *  A list removes each of its params (a page with two windows). */
export function houseWindowClosedHref(pathname: string, search: string, param: string | readonly string[]): string {
  const params = paramsOf(search);
  for (const name of typeof param === "string" ? [param] : param) params.delete(name);
  const rest = params.toString();
  return rest ? `${pathname}?${rest}` : pathname;
}
