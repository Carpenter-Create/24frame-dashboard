"use client";

import { useCallback, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";

import { InlineNotice } from "@/components/ui/inline-notice";
import {
  SOCIAL,
  socialFeedRelativeTime,
  socialGroupHref,
  socialMemberHref,
  socialPostHref,
} from "@/lib/social";
import { type SocialPostCardModel } from "@/lib/social-author-post-card";
import { socialPostMediaAllDropped, socialPostUsableMedia } from "@/lib/social-media-display";
import { postHasMedia } from "@/lib/social-post-own";
import {
  SOCIAL_FEED_CARD_CLASS,
  SOCIAL_FEED_GUTTER_CLASS,
  SOCIAL_POST_ACTIONS_CLASS,
  SOCIAL_POST_AUTHOR_CLASS,
  SOCIAL_POST_AVATAR_EMPTY_CLASS,
  SOCIAL_POST_BYLINE_CLASS,
  SOCIAL_POST_COMMENTS_CLASS,
  SOCIAL_POST_GROUP_CLASS,
  SOCIAL_POST_HEAD_CLASS,
  SOCIAL_POST_LIKE_CLASS,
  SOCIAL_POST_MEDIA_UNAVAILABLE_CLASS,
  SOCIAL_POST_META_CLASS,
  SOCIAL_POST_META_DOT_CLASS,
  SOCIAL_POST_NAME_CLASS,
  SOCIAL_POST_ROUND_CLASS,
  SOCIAL_POST_ROUND_GLYPH,
  SOCIAL_POST_TIME_CLASS,
  SOCIAL_POST_WORDS_CLASS,
  socialPostKind,
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
  comments = null,
}: {
  post: SocialPostCardModel;
  permalink?: boolean;
  muxBandId?: string;
  /** A section inside the card under the actions: the permalink's thread, Profile's "You commented". */
  comments?: ReactNode;
}) {
  // Cards (founder 2026-10-06, Direction B). One card for every post
  // kind, everywhere this card renders: the header (the 40 avatar, the
  // name, the meta "2h · Group", the owner ⋯), the words, the media
  // (inset 8 at radius 16; phone edge to edge), the round Like · Comment
  // · Share with counts beside, then the permalink's comments. Two or
  // more media items: one swipe carousel (Adam lock 2026-09-25). Media
  // that cannot draw (a legacy video with no Mux playback) is dropped
  // here, once for every renderer; a post left with none is a text card,
  // and one with no words either keeps a quiet "Media unavailable" line
  // in the words' place (not a header and actions around nothing).
  // docs/design-locks/social-feed-cards-lock-v1.md
  const media = socialPostUsableMedia(post.media);
  const kind = socialPostKind(media);
  const mediaDropped = socialPostMediaAllDropped(post.media, media);
  const [immersiveIndex, setImmersiveIndex] = useState<number | null>(null);
  const closeImmersive = useCallback(() => setImmersiveIndex(null), []);
  const href = socialPostHref(post.id);
  const thread = {
    id: post.id,
    commentCount: post.commentCount,
    groupSlug: post.groupSlug,
    canComment: post.canLike,
  };
  const time = (
    <time dateTime={post.createdAt} data-social-post-time="">
      {socialFeedRelativeTime(post.createdAt)}
    </time>
  );
  const avatar = (
    <SocialAvatar
      name={post.authorName}
      photoUrl={post.authorPhotoUrl}
      size="post"
      emptyClassName={SOCIAL_POST_AVATAR_EMPTY_CLASS}
    />
  );
  const memberHref = post.authorHandle ? socialMemberHref(post.authorHandle) : null;
  return (
    <SocialPostPresence postId={post.id}>
    <article
      data-social-post={post.id}
      data-social-post-kind={kind}
      data-social-post-owned={post.owned ? "" : undefined}
      data-social-post-href={permalink ? href : undefined}
      className={SOCIAL_FEED_CARD_CLASS}
    >
      <div data-social-post-head="" className={SOCIAL_POST_HEAD_CLASS}>
        {/* The face repeats the name link for a pointer; the name is the
            one link in the tab order and the accessibility tree. */}
        {memberHref ? (
          <Link href={memberHref} tabIndex={-1} aria-hidden className={SOCIAL_POST_AUTHOR_CLASS}>
            {avatar}
          </Link>
        ) : (
          <span className={SOCIAL_POST_AUTHOR_CLASS}>{avatar}</span>
        )}
        <div data-social-post-credit="" className={SOCIAL_POST_BYLINE_CLASS}>
          {memberHref ? (
            <Link href={memberHref} data-social-post-name="" className={SOCIAL_POST_NAME_CLASS}>
              {post.authorName}
            </Link>
          ) : (
            <span data-social-post-name="" className={SOCIAL_POST_NAME_CLASS}>
              {post.authorName}
            </span>
          )}
          <span data-social-post-meta="" className={SOCIAL_POST_META_CLASS}>
            {permalink ? (
              <Link href={href} className={SOCIAL_POST_TIME_CLASS}>
                {time}
              </Link>
            ) : (
              <span className={SOCIAL_POST_TIME_CLASS}>{time}</span>
            )}
            {post.groupSlug && post.groupName ? (
              <>
                <span aria-hidden className={SOCIAL_POST_META_DOT_CLASS}>
                  ·
                </span>
                <Link href={socialGroupHref(post.groupSlug)} className={SOCIAL_POST_GROUP_CLASS}>
                  {post.groupName}
                </Link>
              </>
            ) : null}
          </span>
        </div>
        {post.owned ? (
          <SocialPostOwnerMenu
            postId={post.id}
            body={post.body}
            hasMedia={postHasMedia(post.media)}
            groupSlug={post.groupSlug}
          />
        ) : null}
      </div>
      <SocialPostCaptionPlace
        postId={post.id}
        serverBody={post.body}
        className={SOCIAL_POST_WORDS_CLASS}
        empty={
          mediaDropped ? (
            <p data-social-post-media-unavailable="" className={SOCIAL_POST_MEDIA_UNAVAILABLE_CLASS}>
              {SOCIAL.post.mediaUnavailable}
            </p>
          ) : null
        }
      />
      {kind !== "text" ? (
        <SocialPostMedia
          items={media}
          onOpen={setImmersiveIndex}
          muxBandId={muxBandId}
          topic={post.topic ?? null}
        />
      ) : null}
      {immersiveIndex != null ? (
        <SocialFeedImmersive post={{ ...post, media }} index={immersiveIndex} onClose={closeImmersive} />
      ) : null}
      <div data-social-post-actions="" className={SOCIAL_POST_ACTIONS_CLASS}>
        <span className={SOCIAL_POST_LIKE_CLASS}>
          {post.canLike ? (
            <SocialLikeButton
              postId={post.id}
              liked={post.liked}
              likeCount={post.likeCount}
              groupSlug={post.groupSlug ?? undefined}
              round
            />
          ) : (
            <span className={SOCIAL_POST_ROUND_CLASS}>
              <SocialIcon name="heart" size={SOCIAL_POST_ROUND_GLYPH} />
            </span>
          )}
          <SocialLikeCount postId={post.id} liked={post.liked} likeCount={post.likeCount} />
        </span>
        <SocialCommentTrigger post={thread} round />
        <SocialPostShareButton postId={post.id} round />
      </div>
      {comments ? (
        <div data-social-post-comments="" className={SOCIAL_POST_COMMENTS_CLASS}>
          {comments}
        </div>
      ) : null}
    </article>
    </SocialPostPresence>
  );
}
