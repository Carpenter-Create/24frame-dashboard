import { readFileSync } from "node:fs";
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
  SOCIAL_FEED_QUIET_INK_CLASS,
  SOCIAL_HOME_LANE_TAB_CLASS,
  SOCIAL_HOME_LANE_TAB_CURRENT_CLASS,
  SOCIAL_HOME_LANE_TABS_CLASS,
  SOCIAL_HOME_TOPIC_CLASS,
  SOCIAL_HOME_TOPIC_CURRENT_CLASS,
  SOCIAL_HOME_TOPIC_MARK_CLASS,
  SOCIAL_HOME_TOPIC_MARK_CURRENT_CLASS,
  socialHomeLaneTabClass,
  socialHomeTopicClass,
  socialHomeTopicMarkClass,
} from "@/lib/social-chrome";
import { HOUSE_PILL_SELECTED_CLASS } from "@/lib/house-shell";
import { SOCIAL } from "@/lib/social";
import { socialHomeAxisHref } from "@/lib/social-home-location";
import { SocialHomeLaneTabs } from "./social-home-lane-tabs";
import { SocialHomeTopics } from "./social-home-topics";

// G · Feed (Adam 2026-10-04): "I do also like the "Following/For you" text
// tabs on E-Contact sheet." Tabs on their own row; D topic words below.
// docs/design-locks/social-home-lane-tabs-lock-v1.md

const src = readFileSync("src/components/social/social-home-topics.tsx", "utf8");
const tabsSrc = readFileSync("src/components/social/social-home-lane-tabs.tsx", "utf8");

function topicChips(html: string): string[] {
  return [...html.matchAll(/data-social-home-topic="([^"]+)"/g)].map((match) => match[1]);
}

function chipMarkup(html: string, label: string): string {
  const match = html.match(new RegExp(`<a[^>]*data-social-home-topic="${label}"[^>]*>`));
  return match?.[0] ?? "";
}

function laneMarkup(html: string, lane: string): string {
  const match = html.match(new RegExp(`<a[^>]*data-social-home-lane="${lane}"[^>]*>`));
  return match?.[0] ?? "";
}

describe("SocialHomeTopics words", () => {
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
    // No lane chips: the tabs above own the lane.
    expect(html).not.toContain("data-social-home-lane");
    expect(src).not.toContain('axis: "lane"');
  });

  it("defaults All current with an ink underline, never a pill or accent", () => {
    const html = renderToStaticMarkup(<SocialHomeTopics />);
    const allChip = chipMarkup(html, SOCIAL_CATEGORY_ALL);
    const actingChip = chipMarkup(html, "Acting");
    expect(allChip).toContain('data-social-home-topic-active=""');
    expect(allChip).toContain('aria-current="true"');
    expect(allChip).toContain(SOCIAL_HOME_TOPIC_CURRENT_CLASS);
    expect(allChip).toContain('href="/social"');
    expect(html).toContain(`<span class="${SOCIAL_HOME_TOPIC_MARK_CURRENT_CLASS}">All</span>`);
    expect(html).toContain(`<span class="${SOCIAL_HOME_TOPIC_MARK_CLASS}">Acting</span>`);
    // The underline is a 2px ink bottom border; idle words carry it clear.
    expect(SOCIAL_HOME_TOPIC_MARK_CURRENT_CLASS).toContain("border-b-2");
    expect(SOCIAL_HOME_TOPIC_MARK_CURRENT_CLASS).toContain("border-ink");
    expect(SOCIAL_HOME_TOPIC_MARK_CLASS).toContain("border-transparent");
    expect(socialHomeTopicMarkClass(true)).toBe(SOCIAL_HOME_TOPIC_MARK_CURRENT_CLASS);
    expect(socialHomeTopicMarkClass(false)).toBe(SOCIAL_HOME_TOPIC_MARK_CLASS);
    expect(actingChip).not.toContain("data-social-home-topic-active");
    expect(actingChip).not.toContain("aria-current");
    expect(actingChip).toContain(SOCIAL_HOME_TOPIC_CLASS);
    expect(actingChip).toContain(`href="${socialHomeAxisHref("following", "Acting")}"`);
    expect(html).not.toContain(HOUSE_PILL_SELECTED_CLASS);
    expect(html).not.toContain("accent");
    expect(html).not.toContain("rounded-full");
    expect(socialHomeTopicClass(true)).toBe(SOCIAL_HOME_TOPIC_CURRENT_CLASS);
    expect(socialHomeTopicClass(false)).toBe(SOCIAL_HOME_TOPIC_CLASS);
    expect(src).toContain("socialHomeAxisHref");
    expect(src).not.toContain("socialHomeLensHref");
    expect(src).not.toContain("socialHomeLaneHref");
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

describe("SocialHomeLaneTabs (E text tabs)", () => {
  it("renders Following then For you as text tabs in a Feed scope nav", () => {
    const html = renderToStaticMarkup(<SocialHomeLaneTabs topic={SOCIAL_CATEGORY_ALL} />);
    expect(html).toContain(`<nav aria-label="${SOCIAL.home.lanesLabel}" data-social-home-lanes=""`);
    expect(html).toContain(SOCIAL_HOME_LANE_TABS_CLASS);
    expect(SOCIAL_HOME_LANE_TABS_CLASS).toContain("h-11");
    expect(SOCIAL_HOME_LANE_TABS_CLASS).toContain("gap-6");
    expect(html.indexOf('data-social-home-lane="following"')).toBeLessThan(
      html.indexOf('data-social-home-lane="for-you"'),
    );
    expect(html).toContain(`>${SOCIAL.home.followingTab}<`);
    expect(html).toContain(`>${SOCIAL.home.forYouTab}<`);
    expect(tabsSrc).toContain("SOCIAL.home.followingTab");
    expect(tabsSrc).toContain("SOCIAL.home.forYouTab");
    expect(tabsSrc).toContain("useSocialHomeLive");
    expect(tabsSrc).toContain("HouseLink");
  });

  it("marks the current lane with aria-current and a 2px ink underline; idle is quiet ink", () => {
    const html = renderToStaticMarkup(<SocialHomeLaneTabs topic={SOCIAL_CATEGORY_ALL} />);
    const following = laneMarkup(html, "following");
    const forYou = laneMarkup(html, "for-you");
    expect(following).toContain('data-social-home-lane-active=""');
    expect(following).toContain('aria-current="page"');
    expect(following).toContain(SOCIAL_HOME_LANE_TAB_CURRENT_CLASS);
    expect(following).toContain('href="/social"');
    expect(forYou).not.toContain("data-social-home-lane-active");
    expect(forYou).not.toContain("aria-current");
    expect(forYou).not.toContain("aria-pressed");
    expect(forYou).toContain(SOCIAL_HOME_LANE_TAB_CLASS);
    expect(forYou).toContain('href="/social?lane=for-you"');
    expect(SOCIAL_HOME_LANE_TAB_CURRENT_CLASS).toContain("text-ink");
    expect(SOCIAL_HOME_LANE_TAB_CURRENT_CLASS).toContain("border-b-2");
    expect(SOCIAL_HOME_LANE_TAB_CURRENT_CLASS).toContain("border-ink");
    expect(SOCIAL_HOME_LANE_TAB_CLASS).toContain("border-transparent");
    expect(SOCIAL_HOME_LANE_TAB_CLASS).not.toContain("border-ink");
    expect(SOCIAL_HOME_LANE_TAB_CLASS).toContain(SOCIAL_FEED_QUIET_INK_CLASS);
    expect(SOCIAL_FEED_QUIET_INK_CLASS).toBe("text-ink-3 dark:text-ink-2");
    for (const cls of [SOCIAL_HOME_LANE_TAB_CLASS, SOCIAL_HOME_LANE_TAB_CURRENT_CLASS]) {
      expect(cls).toContain("h-11");
      expect(cls).toContain("text-[length:var(--text-lg)]");
      expect(cls).toContain("[font-weight:var(--type-title-weight)]");
      expect(cls).toContain("tracking-tight");
      expect(cls).not.toContain("accent");
      expect(cls).not.toContain("bg-");
      expect(cls).not.toContain("rounded");
      expect(cls).not.toContain("shadow");
    }
    expect(socialHomeLaneTabClass(true)).toBe(SOCIAL_HOME_LANE_TAB_CURRENT_CLASS);
    expect(socialHomeLaneTabClass(false)).toBe(SOCIAL_HOME_LANE_TAB_CLASS);
  });

  it("keeps the topic when switching lanes", () => {
    const html = renderToStaticMarkup(<SocialHomeLaneTabs lane="for-you" topic="Music" />);
    const forYou = laneMarkup(html, "for-you");
    const following = laneMarkup(html, "following");
    expect(forYou).toContain('aria-current="page"');
    expect(forYou).toContain('href="/social?topic=music&amp;lane=for-you"');
    expect(following).not.toContain("aria-current");
    expect(following).toContain('href="/social?topic=music"');
  });
});
