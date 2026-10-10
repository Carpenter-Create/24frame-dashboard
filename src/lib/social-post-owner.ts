import { houseWindowTabTarget } from "@/lib/house-window";

// A post's ⋯: the owner menu and the Remove confirm
// (docs/design-locks/social-post-owner-menu-lock-v1.md). One flow, two hosts:
// the thread ··· popover on desktop, the house AppSheet card on a phone; the
// confirm is the house ask in HouseDialog's 400 on desktop and the same card
// on a phone. Pure: the hook (components/social/use-social-post-owner) runs it.

export type SocialPostOwnerStep = "closed" | "menu" | "confirm";

/** Where an open menu is drawn: the phone card or the desktop popover. */
export type SocialPostOwnerSurface = "sheet" | "popover";

export type SocialPostOwnerState = {
  step: SocialPostOwnerStep;
  /** The open menu's surface; null unless a menu is open. */
  surface: SocialPostOwnerSurface | null;
  /** The removal is with the server. */
  pending: boolean;
  /** The route's fixed line after a failure; "" when there is none. */
  error: string;
};

export const SOCIAL_POST_OWNER_CLOSED: SocialPostOwnerState = {
  step: "closed",
  surface: null,
  pending: false,
  error: "",
};

export type SocialPostOwnerAction =
  | { type: "menu"; surface: SocialPostOwnerSurface }
  | { type: "popoverClosed" }
  | { type: "confirm" }
  | { type: "dismiss" }
  | { type: "submit" }
  | { type: "failed"; error: string }
  | { type: "removed" }
  | { type: "host"; desktop: boolean };

export function socialPostOwnerReduce(
  state: SocialPostOwnerState,
  action: SocialPostOwnerAction,
): SocialPostOwnerState {
  switch (action.type) {
    case "menu":
      // A menu opens only from closed.
      return state.step === "closed" ? { step: "menu", surface: action.surface, pending: false, error: "" } : state;
    case "popoverClosed":
      // Radix's close after a select lands once the step is already the
      // confirm: it only ever closes the popover menu.
      return state.step === "menu" && state.surface === "popover" ? SOCIAL_POST_OWNER_CLOSED : state;
    case "confirm":
      // From the popover (closed by then) or the phone card; never a stale line.
      return state.step === "confirm" ? state : { step: "confirm", surface: null, pending: false, error: "" };
    case "dismiss":
      // Nothing closes while the removal is with the server.
      if (state.pending) return state;
      return state.step === "closed" ? state : SOCIAL_POST_OWNER_CLOSED;
    case "submit":
      // One request: a second submit changes nothing. A retry clears the old line.
      return state.step === "confirm" && !state.pending ? { ...state, pending: true, error: "" } : state;
    case "failed":
      return state.pending ? { step: "confirm", surface: null, pending: false, error: action.error } : state;
    case "removed":
      return SOCIAL_POST_OWNER_CLOSED;
    case "host":
      // A width change closes a menu drawn for the other width, in both
      // directions; a confirm keeps its pending state and its line and is
      // drawn again in the other host.
      if (state.step !== "menu") return state;
      return (state.surface === "sheet") === action.desktop ? SOCIAL_POST_OWNER_CLOSED : state;
  }
}

/** The host to draw now: the phone card (a sheet menu, or a confirm on a
 *  phone), HouseDialog's confirm on desktop, or null (closed, or the
 *  popover, which Radix draws). */
export function socialPostOwnerHost(state: SocialPostOwnerState, desktop: boolean): "sheet" | "dialog" | null {
  if (state.step === "menu") return state.surface === "sheet" ? "sheet" : null;
  if (state.step === "confirm") return desktop ? "dialog" : "sheet";
  return null;
}

/** After a removal, the post focus moves into: the next entry after the one
 *  acted on whose id is not the removed post (a post shown twice skips its
 *  other copy), else the nearest earlier one, else null. */
export function socialPostRemoveFocusTarget(
  order: readonly string[],
  actingIndex: number,
  removedId: string,
): number | null {
  for (let index = actingIndex + 1; index < order.length; index += 1) {
    if (order[index] !== removedId) return index;
  }
  for (let index = actingIndex - 1; index >= 0; index -= 1) {
    if (order[index] !== removedId) return index;
  }
  return null;
}

/** Remove, and the confirm's scrim, ignore a press this soon after the
 *  confirm appears. Assumption: 500 ms is the usual double-click and
 *  double-tap interval, and reading the line takes longer. On a phone the
 *  menu's Remove row and the confirm's Remove button sit within about 2 px
 *  in the same bottom card, so a double tap must not remove the post. */
export const SOCIAL_POST_OWNER_ARM_MS = 500;

export function socialPostOwnerTooSoon(shownAt: number, now: number): boolean {
  return now - shownAt < SOCIAL_POST_OWNER_ARM_MS;
}

/** Where Tab goes inside the sheet or the confirm: the house window's rule
 *  over the surface's real stops (houseWindowTabTarget), or "panel" when
 *  there is no stop (both buttons wait while the removal is with the
 *  server): hold the key and keep focus on the ask's panel. */
export function socialPostOwnerTabTarget(
  stops: readonly HTMLElement[],
  active: unknown,
  shift: boolean,
  inside: boolean,
): HTMLElement | "panel" | null {
  if (stops.length === 0) return "panel";
  return houseWindowTabTarget(stops, active, shift, inside);
}
