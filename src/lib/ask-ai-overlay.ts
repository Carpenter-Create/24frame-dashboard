import { ASK_ASSISTANT } from "@/lib/product";
import { isAskFrameAiThreadId } from "@/lib/ask-frame-ai";
import { HOUSE_PHONE_WRAP_CLASS } from "@/lib/house-phone-stack";

// Mercury Command overlay — 24Frame AI is never a workspace destination.
// Universal header access on every house chrome path. Open state lives
// on the current path as `?ai=1` (landing) or `?ai=<uuid>` (thread).
// Desktop starts as a bottom-right floating window over the current
// page; expand is a near-fullscreen overlay on the same surface.
// Phone stays bottom-sheet ↔ expand. Never a routed `/messages` land.
// Back/close strips the param and leaves the underlying view.
// Header Ask AI is a toggle on that same window: closed opens, open
// closes through the close path. Never a second instance.

export const ASK_AI_QUERY = "ai";
export const ASK_AI_OPEN_VALUE = "1";
export const ASK_AI_RETURN_STORAGE = "frame_ask_ai_return";

export const ASK_AI_OVERLAY = {
  label: ASK_ASSISTANT,
  close: "Close",
  expand: "Expand",
  collapse: "Close expand",
  dialog: ASK_ASSISTANT,
} as const;

// Overlay chrome mark — 32 house face, Sporty Blue. Visual weight on
// the sparkle cluster, not a 16 chrome whisper. Same HouseAiMark SoT.
export const ASK_AI_OVERLAY_MARK_CLASS = "size-8 shrink-0 text-accent";

export const ASK_AI_OVERLAY_COMPACT_CLASS =
  "flex h-[min(36rem,70dvh)] w-[min(28rem,calc(100vw-var(--space-12)))] flex-col overflow-hidden";

export const ASK_AI_OVERLAY_EXPANDED_CLASS =
  "flex h-full w-full flex-col overflow-hidden";

export const ASK_AI_OVERLAY_DESKTOP_SURFACE_CLASS =
  "rounded-[var(--radius-lg)] border border-hairline bg-surface text-ink shadow-[var(--elevation-float)]";

export const ASK_AI_OVERLAY_DESKTOP_DOCK_CLASS =
  "pointer-events-auto absolute bottom-[var(--space-6)] right-[var(--space-6)]";

export const ASK_AI_OVERLAY_DESKTOP_EXPAND_INSET_CLASS =
  "pointer-events-auto absolute inset-[var(--space-4)]";

export const ASK_AI_OVERLAY_DESKTOP_HOST_COMPACT_CLASS =
  "pointer-events-none fixed inset-0 z-50 hidden md:block";

export const ASK_AI_OVERLAY_DESKTOP_HOST_EXPANDED_CLASS =
  "fixed inset-0 z-50 hidden md:block";

export const ASK_AI_OVERLAY_DESKTOP_SCRIM_CLASS =
  "absolute inset-0 bg-ink/24";

export const ASK_AI_OVERLAY_DESKTOP_COMPACT_CLASS =
  `${ASK_AI_OVERLAY_DESKTOP_SURFACE_CLASS} ${ASK_AI_OVERLAY_COMPACT_CLASS} ${ASK_AI_OVERLAY_DESKTOP_DOCK_CLASS}`;

export const ASK_AI_OVERLAY_DESKTOP_EXPANDED_CLASS =
  `${ASK_AI_OVERLAY_DESKTOP_SURFACE_CLASS} ${ASK_AI_OVERLAY_EXPANDED_CLASS} ${ASK_AI_OVERLAY_DESKTOP_EXPAND_INSET_CLASS}`;

export const ASK_AI_OVERLAY_PHONE_CLASS =
  "flex w-full flex-col overflow-hidden overscroll-none border-0";

/** Phone starts as a bottom sheet. Expand fills the viewport. Same overlay. */
export const ASK_AI_OVERLAY_PHONE_COMPACT_CLASS =
  `${ASK_AI_OVERLAY_PHONE_CLASS} h-[min(36rem,70dvh)] rounded-t-[var(--radius-lg)]`;

export const ASK_AI_OVERLAY_PHONE_EXPANDED_CLASS =
  `${ASK_AI_OVERLAY_PHONE_CLASS} h-dvh rounded-none`;

export const ASK_AI_OVERLAY_EXPAND_CLASS =
  "flex size-[44px] items-center justify-center text-ink-3";

// Overlay body fills the window. Landing/thread own the scroll so empty
// chat and history sit bottom-up (composer pinned, newest nearest it).
export const ASK_AI_OVERLAY_BODY_CLASS =
  "relative flex min-h-0 flex-1 flex-col overflow-hidden [&_[data-ask-frame-ai-gate]]:h-full [&_[data-ask-frame-ai-gate]]:min-h-0 [&_[data-ask-frame-ai-landing]]:h-full [&_[data-ask-frame-ai-landing]]:min-h-0 [&_[data-ask-frame-ai-thread]]:h-full [&_[data-ask-frame-ai-thread]]:min-h-0";

// iOS Safari: overflow-auto + flex-col-reverse is a dead touch port.
// Phone scrollers force overflow-y-scroll, contain overscroll, and pan-y.
export const ASK_AI_OVERLAY_PHONE_SCROLL_CLASS =
  "max-md:overflow-y-scroll max-md:overscroll-contain max-md:[touch-action:pan-y] max-md:[-webkit-overflow-scrolling:touch]";

/** Phone history fills the sheet body. Not the 384 nested popover card. */
export const ASK_AI_OVERLAY_PHONE_HISTORY_HOST_CLASS =
  "hidden min-h-0 flex-1 flex-col bg-surface max-md:flex";

/** Landing: cover chips/composer, leave the 44 clock hit. Thread uses flex-1. */
export const ASK_AI_OVERLAY_PHONE_HISTORY_COVER_CLASS =
  "max-md:absolute max-md:inset-x-[var(--space-4)] max-md:bottom-[var(--space-4)] max-md:top-[44px] max-md:flex-none";

export const ASK_AI_OVERLAY_PHONE_HISTORY_CLASS =
  "max-md:h-full max-md:min-h-0 max-md:w-full max-md:max-w-none max-md:flex-1 max-md:overflow-hidden max-md:rounded-none max-md:border-0 max-md:p-0";

export const ASK_AI_OVERLAY_PHONE_HISTORY_LIST_CLASS =
  "flex flex-col gap-[var(--space-6)] max-md:min-h-0 max-md:flex-1 max-md:overflow-y-scroll max-md:overscroll-contain max-md:[touch-action:pan-y] max-md:[-webkit-overflow-scrolling:touch]";

/** History row title (phone list and desktop popover): the house phone wrap,
 *  never an ellipsis; the time stays on the right. Not the thread title in
 *  the Messages header or the overlay heading. */
export const ASK_AI_HISTORY_ROW_TITLE_CLASS = `${HOUSE_PHONE_WRAP_CLASS} t-body text-ink`;

/** Phone clock sits in sheet pad. The retired /messages -24px dock clips off-screen. */
export const ASK_AI_OVERLAY_PHONE_CLOCK_DOCK_CLASS =
  "absolute top-0 left-0 max-md:left-[var(--space-4)]";

export function askAiOverlayPhoneClass(expanded: boolean): string {
  return expanded ? ASK_AI_OVERLAY_PHONE_EXPANDED_CLASS : ASK_AI_OVERLAY_PHONE_COMPACT_CLASS;
}

export function askAiOverlayDesktopClass(expanded: boolean): string {
  return expanded ? ASK_AI_OVERLAY_DESKTOP_EXPANDED_CLASS : ASK_AI_OVERLAY_DESKTOP_COMPACT_CLASS;
}

export function askAiOverlayDesktopHostClass(expanded: boolean): string {
  return expanded ? ASK_AI_OVERLAY_DESKTOP_HOST_EXPANDED_CLASS : ASK_AI_OVERLAY_DESKTOP_HOST_COMPACT_CLASS;
}

export type AskAiOverlayState = {
  open: boolean;
  threadId: string | null;
};

function readSearchValue(
  search: { get(name: string): string | null } | Record<string, string | string[] | undefined> | string,
  name: string,
): string | null {
  if (typeof search === "string") {
    const value = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search).get(name);
    const trimmed = value?.trim() ?? "";
    return trimmed.length > 0 ? trimmed : null;
  }
  const raw =
    "get" in search && typeof search.get === "function"
      ? search.get(name)
      : (search as Record<string, string | string[] | undefined>)[name];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function copySearchParams(
  search:
    | { get(name: string): string | null; toString(): string }
    | Record<string, string | string[] | undefined>
    | string
    | null
    | undefined,
): URLSearchParams {
  if (!search) return new URLSearchParams();
  if (typeof search === "string") {
    return new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  }
  if ("toString" in search && typeof search.toString === "function" && "get" in search) {
    return new URLSearchParams(search.toString());
  }
  const params = new URLSearchParams();
  for (const [key, raw] of Object.entries(search as Record<string, string | string[] | undefined>)) {
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (typeof value === "string" && value.trim()) params.set(key, value);
  }
  return params;
}

export function readAskAiOverlay(
  search:
    | { get(name: string): string | null }
    | Record<string, string | string[] | undefined>
    | string
    | null
    | undefined,
): AskAiOverlayState {
  const value = search ? readSearchValue(search, ASK_AI_QUERY) : null;
  if (!value) return { open: false, threadId: null };
  if (isAskFrameAiThreadId(value)) return { open: true, threadId: value };
  return { open: true, threadId: null };
}

export function askAiOverlayHref(
  pathname: string,
  search?:
    | { get(name: string): string | null; toString(): string }
    | Record<string, string | string[] | undefined>
    | string
    | null,
  threadId?: string | null,
): string {
  const params = copySearchParams(search);
  params.delete("thread");
  params.delete("q");
  if (threadId && isAskFrameAiThreadId(threadId)) {
    params.set(ASK_AI_QUERY, threadId);
  } else {
    params.set(ASK_AI_QUERY, ASK_AI_OPEN_VALUE);
  }
  const next = params.toString();
  return next ? `${pathname}?${next}` : `${pathname}?${ASK_AI_QUERY}=${ASK_AI_OPEN_VALUE}`;
}

export function askAiCloseHref(
  pathname: string,
  search?:
    | { get(name: string): string | null; toString(): string }
    | Record<string, string | string[] | undefined>
    | string
    | null,
): string {
  const params = copySearchParams(search);
  params.delete(ASK_AI_QUERY);
  params.delete("thread");
  const next = params.toString();
  return next ? `${pathname}?${next}` : pathname;
}

export function rememberAskAiReturnPath(pathname: string): void {
  if (typeof sessionStorage === "undefined") return;
  if (!pathname) return;
  sessionStorage.setItem(ASK_AI_RETURN_STORAGE, pathname);
}

export function readAskAiReturnPath(fallback: string): string {
  if (typeof sessionStorage === "undefined") return fallback;
  const stored = sessionStorage.getItem(ASK_AI_RETURN_STORAGE)?.trim() ?? "";
  if (!stored) return fallback;
  return stored;
}

/** Sheet/nav onClose may unmount the control. Open first so the commit survives. */
export function fireAskAiOpenThen(
  openAskAi: (threadId?: string | null) => void,
  then?: () => void,
  threadId?: string | null,
): void {
  openAskAi(threadId);
  then?.();
}

/** Header chrome lives outside useSearchParams. Optimistic, then the live query. */
export function askAiChromeOpen(optimistic: AskAiOverlayState | null): boolean {
  if (optimistic) return optimistic.open;
  return readAskAiOverlay(currentAskAiSearch()).open;
}

/** Same overlay window. Open calls openAskAi; a second call uses closeAskAi. */
export function toggleAskAiOverlay(
  open: boolean,
  openAskAi: (threadId?: string | null) => void,
  closeAskAi: () => void,
  threadId?: string | null,
): void {
  if (open) {
    closeAskAi();
    return;
  }
  openAskAi(threadId);
}

export function askAiStateFromHref(href: string): AskAiOverlayState {
  const query = href.indexOf("?");
  return readAskAiOverlay(query >= 0 ? href.slice(query + 1) : "");
}

export function currentAskAiSearch(): string {
  if (typeof window === "undefined") return "";
  return window.location.search;
}

export function isAskAiDesktopViewport(
  matchMedia: ((query: string) => { matches: boolean }) | undefined = typeof window === "undefined"
    ? undefined
    : window.matchMedia.bind(window),
): boolean {
  return Boolean(matchMedia?.("(min-width: 768px)").matches);
}

