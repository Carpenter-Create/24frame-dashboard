import { SETTINGS } from "@/lib/settings";
import { SOCIAL, SOCIAL_ROUTES, socialCreateHref } from "@/lib/social";

// Home following wall + Skool-style onboarding. Photo reuses the
// account face at /settings/profile. Do not add a second upload.

// Adam 2026-09-22 lock_topics_composer_stories_wall.
// Supersedes 2026-09-20 lock_airy_topics_under_cut_phone_composer
// (Stories above Topics, phone composer cut). That phone cut is revoked.
// One Home column on both devices: Topics → composer → Stories → wall.
// The share-stage composer (avatar + "Share something" + icon-only
// Photo · Camera) is one row on phone and desktop. Create dock stays.
// Phone + fans Media · Write · Go live. Desktop rail keeps the Create dialog.
// Same JSX, no second layout, no gray liner, no
// Live / Feeling strip on Home.
export const SOCIAL_HOME_STACK_LOCK = "lock_topics_composer_stories_wall" as const;
export const SOCIAL_HOME_STACK_ORDER = ["topics", "composer", "stories", "wall"] as const;

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
