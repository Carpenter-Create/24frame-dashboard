import { SETTINGS } from "@/lib/settings";
import { SOCIAL, SOCIAL_ROUTES, socialCreateHref } from "@/lib/social";

// Home following wall + Skool-style onboarding. Photo reuses the
// account face at /settings/profile. Do not add a second upload.

// Adam 2026-10-04 G · Feed (D · Screening room with E's tabs):
// lock_tabs_topics_stories_composer_wall. Supersedes 2026-09-22
// lock_topics_composer_stories_wall. One Feed column on both devices:
// Following / For you tabs → topic words → story tiles → composer bar →
// wall (with a Reels rail after every 3 posts). The composer (avatar +
// "Share something" + icon-only Photo · Camera) stays one row. Create
// dock stays. Phone + fans Media · Write · Go live. Desktop rail keeps
// the Create dialog. Same JSX, no second layout, no Live / Feeling strip.
// docs/design-locks/social-home-lane-tabs-lock-v1.md
export const SOCIAL_HOME_STACK_LOCK = "lock_tabs_topics_stories_composer_wall" as const;
export const SOCIAL_HOME_STACK_ORDER = ["tabs", "topics", "stories", "composer", "wall"] as const;

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
