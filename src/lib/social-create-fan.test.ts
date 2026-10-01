import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { HOUSE_PHONE_BOTTOM_NAV_ICON_CLASS, HOUSE_PHONE_BOTTOM_NAV_ICON_WEIGHT } from "./house-phone-shell";
import { SOCIAL, SOCIAL_ROUTES, socialCreateHref } from "./social";
import { SOCIAL_CREATE_TILES } from "./social-create-sheet";
import {
  SOCIAL_CREATE_FAN_ANGLES_DEG,
  SOCIAL_CREATE_FAN_CIRCLE_CLASS,
  SOCIAL_CREATE_FAN_DISMISS_MS,
  SOCIAL_CREATE_FAN_ICON_CLASS,
  SOCIAL_CREATE_FAN_LABEL_CLASS,
  SOCIAL_CREATE_FAN_MOTION_MS,
  SOCIAL_CREATE_FAN_RADIUS_PX,
  SOCIAL_CREATE_FAN_SCRIM_CLASS,
  SOCIAL_CREATE_FAN_STAGGER_MS,
  socialCreateFanPoint,
  socialCreateFanPoints,
} from "./social-create-fan";

describe("Social Create fan", () => {
  it("places Media · Write · Go live on a semicircle above the dock", () => {
    expect(SOCIAL_CREATE_TILES.map((tile) => tile.id)).toEqual(["media", "write", "live"]);
    expect(SOCIAL_CREATE_FAN_ANGLES_DEG).toEqual([140, 90, 40]);
    expect(SOCIAL_CREATE_FAN_RADIUS_PX).toBe(132);
    expect(socialCreateFanPoint(140)).toEqual({ x: -101, y: -85 });
    expect(socialCreateFanPoint(90)).toEqual({ x: 0, y: -132 });
    expect(socialCreateFanPoint(40)).toEqual({ x: 101, y: -85 });

    const points = socialCreateFanPoints();
    expect(points).toHaveLength(3);
    expect(points[0]?.x).toBeLessThan(0);
    expect(points[1]?.x).toBe(0);
    expect(points[2]?.x).toBeGreaterThan(0);
    expect(points[1]?.y).toBeLessThan(points[0]?.y ?? 0);
    expect(points[1]?.y).toBeLessThan(points[2]?.y ?? 0);
    for (const point of points) {
      expect(point.y).toBeLessThanOrEqual(-80);
    }
    expect(socialCreateTileHref("media")).toBe(socialCreateHref("media"));
    expect(socialCreateTileHref("write")).toBe(socialCreateHref("text"));
    expect(socialCreateTileHref("live")).toBe(SOCIAL_ROUTES.createLive);
  });

  it("uses dock stroke circles, not an accent fill or a sheet well", () => {
    expect(SOCIAL_CREATE_FAN_CIRCLE_CLASS).toContain("rounded-full");
    expect(SOCIAL_CREATE_FAN_CIRCLE_CLASS).toContain("border-hairline");
    expect(SOCIAL_CREATE_FAN_CIRCLE_CLASS).toContain("bg-surface");
    expect(SOCIAL_CREATE_FAN_CIRCLE_CLASS).toContain("text-ink-2");
    expect(SOCIAL_CREATE_FAN_CIRCLE_CLASS).toContain("shadow-[var(--elevation-float)]");
    expect(SOCIAL_CREATE_FAN_CIRCLE_CLASS).toContain("active:bg-surface-muted");
    expect(SOCIAL_CREATE_FAN_CIRCLE_CLASS).not.toMatch(/(?:^|\s)bg-surface-muted(?:\s|$)/);
    expect(SOCIAL_CREATE_FAN_CIRCLE_CLASS).not.toContain("bg-accent");
    expect(SOCIAL_CREATE_FAN_CIRCLE_CLASS).not.toContain("text-accent");
    expect(SOCIAL_CREATE_FAN_CIRCLE_CLASS).not.toContain("size-16");
    expect(SOCIAL_CREATE_FAN_ICON_CLASS).toBe(HOUSE_PHONE_BOTTOM_NAV_ICON_CLASS);
    expect(HOUSE_PHONE_BOTTOM_NAV_ICON_WEIGHT).toBe("regular");
    expect(SOCIAL_CREATE_FAN_LABEL_CLASS).toContain("whitespace-normal");
    expect(SOCIAL_CREATE_FAN_LABEL_CLASS).toContain("t-body-sm");
    expect(SOCIAL_CREATE_FAN_LABEL_CLASS).not.toContain("truncate");
    expect(SOCIAL_CREATE_FAN_LABEL_CLASS).not.toContain("uppercase");
    expect(SOCIAL_CREATE_FAN_SCRIM_CLASS).toContain("bg-transparent");
    expect(SOCIAL_CREATE_FAN_SCRIM_CLASS).not.toContain("bg-ink");
    expect(SOCIAL.create.media).toBe("Media");
    expect(SOCIAL.create.write).toBe("Write");
    expect(SOCIAL.create.goLive).toBe("Go live");
  });

  it("scales from the plus and skips motion when reduced", () => {
    expect(SOCIAL_CREATE_FAN_MOTION_MS).toBe(280);
    expect(SOCIAL_CREATE_FAN_STAGGER_MS).toEqual([0, 40, 80]);
    expect(SOCIAL_CREATE_FAN_DISMISS_MS).toBe(360);
    const globals = readFileSync("src/app/globals.css", "utf8");
    expect(globals).toContain(".social-create-fan-item[data-open]");
    expect(globals).toContain(".social-create-fan-plus[data-open]");
    expect(globals).toContain("rotate(45deg)");
    expect(globals).toContain("var(--social-create-fan-x)");
    expect(globals).toContain("cubic-bezier(0.22, 1.15, 0.36, 1)");
    const reduced = globals.slice(globals.lastIndexOf("@media (prefers-reduced-motion: reduce)"));
    expect(reduced).toContain(".social-create-fan-item");
    expect(reduced).toContain(".social-create-fan-plus");
    expect(reduced).toContain("transition: none !important");
    const fan = readFileSync("src/components/social/social-create-fan.tsx", "utf8");
    const dock = readFileSync("src/components/chrome/house-phone-bottom-nav.tsx", "utf8");
    expect(fan).toContain("HOUSE_PHONE_BOTTOM_NAV_ICON_WEIGHT");
    expect(fan).not.toContain("SocialIcon");
    expect(fan).not.toContain("SocialCreateSheet");
    expect(fan).not.toContain('role="dialog"');
    expect(dock).toContain("SocialCreateFan");
    expect(dock).not.toContain("SocialCreateSheet");
    expect(dock).not.toContain("Close44");
    expect(dock).not.toContain("<AppSheetSurface");
  });
});

function socialCreateTileHref(id: string): string | undefined {
  return SOCIAL_CREATE_TILES.find((tile) => tile.id === id)?.href;
}
