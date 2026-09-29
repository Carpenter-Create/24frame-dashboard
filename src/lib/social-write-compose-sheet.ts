import { APP_SHEET_HOST_CLASS } from "@/lib/house-sheet";

// Share something → write compose.
// Phone: AppSheet (bottom, rise, 90vh, radius 16, no shadow).
// Desktop: HouseDialog short form. Not an AppSheet promoted into a modal.
// docs/design-locks/share-something-write-compose-sheet-lock-v1.md
// HouseOverlay dual-host lock v1.

export const SOCIAL_WRITE_COMPOSE_SHEET_PRESENTATION = "responsive";

export const SOCIAL_WRITE_COMPOSE_SHEET_HOST_CLASS = APP_SHEET_HOST_CLASS;

// Height cap matches AppSheet max-h 90vh so the sheet reads as a stage.
// AppSheetSurface already supplies radius, pad 16, fill, and the rise.
export const SOCIAL_WRITE_COMPOSE_SHEET_SURFACE_CLASS =
  "relative z-10 h-[90vh] min-h-0 overflow-hidden";

export const SOCIAL_WRITE_COMPOSE_SHEET_DESKTOP_BODY_CLASS =
  "flex max-h-[70vh] min-h-[50vh] min-w-0 flex-col overflow-hidden";

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
