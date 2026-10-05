"use client";

import { useCallback, useState } from "react";
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
import {
  SOCIAL_FEED_GUTTER_CLASS,
  SOCIAL_POST_AUTHOR_CLASS,
  SOCIAL_POST_GROUP_CLASS,
  SOCIAL_POST_LIKE_CLASS,
  SOCIAL_POST_MORE_SLOT_CLASS,
  SOCIAL_POST_NAME_CLASS,
  SOCIAL_POST_NAME_STACK_CLASS,
  SOCIAL_POST_ROUND_GLYPH,
  SOCIAL_POST_WHO_CLASS,
  socialPostActionsClass,
  socialPostAvatarEmptyClass,
  socialPostBodyClass,
  socialPostClass,
  socialPostFootClass,
  socialPostKind,
  socialPostRoundClass,
  socialPostTimeClass,
  type SocialPostSurface,
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
  // H · Posts (founder 2026-10-05; H §5.1). One face at every breakpoint,
  // everywhere this card renders:
  //   media (the card itself) → credit row (40 avatar, name, time; the
  //   round grey Like · Comment · Share with counts beside, the quiet ⋯)
  //   → caption (17 / 420 ink-2, never clamped).
  // Text-only: the soft grey card → credit row → the body at 20 / 480.
  // Phone: the media meets the viewport; the actions take their own row
  // under the caption. No role line until members choose one.
  // docs/design-locks/social-feed-register-lock-v1.md §7
  // Two or more media items (Adam lock 2026-09-25): one swipe carousel
  // with dots and the counter chip. No collage.
  const kind = socialPostKind(post.media);
  const surface: SocialPostSurface = kind === "text" ? "card" : "page";
  const [immersiveIndex, setImmersiveIndex] = useState<number | null>(null);
  const closeImmersive = useCallback(() => setImmersiveIndex(null), []);
  const href = socialPostHref(post.id);
  const thread = {
    id: post.id,
    commentCount: post.commentCount,
    groupSlug: post.groupSlug,
    canComment: post.canLike,
  };
  const timeClass = socialPostTimeClass(surface);
  const time = (
    <time dateTime={post.createdAt} data-social-post-time="">
      {socialFeedRelativeTime(post.createdAt)}
    </time>
  );
  const author = (
    <>
      <SocialAvatar
        name={post.authorName}
        photoUrl={post.authorPhotoUrl}
        size="post"
        emptyClassName={socialPostAvatarEmptyClass(surface)}
      />
      {/* The role eyebrow's slot heads this stack once members choose a
          main role ("Members choose one; no line until they do"). */}
      <span data-social-post-name="" className={SOCIAL_POST_NAME_STACK_CLASS}>
        <span className={SOCIAL_POST_NAME_CLASS}>{post.authorName}</span>
      </span>
    </>
  );
  return (
    <SocialPostPresence postId={post.id}>
    <article
      data-social-post={post.id}
      data-social-post-kind={kind}
      data-social-post-owned={post.owned ? "" : undefined}
      data-social-post-href={permalink ? href : undefined}
      className={socialPostClass(kind)}
    >
      {kind !== "text" ? (
        <SocialPostMedia
          items={post.media}
          onOpen={setImmersiveIndex}
          muxBandId={muxBandId}
          topic={post.topic ?? null}
        />
      ) : null}
      {immersiveIndex != null ? (
        <SocialFeedImmersive post={post} index={immersiveIndex} onClose={closeImmersive} />
      ) : null}
      <div data-social-post-credit="" className={socialPostFootClass(kind)}>
        <div className={SOCIAL_POST_WHO_CLASS}>
          {post.authorHandle ? (
            <Link href={socialMemberHref(post.authorHandle)} className={SOCIAL_POST_AUTHOR_CLASS}>
              {author}
            </Link>
          ) : (
            <span className={SOCIAL_POST_AUTHOR_CLASS}>{author}</span>
          )}
          {permalink ? (
            <Link href={href} className={timeClass}>
              {time}
            </Link>
          ) : (
            <span className={timeClass}>{time}</span>
          )}
          {post.groupSlug && post.groupName ? (
            <Link href={socialGroupHref(post.groupSlug)} className={SOCIAL_POST_GROUP_CLASS}>
              <span aria-hidden>· </span>
              {post.groupName}
            </Link>
          ) : null}
        </div>
        <div data-social-post-actions="" className={socialPostActionsClass(kind)}>
          <span className={SOCIAL_POST_LIKE_CLASS}>
            {post.canLike ? (
              <SocialLikeButton
                postId={post.id}
                liked={post.liked}
                likeCount={post.likeCount}
                groupSlug={post.groupSlug ?? undefined}
                round={surface}
              />
            ) : (
              <span className={socialPostRoundClass(surface)}>
                <SocialIcon name="heart" size={SOCIAL_POST_ROUND_GLYPH} />
              </span>
            )}
            <SocialLikeCount postId={post.id} liked={post.liked} likeCount={post.likeCount} />
          </span>
          <SocialCommentTrigger post={thread} round={surface} />
          <SocialPostShareButton postId={post.id} round={surface} />
        </div>
        {post.owned ? (
          <span className={SOCIAL_POST_MORE_SLOT_CLASS}>
            <SocialPostOwnerMenu
              postId={post.id}
              body={post.body}
              hasMedia={kind !== "text"}
              groupSlug={post.groupSlug}
            />
          </span>
        ) : null}
        <SocialPostCaptionPlace
          postId={post.id}
          serverBody={post.body}
          className={socialPostBodyClass(kind)}
        />
      </div>
    </article>
    </SocialPostPresence>
  );
}
