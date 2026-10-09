import { describe, expect, it } from "vitest";

import { HOUSE_DIALOG_WINDOW_CLASS } from "./house-overlay";
import {
  HOUSE_WINDOW_ASK_STRIP_CLASS,
  HOUSE_WINDOW_FOCUSABLE,
  HOUSE_WINDOW_FRAME_CLASS,
  HOUSE_WINDOW_FRAME_FILL_CLASS,
  HOUSE_WINDOW_HEADER_CLASS,
  HOUSE_WINDOW_PANEL_CLASS,
  houseWindowClosedHref,
  houseWindowFirstField,
  houseWindowFocusables,
  houseWindowMotionClass,
  houseWindowOpenHref,
  houseWindowSameStop,
  houseWindowTabTarget,
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

  it("closes both windows of a page with two, every other param kept", () => {
    expect(houseWindowClosedHref("/p", "?a=1&edit&add-right=type", ["edit", "add-right"])).toBe("/p?a=1");
    expect(houseWindowClosedHref("/p", "?edit=bio", ["edit", "add-right"])).toBe("/p");
    // One param behaves as before.
    expect(houseWindowClosedHref("/p", "?a=1&edit&b=2", "edit")).toBe("/p?a=1&b=2");
  });

  it("may fill 80vh for a window whose faces hold long lists", () => {
    expect(HOUSE_WINDOW_FRAME_FILL_CLASS).toBe("flex h-[80vh] min-h-0 flex-col outline-none");
    expect(HOUSE_WINDOW_FRAME_FILL_CLASS).not.toContain("max-h");
  });

  it("counts only real Tab stops: never tabindex=-1, an .sr-only input, or anything inert", () => {
    type Fake = { tabindex: string | null; srOnly?: boolean; inert?: boolean };
    const node = ({ tabindex, srOnly = false, inert = false }: Fake) => ({
      getAttribute: (name: string) => (name === "tabindex" ? tabindex : null),
      closest: (selector: string) => (selector === "[inert]" && inert ? {} : null),
      classList: { contains: (name: string) => name === "sr-only" && srOnly },
    });
    const header = node({ tabindex: null });
    const stop = node({ tabindex: "0" });
    const roving = node({ tabindex: "-1" });
    const file = node({ tabindex: null, srOnly: true });
    const behind = node({ tabindex: null, inert: true });
    const root = { querySelectorAll: () => [header, stop, roving, file, behind] } as unknown as HTMLElement;
    expect(houseWindowFocusables(root)).toEqual([header, stop]);
  });
});

// A radio group is one Tab stop in the browser (its checked radio, else its
// first), so the trap must count it as one: otherwise Tab from a face that
// ends with radios (Add right's Territory at Worldwide, its Exclusivity, the
// Metadata Release face) leaves the window.
describe("house window Tab stops: a radio group is one stop", () => {
  type Fake = {
    tag?: string;
    type?: string;
    name?: string;
    checked?: boolean;
    form?: unknown;
  };
  const node = ({ tag = "BUTTON", type, name, checked = false, form = null }: Fake) =>
    ({
      tagName: tag,
      type,
      name,
      checked,
      form,
      getAttribute: () => null,
      closest: () => null,
      classList: { contains: () => false },
    }) as unknown as HTMLElement;
  const radio = (name: string, checked = false, form: unknown = null) =>
    node({ tag: "INPUT", type: "radio", name, checked, form });
  const rootOf = (...nodes: HTMLElement[]) => ({ querySelectorAll: () => nodes }) as unknown as HTMLElement;

  const back = node({});
  const done = node({});

  it("counts a group's checked radio, or its first while none is checked", () => {
    const world = radio("mode", true);
    const include = radio("mode");
    const exclude = radio("mode");
    expect(houseWindowFocusables(rootOf(back, done, world, include, exclude))).toEqual([back, done, world]);

    const exclusive = radio("exclusivity");
    const nonExclusive = radio("exclusivity");
    expect(houseWindowFocusables(rootOf(back, done, exclusive, nonExclusive))).toEqual([back, done, exclusive]);

    const chosen = radio("mode2", true);
    expect(houseWindowFocusables(rootOf(back, radio("mode2"), chosen, done))).toEqual([back, chosen, done]);
  });

  it("keeps groups apart by name and form, and an unnamed radio is its own stop", () => {
    const a = radio("a", true);
    const b = radio("b");
    const otherForm = radio("a", false, {});
    const loose = node({ tag: "INPUT", type: "radio" });
    expect(houseWindowFocusables(rootOf(a, b, otherForm, loose))).toEqual([a, b, otherForm, loose]);
    expect(houseWindowSameStop(a, radio("a"))).toBe(true);
    expect(houseWindowSameStop(a, b)).toBe(false);
    expect(houseWindowSameStop(a, otherForm)).toBe(false);
    expect(houseWindowSameStop(back, done)).toBe(false);
    expect(houseWindowSameStop(back, back)).toBe(true);
    expect(houseWindowSameStop(null, back)).toBe(false);
  });

  it("wraps Tab from any radio of the last group, and Shift+Tab from the first stop", () => {
    // Territory at Worldwide: focus opens on the checked radio, the last stop.
    const world = radio("mode", true);
    const include = radio("mode");
    const exclude = radio("mode");
    const stops = houseWindowFocusables(rootOf(back, done, world, include, exclude));
    expect(houseWindowTabTarget(stops, world, false, true)).toBe(back);
    expect(houseWindowTabTarget(stops, exclude, false, true)).toBe(back);
    expect(houseWindowTabTarget(stops, back, true, true)).toBe(world);

    // Exclusivity, nothing chosen: either radio is the group's stop.
    const exclusive = radio("exclusivity");
    const nonExclusive = radio("exclusivity");
    const faceStops = houseWindowFocusables(rootOf(back, done, exclusive, nonExclusive));
    expect(houseWindowTabTarget(faceStops, exclusive, false, true)).toBe(back);
    expect(houseWindowTabTarget(faceStops, nonExclusive, false, true)).toBe(back);

    // Between stops the browser moves; from outside, Tab comes back in.
    expect(houseWindowTabTarget(stops, done, false, true)).toBeNull();
    expect(houseWindowTabTarget(stops, done, true, true)).toBeNull();
    expect(houseWindowTabTarget(stops, world, true, true)).toBeNull();
    expect(houseWindowTabTarget(stops, null, false, false)).toBe(back);
    expect(houseWindowTabTarget(stops, null, true, false)).toBe(world);
    expect(houseWindowTabTarget([], back, false, true)).toBeNull();
  });

  it("opens a face on its first real field: a group's chosen radio, never an unchosen one", () => {
    const world = radio("mode");
    const include = radio("mode", true);
    const search = node({ tag: "INPUT", type: "search" });
    expect(houseWindowFirstField(rootOf(back, done, world, include, radio("mode"), search))).toBe(include);
    // Nothing chosen: the group's first radio.
    const exclusive = radio("exclusivity");
    expect(houseWindowFirstField(rootOf(back, done, exclusive, radio("exclusivity")))).toBe(exclusive);
    // A file input is never the first field; a textarea is.
    const file = node({ tag: "INPUT", type: "file" });
    const bio = node({ tag: "TEXTAREA" });
    expect(houseWindowFirstField(rootOf(back, file, bio))).toBe(bio);
    // No field: the first stop.
    expect(houseWindowFirstField(rootOf(back, done))).toBe(back);
    expect(houseWindowFirstField(rootOf())).toBeNull();
  });
});
