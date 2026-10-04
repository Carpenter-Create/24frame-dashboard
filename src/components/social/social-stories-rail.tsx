import Link from "next/link";

import { SocialAvatar } from "@/components/social/social-avatar";
import { SocialIcon } from "@/components/social/social-icon";
import { SocialStoryRailCover } from "@/components/social/social-story-rail-cover";
import { SocialStoryRailFace } from "@/components/social/social-story-rail-face";
import { cn } from "@/lib/cn";
import {
  SOCIAL_HOME_STORIES_RAIL_CLASS,
  SOCIAL_HOME_STORY_BADGE_CLASS,
  SOCIAL_HOME_STORY_ITEM_CLASS,
  SOCIAL_HOME_STORY_NAME_CLASS,
  SOCIAL_HOME_STORY_RING_SEEN_CLASS,
  SOCIAL_HOME_STORY_TILE_CLASS,
  SOCIAL_HOME_STORY_TILE_MEDIA_CLASS,
  SOCIAL_MOBILE_BLEED_CLASS,
  SOCIAL_STORIES_CARD_CLASS,
  SOCIAL_STORIES_FACE_CLASS,
  SOCIAL_STORIES_MEDIA_CLASS,
  SOCIAL_STORIES_PLUS_WELL_CLASS,
  SOCIAL_STORY_CREATE_LABEL_TYPE_CLASS,
  socialHomeStoryNameClass,
  socialHomeStoryRingClass,
} from "@/lib/social-chrome";
import { SOCIAL_ICON_SIZE_STORY_PLUS } from "@/lib/social-icons";
import { socialStoryRailCover } from "@/lib/social-edge";
import type { SocialStoryRailCard } from "@/lib/social-feed";
import { SOCIAL, SOCIAL_ROUTES, socialPersonLabel, socialStoryHref } from "@/lib/social";
import type { SocialStoryRailWarmThumb } from "@/lib/social-story-rail-mint";

function storyCardHref(card: SocialStoryRailCard): string {
  return socialStoryHref(card.openId ?? card.latest.id);
}

function storyLabel(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2 && parts[1]?.[0]) return `${parts[0]} ${parts[1][0]}.`;
  return parts[0] ?? name;
}

// Adam 2026-09-20 — white plus glyph on the accent well.
// SocialIcon active = Phosphor fill. Plus fill is a filled square with a
// knockout +, so white currentColor on bg-accent reads as a white disc
// with a blue +. Bold is the plus stroke. Do not pass active here.
function StoryCreatePlus() {
  return (
    <SocialIcon
      name="plus"
      size={SOCIAL_ICON_SIZE_STORY_PLUS}
      className="text-accent-contrast"
    />
  );
}

function warmForCard(
  card: SocialStoryRailCard,
  warmedThumbs: readonly SocialStoryRailWarmThumb[] | undefined,
): { playbackId: string; thumbnail: string } | null {
  if (!warmedThumbs || warmedThumbs.length === 0) return null;
  const cover = socialStoryRailCover(card.latest.media, card.authorId);
  if (!cover?.playbackId) return null;
  const match = warmedThumbs.find(
    (row) => row.authorId === card.authorId && row.playbackId === cover.playbackId,
  );
  if (!match) return null;
  return { playbackId: match.playbackId, thumbnail: match.thumbnail };
}

/** Board names the tile by first name; the link's name stays the full name. */
function storyTileName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

// D story tiles (G · Feed, Adam pick 2026-10-04). 56×100 tiles, radius 10,
// in a 70 item with the first name under it. Unseen: an ink ring; seen: a
// hairline. "Your story" wears an ink badge with a page plus. No accent.
// The cover fill and its mint-on-visible stay SocialStoryRailCover.
// docs/design-locks/social-home-lane-tabs-lock-v1.md (stack + tiles)
function HomeStoryTiles({
  cards,
  authors,
  canCreate,
  createName,
  createPhotoUrl,
  warmedThumbs,
}: {
  cards: readonly SocialStoryRailCard[];
  authors: ReadonlyMap<string, { display_name: string; handle?: string }>;
  canCreate: boolean;
  createName?: string | null;
  createPhotoUrl?: string | null;
  warmedThumbs?: readonly SocialStoryRailWarmThumb[];
}) {
  return (
    <div
      role="group"
      aria-label={SOCIAL.home.storiesLabel}
      data-social-stories=""
      data-social-stories-surface="home"
      className={SOCIAL_HOME_STORIES_RAIL_CLASS}
    >
      {canCreate ? (
        <Link
          href={SOCIAL_ROUTES.storiesNew}
          data-social-story-create=""
          aria-label={SOCIAL.stories.yourStoryCreate}
          className={cn(SOCIAL_HOME_STORY_ITEM_CLASS, "text-ink-2")}
        >
          <span className={cn(SOCIAL_HOME_STORY_TILE_CLASS, SOCIAL_HOME_STORY_RING_SEEN_CLASS)}>
            <span className={SOCIAL_HOME_STORY_TILE_MEDIA_CLASS}>
              <SocialAvatar
                name={createName ?? SOCIAL.home.you}
                photoUrl={createPhotoUrl}
                className="absolute inset-0 size-full rounded-none"
              />
            </span>
            <span className={SOCIAL_HOME_STORY_BADGE_CLASS}>
              <SocialIcon name="plus" size={12} />
            </span>
          </span>
          <span className={SOCIAL_HOME_STORY_NAME_CLASS}>{SOCIAL.stories.yourStory}</span>
        </Link>
      ) : null}
      {cards.map((card) => {
        const author = authors.get(card.authorId);
        const name = socialPersonLabel({
          handle: author?.handle ?? "",
          displayName: author?.display_name,
        });
        return (
          <Link
            key={card.authorId}
            href={storyCardHref(card)}
            data-social-story-card={card.authorId}
            data-social-story-unseen={card.unseen ? "" : undefined}
            aria-label={name}
            className={SOCIAL_HOME_STORY_ITEM_CLASS}
          >
            <span className={cn(SOCIAL_HOME_STORY_TILE_CLASS, socialHomeStoryRingClass(card.unseen))}>
              <span data-social-story-media="" className={SOCIAL_HOME_STORY_TILE_MEDIA_CLASS}>
                <SocialStoryRailCover
                  media={card.latest.media}
                  authorId={card.authorId}
                  warm={warmForCard(card, warmedThumbs)}
                />
              </span>
            </span>
            <span className={socialHomeStoryNameClass(card.unseen)}>{storyTileName(name)}</span>
          </Link>
        );
      })}
    </div>
  );
}

export function SocialStoriesRail({
  cards,
  authors,
  faces,
  canCreate,
  createName,
  createPhotoUrl,
  warmedThumbs,
  surface = "home",
}: {
  cards: readonly SocialStoryRailCard[];
  authors: ReadonlyMap<string, { display_name: string; handle?: string }>;
  faces: ReadonlyMap<string, string | null>;
  canCreate: boolean;
  createName?: string | null;
  createPhotoUrl?: string | null;
  /** Server mint for the first two cards. Later cards stay lazy. */
  warmedThumbs?: readonly SocialStoryRailWarmThumb[];
  surface?: "home" | "stories";
}) {
  if (surface === "home") {
    return (
      <HomeStoryTiles
        cards={cards}
        authors={authors}
        canCreate={canCreate}
        createName={createName}
        createPhotoUrl={createPhotoUrl}
        warmedThumbs={warmedThumbs}
      />
    );
  }

  const cardClass = SOCIAL_STORIES_CARD_CLASS;
  const faceClass = SOCIAL_STORIES_FACE_CLASS;
  const mediaClass = SOCIAL_STORIES_MEDIA_CLASS;

  return (
    <div data-social-stories="" data-social-stories-surface={surface} className={cn("overflow-x-auto", SOCIAL_MOBILE_BLEED_CLASS)}>
      <div className="hidden w-max gap-3 pb-2 md:flex">
        {canCreate ? (
          <Link
            href={SOCIAL_ROUTES.storiesNew}
            data-social-story-create=""
            aria-label={SOCIAL.stories.create}
            className="flex w-[112px] shrink-0 flex-col items-center gap-1.5"
          >
            <div className={cn(cardClass, "bg-hairline")}>
              <div className={cn(faceClass, "bg-surface-muted")}>
                <span className={SOCIAL_STORIES_PLUS_WELL_CLASS}>
                  <StoryCreatePlus />
                </span>
                <p className={cn("text-center", SOCIAL_STORY_CREATE_LABEL_TYPE_CLASS)}>
                  {SOCIAL.stories.create}
                </p>
              </div>
            </div>
            <p className="t-label font-medium text-ink">{SOCIAL.stories.you}</p>
          </Link>
        ) : null}
        {cards.map((card) => {
          const author = authors.get(card.authorId);
          const name = socialPersonLabel({
            handle: author?.handle ?? "",
            displayName: author?.display_name,
          });
          const photo = faces.get(card.authorId);
          return (
            <Link
              key={card.authorId}
              href={storyCardHref(card)}
              data-social-story-card={card.authorId}
              data-social-story-unseen={card.unseen ? "" : undefined}
              className="flex w-[112px] shrink-0 flex-col items-center gap-1.5"
            >
              <div className={cn(cardClass, card.unseen ? "bg-accent" : "bg-hairline")}>
                <div data-social-story-media="" className={mediaClass}>
                  <SocialStoryRailFace name={name} photoUrl={photo ?? null} />
                </div>
              </div>
              <p className="w-full truncate text-center t-label font-medium text-ink">{storyLabel(name)}</p>
            </Link>
          );
        })}
      </div>
      <div data-social-stories-mobile="" className="flex w-max gap-3.5 pb-2 md:hidden">
        {canCreate ? (
          <Link
            href={SOCIAL_ROUTES.storiesNew}
            data-social-story-create=""
            aria-label={SOCIAL.stories.create}
            className="flex w-[68px] shrink-0 flex-col items-center gap-1"
          >
            <span className="flex size-[68px] items-center justify-center rounded-full border-[3px] border-hairline">
              <span className="flex size-[58px] items-center justify-center rounded-full bg-surface-muted">
                <span className={SOCIAL_STORIES_PLUS_WELL_CLASS}>
                  <StoryCreatePlus />
                </span>
              </span>
            </span>
            <p className="break-words text-center t-body-sm font-medium text-ink">{SOCIAL.stories.you}</p>
          </Link>
        ) : null}
        {cards.map((card) => {
          const author = authors.get(card.authorId);
          const name = socialPersonLabel({
            handle: author?.handle ?? "",
            displayName: author?.display_name,
          });
          const photo = faces.get(card.authorId);
          return (
            <Link
              key={`m-${card.authorId}`}
              href={storyCardHref(card)}
              data-social-story-card={card.authorId}
              data-social-story-unseen={card.unseen ? "" : undefined}
              className="flex w-[68px] shrink-0 flex-col items-center gap-1"
            >
              <span
                className={cn(
                  "flex size-[68px] items-center justify-center rounded-full border-[3px]",
                  card.unseen ? "border-accent" : "border-hairline",
                )}
              >
                <span
                  data-social-story-media=""
                  className="relative flex size-[58px] items-center justify-center overflow-hidden rounded-full bg-surface-muted"
                >
                  <SocialAvatar name={name} photoUrl={photo ?? null} size="sm" className="size-full" />
                </span>
              </span>
              <p className="w-full break-words text-center t-body-sm font-medium text-ink">{storyLabel(name)}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
