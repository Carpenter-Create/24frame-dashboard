import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  HOUSE_PHONE_BOTTOM_NAV_ITEM_CLASS,
  HOUSE_PHONE_BOTTOM_NAV_ROW_CLASS,
  HOUSE_PHONE_BOTTOM_NAV_THUMB_CLASS,
  housePhoneDestinations,
  housePhoneDockThumbIndex,
} from "./house-phone-shell";
import {
  HOUSE_PHONE_NAV_GLYPH_FADE_CLASS,
  HOUSE_PHONE_NAV_PRESS_FACE_CLASS,
  HOUSE_PHONE_NAV_PRESS_GLYPH_CLASS,
  HOUSE_PHONE_NAV_PRESS_GROUP_CLASS,
  HOUSE_PHONE_NAV_THUMB_DURATION_MS,
  HOUSE_PHONE_NAV_THUMB_MOTION_CLASS,
  housePhoneNavGlyphOpacity,
} from "./house-phone-nav-motion";
import { SEGMENTED_TRACK_PERSIST } from "./segmented-track";
import {
  WORKSPACE_BAND_FOLD_OPEN_CLASS,
  WORKSPACE_BAND_FOLD_TUCKED_CLASS,
  WORKSPACE_BAND_PILL_CLASS,
  WORKSPACE_BAND_PILL_CURRENT_CLASS,
  WORKSPACE_BAND_PILL_HIT_CLASS,
  WORKSPACE_BAND_THUMB_CLASS,
  WORKSPACE_BAND_TRACK_CLASS,
} from "./workspace-switcher";

// docs/design-locks/shell-phone-nav-motion-lock-v1.md (Adam 2026-10-08).
const lock = readFileSync("docs/design-locks/shell-phone-nav-motion-lock-v1.md", "utf8");
const switcherSrc = readFileSync("src/components/chrome/workspace-switcher.tsx", "utf8");
const dockSrc = readFileSync("src/components/chrome/house-phone-bottom-nav.tsx", "utf8");
const trackSrc = readFileSync("src/components/ui/segmented-track.tsx", "utf8");
const classes = (value: string) => value.split(/\s+/).filter(Boolean);

describe("phone nav motion lock v1", () => {
  it("records the founder's words", () => {
    expect(lock).toContain("can we give 24frame some character like this? what is suitable for the 24frame brand?");
    expect(lock).toContain('**"just build it"**');
    expect(lock).toContain("Copy the movement, not the glass.");
  });

  it("G1: one quiet motion — a 260ms slide that settles, a glyph that fills as it lands, a press", () => {
    expect(HOUSE_PHONE_NAV_THUMB_DURATION_MS).toBe(260);
    expect(classes(HOUSE_PHONE_NAV_THUMB_MOTION_CLASS)).toEqual([
      "transition-[left,width]",
      "duration-[260ms]",
      "ease-[cubic-bezier(0.25,1.2,0.5,1)]",
      "motion-reduce:transition-none",
    ]);
    // The fill lands with the pill: 150 wait + 100 fade < 260.
    expect(classes(HOUSE_PHONE_NAV_GLYPH_FADE_CLASS)).toEqual(
      expect.arrayContaining(["transition-opacity", "duration-100", "delay-150"]),
    );
    expect(housePhoneNavGlyphOpacity(true)).toEqual({ idle: "opacity-0", fill: "opacity-100" });
    expect(housePhoneNavGlyphOpacity(false)).toEqual({ idle: "opacity-100", fill: "opacity-0" });
    expect(HOUSE_PHONE_NAV_PRESS_GROUP_CLASS).toBe("group/nav");
    expect(classes(HOUSE_PHONE_NAV_PRESS_FACE_CLASS)).toContain("group-active/nav:scale-[0.96]");
    expect(classes(HOUSE_PHONE_NAV_PRESS_GLYPH_CLASS)).toContain("group-active/nav:scale-90");
  });

  it("G2: the band's page colour is a sliding thumb on the house SegmentedTrack", () => {
    expect(switcherSrc).toContain("persistKey={SEGMENTED_TRACK_PERSIST.workspaceBand}");
    expect(switcherSrc).toContain("thumbClass={WORKSPACE_BAND_THUMB_CLASS}");
    expect(switcherSrc).toContain("durationMs={HOUSE_PHONE_NAV_THUMB_DURATION_MS}");
    expect(SEGMENTED_TRACK_PERSIST.workspaceBand).toBe("workspace-band");
    expect(classes(WORKSPACE_BAND_TRACK_CLASS)).toEqual(
      expect.arrayContaining(["relative", "w-max", "shrink-0", "gap-[var(--space-1)]"]),
    );
    expect(WORKSPACE_BAND_THUMB_CLASS).toContain(HOUSE_PHONE_NAV_THUMB_MOTION_CLASS);
    expect(classes(WORKSPACE_BAND_THUMB_CLASS)).toEqual(
      expect.arrayContaining(["pointer-events-none", "absolute", "h-9", "rounded-full", "bg-bg"]),
    );
    // The face paints the colour only until the thumb is placed.
    expect(classes(WORKSPACE_BAND_PILL_CURRENT_CLASS)).toContain("in-data-segmented-pending:bg-bg");
    expect(classes(WORKSPACE_BAND_PILL_CURRENT_CLASS)).not.toContain("bg-bg");
    // Hits paint above the thumb and carry the press group; faces ease.
    expect(classes(WORKSPACE_BAND_PILL_HIT_CLASS)).toEqual(expect.arrayContaining(["relative", "group/nav"]));
    expect(WORKSPACE_BAND_PILL_CLASS).toContain(HOUSE_PHONE_NAV_PRESS_FACE_CLASS);
  });

  it("G3: every dock's current dest sits on a 64 muted pill that slides; Create never carries it", () => {
    expect(dockSrc).toContain("persistKey={SEGMENTED_TRACK_PERSIST.phoneDest}");
    expect(dockSrc).toContain("revealActive={false}");
    expect(classes(HOUSE_PHONE_BOTTOM_NAV_ROW_CLASS)).toContain("relative");
    expect(classes(HOUSE_PHONE_BOTTOM_NAV_ITEM_CLASS)).toContain("group/nav");
    expect(HOUSE_PHONE_BOTTOM_NAV_THUMB_CLASS).toContain(HOUSE_PHONE_NAV_THUMB_MOTION_CLASS);
    expect(classes(HOUSE_PHONE_BOTTOM_NAV_THUMB_CLASS)).toEqual(
      expect.arrayContaining([
        "pointer-events-none",
        "absolute",
        "inset-y-1",
        "after:w-16",
        "after:left-1/2",
        "after:-translate-x-1/2",
        "after:rounded-full",
        "after:bg-surface-muted",
      ]),
    );
    const social = housePhoneDestinations(false, "social");
    expect(social.map((item) => item.label)).toEqual(["Feed", "Explore", "Create", "Messages", "Profile"]);
    expect(housePhoneDockThumbIndex("/social", social, "social")).toBe(0);
    // Messages is the third dest that can be current: Create is skipped.
    expect(housePhoneDockThumbIndex("/social/dms", social, "social")).toBe(2);
    expect(housePhoneDockThumbIndex("/social/create", social, "social")).toBe(-1);
    // Only real dests are track items; Create's trigger is not.
    expect(dockSrc.match(/data-segmented-item=""/g)).toHaveLength(1);
    expect(dockSrc.indexOf('data-segmented-item=""')).toBeGreaterThan(dockSrc.indexOf("<HouseLink"));
  });

  it("G4: band and dock glyphs crossfade through HouseGlyphSwap", () => {
    expect(switcherSrc).toContain("<HouseGlyphSwap");
    expect(dockSrc).toContain("<HouseGlyphSwap");
    expect(dockSrc).toContain("hostClassName={HOUSE_PHONE_NAV_PRESS_GLYPH_CLASS}");
  });

  it("G5: the fold is never a scroll container, and the dock never scrolls to its dest", () => {
    for (const fold of [WORKSPACE_BAND_FOLD_OPEN_CLASS, WORKSPACE_BAND_FOLD_TUCKED_CLASS]) {
      expect(classes(fold)).toContain("overflow-clip");
      expect(classes(fold)).not.toContain("overflow-hidden");
    }
    expect(trackSrc).toContain(
      'if (revealActive) active.scrollIntoView({ block: "nearest", inline: "nearest" });',
    );
  });
});
