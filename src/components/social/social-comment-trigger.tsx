"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import dynamic from "next/dynamic";

import { SocialIcon } from "@/components/social/social-icon";
import { useSocialCommentCount } from "@/components/social/use-social-optimistic";
import { cn } from "@/lib/cn";
import {
  SOCIAL_POST_ACTION_HIT_CLASS,
  SOCIAL_POST_COMMENT_CLASS,
  SOCIAL_POST_COUNT_CLASS,
  SOCIAL_POST_ROUND_GLYPH,
  SOCIAL_POST_ROUND_IN_GROUP_CLASS,
} from "@/lib/social-chrome";
import { SOCIAL_ICON_SIZE_POST_ACTION } from "@/lib/social-icons";
import { SOCIAL, socialCommentActionLabel, socialPostActionCount } from "@/lib/social";
import { socialCommentReturnFocus, type SocialCommentsPost } from "@/lib/social-comments-window";

const SocialCommentThread = dynamic(() =>
  import("./social-comment-thread").then((mod) => mod.SocialCommentThread),
);

type ThreadPost = {
  id: string;
  commentCount?: number;
  groupSlug?: string | null;
  canComment: boolean;
  /** The post the desktop comments window shows at its top. */
  preview?: SocialCommentsPost;
};

// Opens the comment thread. Two faces: the bare stage glyph (the
// immersive dock and the Explore rail, `icon`), and the feed post's
// round grey Comment with its count beside it (`round`, H · Posts:
// "Comment, 2 comments"). The H face replaces the "N comments" trail
// under the caption. docs/design-locks/social-feed-register-lock-v1.md §7
// On desktop it opens the comments window; opened from the immersive
// viewer (`layer`), the thread mounts at the viewer's root. Focus returns
// to Comment when it closes. docs/design-locks/social-comments-window-lock-v1.md
export function SocialCommentTrigger({
  post,
  icon = false,
  tone = "canvas",
  round = false,
  layer,
}: {
  post: ThreadPost;
  icon?: boolean;
  tone?: "canvas" | "stage";
  /** The feed post card's round Comment with its count beside. */
  round?: boolean;
  /** The layer that owns the thread (the immersive stage). */
  layer?: RefObject<HTMLElement | null>;
}) {
  const [open, setOpen] = useState(false);
  const [host, setHost] = useState<HTMLElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  const count = useSocialCommentCount(post.id, post.commentCount ?? 0);
  const shown = round ? socialPostActionCount(count) : null;

  function openThread() {
    setHost(layer?.current ?? null);
    setOpen(true);
  }

  // Comment takes focus back when the thread closes.
  useEffect(() => {
    if (wasOpen.current && !open) socialCommentReturnFocus(buttonRef.current);
    wasOpen.current = open;
  }, [open]);

  return (
    <>
      {round ? (
        <button
          ref={buttonRef}
          type="button"
          data-social-comment-open=""
          aria-label={socialCommentActionLabel(count)}
          aria-haspopup="dialog"
          className={SOCIAL_POST_COMMENT_CLASS}
          onClick={openThread}
        >
          <span className={SOCIAL_POST_ROUND_IN_GROUP_CLASS}>
            <SocialIcon name="chat-circle" size={SOCIAL_POST_ROUND_GLYPH} />
          </span>
          {shown ? (
            <span data-social-comment-count="" className={SOCIAL_POST_COUNT_CLASS}>
              {shown}
            </span>
          ) : null}
        </button>
      ) : icon ? (
        <button
          ref={buttonRef}
          type="button"
          data-social-comment-open=""
          aria-label={SOCIAL.post.commentsTitle}
          aria-haspopup="dialog"
          className={cn(SOCIAL_POST_ACTION_HIT_CLASS, tone === "stage" && "text-band-ink")}
          onClick={openThread}
        >
          <SocialIcon
            name="chat-circle"
            size={SOCIAL_ICON_SIZE_POST_ACTION}
            weight={tone === "stage" ? "bold" : undefined}
          />
        </button>
      ) : null}
      {open ? (
        <SocialCommentThread
          postId={post.id}
          groupSlug={post.groupSlug}
          canComment={post.canComment}
          commentCount={count}
          post={post.preview}
          layer={host}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
