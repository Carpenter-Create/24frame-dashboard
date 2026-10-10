import { describe, expect, it } from "vitest";

import {
  SOCIAL_POST_OWNER_ARM_MS,
  SOCIAL_POST_OWNER_CLOSED,
  socialPostOwnerHost,
  socialPostOwnerHostCloses,
  socialPostOwnerReduce,
  socialPostOwnerTabTarget,
  socialPostOwnerTooSoon,
  socialPostRemoveFocusTarget,
  type SocialPostOwnerAction,
  type SocialPostOwnerState,
} from "./social-post-owner";

// A post's ⋯ (docs/design-locks/social-post-owner-menu-lock-v1.md): the
// owner flow's state, its host, the focus after a removal, the press guard
// and the Tab decision.

function run(...actions: SocialPostOwnerAction[]): SocialPostOwnerState {
  return actions.reduce(socialPostOwnerReduce, SOCIAL_POST_OWNER_CLOSED);
}

const LINE = "Could not remove that post.";

describe("socialPostOwnerReduce", () => {
  it("opens a menu from closed, on its surface, and turns it into the confirm", () => {
    const sheet = run({ type: "menu", surface: "sheet" });
    expect(sheet).toEqual({ step: "menu", surface: "sheet", pending: false, error: "" });
    expect(socialPostOwnerReduce(sheet, { type: "confirm" })).toEqual({
      step: "confirm",
      surface: null,
      pending: false,
      error: "",
    });
    expect(run({ type: "menu", surface: "popover" })).toEqual({
      step: "menu",
      surface: "popover",
      pending: false,
      error: "",
    });
    // A menu never opens over the confirm.
    const confirm = run({ type: "confirm" });
    expect(socialPostOwnerReduce(confirm, { type: "menu", surface: "sheet" })).toBe(confirm);
  });

  it("closes only a popover menu when Radix closes the popover", () => {
    expect(run({ type: "menu", surface: "popover" }, { type: "popoverClosed" })).toEqual(SOCIAL_POST_OWNER_CLOSED);
    // Radix's close after a select lands once the step is already the confirm.
    const confirm = run({ type: "menu", surface: "popover" }, { type: "confirm" });
    expect(socialPostOwnerReduce(confirm, { type: "popoverClosed" })).toBe(confirm);
    const sheet = run({ type: "menu", surface: "sheet" });
    expect(socialPostOwnerReduce(sheet, { type: "popoverClosed" })).toBe(sheet);
  });

  it("starts every confirm clean, from closed (the popover) or from the menu", () => {
    const failedThenClosed: SocialPostOwnerState = { step: "closed", surface: null, pending: false, error: LINE };
    expect(socialPostOwnerReduce(failedThenClosed, { type: "confirm" }).error).toBe("");
    const menuWithLine: SocialPostOwnerState = { step: "menu", surface: "sheet", pending: false, error: LINE };
    expect(socialPostOwnerReduce(menuWithLine, { type: "confirm" }).error).toBe("");
  });

  it("sends one request: submit waits and clears the old line, a second submit changes nothing", () => {
    const failed = run({ type: "confirm" }, { type: "submit" }, { type: "failed", error: LINE });
    expect(failed.error).toBe(LINE);
    const retry = socialPostOwnerReduce(failed, { type: "submit" });
    expect(retry).toEqual({ step: "confirm", surface: null, pending: true, error: "" });
    expect(socialPostOwnerReduce(retry, { type: "submit" })).toBe(retry);
    // Nothing to submit outside the confirm.
    const menu = run({ type: "menu", surface: "sheet" });
    expect(socialPostOwnerReduce(menu, { type: "submit" })).toBe(menu);
  });

  it("refuses dismiss while the removal waits, and otherwise closes with the line cleared", () => {
    const pending = run({ type: "confirm" }, { type: "submit" });
    expect(socialPostOwnerReduce(pending, { type: "dismiss" })).toBe(pending);
    const failed = socialPostOwnerReduce(pending, { type: "failed", error: LINE });
    expect(socialPostOwnerReduce(failed, { type: "dismiss" })).toEqual(SOCIAL_POST_OWNER_CLOSED);
    expect(run({ type: "menu", surface: "sheet" }, { type: "dismiss" })).toEqual(SOCIAL_POST_OWNER_CLOSED);
  });

  it("returns a failure to the confirm with its line, only while waiting", () => {
    const failed = run({ type: "confirm" }, { type: "submit" }, { type: "failed", error: LINE });
    expect(failed).toEqual({ step: "confirm", surface: null, pending: false, error: LINE });
    const idle = run({ type: "confirm" });
    expect(socialPostOwnerReduce(idle, { type: "failed", error: LINE })).toBe(idle);
  });

  it("closes on removed", () => {
    expect(run({ type: "confirm" }, { type: "submit" }, { type: "removed" })).toEqual(SOCIAL_POST_OWNER_CLOSED);
  });
});

describe("socialPostOwnerHostCloses", () => {
  it("closes a menu drawn for the other width, in both directions, and nothing else", () => {
    const sheet = run({ type: "menu", surface: "sheet" });
    const popover = run({ type: "menu", surface: "popover" });
    const confirm = run({ type: "confirm" });
    expect(socialPostOwnerHostCloses(sheet, true)).toBe(true);
    expect(socialPostOwnerHostCloses(sheet, false)).toBe(false);
    expect(socialPostOwnerHostCloses(popover, false)).toBe(true);
    expect(socialPostOwnerHostCloses(popover, true)).toBe(false);
    expect(socialPostOwnerHostCloses(confirm, true)).toBe(false);
    expect(socialPostOwnerHostCloses(confirm, false)).toBe(false);
    expect(socialPostOwnerHostCloses(SOCIAL_POST_OWNER_CLOSED, true)).toBe(false);
    // The reducer closes exactly when the helper says so.
    for (const state of [sheet, popover, confirm]) {
      for (const desktop of [true, false]) {
        const next = socialPostOwnerReduce(state, { type: "host", desktop });
        expect(next === SOCIAL_POST_OWNER_CLOSED).toBe(socialPostOwnerHostCloses(state, desktop));
      }
    }
  });
});

describe("socialPostOwnerHost", () => {
  it("draws the phone card, HouseDialog's confirm, or nothing (Radix draws the popover)", () => {
    expect(socialPostOwnerHost(run({ type: "menu", surface: "sheet" }), false)).toBe("sheet");
    expect(socialPostOwnerHost(run({ type: "menu", surface: "popover" }), true)).toBeNull();
    expect(socialPostOwnerHost(run({ type: "confirm" }), false)).toBe("sheet");
    expect(socialPostOwnerHost(run({ type: "confirm" }), true)).toBe("dialog");
    expect(socialPostOwnerHost(SOCIAL_POST_OWNER_CLOSED, false)).toBeNull();
    expect(socialPostOwnerHost(SOCIAL_POST_OWNER_CLOSED, true)).toBeNull();
  });

  it("closes a menu on a width change in both directions and keeps a confirm as it is", () => {
    expect(run({ type: "menu", surface: "sheet" }, { type: "host", desktop: true })).toEqual(SOCIAL_POST_OWNER_CLOSED);
    expect(run({ type: "menu", surface: "popover" }, { type: "host", desktop: false })).toEqual(SOCIAL_POST_OWNER_CLOSED);
    const pending = run({ type: "confirm" }, { type: "submit" });
    expect(socialPostOwnerReduce(pending, { type: "host", desktop: true })).toBe(pending);
    expect(socialPostOwnerReduce(pending, { type: "host", desktop: false })).toBe(pending);
    const failed = run({ type: "confirm" }, { type: "submit" }, { type: "failed", error: LINE });
    expect(socialPostOwnerReduce(failed, { type: "host", desktop: true })).toBe(failed);
  });
});

describe("socialPostRemoveFocusTarget", () => {
  it("moves into the post after the one acted on, else the nearest earlier one", () => {
    expect(socialPostRemoveFocusTarget(["a", "b", "c"], 1, "b")).toBe(2);
    expect(socialPostRemoveFocusTarget(["a", "b"], 1, "b")).toBe(0);
    expect(socialPostRemoveFocusTarget(["b", "b"], 0, "b")).toBeNull();
  });

  it("skips the post's other copy and starts from the copy acted on", () => {
    // Acting on the second copy focuses the post after it, not "x" above.
    expect(socialPostRemoveFocusTarget(["b", "x", "b", "c"], 2, "b")).toBe(3);
    expect(socialPostRemoveFocusTarget(["b", "x", "b", "c"], 0, "b")).toBe(1);
  });
});

describe("the press guard", () => {
  it("ignores a press in the first 500 ms after the confirm appears", () => {
    expect(SOCIAL_POST_OWNER_ARM_MS).toBe(500);
    expect(socialPostOwnerTooSoon(1000, 1499)).toBe(true);
    expect(socialPostOwnerTooSoon(1000, 1500)).toBe(false);
  });
});

describe("socialPostOwnerTabTarget", () => {
  function stops(count: number): HTMLElement[] {
    return Array.from({ length: count }, (_, index) => ({ id: `stop-${index}` }) as unknown as HTMLElement);
  }

  it("wraps Tab inside the surface and lets the browser move between stops", () => {
    const two = stops(2);
    expect(socialPostOwnerTabTarget(two, two[1], false, true)).toBe(two[0]);
    expect(socialPostOwnerTabTarget(two, two[0], true, true)).toBe(two[1]);
    const outside = { id: "page" };
    expect(socialPostOwnerTabTarget(two, outside, false, false)).toBe(two[0]);
    expect(socialPostOwnerTabTarget(two, outside, true, false)).toBe(two[1]);
    const three = stops(3);
    expect(socialPostOwnerTabTarget(three, three[1], false, true)).toBeNull();
  });

  it("holds focus on the panel when nothing in it can take focus (the removal waits)", () => {
    expect(socialPostOwnerTabTarget([], null, false, true)).toBe("panel");
    expect(socialPostOwnerTabTarget([], null, true, false)).toBe("panel");
  });
});
