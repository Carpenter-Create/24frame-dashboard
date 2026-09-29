"use client";

import { useCallback, useState } from "react";
import Link from "next/link";

import { InlineNotice } from "@/components/ui/inline-notice";
import { cn } from "@/lib/cn";
import { socialFeedUsesCarousel } from "@/lib/social-feed-carousel";
import { SOCIAL_ICON_SIZE_POST_ACTION } from "@/lib/social-icons";
import { SOCIAL_POST_IMAGE_SIZES, socialMediaFrameClass } from "@/lib/social-media-display";
import {
  displayHandle,
  SOCIAL,
  socialGroupHref,
  socialMemberHref,
  socialPostHref,
  socialRelativeTime,
} from "@/lib/social";
import {
  type SocialPostCardModel,
  type SocialPostMediaItem,
} from "@/lib/social-author-post-card";
import {
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
} from "@/lib/social-chrome";

import { SocialAvatar } from "./social-avatar";
import { SocialCommentTrigger } from "./social-comment-thread";
import { SocialProfilePostsEmpty } from "./social-empty";
import { SocialLikeButton, SocialLikeCount } from "./social-engagement";
import { SocialFeedCarousel } from "./social-feed-carousel";
import { SocialFeedImmersive } from "./social-feed-immersive";
import { SocialFeedVideo } from "./social-feed-video";
import { SocialIcon } from "./social-icon";
import { SocialMediaImage } from "./social-media-image";
import { SocialPostCaptionPlace, SocialPostOwnerMenu, SocialPostPresence } from "./social-post-owner";
import { SocialPostShareButton } from "./social-post-share-sheet";

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
      className="block min-w-0 shrink-0"
    >
      <div className={SOCIAL_FEED_ROW_CLASS}>
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
      </div>
    </article>
    </SocialPostPresence>
  );
}
