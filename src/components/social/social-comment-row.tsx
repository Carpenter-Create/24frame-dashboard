"use client";

import Link from "next/link";
import type { MouseEvent } from "react";

import { HouseLink } from "@/components/chrome/house-link";
import { SocialAvatar } from "@/components/social/social-avatar";
import { TEXT_ACTION_CLASS } from "@/lib/house-sheet";
import {
  SOCIAL_COMMENT_ROW_AVATAR_CLASS,
  SOCIAL_COMMENT_ROW_BODY_CLASS,
  SOCIAL_COMMENT_ROW_NAME_CLASS,
  SOCIAL_COMMENT_ROW_TIME_CLASS,
} from "@/lib/social-chrome";
import { socialMemberHref, socialRelativeTime, SOCIAL } from "@/lib/social";
import type { SocialCommentCard } from "@/lib/social-comments";

/** A link leaving the comments window: it may hold the click and ask first. */
export type SocialCommentLeave = (event: MouseEvent<HTMLAnchorElement>, href: string) => void;

// One comment row: the 32 face, the name over the body, the time, and
// Remove on the viewer's own. The permalink and the phone sheet link the
// name plainly; the desktop window passes `onLeave`, so the name is a
// HouseLink whose click the window can hold while it asks.
// docs/design-locks/social-comments-window-lock-v1.md
export function SocialCommentRow({
  comment,
  onRemove,
  onLeave,
}: {
  comment: SocialCommentCard;
  onRemove: (comment: SocialCommentCard) => void;
  onLeave?: SocialCommentLeave;
}) {
  const href = comment.authorHandle ? socialMemberHref(comment.authorHandle) : null;
  return (
    <article data-social-comment={comment.id} className="flex flex-col gap-1">
      <div className="flex items-start gap-2">
        <SocialAvatar
          name={comment.authorName}
          photoUrl={comment.authorPhotoUrl}
          size="sm"
          className={SOCIAL_COMMENT_ROW_AVATAR_CLASS}
        />
        <div className="min-w-0 flex-1">
          <p>
            {href && onLeave ? (
              <HouseLink href={href} className={SOCIAL_COMMENT_ROW_NAME_CLASS} onClick={(event) => onLeave(event, href)}>
                {comment.authorName}
              </HouseLink>
            ) : href ? (
              <Link href={href} className={SOCIAL_COMMENT_ROW_NAME_CLASS}>
                {comment.authorName}
              </Link>
            ) : (
              <span className={SOCIAL_COMMENT_ROW_NAME_CLASS}>{comment.authorName}</span>
            )}
            <span className={SOCIAL_COMMENT_ROW_BODY_CLASS}>{comment.body}</span>
          </p>
          <p className={SOCIAL_COMMENT_ROW_TIME_CLASS}>{socialRelativeTime(comment.created_at)}</p>
        </div>
        {comment.canDelete ? (
          <button
            type="button"
            data-social-comment-delete=""
            className={TEXT_ACTION_CLASS}
            onClick={() => onRemove(comment)}
          >
            {SOCIAL.post.commentDelete}
          </button>
        ) : null}
      </div>
    </article>
  );
}
