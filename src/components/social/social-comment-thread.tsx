"use client";

import { useEffect, useId } from "react";
import { createPortal } from "react-dom";

import { Close44 } from "@/components/chrome/house";
import { useHouseDesktop } from "@/components/chrome/house-overlay";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";
import {
  SOCIAL_ACTION_CLASS,
  SOCIAL_COMMENT_COMPOSER_CLASS,
  SOCIAL_COMMENT_COMPOSER_IN_CARD_CLASS,
  SOCIAL_COMMENT_FIELD_CLASS,
  SOCIAL_COMMENT_NEED_PROFILE_CLASS,
  SOCIAL_COMMENT_NEED_PROFILE_IN_CARD_CLASS,
  SOCIAL_COMMENT_SHEET_HOST_CLASS,
  SOCIAL_COMMENT_SHEET_SCRIM_CLASS,
  SOCIAL_COMMENT_SHEET_SURFACE_CLASS,
} from "@/lib/social-chrome";
import { SOCIAL } from "@/lib/social";
import { COMMENT_BODY_MAX } from "@/lib/social-comments";
import type { SocialCommentsPost } from "@/lib/social-comments-window";

import { SocialCommentRow } from "./social-comment-row";
import { SocialCommentsWindow } from "./social-comments-window";
import { useSocialCommentThread, type SocialCommentThreadState } from "./use-social-comment-thread";

// One comment thread, three hosts sharing one state (the hook runs once
// here, so a resize across md keeps the draft and the list): the permalink's
// in-card thread (`page`); on desktop, the comments window over the page
// (docs/design-locks/social-comments-window-lock-v1.md); on a phone, the
// comment sheet as it was. Opened from the immersive viewer, the window or
// the sheet mounts at the viewer's root (`layer`).
export function SocialCommentThread({
  postId,
  groupSlug,
  canComment,
  commentCount,
  onClose,
  variant = "sheet",
  post,
  layer = null,
}: {
  postId: string;
  groupSlug?: string | null;
  canComment: boolean;
  commentCount: number;
  onClose?: () => void;
  variant?: "sheet" | "page";
  /** The post the window shows at its top (display only). */
  post?: SocialCommentsPost;
  /** The layer that owns the thread (the immersive stage), else in place. */
  layer?: HTMLElement | null;
}) {
  const titleId = useId();
  const fieldId = useId();
  const desktop = useHouseDesktop();
  const thread = useSocialCommentThread({ postId, groupSlug, canComment, commentCount });

  if (variant === "page") {
    return (
      <div data-social-comment-thread="" data-social-comment-page="" className="flex flex-col gap-3">
        <h2 id={titleId} className="t-body font-medium text-ink">
          {SOCIAL.post.commentsTitle}
        </h2>
        <SocialCommentList thread={thread} variant="page" />
        <SocialCommentComposer thread={thread} canComment={canComment} fieldId={fieldId} variant="page" />
      </div>
    );
  }

  if (desktop && onClose) {
    return <SocialCommentsWindow thread={thread} post={post} canComment={canComment} container={layer} onClose={onClose} />;
  }

  const sheet = (
    <SocialCommentSheet thread={thread} canComment={canComment} titleId={titleId} fieldId={fieldId} onClose={onClose} />
  );
  return layer ? createPortal(sheet, layer) : sheet;
}

/** The phone comment sheet, as it was. Its Esc and scroll lock live here
 *  only: with the desktop window they would close it without asking. Its
 *  Esc is marked handled, so the immersive viewer does not close too. */
function SocialCommentSheet({
  thread,
  canComment,
  titleId,
  fieldId,
  onClose,
}: {
  thread: SocialCommentThreadState;
  canComment: boolean;
  titleId: string;
  fieldId: string;
  onClose?: () => void;
}) {
  useEffect(() => {
    if (!onClose) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div data-social-comment-thread="" data-house-overlay-host="app-sheet" className={SOCIAL_COMMENT_SHEET_HOST_CLASS} role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button type="button" className={SOCIAL_COMMENT_SHEET_SCRIM_CLASS} aria-label={SOCIAL.create.close} onClick={onClose} />
      <div className={SOCIAL_COMMENT_SHEET_SURFACE_CLASS}>
        <div className="flex h-14 shrink-0 items-center justify-between px-2">
          <Close44 label={SOCIAL.create.close} onClick={onClose} />
          <h2 id={titleId} className="t-body font-medium text-ink">
            {SOCIAL.post.commentsTitle}
          </h2>
          <span className="size-11" />
        </div>
        <SocialCommentList thread={thread} variant="sheet" />
        <SocialCommentComposer thread={thread} canComment={canComment} fieldId={fieldId} variant="sheet" />
      </div>
    </div>
  );
}

function SocialCommentList({ thread, variant }: { thread: SocialCommentThreadState; variant: "sheet" | "page" }) {
  return (
    <div className={variant === "page" ? "flex flex-col gap-3" : "flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-2"}>
      {thread.error ? <InlineNotice tone="error">{thread.error}</InlineNotice> : null}
      {thread.loading ? null : thread.comments.length === 0 ? (
        <p data-social-comment-empty="" className="py-8 text-center t-body-sm text-ink-2">
          {SOCIAL.post.commentEmpty}
        </p>
      ) : (
        thread.comments.map((comment) => <SocialCommentRow key={comment.id} comment={comment} onRemove={thread.remove} />)
      )}
    </div>
  );
}

function SocialCommentComposer({
  thread,
  canComment,
  fieldId,
  variant,
}: {
  thread: SocialCommentThreadState;
  canComment: boolean;
  fieldId: string;
  variant: "sheet" | "page";
}) {
  if (!canComment) {
    return (
      <p className={variant === "page" ? SOCIAL_COMMENT_NEED_PROFILE_IN_CARD_CLASS : SOCIAL_COMMENT_NEED_PROFILE_CLASS}>
        {SOCIAL.cta.needProfile}
      </p>
    );
  }
  return (
    <form
      data-social-comment-composer=""
      className={variant === "page" ? SOCIAL_COMMENT_COMPOSER_IN_CARD_CLASS : SOCIAL_COMMENT_COMPOSER_CLASS}
      onSubmit={(event) => {
        event.preventDefault();
        thread.submit();
      }}
    >
      <Textarea
        id={fieldId}
        name="body"
        value={thread.body}
        maxLength={COMMENT_BODY_MAX}
        rows={2}
        variant="bare"
        placeholder={SOCIAL.post.commentPlaceholder}
        aria-label={SOCIAL.post.commentPlaceholder}
        className={SOCIAL_COMMENT_FIELD_CLASS}
        onChange={(event) => thread.setBody(event.target.value)}
      />
      <button type="submit" disabled={thread.pending || !thread.body.trim()} className={cn(SOCIAL_ACTION_CLASS, "shrink-0")}>
        {SOCIAL.post.commentSubmit}
      </button>
    </form>
  );
}
