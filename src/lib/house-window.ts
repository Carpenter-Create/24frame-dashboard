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

export function houseWindowFocusables(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(HOUSE_WINDOW_FOCUSABLE)].filter(
    (node) => !node.closest("[inert]") && !node.classList.contains("sr-only"),
  );
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

/** The address with the window's query removed (every other param kept). */
export function houseWindowClosedHref(pathname: string, search: string, param: string): string {
  const params = paramsOf(search);
  params.delete(param);
  const rest = params.toString();
  return rest ? `${pathname}?${rest}` : pathname;
}
