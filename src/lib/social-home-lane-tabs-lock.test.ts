import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  SOCIAL_FEED_ASIDE_CLASS,
  SOCIAL_FEED_QUIET_INK_CLASS,
  SOCIAL_FEED_SCOPE_CLASS,
  SOCIAL_FEED_SCOPE_SEGMENT_ON_CLASS,
  SOCIAL_HOME_STORY_CARD_CLASS,
  SOCIAL_HOME_TOPIC_FADE_CLASS,
  SOCIAL_HOME_TOPIC_TRACK_CLASS,
} from "./social-chrome";

const lock = readFileSync("docs/design-locks/social-home-lane-tabs-lock-v1.md", "utf8");
const register = readFileSync("docs/design-locks/social-feed-register-lock-v1.md", "utf8");
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

// Founder words (Adam, 2026-10-04): a short verbatim anchor per quote (its
// first clause), under the verbatim heading.
const QUOTES = [
  "A fresh, media-oriented, immersive social media experience for the film community.",
  "I think I like 1) Feed, Explore from D-Screening Room.",
  "Lastly, I also like the mobile menu icons",
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
    expect(lock).toContain("## Founder words (verbatim, Adam, 2026-10-04)");
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
    // The inset lock's G2 named the topic row's phone pull; G moved it to
    // the tabs. Superseded 2026-10-05 (H · Feed): the slider takes no
    // pull, and the inset lock says so in its head.
    const inset = readFileSync("docs/design-locks/shell-desktop-header-content-inset-lock-v1.md", "utf8");
    expect(inset.split("\n").slice(0, 12).join("\n")).toContain("`max-md:-mt-3`");
    expect(inset.split("\n").slice(0, 12).join("\n")).toContain("`max-md:-mt-3` is gone");
    expect(SOCIAL_FEED_SCOPE_CLASS).not.toContain("-mt-");
    // The index no longer tells readers the old stack still stands.
    const spineV1 = readme.split("\n").find((row) => row.startsWith("- [`social-home-spine-density-lock-v1.md`]")) ?? "";
    expect(spineV1).not.toBe("");
    expect(spineV1).not.toMatch(/stack order stay/);
    expect(spineV1).toContain("superseded by the lane-tabs lock");
  });

  // Superseded in part 2026-10-05 by the Feed register lock (H · Feed):
  // the code now carries the register's values, and this lock records
  // that in its head. Each pin below moved to the superseding value (the
  // register lock and its test pin the rest); the G values stay as
  // history in the doc.
  it("records the stack, tabs, topics, tiles, composer and grid it locked as superseded by the register", () => {
    expect(lock).toContain("**Superseded in part (founder 2026-10-05, H · Feed):**");
    expect(register).toContain("[`social-home-lane-tabs-lock-v1.md`](social-home-lane-tabs-lock-v1.md) — the E text tabs");
    // Stack → slider, stories, composer, topics, wall.
    expect(lock).toContain("`lock_tabs_topics_stories_composer_wall`");
    // The host and its name stay.
    expect(lock).toContain('`nav aria-label="Feed scope"`');
    // Text tabs (20 / 480, ink underline) → the pill slider (17 / 600 on
    // the ink thumb).
    expect(lock).toContain("20 / 480 / -0.02em");
    expect(SOCIAL_FEED_SCOPE_SEGMENT_ON_CLASS).toContain("text-[length:var(--text-base)]");
    expect(SOCIAL_FEED_SCOPE_SEGMENT_ON_CLASS).toContain("font-semibold");
    expect(SOCIAL_FEED_SCOPE_SEGMENT_ON_CLASS).not.toContain("border-b-2");
    expect(lock).toContain("`text-ink-3 dark:text-ink-2`");
    expect(SOCIAL_FEED_QUIET_INK_CLASS).toBe("text-ink-3 dark:text-ink-2");
    // Topic words (no pill, no fill, no accent) → chips; the current one
    // is the accent wash.
    expect(lock).toContain("**No pill, no fill, no accent**");
    // Fade 120 / 76 → 96 on both.
    expect(lock).toContain("(phone 120, desktop 76)");
    expect(SOCIAL_HOME_TOPIC_FADE_CLASS).toContain("w-24");
    expect(SOCIAL_HOME_TOPIC_FADE_CLASS).not.toContain("md:w-[76px]");
    // 56×100 tiles in a 70 item → the 112×200 story cards.
    expect(lock).toContain("56×100, radius 10, in a 70 item");
    expect(SOCIAL_HOME_STORY_CARD_CLASS).not.toContain("h-[100px] w-14");
    // The 52 composer bar → a 44 row with a grey pill.
    expect(lock).toContain("52 tall, radius 16, `--surface-muted`, no rule");
    // 620 / 40 / 244 → 600 / 48 / 296.
    expect(lock).toContain("Feed column **620**, gap **40**, aside **244**");
    expect(SOCIAL_FEED_ASIDE_CLASS).toContain("w-[296px]");
  });

  it("scrolls a keyboard-focused topic clear of the fade and draws its ring whole", () => {
    // Focus scrolls a partly hidden word to the scrollport edge less the
    // track's scroll padding. Padding = fade width, so the word lands
    // left of the fade and More topics, never under them.
    // The rule stands; the H chips' fade is 96 on both (Feed register lock).
    expect(lock).toContain("inline-end scroll padding equals the fade width (phone 120, desktop 76)");
    expect(register).toContain("The track's inline-end scroll padding equals the fade width (**96**)");
    const fade = SOCIAL_HOME_TOPIC_FADE_CLASS.split(/\s+/).find((cls) => cls.startsWith("w-"))?.slice(2);
    expect(fade).toBe("24");
    expect(SOCIAL_HOME_TOPIC_FADE_CLASS.split(/\s+/).some((cls) => cls.startsWith("md:w-"))).toBe(false);
    expect(hasClass(SOCIAL_HOME_TOPIC_TRACK_CLASS, `scroll-pe-${fade}`)).toBe(true);
    expect(SOCIAL_HOME_TOPIC_TRACK_CLASS).not.toMatch(/md:scroll-pe-/);
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

  // Superseded 2026-10-05 (H · Feed; founder decision 5, "sure"): the
  // rail carries the "For you" heading again and the latest course as one
  // soft grey card; still no bordered rail card and no hairline.
  it("records the borderless aside as superseded: the For you heading returns, no bordered card", () => {
    expect(lock).toContain('No "For you" eyebrow');
    const aside = forYou.slice(forYou.indexOf("function SocialFeedForYouAside"));
    expect(aside).toContain("SOCIAL.forYou.title");
    expect(aside).not.toContain("SOCIAL_FOR_YOU_RAIL_CLASS");
    expect(aside).toContain("SOCIAL.forYou.latestCourse");
    expect(aside.indexOf("data-social-latest-course")).toBeLessThan(aside.indexOf("SocialSuggestedPeople"));
    expect(aside).not.toContain("data-social-for-you-rule");
    expect(SOCIAL_FEED_ASIDE_CLASS).not.toMatch(/border|rounded|bg-/);
  });
});
