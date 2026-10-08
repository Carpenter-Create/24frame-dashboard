import { existsSync, readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  SOCIAL_CATEGORY_ALL,
  SOCIAL_CATEGORY_LABELS,
  SOCIAL_CATEGORY_TOPICS,
  socialCategorySlug,
  sortTopicsAlpha,
} from "@/lib/social-categories";
import {
  SOCIAL_HOME_TOPIC_CHIP_CLASS,
  SOCIAL_HOME_TOPIC_CHIP_CURRENT_CLASS,
  SOCIAL_HOME_TOPIC_CLASS,
  SOCIAL_HOME_TOPIC_CURRENT_CLASS,
  socialHomeTopicChipClass,
  socialHomeTopicClass,
} from "@/lib/social-chrome";
import { HOUSE_PILL_SELECTED_CLASS } from "@/lib/house-shell";
import { SOCIAL } from "@/lib/social";
import { socialHomeAxisHref } from "@/lib/social-home-location";
import { SocialHomeTopics } from "./social-home-topics";

// H · Feed (founder 2026-10-05, "I like the designs. Let's use them."):
// topics are secondary chips, the current one the accent wash with
// accent-ink type. (H's Following / For you slider is gone, founder
// 2026-10-08.)
// docs/design-locks/social-feed-register-lock-v1.md

const src = readFileSync("src/components/social/social-home-topics.tsx", "utf8");

function topicChips(html: string): string[] {
  return [...html.matchAll(/data-social-home-topic="([^"]+)"/g)].map((match) => match[1]);
}

function chipMarkup(html: string, label: string): string {
  const match = html.match(new RegExp(`<a[^>]*data-social-home-topic="${label}"[^>]*>`));
  return match?.[0] ?? "";
}

describe("SocialHomeTopics chips", () => {
  it("renders All first, then the shared A-Z Topics bank on one scrolling row", () => {
    const html = renderToStaticMarkup(<SocialHomeTopics />);
    const chips = topicChips(html);
    expect(chips[0]).toBe(SOCIAL_CATEGORY_ALL);
    expect(chips).toEqual([...SOCIAL_CATEGORY_LABELS]);
    expect(chips.slice(1)).toEqual([...SOCIAL_CATEGORY_TOPICS]);
    expect(chips.slice(1)).toEqual(sortTopicsAlpha(chips.slice(1)));
    expect(src).toContain("SOCIAL_CATEGORY_LABELS");
    expect(src).not.toContain("socialInterestTopics");
    expect(src).not.toContain("SOCIAL_FOR_YOU_CARD_CLASS");
    expect(src).not.toContain("flex-wrap");
    expect(src).not.toContain("HouseChipRail");
    expect(src).not.toMatch(/Coinbase|Predict/i);
    expect(html).not.toMatch(/>Topics</);
    expect(html).toContain(`aria-label="${SOCIAL.home.topicsLabel}"`);
    expect(src).not.toContain("SOCIAL.forYou.topics");
    // No lane chips: the slider above owns the lane.
    expect(html).not.toContain("data-social-home-lane");
    expect(src).not.toContain('axis: "lane"');
  });

  // Replaces "defaults All current with an ink underline, never a pill or
  // accent" (G topic words): the current chip is the accent wash with
  // accent-ink 15 / 600; idle chips are plain 15 / 500 ink, no fill.
  it("defaults All current as the wash chip with accent-ink type; idle chips are plain ink", () => {
    const html = renderToStaticMarkup(<SocialHomeTopics />);
    const allChip = chipMarkup(html, SOCIAL_CATEGORY_ALL);
    const actingChip = chipMarkup(html, "Acting");
    expect(allChip).toContain('data-social-home-topic-active=""');
    expect(allChip).toContain('aria-current="true"');
    expect(allChip).toContain(SOCIAL_HOME_TOPIC_CURRENT_CLASS);
    expect(allChip).toContain('href="/social"');
    expect(html).toContain(`<span class="${SOCIAL_HOME_TOPIC_CHIP_CURRENT_CLASS}">All</span>`);
    expect(html).toContain(`<span class="${SOCIAL_HOME_TOPIC_CHIP_CLASS}">Acting</span>`);
    // The wash fill and the accent-ink type ride the current chip only.
    expect(SOCIAL_HOME_TOPIC_CHIP_CLASS).not.toMatch(/bg-/);
    // Never --accent type on the wash (4.07:1); never the accent fill.
    expect(SOCIAL_HOME_TOPIC_CURRENT_CLASS).not.toMatch(/(?:^|\s)text-accent(?:\s|$)/);
    expect(html).not.toContain(HOUSE_PILL_SELECTED_CLASS);
    expect(html).not.toContain("border-b-2");
    expect(socialHomeTopicChipClass(true)).toBe(SOCIAL_HOME_TOPIC_CHIP_CURRENT_CLASS);
    expect(socialHomeTopicChipClass(false)).toBe(SOCIAL_HOME_TOPIC_CHIP_CLASS);
    expect(actingChip).not.toContain("data-social-home-topic-active");
    expect(actingChip).not.toContain("aria-current");
    expect(actingChip).toContain(SOCIAL_HOME_TOPIC_CLASS);
    expect(actingChip).toContain(`href="${socialHomeAxisHref("following", "Acting")}"`);
    expect(socialHomeTopicClass(true)).toBe(SOCIAL_HOME_TOPIC_CURRENT_CLASS);
    expect(socialHomeTopicClass(false)).toBe(SOCIAL_HOME_TOPIC_CLASS);
    expect(src).toContain("socialHomeAxisHref");
    expect(src).not.toContain("socialHomeLensHref");
    expect(src).not.toContain("socialHomeLaneHref");
  });

  it("sizes chips 40 on desktop and a 36 pill in a 44 hit on phone, 15px, never truncated", () => {
    expect(SOCIAL_HOME_TOPIC_CHIP_CLASS).toContain("md:h-10");
    expect(SOCIAL_HOME_TOPIC_CHIP_CLASS).toContain("md:px-4");
    expect(SOCIAL_HOME_TOPIC_CHIP_CLASS).toContain("rounded-full");
    for (const cls of [SOCIAL_HOME_TOPIC_CLASS, SOCIAL_HOME_TOPIC_CHIP_CLASS, SOCIAL_HOME_TOPIC_CHIP_CURRENT_CLASS]) {
      expect(cls).not.toMatch(/truncate|text-ellipsis|line-clamp/);
      expect(cls).not.toMatch(/border|shadow/);
    }
  });

  it("selects the URL topic and re-taps it back to All", () => {
    const html = renderToStaticMarkup(<SocialHomeTopics active="Music" />);
    const musicChip = chipMarkup(html, "Music");
    const allChip = chipMarkup(html, SOCIAL_CATEGORY_ALL);
    expect(musicChip).toContain('data-social-home-topic-active=""');
    expect(musicChip).toContain(SOCIAL_HOME_TOPIC_CURRENT_CLASS);
    expect(musicChip).toContain('href="/social"');
    expect(allChip).not.toContain("data-social-home-topic-active");
    expect(allChip).toContain(SOCIAL_HOME_TOPIC_CLASS);
    expect(allChip).toContain('href="/social"');
    expect(chipMarkup(html, "Acting")).toContain(
      `href="/social?topic=${socialCategorySlug("Acting")}"`,
    );
  });

  it("keeps the lane in every topic href", () => {
    const html = renderToStaticMarkup(<SocialHomeTopics active="Music" lane="for-you" />);
    expect(chipMarkup(html, "Music")).toContain('href="/social?lane=for-you"');
    expect(chipMarkup(html, SOCIAL_CATEGORY_ALL)).toContain('href="/social?lane=for-you"');
    expect(chipMarkup(html, "Acting")).toContain('href="/social?topic=acting&amp;lane=for-you"');
    expect(socialHomeAxisHref("following", "All")).toBe("/social");
    expect(socialHomeAxisHref("for-you", "All")).toBe("/social?lane=for-you");
    expect(socialHomeAxisHref("following", "Music")).toBe(
      `/social?topic=${socialCategorySlug("Music")}`,
    );
    expect(socialHomeAxisHref("for-you", "Music")).toBe(
      `/social?topic=${socialCategorySlug("Music")}&lane=for-you`,
    );
    expect(socialHomeAxisHref("following", "Cinematography")).not.toContain("explore");
    expect(socialHomeAxisHref("for-you", "Music")).not.toContain("/social/home");
  });
});

// The Following / For you slider is gone (founder 2026-10-08, "on social,
// remove the Following and For You above the feed", "only the slider").
// The lane stays in the address (?lane=for-you); the topic row keeps it.
describe("Feed lanes without a slider", () => {
  it("has no slider component left to render over the Feed", () => {
    expect(existsSync("src/components/social/social-home-lane-tabs.tsx")).toBe(false);
    expect(src).not.toContain("SocialHomeLaneTabs");
  });
});
