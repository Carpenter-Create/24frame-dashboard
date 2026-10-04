import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  SOCIAL_COMPOSER_CLASS,
  SOCIAL_FEED_ASIDE_CLASS,
  SOCIAL_FEED_CENTER_CLASS,
  SOCIAL_FEED_LAYOUT_CLASS,
  SOCIAL_FEED_MEASURE,
  SOCIAL_FEED_QUIET_INK_CLASS,
  SOCIAL_HOME_LANE_TAB_CURRENT_CLASS,
  SOCIAL_HOME_LANE_TABS_CLASS,
  SOCIAL_HOME_STORY_ITEM_CLASS,
  SOCIAL_HOME_STORY_TILE_CLASS,
  SOCIAL_HOME_TOPIC_CLASS,
  SOCIAL_HOME_TOPIC_CURRENT_CLASS,
  SOCIAL_HOME_TOPIC_FADE_CLASS,
  SOCIAL_HOME_TOPIC_TRACK_CLASS,
} from "./social-chrome";
import { SOCIAL_HOME_STACK_LOCK, SOCIAL_HOME_STACK_ORDER } from "./social-home";
import { SOCIAL } from "./social";

const lock = readFileSync("docs/design-locks/social-home-lane-tabs-lock-v1.md", "utf8");
const readme = readFileSync("docs/design-locks/README.md", "utf8");
const current = readFileSync("docs/status/CURRENT.md", "utf8");
const forYou = readFileSync("src/components/social/social-for-you.tsx", "utf8");
const globals = readFileSync("src/app/globals.css", "utf8");

// How far the house keyboard focus ring reaches past an element's box:
// outline width + outline offset, read from the global rule.
function focusRingReach(): number {
  const rule = globals.match(/:focus-visible:not\(input\):not\(textarea\):not\(select\)\s*\{([^}]*)\}/)?.[1] ?? "";
  const width = Number(rule.match(/outline:\s*(\d+)px/)?.[1]);
  const offset = Number(rule.match(/outline-offset:\s*(\d+)px/)?.[1]);
  return width + offset;
}

function hasClass(classes: string, cls: string): boolean {
  return classes.split(/\s+/).includes(cls);
}

// Founder words, verbatim (Adam, 2026-10-04).
const QUOTES = [
  "A fresh, media-oriented, immersive social media experience for the film community.",
  'I think I like 1) Feed, Explore from D-Screening Room. 2) Profile from F-Reel. I do also like the "Following/For you" text tabs on E-Contact sheet.',
  "Lastly, I also like the mobile menu icons not having words, just icons.",
] as const;

// Locks this PR reverses carry a note that points here. The list is read
// from the lock's own Supersedes section, so the test cannot drift from
// the doc: every linked lock, except one a clause names as "unchanged".
function supersededLocks(doc: string): string[] {
  const start = doc.indexOf("**Supersedes:**");
  const section = doc.slice(start, doc.indexOf("\n---", start));
  const files = new Set<string>();
  for (const clause of section.split(/[.;]\s/)) {
    if (/\bunchanged\b/.test(clause)) continue;
    for (const match of clause.matchAll(/\]\(([a-z0-9.-]+-lock-v[0-9.]+\.md)\)/g)) {
      files.add(match[1]!);
    }
  }
  return [...files];
}

const SUPERSEDED = supersededLocks(lock);

// docs/design-locks/social-home-lane-tabs-lock-v1.md
describe("Feed lane tabs + stack lock v1 (G · Feed, Adam 2026-10-04)", () => {
  it("records the founder words verbatim and is indexed", () => {
    for (const quote of QUOTES) {
      expect(lock).toContain(quote);
    }
    expect(readme).toContain("social-home-lane-tabs-lock-v1.md");
    // One CURRENT.md line carries both Feed locks, with no ISO date
    // (governance rejects dates in CURRENT.md lines).
    const line = current.split("\n").find((row) => row.startsWith("Social Feed is G")) ?? "";
    expect(line).toContain("social-home-lane-tabs-lock-v1.md");
    expect(line).toContain("social-feed-reel-rail-lock-v1.md");
    expect(line).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it("marks every reversed lock with a pointer back here", () => {
    // The parse finds every lock the section reverses, and skips the shell
    // gutter lock it names as unchanged.
    expect([...SUPERSEDED].sort()).toEqual(
      [
        "24frame-visual-register-rich-calm-lock-v1.md",
        "shell-desktop-header-content-inset-lock-v1.md",
        "social-home-activity-feed-lock-v1.md",
        "social-home-composer-fb-row-sheet-lock-v1.6.md",
        "social-home-density-craft-sequel-lock-v1.md",
        "social-home-spine-density-lock-v1.1.md",
        "social-home-spine-density-lock-v1.md",
        "social-home-stories-feed-hairline-lock-v1.md",
        "social-home-topics-strip-center-lock-v1.md",
        "social-home-topics-vertical-center-lock-v1.md",
        "stories-home-rail-card-identity-lock-v1.md",
        "stories-home-rail-fb-card-lock-v1.md",
      ].sort(),
    );
    expect(SUPERSEDED).not.toContain("shell-desktop-horizontal-gutter-lock-v2.md");
    for (const file of SUPERSEDED) {
      const doc = readFileSync(`docs/design-locks/${file}`, "utf8");
      const head = doc.split("\n").slice(0, 12).join("\n");
      expect(head).toMatch(/\*\*(Superseded|Amended)[^*]*\(Adam 2026-10-04, G · Feed\):\*\*/);
      expect(head).toContain("social-home-lane-tabs-lock-v1.md");
      expect(lock).toContain(file);
      // The index row says so too, so nobody reads the old rule as standing.
      const row = readme.split("\n").find((line) => line.startsWith(`- [\`${file}\`]`)) ?? "";
      expect(row).not.toBe("");
      expect(row).toMatch(/lane-tabs lock|G · Feed locks/);
    }
    // The inset lock's G2 named the topic row's phone pull; the tabs carry it now.
    const inset = readFileSync("docs/design-locks/shell-desktop-header-content-inset-lock-v1.md", "utf8");
    expect(inset.split("\n").slice(0, 12).join("\n")).toContain("`max-md:-mt-3`");
    expect(SOCIAL_HOME_LANE_TABS_CLASS).toContain("max-md:-mt-3");
    // The index no longer tells readers the old stack still stands.
    const spineV1 = readme.split("\n").find((row) => row.startsWith("- [`social-home-spine-density-lock-v1.md`]")) ?? "";
    expect(spineV1).not.toBe("");
    expect(spineV1).not.toMatch(/stack order stay/);
    expect(spineV1).toContain("superseded by the lane-tabs lock");
  });

  it("matches the lock's stack, tabs, topics, tiles, composer, and grid in code", () => {
    expect(lock).toContain("`lock_tabs_topics_stories_composer_wall`");
    expect(SOCIAL_HOME_STACK_LOCK).toBe("lock_tabs_topics_stories_composer_wall");
    expect(SOCIAL_HOME_STACK_ORDER).toEqual(["tabs", "topics", "stories", "composer", "wall"]);
    expect(lock).toContain('`nav aria-label="Feed scope"`');
    expect(SOCIAL.home.lanesLabel).toBe("Feed scope");
    expect(lock).toContain("Row 44, gap 24");
    expect(SOCIAL_HOME_LANE_TABS_CLASS).toContain("h-11");
    expect(SOCIAL_HOME_LANE_TABS_CLASS).toContain("gap-6");
    expect(lock).toContain("20 / 480 / -0.02em");
    expect(SOCIAL_HOME_LANE_TAB_CURRENT_CLASS).toContain("text-[length:var(--text-lg)]");
    expect(SOCIAL_HOME_LANE_TAB_CURRENT_CLASS).toContain("[font-weight:var(--type-title-weight)]");
    expect(lock).toContain("`text-ink-3 dark:text-ink-2`");
    expect(SOCIAL_FEED_QUIET_INK_CLASS).toBe("text-ink-3 dark:text-ink-2");
    expect(lock).toContain("**No pill, no fill, no accent**");
    for (const cls of [SOCIAL_HOME_TOPIC_CLASS, SOCIAL_HOME_TOPIC_CURRENT_CLASS]) {
      expect(cls).not.toMatch(/accent|rounded-full|bg-/);
    }
    expect(lock).toContain("(phone 120, desktop 76)");
    expect(SOCIAL_HOME_TOPIC_FADE_CLASS).toContain("w-30");
    expect(SOCIAL_HOME_TOPIC_FADE_CLASS).toContain("md:w-[76px]");
    expect(SOCIAL.home.moreTopics).toBe("More topics");
    expect(lock).toContain("56×100, radius 10, in a 70 item");
    expect(SOCIAL_HOME_STORY_TILE_CLASS).toContain("h-[100px] w-14");
    expect(SOCIAL_HOME_STORY_ITEM_CLASS).toContain("w-[70px]");
    expect(lock).toContain("52 tall, radius 16, `--surface-muted`, no rule");
    expect(SOCIAL_COMPOSER_CLASS).toContain("h-[52px]");
    expect(SOCIAL_COMPOSER_CLASS).toContain("rounded-[var(--radius-lg)]");
    expect(lock).toContain("Feed column **620**, gap **40**, aside **244**");
    expect(SOCIAL_FEED_MEASURE).toEqual({ center: 620, gutter: 40, right: 244 });
    expect(SOCIAL_FEED_CENTER_CLASS).toContain("lg:max-w-[620px]");
    expect(SOCIAL_FEED_LAYOUT_CLASS).toContain("gap-[40px]");
    expect(SOCIAL_FEED_ASIDE_CLASS).toContain("w-[244px]");
  });

  it("scrolls a keyboard-focused topic clear of the fade and draws its ring whole", () => {
    // Focus scrolls a partly hidden word to the scrollport edge less the
    // track's scroll padding. Padding = fade width, so the word lands
    // left of the fade and More topics, never under them.
    expect(lock).toContain("inline-end scroll padding equals the fade width (phone 120, desktop 76)");
    const phoneFade = SOCIAL_HOME_TOPIC_FADE_CLASS.split(/\s+/).find((cls) => cls.startsWith("w-"))?.slice(2);
    const deskFade = SOCIAL_HOME_TOPIC_FADE_CLASS.split(/\s+/).find((cls) => cls.startsWith("md:w-"))?.slice(5);
    expect(phoneFade).toBe("30");
    expect(deskFade).toBe("[76px]");
    expect(hasClass(SOCIAL_HOME_TOPIC_TRACK_CLASS, `scroll-pe-${phoneFade}`)).toBe(true);
    expect(hasClass(SOCIAL_HOME_TOPIC_TRACK_CLASS, `md:scroll-pe-${deskFade}`)).toBe(true);
    // Scroll padding only acts on the scroll container: the track is it.
    expect(hasClass(SOCIAL_HOME_TOPIC_TRACK_CLASS, "overflow-x-auto")).toBe(true);
    // overflow-x:auto clips overflow-y too. The track pads the ring's
    // reach top and bottom and takes it back in margin (row height kept).
    const reach = focusRingReach();
    expect(reach).toBe(5);
    expect(hasClass(SOCIAL_HOME_TOPIC_TRACK_CLASS, `py-[${reach}px]`)).toBe(true);
    expect(hasClass(SOCIAL_HOME_TOPIC_TRACK_CLASS, `-my-[${reach}px]`)).toBe(true);
    expect(SOCIAL_HOME_TOPIC_TRACK_CLASS).not.toMatch(/(?:^|\s)md:-?(?:py|my|pt|pb|mt|mb)-/);
  });

  it("drops the aside's For you eyebrow and its bordered card on the Feed", () => {
    expect(lock).toContain('No "For you" eyebrow');
    const aside = forYou.slice(forYou.indexOf("function SocialFeedForYouAside"));
    expect(aside).not.toContain("SOCIAL.forYou.title");
    expect(aside).not.toContain("SOCIAL_FOR_YOU_RAIL_CLASS");
    expect(aside).toContain("SOCIAL.forYou.latestCourse");
    expect(aside.indexOf("data-social-latest-course")).toBeLessThan(aside.indexOf("SocialSuggestedPeople"));
    expect(SOCIAL_FEED_ASIDE_CLASS).not.toMatch(/border|rounded|bg-/);
  });
});
