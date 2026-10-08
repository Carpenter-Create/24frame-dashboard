import { describe, expect, it } from "vitest";

import {
  createHousePhoneChrome,
  HOUSE_PHONE_BAND_ROW_PX,
  HOUSE_PHONE_CHROME_DRAG_ZONE,
  HOUSE_PHONE_SHEET_AXIS_PX,
  housePhoneSheetDragAxis,
  housePhoneSheetMovesPage,
  housePhoneSheetOffset,
  housePhoneSheetSnapTarget,
  type HousePhoneChromeState,
} from "./house-phone-chrome";

// docs/design-locks/shell-phone-workspace-band-lock-v1.md §5 (Adam 2026-10-08).
function page({ range = 2000 }: { range?: number } = {}) {
  let y = 0;
  const offsets: Array<[number, boolean]> = [];
  const changes: HousePhoneChromeState[] = [];
  const pageScrolls: Array<[number, boolean]> = [];
  // The page's own scroll, as the browser would report it.
  const chrome = createHousePhoneChrome({
    readY: () => y,
    readRange: () => range,
    scrollPage: (next, smooth) => {
      pageScrolls.push([next, smooth]);
      y = Math.min(range, Math.max(0, next));
      chrome.scroll();
    },
    onOffset: (offset, settle) => offsets.push([offset, settle]),
    onChange: (next) => changes.push(next),
  });
  return {
    chrome,
    offsets,
    changes,
    pageScrolls,
    y: () => y,
    scrollTo(next: number) {
      y = next;
      chrome.scroll();
    },
  };
}

const BAND = HOUSE_PHONE_BAND_ROW_PX;

describe("phone bar over the band (lock §5)", () => {
  it("covers the band by exactly as far as the page scrolls, up to the band's 56", () => {
    const p = page();
    p.scrollTo(20);
    expect(p.chrome.offset()).toBe(20);
    p.scrollTo(50);
    expect(p.chrome.offset()).toBe(50);
    expect(p.chrome.state().bandTucked).toBe(false);
    p.scrollTo(400);
    expect(p.chrome.offset()).toBe(BAND);
    expect(p.chrome.state().bandTucked).toBe(true);
    // Every step moved the bar with the scroll, never eased.
    expect(p.offsets.every(([, settle]) => !settle)).toBe(true);
  });

  it("opens by exactly as far as the page scrolls back, anywhere on the page", () => {
    const p = page();
    p.scrollTo(400);
    p.scrollTo(380);
    expect(p.chrome.offset()).toBe(BAND - 20);
    p.scrollTo(350);
    expect(p.chrome.offset()).toBe(BAND - 50);
    p.scrollTo(300);
    expect(p.chrome.offset()).toBe(0);
    expect(p.chrome.state().bandTucked).toBe(false);
  });

  it("always shows the band at the top of the page", () => {
    const p = page();
    p.scrollTo(30);
    expect(p.chrome.offset()).toBe(30);
    p.scrollTo(0);
    expect(p.chrome.offset()).toBe(0);
    expect(housePhoneSheetOffset(BAND, -5, -12)).toBe(0);
  });

  it("settles the way the page was moving when the scroll rests between", () => {
    // Deep in the page the content is already under the bar: only the bar eases.
    const up = page();
    up.scrollTo(400);
    up.scrollTo(370);
    up.chrome.settle();
    expect(up.chrome.offset()).toBe(0);
    expect(up.offsets.at(-1)).toEqual([0, true]);
    expect(up.pageScrolls).toEqual([]);

    const down = page();
    down.scrollTo(400);
    down.scrollTo(370);
    down.scrollTo(380);
    down.chrome.settle();
    expect(down.chrome.offset()).toBe(BAND);
    expect(down.offsets.at(-1)).toEqual([BAND, true]);

    // At either end there is nothing to settle.
    const rest = page();
    rest.scrollTo(400);
    const calls = rest.offsets.length;
    rest.chrome.settle();
    expect(rest.offsets).toHaveLength(calls);

    // No direction: the nearer end.
    expect(housePhoneSheetSnapTarget(20, 0)).toBe(0);
    expect(housePhoneSheetSnapTarget(40, 0)).toBe(BAND);
  });

  it("near the top, settles by scrolling the page, so the content travels with the bar", () => {
    const down = page();
    down.scrollTo(20);
    down.chrome.settle();
    expect(down.pageScrolls).toEqual([[BAND, true]]);
    expect(down.y()).toBe(BAND);
    expect(down.chrome.offset()).toBe(BAND);

    const back = page();
    back.scrollTo(40);
    back.scrollTo(30);
    back.chrome.settle();
    expect(back.pageScrolls).toEqual([[0, true]]);
    expect(back.chrome.offset()).toBe(0);
  });

  it("near the top, a drag on the bar pushes the page up with it; deeper, it moves the bar under the finger", () => {
    const p = page();
    p.chrome.dragStart();
    p.chrome.drag(-20); // finger up 20: the page and the bar rise 20
    expect(p.y()).toBe(20);
    expect(p.chrome.offset()).toBe(20);
    p.chrome.drag(-30);
    expect(p.y()).toBe(30);
    expect(p.chrome.offset()).toBe(30);
    p.chrome.dragEnd();
    expect(p.pageScrolls.at(-1)).toEqual([BAND, true]);
    expect(p.chrome.offset()).toBe(BAND);
    expect(p.chrome.state()).toEqual({ dockHidden: true, bandTucked: true });

    // Still at the top zone's edge: pulling down brings the page back with it.
    p.chrome.dragStart();
    p.chrome.drag(20);
    expect(p.y()).toBe(BAND - 20);
    expect(p.chrome.offset()).toBe(BAND - 20);
    p.chrome.dragEnd();
    expect(p.pageScrolls.at(-1)).toEqual([0, true]);
    expect(p.chrome.offset()).toBe(0);

    // Deeper, the page sits under the bar: the drag moves the bar alone.
    p.scrollTo(400);
    const scrolls = p.pageScrolls.length;
    p.chrome.dragStart();
    p.chrome.drag(10); // finger down 10: opens 10
    expect(p.chrome.offset()).toBe(BAND - 10);
    expect(p.y()).toBe(400);
    p.chrome.dragEnd();
    expect(p.chrome.offset()).toBe(0);
    expect(p.pageScrolls).toHaveLength(scrolls);
    expect(p.chrome.state()).toEqual({ dockHidden: false, bandTucked: false });
    expect(HOUSE_PHONE_CHROME_DRAG_ZONE).toBe("[data-house-lead-stack]");
  });

  it("on a page too short to scroll a band, the bar moves alone", () => {
    const p = page({ range: 30 });
    expect(housePhoneSheetMovesPage(0, 0, 30)).toBe(false);
    expect(housePhoneSheetMovesPage(0, 0, BAND)).toBe(true);
    // Covered more than the page has scrolled: the bar, not the page.
    expect(housePhoneSheetMovesPage(10, 40, 2000)).toBe(false);
    p.chrome.dragStart();
    p.chrome.drag(-40);
    expect(p.chrome.offset()).toBe(40);
    expect(p.pageScrolls).toEqual([]);
    p.chrome.dragEnd();
    expect(p.chrome.offset()).toBe(BAND);
  });

  it("reads a drag as vertical only when it moves more up or down than sideways", () => {
    expect(HOUSE_PHONE_SHEET_AXIS_PX).toBe(6);
    expect(housePhoneSheetDragAxis(3, 4)).toBeNull();
    expect(housePhoneSheetDragAxis(2, -8)).toBe("vertical");
    // Sliding the band's pills sideways never moves the bar.
    expect(housePhoneSheetDragAxis(10, 6)).toBe("horizontal");
  });

  it("opens on request (keyboard focus into the band), eased", () => {
    const p = page();
    p.scrollTo(400);
    p.chrome.open();
    expect(p.offsets.at(-1)).toEqual([0, true]);
    expect(p.chrome.state()).toEqual({ dockHidden: false, bandTucked: false });
  });

  it("keeps the dock's hide-on-scroll rule from the same scroll", () => {
    const p = page();
    p.scrollTo(4);
    expect(p.chrome.state().dockHidden).toBe(false);
    p.scrollTo(40);
    expect(p.chrome.state().dockHidden).toBe(true);
    p.scrollTo(20);
    expect(p.chrome.state().dockHidden).toBe(false);
  });
});
