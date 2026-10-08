import { APP_SHEET_HOST_CLASS } from "@/lib/house-sheet";

// Share something (and desktop Create) → write compose.
// Phone: AppSheet (bottom, rise, 90vh, radius 16, no shadow).
// Desktop: the house dialog as the composer window (below). Not an
// AppSheet promoted into a modal.
// docs/design-locks/share-something-write-compose-sheet-lock-v1.md
// HouseOverlay dual-host lock v1.

export const SOCIAL_WRITE_COMPOSE_SHEET_PRESENTATION = "responsive";

export const SOCIAL_WRITE_COMPOSE_SHEET_HOST_CLASS = APP_SHEET_HOST_CLASS;

// Height cap matches AppSheet max-h 90vh so the sheet reads as a stage.
// AppSheetSurface already supplies radius, pad 16, fill, and the rise.
export const SOCIAL_WRITE_COMPOSE_SHEET_SURFACE_CLASS =
  "relative z-10 h-[90vh] min-h-0 overflow-hidden";

// Desktop: the window hugs the composer (social-desktop-create-composer-lock-v1).
export const SOCIAL_WRITE_COMPOSE_SHEET_DESKTOP_BODY_CLASS = "flex min-h-0 min-w-0 flex-col";

/** Keep the phone sheet in the visual viewport so the keyboard does not cover the caption. */
export function bindSocialWriteComposeSheetViewport(
  host: HTMLElement,
  surface: HTMLElement,
): () => void {
  if (typeof window === "undefined" || !window.visualViewport) return () => undefined;
  const vv = window.visualViewport;
  const apply = () => {
    const visible = Math.round(vv.height);
    const cap = Math.min(Math.round(window.innerHeight * 0.9), visible);
    host.style.top = `${Math.round(vv.offsetTop)}px`;
    host.style.height = `${visible}px`;
    host.style.bottom = "auto";
    surface.style.height = `${cap}px`;
    surface.style.maxHeight = `${cap}px`;
  };
  apply();
  vv.addEventListener("resize", apply);
  vv.addEventListener("scroll", apply);
  return () => {
    vv.removeEventListener("resize", apply);
    vv.removeEventListener("scroll", apply);
    host.style.top = "";
    host.style.height = "";
    host.style.bottom = "";
    surface.style.height = "";
    surface.style.maxHeight = "";
  };
}

// Desktop window (docs/design-locks/social-desktop-create-composer-lock-v1.md,
// Adam 2026-10-08, "Open the composer"). The side menu's Create and the
// Feed's "Share something" open it. The house dialog at the Feed's
// card grammar: 600 wide, radius 24, no edge, pad 16. Inside, top to
// bottom: the round grey 44 close; the 40 avatar beside the field, set
// in the post's own desktop type (17 / 420, line 1.5) so the draft reads
// as the post; the attached media under it; then a hairline and the
// tool row: round grey 44 Media and Go live, the Post pill at the end.
export const SOCIAL_WRITE_COMPOSE_DIALOG_PANEL_CLASS =
  "w-[min(92vw,600px)] rounded-[var(--radius-xl)] border-0 p-[var(--space-4)]";

export const SOCIAL_WRITE_COMPOSE_DIALOG_FORM_CLASS = "flex max-h-[calc(80vh-32px)] min-h-0 w-full min-w-0 flex-col";

export const SOCIAL_WRITE_COMPOSE_DIALOG_HEAD_CLASS = "flex shrink-0 items-center";

export const SOCIAL_WRITE_COMPOSE_DIALOG_BODY_CLASS =
  "mt-[var(--space-2)] flex min-h-0 flex-1 gap-[var(--space-3)] overflow-y-auto pb-[var(--space-4)]";

export const SOCIAL_WRITE_COMPOSE_DIALOG_AVATAR_CLASS = "size-10 shrink-0";

export const SOCIAL_WRITE_COMPOSE_DIALOG_COLUMN_CLASS = "flex min-w-0 flex-1 flex-col gap-[var(--space-3)]";

// The first line sits on the avatar's centre: (40 - 25.5) / 2 ≈ 7.
export const SOCIAL_WRITE_COMPOSE_DIALOG_FIELD_CLASS =
  "min-h-[120px] w-full resize-none border-0 bg-transparent pt-[7px] text-[length:var(--text-base)] leading-normal [font-weight:var(--type-body-weight)] text-ink caret-ink outline-none placeholder:text-ink-2";

export const SOCIAL_WRITE_COMPOSE_DIALOG_PREVIEW_CLASS =
  "relative h-[min(40vh,320px)] w-full overflow-hidden rounded-[var(--radius-lg)] bg-surface-muted";

export const SOCIAL_WRITE_COMPOSE_DIALOG_TOOLS_CLASS =
  "flex shrink-0 items-center gap-[var(--space-2)] border-t border-hairline pt-[var(--space-3)]";

export const SOCIAL_WRITE_COMPOSE_DIALOG_POST_CLASS = "ml-auto min-h-10 px-5 focus-visible:rounded-full!";

/** Desktop Create's window and the screen it opened on. */
export type SocialCreateWindow = { open: boolean; path: string };

/** The window belongs to the screen it opened on: any navigation closes it
 *  (a hop that hides the side menu unmounts the window and its draft, so it
 *  must not reopen empty on the way back). */
export function socialCreateWindowAt(state: SocialCreateWindow, pathname: string): SocialCreateWindow {
  return state.path === pathname ? state : { open: false, path: pathname };
}
