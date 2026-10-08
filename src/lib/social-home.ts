import { SETTINGS } from "@/lib/settings";
import { SOCIAL, SOCIAL_ROUTES, socialCreateHref } from "@/lib/social";

// Home following wall + Skool-style onboarding. Photo reuses the
// account face at /settings/profile. Do not add a second upload.

// Founder 2026-10-08 ("on social, remove the Following and For You above
// the feed", "only the slider"): lock_stories_composer_topics_wall.
// Supersedes H · Feed (2026-10-05) lock_slider_stories_composer_topics_wall,
// the G stack (2026-10-04) lock_tabs_topics_stories_composer_wall and,
// before it, 2026-09-22 lock_topics_composer_stories_wall. One Feed
// column on both devices: story cards → composer → topic chips → wall
// (with a Reels row after every 3 posts); no slider leads it, and the For
// you rail on the right stays as it is;
// the topics sit over the wall they filter. The composer (avatar +
// "Share something" + icon-only Photo · Camera) stays one row. Create
// dock stays. Phone + fans Media · Write · Go live. Desktop rail keeps
// the Create dialog. Same JSX, no second layout, no Live / Feeling strip.
// docs/design-locks/social-feed-register-lock-v1.md
export const SOCIAL_HOME_STACK_LOCK = "lock_stories_composer_topics_wall" as const;
export const SOCIAL_HOME_STACK_ORDER = ["stories", "composer", "topics", "wall"] as const;

/**
 * Stories stay at the top of the Feed (founder 2026-10-06, "Stories have
 * to stay at the top of the feed"): the stories card draws in both lanes
 * whenever it has a tile. The member's own Create story is a tile, so a
 * rail whose one tile is Create story still draws, in place. No rule
 * hides or moves a sparse rail; only a rail with no tile at all (no
 * profile to create with, no live story) has nothing to draw.
 * docs/design-locks/social-feed-cards-lock-v1.md
 */
export function socialHomeStoryRailHasTiles(input: { canCreate: boolean; cards: number }): boolean {
  return input.canCreate || input.cards > 0;
}

export const SOCIAL_CHECKLIST_IDS = [
  "photo",
  "bio",
  "introduce",
  "firstPost",
  "firstStory",
] as const;

export type SocialChecklistId = (typeof SOCIAL_CHECKLIST_IDS)[number];

export type SocialChecklistItem = {
  id: SocialChecklistId;
  label: string;
  href: string;
  cta: string;
  done: boolean;
};

export function socialChecklistItems(input: {
  hasPhoto: boolean;
  hasBio: boolean;
  hasIntro: boolean;
  hasPost: boolean;
  hasStory: boolean;
}): SocialChecklistItem[] {
  return [
    {
      id: "photo",
      label: SOCIAL.checklist.photo,
      href: SETTINGS.profileHref,
      cta: SOCIAL.checklist.photoCta,
      done: input.hasPhoto,
    },
    {
      id: "bio",
      label: SOCIAL.checklist.bio,
      href: SOCIAL_ROUTES.profileBio,
      cta: SOCIAL.checklist.bioCta,
      done: input.hasBio,
    },
    {
      id: "introduce",
      label: SOCIAL.checklist.introduce,
      href: SOCIAL_ROUTES.create,
      cta: SOCIAL.checklist.introduceCta,
      done: input.hasIntro,
    },
    {
      id: "firstPost",
      label: SOCIAL.checklist.firstPost,
      href: socialCreateHref("media"),
      cta: SOCIAL.checklist.firstPostCta,
      done: input.hasPost,
    },
    {
      id: "firstStory",
      label: SOCIAL.checklist.firstStory,
      href: SOCIAL_ROUTES.storiesNew,
      cta: SOCIAL.checklist.firstStoryCta,
      done: input.hasStory,
    },
  ];
}

export function socialChecklistIncomplete(items: readonly SocialChecklistItem[]): boolean {
  return items.some((item) => !item.done);
}

export function socialChecklistRemaining(items: readonly SocialChecklistItem[]): number {
  return items.filter((item) => !item.done).length;
}

export function followingAuthorIds(selfId: string, followeeIds: readonly string[]): string[] {
  return [...new Set([selfId, ...followeeIds.filter(Boolean)])];
}
