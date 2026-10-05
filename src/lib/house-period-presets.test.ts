import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  HOUSE_PERIOD_PRESETS_HOST_CLASS,
  HOUSE_PERIOD_PRESETS_PHONE_CLASS,
  resolveHousePeriodPresetKey,
} from "@/lib/house-period-presets";

describe("HousePeriodPresets craft", () => {
  it("uses a segmented track on desktop and HousePageSelect on phone — never wrap", () => {
    expect(HOUSE_PERIOD_PRESETS_PHONE_CLASS).toBe("md:hidden");
    expect(HOUSE_PERIOD_PRESETS_PHONE_CLASS).not.toContain("flex-wrap");
    expect(HOUSE_PERIOD_PRESETS_HOST_CLASS).toBe("min-w-0");

    const craft = readFileSync("src/lib/house-period-presets.ts", "utf8");
    const src = readFileSync("src/components/chrome/house-period-presets.tsx", "utf8");
    expect(craft).not.toContain("flex-wrap");
    expect(src).toContain("HousePageSelect");
    expect(src).toContain("SegmentedTrack");
    expect(src).toContain("resolveHousePeriodPresetKey");
    expect(src).toContain("SEGMENTED_TRACK_PERSIST.period");
    expect(src).toContain("({ selectedIndex })");
    expect(src).toContain("segmentedItemOn");
    expect(src).not.toContain("pendingIndex");
    expect(src).not.toContain("setPending");
    expect(src).toContain("HOUSE_SEGMENTED_ITEM_BASE_CLASS");
    expect(src).toContain("chipDataAttr");
    expect(src).not.toContain("chipAttrs");
    expect(src).not.toContain("flex-wrap");
    expect(src).not.toContain("overflow-x-auto");
  });

  it("flips the Revenue chip from the owned Home period before RSC", () => {
    const items = [
      { key: "all", href: "/home" },
      { key: "ytd", href: "/home?period=ytd" },
    ];
    expect(
      resolveHousePeriodPresetKey({
        seed: "all",
        owned: true,
        currentHref: "/home?period=ytd",
        nextHref: "/home",
        items,
      }),
    ).toBe("ytd");
    expect(
      resolveHousePeriodPresetKey({
        seed: "all",
        owned: false,
        currentHref: "/home?period=ytd",
        nextHref: "/home?period=ytd",
        items,
      }),
    ).toBe("all");
    expect(
      resolveHousePeriodPresetKey({
        seed: "ytd",
        owned: true,
        currentHref: "/social",
        nextHref: "/home",
        items,
      }),
    ).toBe("ytd");
  });
});
