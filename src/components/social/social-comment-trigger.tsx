"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

import { SocialIcon } from "@/components/social/social-icon";
import { useSocialCommentCount } from "@/components/social/use-social-optimistic";
import { cn } from "@/lib/cn";
import { SOCIAL_FEED_META_COPY_CLASS, SOCIAL_POST_ACTION_HIT_CLASS } from "@/lib/social-chrome";
import { SOCIAL_ICON_SIZE_POST_ACTION } from "@/lib/social-icons";
import { SOCIAL } from "@/lib/social";

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
}: {
  post: ThreadPost;
  icon?: boolean;
  tone?: "canvas" | "stage";
}) {
  const [open, setOpen] = useState(false);
  const count = useSocialCommentCount(post.id, post.commentCount ?? 0);
  // Adam lock 2026-09-20: trail is left muted "N comments" only when N > 0.
  // Icon always opens the thread. N === 0 has no trail text.
  const showTrail = !icon && count > 0;

  return (
    <>
      {icon || showTrail ? (
        <button
          type="button"
          data-social-comment-open=""
          {...(showTrail ? { "data-social-comment-trail": "" } : {})}
          aria-label={SOCIAL.post.commentsTitle}
          className={
            icon
              ? cn(SOCIAL_POST_ACTION_HIT_CLASS, tone === "stage" && "text-band-ink")
              : `self-start text-left t-body-sm text-ink-2 ${SOCIAL_FEED_META_COPY_CLASS}`
          }
          onClick={() => setOpen(true)}
        >
          {icon ? (
            <SocialIcon name="chat-circle" size={SOCIAL_ICON_SIZE_POST_ACTION} />
          ) : (
            `${count} ${SOCIAL.post.comments}`
          )}
        </button>
      ) : null}
      {open ? (
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
