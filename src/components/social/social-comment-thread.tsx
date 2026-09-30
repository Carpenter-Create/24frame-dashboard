"use client";

import { useEffect, useId, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";

import { Close44 } from "@/components/chrome/house";
import { HouseDialogFrame, HouseOverlayHead, useHouseDesktop } from "@/components/chrome/house-overlay";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Textarea } from "@/components/ui/textarea";
import { SocialAvatar } from "@/components/social/social-avatar";
import { cn } from "@/lib/cn";
import { TEXT_ACTION_CLASS } from "@/lib/house-sheet";
import {
  SOCIAL_ACTION_CLASS,
  SOCIAL_COMMENT_COMPOSER_CLASS,
  SOCIAL_COMMENT_SHEET_HOST_CLASS,
  SOCIAL_COMMENT_SHEET_SCRIM_CLASS,
  SOCIAL_COMMENT_SHEET_SURFACE_CLASS,
} from "@/lib/social-chrome";
import { socialMemberHref, socialRelativeTime, SOCIAL } from "@/lib/social";
import {
  applyOptimisticCommentCount,
  persistSocialComment,
  persistSocialCommentDelete,
  runSocialOptimisticMutation,
} from "@/lib/social-optimistic";
import type { SocialCommentCard } from "@/lib/social-comments";
import { COMMENT_BODY_MAX, normalizeCommentBody } from "@/lib/social-comments";

export function SocialCommentThread({
  postId,
  groupSlug,
  canComment,
  commentCount,
  onClose,
  variant = "sheet",
  preamble,
  footer,
}: {
  postId: string;
  groupSlug?: string | null;
  canComment: boolean;
  commentCount: number;
  onClose?: () => void;
  variant?: "sheet" | "page" | "panel";
  preamble?: ReactNode;
  footer?: ReactNode;
}) {
  const titleId = useId();
  const desktop = useHouseDesktop();
  const [comments, setComments] = useState<SocialCommentCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (variant !== "sheet" || !onClose) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose, variant]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const res = await fetch(`/api/social/comments?post_id=${encodeURIComponent(postId)}`, {
        cache: "no-store",
      });
      const json = (await res.json().catch(() => null)) as {
        error?: string;
        comments?: SocialCommentCard[];
      } | null;
      if (cancelled) return;
      if (!res.ok || json?.error) {
        setError(json?.error || SOCIAL.post.commentFailed);
        setLoading(false);
        return;
      }
      setComments(json?.comments ?? []);
      applyOptimisticCommentCount(postId, json?.comments?.length ?? 0);
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [postId]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canComment || pending) return;
    const nextBody = normalizeCommentBody(body);
    if (!nextBody) {
      setError(body.trim() ? SOCIAL.post.commentTooLong : SOCIAL.post.commentMissing);
      return;
    }

    const tempId = crypto.randomUUID();
    const optimistic: SocialCommentCard = {
      id: tempId,
      post_id: postId,
      author_id: "me",
      body: nextBody,
      created_at: new Date().toISOString(),
      authorHandle: null,
      authorName: SOCIAL.home.you,
      authorPhotoUrl: null,
      canDelete: true,
    };
    const previous = comments;
    const previousCount = commentCount;
    setPending(true);
    setError("");
    setBody("");
    runSocialOptimisticMutation({
      apply: () => {
        setComments((rows) => [...rows, optimistic]);
        applyOptimisticCommentCount(postId, previousCount + 1);
        return { previous, previousCount };
      },
      persist: async () => {
        const form = new FormData();
        form.set("post_id", postId);
        form.set("body", nextBody);
        if (groupSlug) form.set("group_slug", groupSlug);
        const result = await persistSocialComment(form);
        if (!result.error && result.id) {
          setComments((rows) =>
            rows.map((row) =>
              row.id === tempId
                ? { ...row, id: result.id ?? row.id, created_at: result.created_at ?? row.created_at }
                : row,
            ),
          );
        }
        return result;
      },
      rollback: (token) => {
        setComments(token.previous);
        applyOptimisticCommentCount(postId, token.previousCount);
        setBody(nextBody);
      },
      onError: (notice) => {
        setError(notice);
        setPending(false);
      },
      onSuccess: () => setPending(false),
    });
  }

  function onDelete(comment: SocialCommentCard) {
    const previous = comments;
    const previousCount = commentCount;
    runSocialOptimisticMutation({
      apply: () => {
        setComments((rows) => rows.filter((row) => row.id !== comment.id));
        applyOptimisticCommentCount(postId, Math.max(0, previousCount - 1));
        return { previous, previousCount };
      },
      persist: async () => {
        const form = new FormData();
        form.set("comment_id", comment.id);
        return persistSocialCommentDelete(form);
      },
      rollback: (token) => {
        setComments(token.previous);
        applyOptimisticCommentCount(postId, token.previousCount);
      },
      onError: (notice) => setError(notice),
    });
  }

  const list = (
    <div className={variant === "sheet" ? "flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-2" : "flex flex-col gap-3"}>
      {error ? <InlineNotice tone="error">{error}</InlineNotice> : null}
      {loading ? null : comments.length === 0 ? (
        <p data-social-comment-empty="" className="py-8 text-center t-body-sm text-ink-2">
          {SOCIAL.post.commentEmpty}
        </p>
      ) : (
        comments.map((comment) => (
          <article key={comment.id} data-social-comment={comment.id} className="flex flex-col gap-1">
            <div className="flex items-start gap-2">
              <SocialAvatar name={comment.authorName} photoUrl={comment.authorPhotoUrl} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="t-body-sm text-ink">
                  {comment.authorHandle ? (
                    <Link href={socialMemberHref(comment.authorHandle)} className="font-semibold">
                      {comment.authorName}
                    </Link>
                  ) : (
                    <span className="font-semibold">{comment.authorName}</span>
                  )}{" "}
                  <span className="whitespace-pre-wrap break-words">{comment.body}</span>
                </p>
                <p className="t-label text-ink-3">{socialRelativeTime(comment.created_at)}</p>
              </div>
              {comment.canDelete ? (
                <button
                  type="button"
                  data-social-comment-delete=""
                  className={TEXT_ACTION_CLASS}
                  onClick={() => onDelete(comment)}
                >
                  {SOCIAL.post.commentDelete}
                </button>
              ) : null}
            </div>
          </article>
        ))
      )}
    </div>
  );
  const composer = canComment ? (
    <form data-social-comment-composer="" className={SOCIAL_COMMENT_COMPOSER_CLASS} onSubmit={onSubmit}>
      <Textarea
        id="social-comment-body"
        name="body"
        value={body}
        maxLength={COMMENT_BODY_MAX}
        rows={2}
        variant="bare"
        placeholder={SOCIAL.post.commentPlaceholder}
        className="min-h-9 min-w-0 flex-1 resize-none px-0 py-1"
        onChange={(event) => setBody(event.target.value)}
      />
      <button type="submit" disabled={pending || !body.trim()} className={cn(SOCIAL_ACTION_CLASS, "shrink-0")}>
        {SOCIAL.post.commentSubmit}
      </button>
    </form>
  ) : (
    <p className="px-4 py-3 t-body-sm text-ink-2">{SOCIAL.cta.needProfile}</p>
  );

  if (variant === "page" || variant === "panel") {
    if (variant === "panel") {
      return (
        <div
          data-social-comment-thread=""
          data-social-comment-panel=""
          className="flex min-h-0 flex-1 flex-col pb-[env(safe-area-inset-bottom)]"
        >
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3">
            {preamble}
            {list}
          </div>
          {footer}
          {composer}
        </div>
      );
    }
    return (
      <div data-social-comment-thread="" data-social-comment-page="" className="flex flex-col gap-3">
        <h2 id={titleId} className="t-body font-medium text-ink">
          {SOCIAL.post.commentsTitle}
        </h2>
        {list}
        {composer}
      </div>
    );
  }

  if (desktop && onClose) {
    return (
      <HouseDialogFrame
        size="form"
        titleId={titleId}
        label={SOCIAL.post.commentsTitle}
        onClose={onClose}
        closeLabel={SOCIAL.create.close}
      >
        <div data-social-comment-thread="">
          <HouseOverlayHead
            title={SOCIAL.post.commentsTitle}
            titleId={titleId}
            closeLabel={SOCIAL.create.close}
            onClose={onClose}
          />
          {list}
          {composer}
        </div>
      </HouseDialogFrame>
    );
  }

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
        {list}
        {composer}
      </div>
    </div>
  );
}
