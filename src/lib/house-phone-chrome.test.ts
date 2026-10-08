import { describe, expect, it } from "vitest";

import {
  createHousePhoneChrome,
  HOUSE_PHONE_BAND_ROW_PX,
  HOUSE_PHONE_CHROME_OPEN,
  HOUSE_PHONE_CHROME_SETTLE_MS,
  HOUSE_PHONE_CHROME_SWIPE_PX,
  HOUSE_PHONE_CHROME_SWIPE_ZONE,
  housePhoneBandCanTuck,
  housePhoneChromeSwipe,
  type HousePhoneChromeState,
} from "./house-phone-chrome";

// docs/design-locks/shell-phone-workspace-band-lock-v1.md §5 (Adam 2026-10-08).
function page({ range = 2000 }: { range?: number } = {}) {
  let y = 0;
  let t = 0;
  const changes: HousePhoneChromeState[] = [];
  const chrome = createHousePhoneChrome({
    readY: () => y,
    readRange: () => range,
    now: () => t,
    onChange: (next) => changes.push(next),
  });
  return {
    chrome,
    changes,
    scrollTo(next: number) {
      y = next;
      chrome.scroll();
    },
    wait(ms: number) {
      t += ms;
    },
  };
}

const TUCKED = { dockHidden: true, bandTucked: true };

describe("phone chrome tuck (lock §5)", () => {
  it("folds the band and hides the dock together on scroll down; both return on scroll up", () => {
    const p = page();
    p.scrollTo(4);
    expect(p.chrome.state()).toEqual(HOUSE_PHONE_CHROME_OPEN);
    p.scrollTo(40);
    expect(p.chrome.state()).toEqual(TUCKED);
    p.wait(HOUSE_PHONE_CHROME_SETTLE_MS);
    p.scrollTo(400);
    expect(p.chrome.state()).toEqual(TUCKED);
    p.scrollTo(380);
    expect(p.chrome.state()).toEqual(HOUSE_PHONE_CHROME_OPEN);
    expect(p.changes).toEqual([TUCKED, HOUSE_PHONE_CHROME_OPEN]);
  });

  it("opens at the top of the page", () => {
    const p = page();
    p.scrollTo(200);
    p.wait(HOUSE_PHONE_CHROME_SETTLE_MS);
    p.scrollTo(0);
    expect(p.chrome.state()).toEqual(HOUSE_PHONE_CHROME_OPEN);
  });

  it("ignores the fold's own scroll clamp near the bottom of a page", () => {
    const p = page({ range: 1000 });
    p.scrollTo(940);
    p.scrollTo(1000);
    expect(p.chrome.state()).toEqual(TUCKED);
    // The scroller grows by the band row, so the browser clamps the
    // position up by 56. Inside the settle that is not a scroll up.
    p.wait(HOUSE_PHONE_CHROME_SETTLE_MS - 1);
    p.scrollTo(1000 - HOUSE_PHONE_BAND_ROW_PX);
    expect(p.chrome.state()).toEqual(TUCKED);
    // After the settle a real scroll up opens it again, measured from
    // the clamped position.
    p.wait(1);
    p.scrollTo(1000 - HOUSE_PHONE_BAND_ROW_PX - 4);
    expect(p.chrome.state()).toEqual(TUCKED);
    p.scrollTo(1000 - HOUSE_PHONE_BAND_ROW_PX - 20);
    expect(p.chrome.state()).toEqual(HOUSE_PHONE_CHROME_OPEN);
  });

  it("keeps the band on a short page; the dock still hides", () => {
    const p = page({ range: HOUSE_PHONE_BAND_ROW_PX * 2 });
    p.scrollTo(60);
    expect(p.chrome.state()).toEqual({ dockHidden: true, bandTucked: false });
    expect(housePhoneBandCanTuck(HOUSE_PHONE_BAND_ROW_PX * 2)).toBe(false);
    expect(housePhoneBandCanTuck(HOUSE_PHONE_BAND_ROW_PX * 2 + 1)).toBe(true);
  });

  it("pulls the bar down to open and pushes it up to fold, on any page", () => {
    const p = page({ range: 0 });
    expect(p.chrome.swipe(0, -HOUSE_PHONE_CHROME_SWIPE_PX)).toBe(true);
    expect(p.chrome.state()).toEqual(TUCKED);
    expect(p.chrome.swipe(0, HOUSE_PHONE_CHROME_SWIPE_PX)).toBe(true);
    expect(p.chrome.state()).toEqual(HOUSE_PHONE_CHROME_OPEN);
    expect(HOUSE_PHONE_CHROME_SWIPE_ZONE).toBe("[data-house-lead-stack]");
  });

  it("reads only a mostly vertical drag past 24 as a pull or a push", () => {
    expect(housePhoneChromeSwipe(0, 23)).toBeNull();
    expect(housePhoneChromeSwipe(0, -23)).toBeNull();
    expect(housePhoneChromeSwipe(0, 24)).toBe("open");
    expect(housePhoneChromeSwipe(0, -24)).toBe("tuck");
    // Sliding the band's pills sideways never folds it.
    expect(housePhoneChromeSwipe(60, -40)).toBeNull();
    expect(housePhoneChromeSwipe(-40, 40)).toBeNull();
  });

  it("re-bases the scroll after a pull, so the next small scroll does not fold it again", () => {
    const p = page();
    p.scrollTo(300);
    p.wait(HOUSE_PHONE_CHROME_SETTLE_MS);
    p.chrome.open();
    expect(p.chrome.state()).toEqual(HOUSE_PHONE_CHROME_OPEN);
    p.wait(HOUSE_PHONE_CHROME_SETTLE_MS);
    p.scrollTo(304);
    expect(p.chrome.state()).toEqual(HOUSE_PHONE_CHROME_OPEN);
    p.scrollTo(320);
    expect(p.chrome.state()).toEqual(TUCKED);
  });
});
