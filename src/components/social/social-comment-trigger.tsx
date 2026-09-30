"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";

import { SocialIcon } from "@/components/social/social-icon";
import { useSocialCommentCount } from "@/components/social/use-social-optimistic";
import { cn } from "@/lib/cn";
import { SOCIAL_POST_ACTION_HIT_CLASS } from "@/lib/social-chrome";
import { SOCIAL_ICON_SIZE_POST_ACTION } from "@/lib/social-icons";
import { SOCIAL, socialPostHref } from "@/lib/social";

const SocialCommentThread = dynamic(() =>
  import("./social-comment-thread").then((mod) => mod.SocialCommentThread),
);

type ThreadPost = {
  id: string;
  commentCount?: number;
  groupSlug?: string | null;
  canComment: boolean;
};

export function SocialCommentTrigger({
  post,
  icon = false,
  tone = "canvas",
  presentation = "route",
}: {
  post: ThreadPost;
  icon?: boolean;
  tone?: "canvas" | "stage";
  /** Feed and immersive open the post URL. Explore stays on the sheet. */
  presentation?: "route" | "sheet";
}) {
  const [open, setOpen] = useState(false);
  const count = useSocialCommentCount(post.id, post.commentCount ?? 0);
  // Adam lock 2026-09-20: trail is left muted "N comments" only when N > 0.
  // Icon always opens the post. N === 0 has no trail text.
  const showTrail = !icon && count > 0;
  if (!icon && !showTrail) return null;

  const className = icon
    ? cn(SOCIAL_POST_ACTION_HIT_CLASS, tone === "stage" && "text-band-ink")
    : "self-start text-left t-body-sm text-ink-2";
  const face = icon ? (
    <SocialIcon name="chat-circle" size={SOCIAL_ICON_SIZE_POST_ACTION} />
  ) : (
    `${count} ${SOCIAL.post.comments}`
  );
  const href = socialPostHref(post.id);

  return (
    <>
      {presentation === "sheet" ? (
        <button
          type="button"
          data-social-comment-open=""
          {...(showTrail ? { "data-social-comment-trail": "" } : {})}
          aria-label={SOCIAL.post.commentsTitle}
          className={className}
          onClick={() => setOpen(true)}
        >
          {face}
        </button>
      ) : (
        <Link
          href={href}
          scroll={false}
          data-social-comment-open=""
          data-social-comment-href={href}
          {...(showTrail ? { "data-social-comment-trail": "" } : {})}
          aria-label={SOCIAL.post.commentsTitle}
          className={className}
        >
          {face}
        </Link>
      )}
      {presentation === "sheet" && open ? (
        <SocialCommentThread
          postId={post.id}
          groupSlug={post.groupSlug}
          canComment={post.canComment}
          commentCount={count}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
