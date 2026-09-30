import { describe, expect, it } from "vitest";

import {
  SOCIAL_IMMERSIVE_FOCUSABLE_SELECTOR,
  SOCIAL_IMMERSIVE_KEEP_ABOVE_SELECTOR,
  SOCIAL_IMMERSIVE_COMMENT_SHEET_SELECTOR,
  SOCIAL_IMMERSIVE_NESTED_SHEET_SELECTOR,
  SOCIAL_IMMERSIVE_SHARE_SHEET_SELECTOR,
  socialImmersiveActiveFocusRoot,
  socialImmersiveCaptionNeedsMore,
  socialImmersiveEscapeDismisses,
  socialImmersiveFocusables,
  socialImmersiveNestedSheetOpen,
  socialImmersiveShellStaysActive,
  socialImmersiveTabWrapIndex,
} from "./social-feed-immersive";

describe("social feed immersive helpers", () => {
  it("caps a long caption at three lines before more", () => {
    expect(socialImmersiveCaptionNeedsMore("short note")).toBe(false);
    expect(socialImmersiveCaptionNeedsMore("a".repeat(141))).toBe(true);
    expect(socialImmersiveCaptionNeedsMore("one\ntwo\nthree\nfour")).toBe(true);
  });

  it("lets Escape dismiss the stage only when no comment or share sheet is open", () => {
    expect(socialImmersiveEscapeDismisses("Escape", false)).toBe(true);
    expect(socialImmersiveEscapeDismisses("Escape", true)).toBe(false);
    expect(socialImmersiveEscapeDismisses("Tab", false)).toBe(false);
    expect(SOCIAL_IMMERSIVE_NESTED_SHEET_SELECTOR).toContain(
      "[data-social-feed-immersive] [data-social-comment-thread]",
    );
    expect(SOCIAL_IMMERSIVE_NESTED_SHEET_SELECTOR).toContain("[data-social-post-share-sheet]");
    expect(SOCIAL_IMMERSIVE_NESTED_SHEET_SELECTOR).toContain("[data-social-post-open]");
    let seen = "";
    expect(
      socialImmersiveNestedSheetOpen({
        querySelector: (selector) => {
          seen = selector;
          return null;
        },
      }),
    ).toBe(false);
    expect(seen).toBe(SOCIAL_IMMERSIVE_NESTED_SHEET_SELECTOR);
    expect(socialImmersiveNestedSheetOpen({ querySelector: () => ({}) })).toBe(true);
    const share = { id: "share" };
    const comment = { id: "comment" };
    const stage = { id: "stage" };
    expect(socialImmersiveActiveFocusRoot(share, comment, stage)).toBe(share);
    expect(socialImmersiveActiveFocusRoot(null, comment, stage)).toBe(comment);
    expect(socialImmersiveActiveFocusRoot(null, null, stage)).toBe(stage);
    expect(SOCIAL_IMMERSIVE_SHARE_SHEET_SELECTOR).toBe("[data-social-post-share-sheet]");
    expect(SOCIAL_IMMERSIVE_COMMENT_SHEET_SELECTOR).toContain('data-house-overlay-host="house-dialog"');
    expect(SOCIAL_IMMERSIVE_COMMENT_SHEET_SELECTOR).toContain('data-house-overlay-host="app-sheet"');
  });

  it("leaves the dialog and an already-open share sheet out of the inert set", () => {
    expect(socialImmersiveShellStaysActive({ isDialog: true, alreadyInert: false, keepAbove: false })).toBe(
      true,
    );
    expect(socialImmersiveShellStaysActive({ isDialog: false, alreadyInert: true, keepAbove: false })).toBe(
      true,
    );
    expect(socialImmersiveShellStaysActive({ isDialog: false, alreadyInert: false, keepAbove: true })).toBe(
      true,
    );
    expect(socialImmersiveShellStaysActive({ isDialog: false, alreadyInert: false, keepAbove: false })).toBe(
      false,
    );
    expect(SOCIAL_IMMERSIVE_KEEP_ABOVE_SELECTOR).toContain("[data-social-post-share-sheet]");
    expect(SOCIAL_IMMERSIVE_KEEP_ABOVE_SELECTOR).toContain("[data-social-post-share-toast]");
  });

  it("cycles Tab inside the dialog and pulls outside focus back in", () => {
    expect(socialImmersiveTabWrapIndex(3, 2, true, false)).toBe(0);
    expect(socialImmersiveTabWrapIndex(3, 0, true, true)).toBe(2);
    expect(socialImmersiveTabWrapIndex(3, 1, true, false)).toBeNull();
    expect(socialImmersiveTabWrapIndex(3, 1, true, true)).toBeNull();
    expect(socialImmersiveTabWrapIndex(3, -1, true, false)).toBeNull();
    expect(socialImmersiveTabWrapIndex(3, -1, false, false)).toBe(0);
    expect(socialImmersiveTabWrapIndex(3, -1, false, true)).toBe(2);
    expect(socialImmersiveTabWrapIndex(0, -1, false, false)).toBeNull();
    let seen = "";
    const kept = { closest: () => null };
    const hidden = { closest: () => ({}) };
    expect(
      socialImmersiveFocusables({
        querySelectorAll: (selector) => {
          seen = selector;
          return [kept, hidden];
        },
      }),
    ).toEqual([kept]);
    expect(seen).toBe(SOCIAL_IMMERSIVE_FOCUSABLE_SELECTOR);
  });
});
