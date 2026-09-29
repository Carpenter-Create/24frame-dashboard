"use client";

import { useCallback, useState, type ReactNode } from "react";
import Link from "next/link";

import { HouseChipRail } from "@/components/chrome/house-chip-rail";
import { TextAction } from "@/components/chrome/house";
import { InlineNotice } from "@/components/ui/inline-notice";
import { cn } from "@/lib/cn";
import type { SocialMuxPlaybackPolicy } from "@/lib/social-mux";
import {
  SOCIAL_ACTION_CLASS,
  SOCIAL_ACTION_SECONDARY_CLASS,
  SOCIAL_FEED_AUTHOR_FOLLOW_GAP_CLASS,
  SOCIAL_FEED_GUTTER_CLASS,
  SOCIAL_FEED_MEDIA_ACTIONS_GAP_CLASS,
  SOCIAL_FEED_META_ROW_GAP_CLASS,
  SOCIAL_FEED_ROW_CLASS,
  SOCIAL_POST_ACTION_HEART_NUDGE_CLASS,
  SOCIAL_POST_ACTION_HIT_CLASS,
  SOCIAL_POST_ACTIONS_CLASS,
  SOCIAL_POST_ACTIONS_OPTICAL_CLASS,
  SOCIAL_POST_MEDIA_CLASS,
  SOCIAL_POST_TIME_CLASS,
  SOCIAL_HIGHLIGHT_RING_CLASS,
  SOCIAL_PROFILE_ACTIONS_CLASS,
  SOCIAL_PROFILE_AVATAR_ON_COVER_CLASS,
  SOCIAL_PROFILE_BIO_CLASS,
  SOCIAL_PROFILE_COVER_STACK_CLASS,
  SOCIAL_PROFILE_FACE_CLASS,
  SOCIAL_PROFILE_FACE_LEAD_CLASS,
  SOCIAL_PROFILE_HEAD_CLASS,
  SOCIAL_PROFILE_HEAD_OVERLAP_CLASS,
  SOCIAL_PROFILE_IDENTITY_CLASS,
  SOCIAL_PROFILE_INSET_CLASS,
  SOCIAL_PERSON_PRIMARY_CLASS,
  SOCIAL_PERSON_SECONDARY_CLASS,
  SOCIAL_PROFILE_HANDLE_CLASS,
  SOCIAL_PROFILE_NAME_CLASS,
  SOCIAL_PROFILE_NAME_STACK_CLASS,
  SOCIAL_PROFILE_STATS_LEAD_CLASS,
  SOCIAL_PROFILE_ROLE_PILL_CLASS,
  SOCIAL_PROFILE_ROLES_RAIL_ROWS,
} from "@/lib/social-chrome";
import {
  displayHandle,
  SOCIAL,
  SOCIAL_ROUTES,
  socialGroupHref,
  socialMemberHref,
  socialPersonIdentity,
  socialPostHref,
  socialRelativeTime,
} from "@/lib/social";
import {
  socialFollowedByLine,
  SOCIAL_MUTUALS_FACE_CAP,
  type SocialProfileMutuals,
} from "@/lib/social-profile-mutuals";
import { socialProfilePublicLinks } from "@/lib/social-profile-links";
import { socialProfileRolesRailItems } from "@/lib/social-profile-roles";
import { socialProfileRendersCoverBand } from "@/lib/social-profile-cover";
import { SOCIAL_ICON_SIZE_POST_ACTION } from "@/lib/social-icons";
import {
  SOCIAL_POST_IMAGE_SIZES,
  socialMediaFrameClass,
  type SocialMediaOrientation,
} from "@/lib/social-media-display";
import { socialFeedUsesCarousel } from "@/lib/social-feed-carousel";
import { SocialAvatar } from "./social-avatar";
import { SocialFeedCarousel } from "./social-feed-carousel";
import { SocialFeedImmersive } from "./social-feed-immersive";
import { SocialFeedVideo } from "./social-feed-video";
import { SocialCommentTrigger } from "./social-comment-thread";
import { SocialPostShareButton } from "./social-post-share-sheet";
import { SocialLikeButton, SocialLikeCount } from "./social-engagement";
import { SocialProfileStats } from "./social-profile-stats";
import { SocialEmpty, SocialProfilePostsEmpty } from "./social-empty";
import { SocialIcon } from "./social-icon";
import { SocialPostCaptionPlace, SocialPostOwnerMenu, SocialPostPresence } from "./social-post-owner";
import { SocialMediaImage } from "./social-media-image";
import { SocialProfileLinkRow } from "./social-profile-links";
import { SocialProfileBanner, SocialProfileCoverBlock } from "./social-profile-banner";

export { SocialAvatar } from "./social-avatar";

export function SocialNeedProfile() {
  return (
    <div data-social-need-profile="" className="flex flex-col gap-[var(--space-2)]">
      <SocialEmpty icon="user" title={SOCIAL.cta.needProfile} />
      <TextAction href={SOCIAL_ROUTES.profile}>{SOCIAL.cta.profileHrefLabel}</TextAction>
    </div>
  );
}

export function SocialPersonRow({
  handle,
  displayName,
  photoUrl,
  href,
  size = "sm",
}: {
  handle: string;
  displayName?: string | null;
  photoUrl?: string | null;
  href?: string;
  size?: "sm" | "md";
}) {
  const person = socialPersonIdentity({ handle, displayName });
  const stack = (
    <>
      <SocialAvatar name={person.avatarName} photoUrl={photoUrl} size={size} />
      <span className="min-w-0">
        <span data-social-person-handle="" className={SOCIAL_PERSON_PRIMARY_CLASS}>
          {person.handleLabel}
        </span>
        {person.name ? (
          <span data-social-person-name="" className={SOCIAL_PERSON_SECONDARY_CLASS}>
            {person.name}
          </span>
        ) : null}
      </span>
    </>
  );
  const className = "flex min-w-0 items-center gap-[10px]";
  return href ? (
    <Link href={href} data-social-person-row="" className={className}>
      {stack}
    </Link>
  ) : (
    <span data-social-person-row="" className={className}>
      {stack}
    </span>
  );
}

export function SocialConversationFaces({
  people,
}: {
  people: readonly { name: string; photoUrl?: string | null }[];
}) {
  if (people.length <= 1) {
    const only = people[0];
    return <SocialAvatar name={only?.name || "?"} photoUrl={only?.photoUrl} />;
  }

  const shown = people.slice(0, 2);
  return (
    <div data-social-conversation-faces="" className="relative size-12 shrink-0">
      <div className="absolute left-0 top-0 origin-top-left scale-75">
        <SocialAvatar name={shown[0].name} photoUrl={shown[0].photoUrl} />
      </div>
      <div className="absolute right-0 bottom-0 origin-bottom-right scale-75">
        <SocialAvatar name={shown[1].name} photoUrl={shown[1].photoUrl} />
      </div>
    </div>
  );
}

export type SocialPostMediaItem = {
  kind: "image" | "video";
  url: string;
  playbackId?: string;
  playbackPolicy?: SocialMuxPlaybackPolicy;
  orientation?: SocialMediaOrientation;
  width?: number;
  height?: number;
  aspect?: number;
};

export type SocialPostCardModel = {
  id: string;
  body: string | null;
  likeCount: number;
  commentCount?: number;
  liked: boolean;
  createdAt: string;
  authorId: string;
  authorHandle: string | null;
  authorName: string;
  authorPhotoUrl: string | null;
  groupSlug: string | null;
  groupName: string | null;
  canLike: boolean;
  media: SocialPostMediaItem[];
  owned?: boolean;
};

export function SocialPostMedia({
  items,
  onOpen,
  frameClass,
}: {
  items: readonly SocialPostMediaItem[];
  onOpen: (index: number) => void;
  frameClass?: string;
}) {
  if (items.length === 0) return null;
  if (socialFeedUsesCarousel(items.length)) {
    return <SocialFeedCarousel items={items} onOpen={onOpen} />;
  }
  return (
    <div data-social-post-media="" className={cn("@container", SOCIAL_POST_MEDIA_CLASS)}>
      {items.map((item, index) => (
        <SocialPostMediaFrame
          key={item.playbackId ?? item.url}
          item={item}
          label={item.kind === "video" ? SOCIAL.post.viewVideo : SOCIAL.post.viewPhoto}
          frameClass={frameClass}
          onOpen={() => onOpen(index)}
        />
      ))}
    </div>
  );
}

function SocialPostMediaFrame({
  item,
  label,
  frameClass,
  onOpen,
}: {
  item: SocialPostMediaItem;
  label: string;
  frameClass?: string;
  onOpen: () => void;
}) {
  const frame = cn(
    frameClass ?? socialMediaFrameClass(item),
    "relative w-full overflow-hidden bg-surface-muted",
  );
  const open = (
    <button
      type="button"
      data-social-feed-media-open=""
      aria-label={label}
      className="absolute inset-0 z-10 cursor-pointer"
      onClick={onOpen}
    />
  );
  if (item.kind === "video") {
    return (
      <div data-social-feed-media-frame="" className={frame}>
        <SocialFeedVideo item={item} className="absolute inset-0 size-full object-cover" />
        {open}
      </div>
    );
  }
  return (
    <div data-social-post-image="" data-social-feed-media-frame="" className={frame}>
      <SocialMediaImage src={item.url} sizes={SOCIAL_POST_IMAGE_SIZES} />
      {open}
    </div>
  );
}

export function SocialProfileIdentity({
  name,
  handle,
  photoUrl,
  coverUrl,
  coverEdit,
  bio,
  roles,
  websiteUrl,
  imdbUrl,
  ring = null,
  photoAction,
  profileId,
  stats,
  mutuals = null,
  actions,
  children,
}: {
  name: string;
  handle: string;
  photoUrl?: string | null;
  coverUrl?: string | null;
  coverEdit?: ReactNode;
  bio?: string | null;
  roles?: readonly string[] | null;
  websiteUrl?: string | null;
  imdbUrl?: string | null;
  ring?: "unseen" | "live" | null;
  photoAction?: ReactNode;
  profileId?: string;
  stats?: { posts: number; followers: number; following: number };
  mutuals?: SocialProfileMutuals | null;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  const person = socialPersonIdentity({ handle, displayName: name });
  const roleRailItems = socialProfileRolesRailItems(roles ?? []);
  const links = socialProfilePublicLinks({ websiteUrl, imdbUrl });
  const followedBy = mutuals
    ? socialFollowedByLine(
        mutuals.people.slice(0, SOCIAL_MUTUALS_FACE_CAP).map((peer) => peer.label),
        mutuals.extra,
      )
    : null;
  const actionRow = actions ? (
    <div data-social-profile-actions="" className={SOCIAL_PROFILE_ACTIONS_CLASS}>
      {actions}
    </div>
  ) : null;
  const ownerCover = Boolean(coverEdit);
  const showCoverBand = socialProfileRendersCoverBand({ coverUrl, owner: ownerCover });

  return (
    <div data-social-profile-identity="" className={SOCIAL_PROFILE_IDENTITY_CLASS}>
      <div data-social-profile-cover-stack="" className={SOCIAL_PROFILE_COVER_STACK_CLASS}>
        {ownerCover ? (
          <SocialProfileCoverBlock coverUrl={coverUrl} coverEdit={coverEdit} />
        ) : (
          <SocialProfileBanner coverUrl={coverUrl} />
        )}
        <div
          data-social-profile-head=""
          className={cn(
            SOCIAL_PROFILE_INSET_CLASS,
            showCoverBand ? SOCIAL_PROFILE_HEAD_OVERLAP_CLASS : "pt-[var(--space-4)]",
          )}
        >
          <div className={SOCIAL_PROFILE_HEAD_CLASS}>
            <div className="relative w-fit shrink-0">
              <SocialAvatar
                name={person.avatarName}
                photoUrl={photoUrl}
                ring={ring}
                size="profile"
                className={SOCIAL_PROFILE_AVATAR_ON_COVER_CLASS}
              />
              {photoAction}
            </div>
            {person.name || person.handleLabel ? (
              <div className={SOCIAL_PROFILE_NAME_STACK_CLASS}>
                {person.name ? (
                  <p data-social-profile-name="" className={SOCIAL_PROFILE_NAME_CLASS}>
                    {person.name}
                  </p>
                ) : null}
                {person.handleLabel ? (
                  <p data-social-profile-handle="" className={SOCIAL_PROFILE_HANDLE_CLASS}>
                    {person.handleLabel}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <div
        data-social-profile-face=""
        className={cn(
          SOCIAL_PROFILE_FACE_CLASS,
          stats ? SOCIAL_PROFILE_STATS_LEAD_CLASS : SOCIAL_PROFILE_FACE_LEAD_CLASS,
        )}
      >
        {stats ? (
          <SocialProfileStats profileId={profileId} handle={handle} stats={stats} />
        ) : null}
        {bio?.trim() ? (
          <p data-social-profile-bio="" className={SOCIAL_PROFILE_BIO_CLASS}>
            {bio}
          </p>
        ) : null}
        {roleRailItems.length > 0 ? (
          <HouseChipRail
            data-social-profile-roles=""
            rows={SOCIAL_PROFILE_ROLES_RAIL_ROWS}
            items={roleRailItems}
            renderItem={(item) => (
              <span
                key={item.slug}
                data-social-profile-role={item.slug}
                className={SOCIAL_PROFILE_ROLE_PILL_CLASS}
              >
                {item.label}
              </span>
            )}
          />
        ) : null}
        <SocialProfileLinkRow links={links} />
        {actionRow}
        {followedBy ? (
          <div data-social-profile-mutuals="" className="flex min-w-0 items-center gap-2">
            <div data-social-profile-mutuals-faces="" className="flex shrink-0">
              {mutuals?.people.slice(0, SOCIAL_MUTUALS_FACE_CAP).map((peer, index) => (
                <SocialAvatar
                  key={peer.id}
                  name={peer.label}
                  photoUrl={peer.photoUrl}
                  size="sm"
                  className={index === 0 ? undefined : "-ml-2"}
                />
              ))}
            </div>
            <p className="min-w-0 break-words t-body-sm text-ink-2">{followedBy}</p>
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}

export function SocialHighlights({
  cards,
}: {
  cards: readonly { id: string; href: string; label: string; photoUrl?: string | null }[];
}) {
  if (cards.length === 0) return null;
  return (
    <div data-social-highlights="" className="flex flex-col gap-2">
      <div className="flex gap-3 overflow-x-auto">
        {cards.map((card) => (
          <Link
            key={card.id}
            href={card.href}
            data-social-highlight={card.id}
            className="flex w-14 shrink-0 flex-col items-center gap-1"
          >
            <span className={SOCIAL_HIGHLIGHT_RING_CLASS}>
              {card.photoUrl ? (
                <SocialAvatar name={card.label} photoUrl={card.photoUrl} />
              ) : (
                <span className="block size-12 rounded-full bg-surface-muted" />
              )}
            </span>
            <span className="w-full truncate text-center t-label text-ink">{card.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function SocialAuthorHistory({
  posts,
  truncated,
  emptyAction,
}: {
  posts: readonly SocialPostCardModel[];
  truncated: boolean;
  emptyAction?: { href: string; label: string };
}) {
  return (
    <div data-social-author-history="" className="flex flex-col">
      {posts.length === 0 ? (
        <SocialProfilePostsEmpty action={emptyAction} />
      ) : (
        <div data-social-author-posts="" className={SOCIAL_FEED_GUTTER_CLASS}>
          {posts.map((post) => (
            <SocialPostCard key={post.id} post={post} />
          ))}
        </div>
      )}
      {truncated ? (
        <InlineNotice data-social-author-truncated="">{SOCIAL.profile.postsTruncated}</InlineNotice>
      ) : null}
    </div>
  );
}

export function socialAuthorPostCard(input: {
  post: {
    id: string;
    body: string | null;
    author_id: string;
    like_count: number;
    comment_count?: number;
    created_at: string;
  };
  authorHandle: string;
  authorName: string;
  authorPhotoUrl: string | null;
  liked: boolean;
  canLike: boolean;
  media: SocialPostMediaItem[];
  owned?: boolean;
}): SocialPostCardModel {
  return {
    id: input.post.id,
    body: input.post.body,
    likeCount: input.post.like_count,
    commentCount: input.post.comment_count,
    liked: input.liked,
    createdAt: input.post.created_at,
    authorId: input.post.author_id,
    authorHandle: input.authorHandle,
    authorName: input.authorName,
    authorPhotoUrl: input.authorPhotoUrl,
    groupSlug: null,
    groupName: null,
    canLike: input.canLike,
    media: input.media,
    owned: input.owned ?? false,
  };
}

export function SocialPostCard({
  post,
  permalink = true,
}: {
  post: SocialPostCardModel;
  permalink?: boolean;
}) {
  // One card at every breakpoint.
  // Text + media: docs/design-locks/social-feed-text-media-caption-below-lock-v1.md
  //   author → media → actions → likes → caption → comments when N > 0.
  // Two or more media items (Adam lock 2026-09-25): that media face is one
  // full-bleed swipe carousel with dots and N of M. No collage.
  // Text-only stays the 2026-09-20 blend:
  //   author → actions → likes → caption → comments when N > 0.
  // Media-only: author → media → actions → likes.
  // Forbidden: FB reaction pile, labeled action bar, bottom timestamp, share count, collage.
  const media = post.media.length > 0;
  const [immersiveIndex, setImmersiveIndex] = useState<number | null>(null);
  const closeImmersive = useCallback(() => setImmersiveIndex(null), []);
  const handle = post.authorHandle ? displayHandle(post.authorHandle).slice(1) : post.authorName;
  const href = socialPostHref(post.id);
  const thread = {
    id: post.id,
    commentCount: post.commentCount,
    groupSlug: post.groupSlug,
    canComment: post.canLike,
  };
  const time = (
    <time dateTime={post.createdAt} data-social-post-time="" className={SOCIAL_POST_TIME_CLASS}>
      {socialRelativeTime(post.createdAt)}
    </time>
  );
  return (
    <SocialPostPresence postId={post.id}>
    <article
      data-social-post={post.id}
      data-social-post-owned={post.owned ? "" : undefined}
      data-social-post-href={permalink ? href : undefined}
      className={SOCIAL_FEED_ROW_CLASS}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <SocialAvatar name={post.authorName} photoUrl={post.authorPhotoUrl} size="sm" />
        <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-1.5">
          {post.authorHandle ? (
            <Link
              href={socialMemberHref(post.authorHandle)}
              className="min-w-0 break-words t-body-sm font-semibold text-ink"
            >
              {post.authorName}
            </Link>
          ) : (
            <span className="min-w-0 break-words t-body-sm font-semibold text-ink">{post.authorName}</span>
          )}
          {permalink ? (
            <Link href={href} className={SOCIAL_POST_TIME_CLASS}>
              {time}
            </Link>
          ) : (
            time
          )}
          {post.groupSlug && post.groupName ? (
            <>
              <span className="t-label text-ink-2" aria-hidden>
                ·
              </span>
              <Link href={socialGroupHref(post.groupSlug)} className="min-w-0 break-words t-label text-ink-2">
                {post.groupName}
              </Link>
            </>
          ) : null}
        </div>
        {post.owned ? (
          <SocialPostOwnerMenu
            postId={post.id}
            body={post.body}
            hasMedia={media}
            groupSlug={post.groupSlug}
          />
        ) : null}
      </div>
      {media ? <SocialPostMedia items={post.media} onOpen={setImmersiveIndex} /> : null}
      {immersiveIndex != null ? (
        <SocialFeedImmersive post={post} index={immersiveIndex} onClose={closeImmersive} />
      ) : null}
      <div
        className={cn(
          SOCIAL_FEED_META_ROW_GAP_CLASS,
          media ? SOCIAL_FEED_MEDIA_ACTIONS_GAP_CLASS : SOCIAL_FEED_AUTHOR_FOLLOW_GAP_CLASS,
        )}
      >
        <div
          data-social-post-actions=""
          className={cn(SOCIAL_POST_ACTIONS_CLASS, SOCIAL_POST_ACTIONS_OPTICAL_CLASS)}
        >
          {post.canLike ? (
            <SocialLikeButton
              postId={post.id}
              liked={post.liked}
              likeCount={post.likeCount}
              groupSlug={post.groupSlug ?? undefined}
              icon
            />
          ) : (
            <span className={SOCIAL_POST_ACTION_HIT_CLASS}>
              <SocialIcon
                name="heart"
                size={SOCIAL_ICON_SIZE_POST_ACTION}
                className={SOCIAL_POST_ACTION_HEART_NUDGE_CLASS}
              />
            </span>
          )}
          <SocialCommentTrigger post={thread} icon />
          <SocialPostShareButton postId={post.id} />
        </div>
        <SocialLikeCount postId={post.id} liked={post.liked} likeCount={post.likeCount} />
        <SocialPostCaptionPlace
          postId={post.id}
          serverBody={post.body}
          href={href}
          permalink={permalink}
          handle={handle}
        />
        <SocialCommentTrigger post={thread} />
      </div>
    </article>
    </SocialPostPresence>
  );
}

export function SocialProfileActions({
  children,
}: {
  children: ReactNode;
}) {
  return <div className="flex flex-wrap items-center gap-[var(--space-2)]">{children}</div>;
}

export { SOCIAL_ACTION_CLASS, SOCIAL_ACTION_SECONDARY_CLASS };
