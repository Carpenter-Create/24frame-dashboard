import { describe, expect, it } from "vitest";

import { SETTINGS } from "./settings";
import { SOCIAL, SOCIAL_ROUTES } from "./social";
import {
  followingAuthorIds,
  SOCIAL_HOME_STACK_LOCK,
  SOCIAL_HOME_STACK_ORDER,
  socialChecklistIncomplete,
  socialChecklistItems,
  socialHomeStoryRailHasTiles,
} from "./social-home";
import { SOCIAL_COMPOSER_CLASS, SOCIAL_FEED_CARD_SURFACE_CLASS } from "./social-chrome";
import {
  isStoryLive,
  oldestLiveStoryId,
  storyExpiresAt,
  storyInsertRow,
  storyRailUnseen,
} from "./social-stories";

describe("Social Home stack lock", () => {
  // Founder 2026-10-08 ("on social, remove the Following and For You above
  // the feed", "only the slider"; replaces H · Feed's pill slider → story
  // cards → composer row → topic chips → wall): story cards → composer row
  // → topic chips → wall. docs/design-locks/social-feed-register-lock-v1.md
  it("locks stories → composer → topics → wall on phone and desktop, with no slider", () => {
    expect(SOCIAL_HOME_STACK_LOCK).toBe("lock_stories_composer_topics_wall");
    expect(SOCIAL_HOME_STACK_ORDER).toEqual(["stories", "composer", "topics", "wall"]);
    // Cards lock: the composer is a card (the card face), no rule of its own.
    expect(SOCIAL_COMPOSER_CLASS).toContain(SOCIAL_FEED_CARD_SURFACE_CLASS);
    expect(SOCIAL_COMPOSER_CLASS).not.toMatch(/(?:^|\s)border-[by]?(?:\s|$)/);
  });

  it("keeps the stories at the top whenever the rail has a tile (founder 2026-10-06, cards lock)", () => {
    // The member's own Create story is a tile: alone, it still draws the rail.
    expect(socialHomeStoryRailHasTiles({ canCreate: true, cards: 0 })).toBe(true);
    expect(socialHomeStoryRailHasTiles({ canCreate: true, cards: 4 })).toBe(true);
    // Someone else's story with no profile to create with.
    expect(socialHomeStoryRailHasTiles({ canCreate: false, cards: 1 })).toBe(true);
    // Only no tile at all draws nothing (no empty card).
    expect(socialHomeStoryRailHasTiles({ canCreate: false, cards: 0 })).toBe(false);
  });
});

describe("following wall authors", () => {
  it("includes self and unique followees", () => {
    expect(followingAuthorIds("u1", ["u2", "u1", "u3"])).toEqual(["u1", "u2", "u3"]);
    expect(followingAuthorIds("u1", [])).toEqual(["u1"]);
  });
});

describe("onboarding checklist", () => {
  it("uses the locked Skool-style items and the account photo door", () => {
    const items = socialChecklistItems({
      hasPhoto: false,
      hasBio: true,
      hasIntro: false,
      hasPost: false,
      hasStory: true,
    });
    expect(items.map((item) => item.label)).toEqual([
      SOCIAL.checklist.photo,
      SOCIAL.checklist.bio,
      SOCIAL.checklist.introduce,
      SOCIAL.checklist.firstPost,
      SOCIAL.checklist.firstStory,
    ]);
    expect(items[0]?.href).toBe(SETTINGS.profileHref);
    expect(items[1]?.href).toBe(SOCIAL_ROUTES.profileBio);
    expect(items[2]?.href).toBe(SOCIAL_ROUTES.create);
    expect(items[3]?.href).toBe("/social/create?kind=media");
    expect(items[4]?.href).toBe(SOCIAL_ROUTES.storiesNew);
    expect(items[1]?.done).toBe(true);
    expect(items[4]?.done).toBe(true);
    expect(socialChecklistIncomplete(items)).toBe(true);
    expect(
      socialChecklistIncomplete(
        socialChecklistItems({
          hasPhoto: true,
          hasBio: true,
          hasIntro: true,
          hasPost: true,
          hasStory: true,
        }),
      ),
    ).toBe(false);
  });
});

describe("stories live window", () => {
  it("treats unseen as not fully viewed inside 24h", () => {
    const now = new Date("2026-09-14T12:00:00.000Z");
    expect(storyExpiresAt(now).toISOString()).toBe("2026-09-15T12:00:00.000Z");
    expect(isStoryLive("2026-09-14T11:00:00.000Z", now)).toBe(false);
    expect(isStoryLive("2026-09-14T13:00:00.000Z", now)).toBe(true);
    expect(storyRailUnseen(["s1", "s2"], new Set(["s1"]))).toBe(true);
    expect(storyRailUnseen(["s1", "s2"], new Set(["s1", "s2"]))).toBe(false);
    expect(storyInsertRow({ authorId: "u1", body: null, media: [], now }).expires_at).toBe(
      "2026-09-15T12:00:00.000Z",
    );
    expect(
      oldestLiveStoryId([
        { id: "newer", created_at: "2026-09-14T18:00:00.000Z" },
        { id: "older", created_at: "2026-09-14T12:00:00.000Z" },
      ]),
    ).toBe("older");
    expect(
      oldestLiveStoryId([
        { id: "b", created_at: "2026-09-14T12:00:00.000Z" },
        { id: "a", created_at: "2026-09-14T12:00:00.000Z" },
      ]),
    ).toBe("a");
  });
});
