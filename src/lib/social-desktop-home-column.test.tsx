import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SocialHomeTopics } from "@/components/social/social-home-topics";
import { HOUSE_PILL_SELECTED_CLASS } from "@/lib/house-shell";
import { SOCIAL_NAV } from "@/lib/nav";
import {
  SOCIAL_DESKTOP_HOME_FEED_CLASS,
  SOCIAL_DESKTOP_HOME_ROW_CLASS,
  SOCIAL_HOME_CENTER_CLASS,
  SOCIAL_HOME_LAYOUT_CLASS,
  SOCIAL_HOME_LENS_PHONE_OFF_DESKTOP_ON_CLASS,
  SOCIAL_HOME_LENS_PHONE_ON_DESKTOP_OFF_CLASS,
  socialHomeLensChipClass,
} from "@/lib/social-chrome";
import { socialFeedVideoFrame } from "@/lib/social-media-display";
import { socialHomeDesktopLensFilled } from "@/lib/social-home-location";

const css = readFileSync("src/app/globals.css", "utf8");
const home = readFileSync("src/app/(app)/social/page.tsx", "utf8");
const phoneDock = readFileSync("src/lib/house-phone-shell.ts", "utf8");

function chipOpenTags(html: string): string[] {
  return [...html.matchAll(/<a\b[^>]*>/g)].map((match) => match[0]);
}

function desktopFilled(tag: string): boolean {
  if (tag.includes("lg:bg-surface-muted")) return false;
  return tag.includes(HOUSE_PILL_SELECTED_CLASS) || tag.includes("lg:bg-accent lg:text-white");
}

function phoneFilled(tag: string): boolean {
  if (tag.includes(HOUSE_PILL_SELECTED_CLASS)) return true;
  return tag.includes("max-lg:bg-accent") && tag.includes("max-lg:text-white");
}

describe("desktop Social Home column", () => {
  it("keeps the phone feed frame and the shared center, and forks Home at lg", () => {
    const portrait = socialFeedVideoFrame({ width: 1080, height: 1920 });
    expect(portrait?.style.width).toBe("min(100%, calc(min(70vh, 560px) * 1080 / 1920))");
    expect(portrait?.style.maxHeight).toBe("min(70vh, 560px)");
    expect(portrait?.style.aspectRatio).toBe("1080 / 1920");
    expect(portrait?.className).not.toContain("lg:");
    expect(portrait?.className).not.toContain("md:");

    const display = readFileSync("src/lib/social-media-display.ts", "utf8");
    const fn = display.slice(
      display.indexOf("export function socialFeedVideoFrame"),
      display.indexOf("export function socialFeedVideoPosterSrc"),
    );
    expect(fn).not.toContain("lg:");
    expect(fn).not.toContain("md:");
    expect(fn).toContain("min(100%, calc(${SOCIAL_FEED_VIDEO_MAX_H} * ${width} / ${height}))");

    expect(SOCIAL_DESKTOP_HOME_FEED_CLASS.replace("lg:max-w-[470px]", "lg:max-w-[720px]")).toBe(
      SOCIAL_HOME_CENTER_CLASS,
    );
    expect(SOCIAL_DESKTOP_HOME_FEED_CLASS).not.toMatch(/(^|\s)max-w-/);
    expect(SOCIAL_DESKTOP_HOME_ROW_CLASS.startsWith("flex w-full items-start gap-[32px]")).toBe(true);
    expect(SOCIAL_HOME_LAYOUT_CLASS.startsWith("flex w-full items-start gap-[32px]")).toBe(true);
    expect(SOCIAL_DESKTOP_HOME_ROW_CLASS).not.toContain("ml-auto");
    expect(SOCIAL_DESKTOP_HOME_ROW_CLASS).not.toMatch(/(^|\s)max-w-/);
    expect(SOCIAL_HOME_LAYOUT_CLASS).toContain("lg:ml-auto");
    expect(SOCIAL_HOME_LAYOUT_CLASS).toContain("lg:max-w-[1052px]");

    expect(home).toContain("SOCIAL_DESKTOP_HOME_ROW_CLASS");
    expect(home).toContain("SOCIAL_DESKTOP_HOME_FEED_CLASS");
    expect(home).not.toContain("SOCIAL_HOME_LAYOUT_CLASS");
    expect(home).not.toContain("SOCIAL_HOME_CENTER_CLASS");
  });

  it("fills desktop Home video to the column without cropping the ratio or touching phone", () => {
    const start = css.indexOf("Desktop Social Home only.");
    const end = css.indexOf("Adam lock 2026-09-25. Feed carousel");
    const block = css.slice(start, end);
    expect(start).toBeGreaterThan(-1);
    expect(block.startsWith("Desktop Social Home only.")).toBe(true);
    expect(block).toContain("@media (min-width: 1024px)");
    const frameRule = block.slice(
      block.indexOf("[data-social-home] [data-social-feed-video-frame] {"),
      block.indexOf("[data-social-home] [data-social-feed-video-frame] [data-social-feed-video-poster]"),
    );
    expect(frameRule).toContain("width: 100% !important;");
    expect(frameRule).toContain("max-height: none !important;");
    expect(frameRule).not.toContain("min(70vh");
    expect(block).not.toContain("aspect-ratio");
    expect(block).not.toContain("object-fit: contain");
    expect(block).not.toContain("4 / 5");
    expect(block).not.toContain("aspect-[4/5]");
    expect(block).toContain("object-fit: cover");
    expect(block).toContain("[data-social-home] [data-social-for-you]");
    expect(block).toContain("position: sticky");
    expect(css.slice(0, start)).not.toContain("[data-social-home] [data-social-feed-video-frame]");
  });

  it("lights one desktop lens and keeps Following plus All filled on the phone path", () => {
    expect(
      socialHomeDesktopLensFilled({
        axis: "lane",
        lane: "following",
        liveLane: "following",
        liveTopic: "All",
      }),
    ).toBe(true);
    expect(
      socialHomeDesktopLensFilled({
        axis: "topic",
        topic: "All",
        liveLane: "following",
        liveTopic: "All",
      }),
    ).toBe(false);
    expect(
      socialHomeDesktopLensFilled({
        axis: "lane",
        lane: "following",
        liveLane: "following",
        liveTopic: "Music",
      }),
    ).toBe(false);
    expect(
      socialHomeDesktopLensFilled({
        axis: "topic",
        topic: "Music",
        liveLane: "following",
        liveTopic: "Music",
      }),
    ).toBe(true);
    expect(socialHomeLensChipClass(true, true)).toContain(HOUSE_PILL_SELECTED_CLASS);
    expect(socialHomeLensChipClass(true, false)).toBe(SOCIAL_HOME_LENS_PHONE_ON_DESKTOP_OFF_CLASS);
    expect(SOCIAL_HOME_LENS_PHONE_ON_DESKTOP_OFF_CLASS).toContain("max-lg:bg-accent");
    expect(SOCIAL_HOME_LENS_PHONE_ON_DESKTOP_OFF_CLASS).toContain("max-lg:text-white");
    expect(SOCIAL_HOME_LENS_PHONE_ON_DESKTOP_OFF_CLASS).toContain("lg:bg-surface-muted");
    expect(SOCIAL_HOME_LENS_PHONE_ON_DESKTOP_OFF_CLASS).not.toContain(HOUSE_PILL_SELECTED_CLASS);
    expect(socialHomeLensChipClass(false, true)).toBe(SOCIAL_HOME_LENS_PHONE_OFF_DESKTOP_ON_CLASS);

    for (const props of [
      {},
      { active: "Music" as const },
      { active: "Music" as const, lane: "for-you" as const },
    ]) {
      const tags = chipOpenTags(renderToStaticMarkup(<SocialHomeTopics {...props} />));
      expect(tags.filter(desktopFilled)).toHaveLength(1);
      expect(tags.filter(phoneFilled).length).toBeGreaterThan(1);
    }

    const phoneDefault = chipOpenTags(renderToStaticMarkup(<SocialHomeTopics />)).filter(phoneFilled);
    expect(phoneDefault.some((tag) => tag.includes('data-social-home-lane="following"'))).toBe(true);
    expect(phoneDefault.some((tag) => tag.includes('data-social-home-topic="All"'))).toBe(true);
  });

  it("keeps Lock A, the phone dock, and does not invent a rail or a third lane", () => {
    expect(SOCIAL_NAV.map((item) => item.label)).toEqual([
      "Home",
      "Explore",
      "Create",
      "Messages",
      "Profile",
    ]);
    expect(phoneDock).toContain("SOCIAL_NAV");
    expect(home).toContain("SocialDesktopForYouSlot");
    expect(home).not.toContain("Suggested for you");
    expect(readFileSync("src/components/social/social-home-topics.tsx", "utf8")).not.toContain("Discover");
  });
});
