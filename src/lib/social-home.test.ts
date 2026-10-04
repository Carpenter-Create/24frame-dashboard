import { describe, expect, it } from "vitest";

import { SETTINGS } from "./settings";
import { SOCIAL, SOCIAL_ROUTES } from "./social";
import {
  followingAuthorIds,
  SOCIAL_HOME_STACK_LOCK,
  SOCIAL_HOME_STACK_ORDER,
  socialChecklistIncomplete,
  socialChecklistItems,
} from "./social-home";
import { SOCIAL_COMPOSER_CLASS } from "./social-chrome";
import {
  isStoryLive,
  oldestLiveStoryId,
  storyExpiresAt,
  storyInsertRow,
  storyRailUnseen,
} from "./social-stories";

describe("Social Home stack lock", () => {
  // G · Feed (Adam 2026-10-04): tabs → topic words → story tiles → composer
  // bar → wall. Supersedes lock_topics_composer_stories_wall.
  // docs/design-locks/social-home-lane-tabs-lock-v1.md
  it("locks tabs → topics → stories → composer → wall on phone and desktop", () => {
    expect(SOCIAL_HOME_STACK_LOCK).toBe("lock_tabs_topics_stories_composer_wall");
    expect(SOCIAL_HOME_STACK_ORDER).toEqual(["tabs", "topics", "stories", "composer", "wall"]);
    expect(SOCIAL_COMPOSER_CLASS).toContain("flex ");
    expect(SOCIAL_COMPOSER_CLASS).not.toContain("hidden");
    expect(SOCIAL_COMPOSER_CLASS).toContain("items-center");
    expect(SOCIAL_COMPOSER_CLASS).not.toContain("flex-col");
    expect(SOCIAL_COMPOSER_CLASS).toContain("h-[52px]");
    expect(SOCIAL_COMPOSER_CLASS).toContain("rounded-[var(--radius-lg)]");
    expect(SOCIAL_COMPOSER_CLASS).toContain("bg-surface-muted");
    expect(SOCIAL_COMPOSER_CLASS).not.toContain("border-y");
    expect(SOCIAL_COMPOSER_CLASS).not.toContain("rounded-none");
    expect(SOCIAL_COMPOSER_CLASS).not.toMatch(/(?:^|\s)border(?:\s|$)/);
    expect(SOCIAL_COMPOSER_CLASS).not.toContain("h-20");
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
