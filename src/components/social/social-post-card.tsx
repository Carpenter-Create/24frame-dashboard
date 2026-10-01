"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";

import { InlineNotice } from "@/components/ui/inline-notice";
import { cn } from "@/lib/cn";
import { SOCIAL_ICON_SIZE_POST_ACTION } from "@/lib/social-icons";
import {
  displayHandle,
  SOCIAL,
  socialFeedRelativeTime,
  socialGroupHref,
  socialMemberHref,
  socialPostHref,
} from "@/lib/social";
import { type SocialPostCardModel } from "@/lib/social-author-post-card";
import {
  SOCIAL_FEED_ACTIONS_META_CLASS,
  SOCIAL_FEED_ACTIONS_OPTICAL_PULL_CLASS,
  SOCIAL_FEED_AUTHOR_EDGE_CLASS,
  SOCIAL_FEED_AUTHOR_FOLLOW_GAP_CLASS,
  SOCIAL_FEED_GUTTER_CLASS,
  SOCIAL_FEED_MEDIA_ACTIONS_GAP_CLASS,
  SOCIAL_FEED_META_EDGE_CLASS,
  SOCIAL_FEED_META_ROW_GAP_CLASS,
  SOCIAL_FEED_ROW_CLASS,
  SOCIAL_POST_ACTION_HEART_NUDGE_CLASS,
  SOCIAL_POST_ACTION_HIT_CLASS,
  SOCIAL_POST_ACTIONS_CLASS,
  SOCIAL_POST_ACTIONS_OPTICAL_CLASS,
  SOCIAL_POST_TIME_CLASS,
} from "@/lib/social-chrome";

import { SocialAvatar } from "./social-avatar";
import { SocialCommentTrigger } from "./social-comment-trigger";
import { SocialProfilePostsEmpty } from "./social-empty";
import { SocialLikeButton, SocialLikeCount } from "./social-engagement";
import { SocialIcon } from "./social-icon";
import { SocialPostCaptionPlace, SocialPostOwnerMenu, SocialPostPresence } from "./social-post-owner";
import { SocialPostShareButton } from "./social-post-share-button";

const SocialPostMedia = dynamic(() =>
  import("./social-post-media").then((mod) => mod.SocialPostMedia),
);
const SocialFeedImmersive = dynamic(() =>
  import("./social-feed-immersive").then((mod) => mod.SocialFeedImmersive),
);

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
  muxBandId,
}: {
  post: SocialPostCardModel;
  permalink?: boolean;
  muxBandId?: string;
}) {
  // One card at every breakpoint.
  // Text + media: docs/design-locks/social-feed-text-media-caption-below-lock-v1.md
  //   author → media → actions → likes → caption → comments when N > 0
  //   → under-post time, the last chrome line, then the post-separation air.
  // Text-only: author → actions → likes → caption → comments when N > 0 → time.
  // Media-only: author → media → actions → likes → time.
  // Time is not author-row meta. Nh / Nd. No clock.
  // docs/design-locks/social-feed-under-post-time-lock-v1.md
  // docs/design-locks/social-home-post-separation-lock-v1.md
  // docs/design-locks/social-home-craft-wave-1-lock-v1.md
  // Two or more media items (Adam lock 2026-09-25): that media face is one
  // full-bleed swipe carousel with dots and N of M. No collage.
  // Forbidden: FB reaction pile, labeled action bar, clock time, share count, collage.
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
      {socialFeedRelativeTime(post.createdAt)}
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
      <div className={cn("flex min-w-0 items-center gap-2.5", SOCIAL_FEED_AUTHOR_EDGE_CLASS)}>
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
      {media ? (
        <SocialPostMedia items={post.media} onOpen={setImmersiveIndex} muxBandId={muxBandId} />
      ) : null}
      {immersiveIndex != null ? (
        <SocialFeedImmersive post={post} index={immersiveIndex} onClose={closeImmersive} />
      ) : null}
      <div
        className={cn(
          SOCIAL_FEED_ACTIONS_META_CLASS,
          SOCIAL_FEED_META_EDGE_CLASS,
          media ? SOCIAL_FEED_MEDIA_ACTIONS_GAP_CLASS : SOCIAL_FEED_AUTHOR_FOLLOW_GAP_CLASS,
        )}
      >
        <div
          data-social-post-actions=""
          className={cn(
            SOCIAL_POST_ACTIONS_CLASS,
            SOCIAL_POST_ACTIONS_OPTICAL_CLASS,
            SOCIAL_FEED_ACTIONS_OPTICAL_PULL_CLASS,
          )}
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
        <div className={SOCIAL_FEED_META_ROW_GAP_CLASS}>
          <SocialLikeCount postId={post.id} liked={post.liked} likeCount={post.likeCount} />
          <SocialPostCaptionPlace
            postId={post.id}
            serverBody={post.body}
            href={href}
            permalink={permalink}
            handle={handle}
          />
          <SocialCommentTrigger post={thread} />
          {permalink ? (
            <Link href={href} className="self-start">
              {time}
            </Link>
          ) : (
            time
          )}
        </div>
      </div>
      </div>
    </article>
    </SocialPostPresence>
  );
}
