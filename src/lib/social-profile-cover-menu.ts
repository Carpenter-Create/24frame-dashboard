import { SOCIAL } from "@/lib/social";
import { coverZoomReadout } from "@/lib/social-profile-cover-frame";

// Cover pill menu. The document listener arms on a later turn than the
// gesture that opened the menu, so that press cannot also close it.
// Closing disarms the listener; the next pill press can open again.

export type CoverPillMode = "idle" | "menu";

export type CoverMenuListener = "armed" | "idle";

export type CoverMenuMachine = {
  mode: CoverPillMode;
  listener: CoverMenuListener;
};

export function nextCoverPillMode(mode: CoverPillMode): CoverPillMode {
  return mode === "menu" ? "idle" : "menu";
}

/** Outside press closes only an open menu, and only when the target is outside it. */
export function coverMenuClosesOnDocumentPress(
  mode: CoverPillMode,
  targetInsideMenu: boolean,
): boolean {
  return mode === "menu" && !targetInsideMenu;
}

export function reduceCoverMenu(
  state: CoverMenuMachine,
  event:
    | { type: "document-press"; inside: boolean }
    | { type: "pill-click" }
    | { type: "arm-listener" }
    | { type: "escape" },
): CoverMenuMachine {
  if (event.type === "arm-listener") {
    return {
      mode: state.mode,
      listener: state.mode === "menu" ? "armed" : "idle",
    };
  }
  if (event.type === "escape") {
    return state.mode === "menu" ? { mode: "idle", listener: "idle" } : state;
  }
  if (event.type === "document-press") {
    if (state.listener !== "armed") return state;
    if (!coverMenuClosesOnDocumentPress(state.mode, event.inside)) return state;
    return { mode: "idle", listener: "idle" };
  }
  return { mode: nextCoverPillMode(state.mode), listener: "idle" };
}

/** Modes observed at each pill click: open, outside-close, open again. */
export function coverMenuToggleSequence(times: number): CoverPillMode[] {
  let state: CoverMenuMachine = { mode: "idle", listener: "idle" };
  const seen: CoverPillMode[] = [];
  for (let i = 0; i < times; i += 1) {
    state = reduceCoverMenu(state, { type: "document-press", inside: true });
    state = reduceCoverMenu(state, { type: "pill-click" });
    seen.push(state.mode);
    state = reduceCoverMenu(state, { type: "document-press", inside: false });
    state = reduceCoverMenu(state, { type: "arm-listener" });
    state = reduceCoverMenu(state, { type: "document-press", inside: false });
    state = reduceCoverMenu(state, { type: "escape" });
    state = reduceCoverMenu(state, { type: "pill-click" });
    seen.push(state.mode);
    state = reduceCoverMenu(state, { type: "arm-listener" });
    state = reduceCoverMenu(state, { type: "escape" });
    state = reduceCoverMenu(state, { type: "arm-listener" });
  }
  return seen;
}

/**
 * Reposition (founder decision 3, keep the original): a cover with a kept
 * original reopens it at its stored framing; a cover saved before the
 * original was kept opens the file picker, the same as Choose cover photo.
 */
export function coverRepositionAction(input: {
  hasCover: boolean;
  hasSource: boolean;
}): "reopen" | "pick" | null {
  if (!input.hasCover) return null;
  return input.hasSource ? "reopen" : "pick";
}

/** The owner head trail that the cover editor's hint, actions and errors portal into. */
export const COVER_TRAIL_SELECTOR = "[data-social-profile-head-trail]";

export function coverTrailTarget(node: Element | null): HTMLElement | null {
  const host = node?.closest("[data-social-profile-identity]");
  return host?.querySelector<HTMLElement>(COVER_TRAIL_SELECTOR) ?? null;
}

/** Zoom readout beside the slider ("1.5×"); also the slider's spoken value. */
export function coverZoomText(zoom: number): string {
  return SOCIAL.profile.coverZoomValue.replace("{zoom}", coverZoomReadout(zoom));
}
