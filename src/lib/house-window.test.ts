import { describe, expect, it } from "vitest";

import { HOUSE_DIALOG_WINDOW_CLASS } from "./house-overlay";
import {
  HOUSE_WINDOW_ASK_STRIP_CLASS,
  HOUSE_WINDOW_FOCUSABLE,
  HOUSE_WINDOW_FRAME_CLASS,
  HOUSE_WINDOW_HEADER_CLASS,
  HOUSE_WINDOW_PANEL_CLASS,
  houseWindowClosedHref,
  houseWindowMotionClass,
  houseWindowOpenHref,
  parseHouseWindowParam,
} from "./house-window";

const face = (value: string | null) => (value === "name" || value === "bio" ? value : "edit");

describe("house window (lib/house-window)", () => {
  it("is the 600 window with no pad of its own, a 64 header and a frame up to 80vh", () => {
    expect(HOUSE_WINDOW_PANEL_CLASS).toBe(`${HOUSE_DIALOG_WINDOW_CLASS} relative flex flex-col overflow-hidden p-0`);
    expect(HOUSE_WINDOW_HEADER_CLASS).toContain("h-16");
    expect(HOUSE_WINDOW_FRAME_CLASS).toContain("max-h-[80vh]");
    expect(HOUSE_WINDOW_ASK_STRIP_CLASS).toContain("absolute inset-x-0 bottom-0");
    // Tab never lands on a disabled control or a hidden input.
    expect(HOUSE_WINDOW_FOCUSABLE).toContain("button:not([disabled])");
    expect(HOUSE_WINDOW_FOCUSABLE).toContain('input:not([disabled]):not([type="hidden"])');
    expect(HOUSE_WINDOW_FOCUSABLE).toContain('[tabindex]:not([tabindex="-1"])');
  });

  it("slides a face in from the right and Back from the left", () => {
    expect(houseWindowMotionClass("push")).toBe("house-window-push");
    expect(houseWindowMotionClass("pop")).toBe("house-window-pop");
    expect(houseWindowMotionClass(null)).toBeNull();
  });

  it("reads the window's face from its query, and null when the query is absent", () => {
    expect(parseHouseWindowParam("", "edit", face)).toBeNull();
    expect(parseHouseWindowParam("?tab=credits", "edit", face)).toBeNull();
    expect(parseHouseWindowParam("?edit", "edit", face)).toBe("edit");
    expect(parseHouseWindowParam("edit=name", "edit", face)).toBe("name");
    expect(parseHouseWindowParam("?tab=x&edit=bio", "edit", face)).toBe("bio");
    expect(parseHouseWindowParam("?edit=nope", "edit", face)).toBe("edit");
    expect(parseHouseWindowParam("?details=name", "edit", face)).toBeNull();
  });

  it("opens and closes on the same page, every other param kept", () => {
    expect(houseWindowOpenHref("/p", "", "edit", "edit", "edit")).toBe("/p?edit");
    expect(houseWindowOpenHref("/p", "?tab=credits", "edit", "edit", "edit")).toBe("/p?tab=credits&edit");
    expect(houseWindowOpenHref("/p", "?edit=bio&tab=x", "edit", "name", "edit")).toBe("/p?tab=x&edit=name");
    expect(houseWindowOpenHref("/p", "", "w", "a b", "i")).toBe("/p?w=a%20b");
    expect(houseWindowClosedHref("/p", "?edit=bio", "edit")).toBe("/p");
    expect(houseWindowClosedHref("/p", "?tab=x&edit", "edit")).toBe("/p?tab=x");
    expect(houseWindowClosedHref("/p", "tab=x", "edit")).toBe("/p?tab=x");
  });
});
