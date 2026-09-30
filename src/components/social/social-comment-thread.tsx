"use client";

import { useEffect, useId, useState, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";

import { HouseScrim } from "@/components/chrome/house-overlay";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Textarea } from "@/components/ui/textarea";
import { SocialAvatar } from "@/components/social/social-avatar";
import { TEXT_ACTION_CLASS } from "@/lib/house-sheet";
import {
  SOCIAL_POST_DRAWER_COMPOSE_FIELD_CLASS,
  SOCIAL_POST_DRAWER_COMPOSE_INPUT_CLASS,
  SOCIAL_POST_DRAWER_GRAB_CLASS,
  SOCIAL_POST_DRAWER_HOST_CLASS,
  SOCIAL_POST_DRAWER_SUBMIT_CLASS,
  SOCIAL_POST_DRAWER_SURFACE_CLASS,
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
    return () => {
      document.removeEventListener("keydown", onKey);
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
    <div className={variant === "sheet" ? "flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto" : "flex flex-col gap-3"}>
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
    <form
      data-social-comment-composer=""
      className={variant === "sheet" ? "flex shrink-0 flex-col gap-4" : "flex flex-col gap-4 px-4 pb-4"}
      onSubmit={onSubmit}
    >
      <label className="sr-only" htmlFor="social-comment-body">
        {SOCIAL.post.commentPlaceholder}
      </label>
      <div className={SOCIAL_POST_DRAWER_COMPOSE_FIELD_CLASS}>
        <Textarea
          id="social-comment-body"
          name="body"
          value={body}
          maxLength={COMMENT_BODY_MAX}
          rows={2}
          variant="bare"
          placeholder={SOCIAL.post.commentPlaceholder}
          className={SOCIAL_POST_DRAWER_COMPOSE_INPUT_CLASS}
          onChange={(event) => setBody(event.target.value)}
        />
      </div>
      <button type="submit" disabled={pending || !body.trim()} className={SOCIAL_POST_DRAWER_SUBMIT_CLASS}>
        {SOCIAL.post.commentSubmit}
      </button>
    </form>
  ) : (
    <p className={variant === "sheet" ? "t-body-sm text-ink-2" : "px-4 py-3 t-body-sm text-ink-2"}>
      {SOCIAL.cta.needProfile}
    </p>
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

  const sheet = (
    <div
      data-social-comment-thread=""
      data-social-comment-host="ig-drawer"
      className={SOCIAL_POST_DRAWER_HOST_CLASS}
    >
      <HouseScrim label={SOCIAL.post.shareClose} onClose={onClose ?? (() => undefined)} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`${SOCIAL_POST_DRAWER_SURFACE_CLASS} shadow-none`}
      >
        <div data-social-comment-grab="" className={SOCIAL_POST_DRAWER_GRAB_CLASS} />
        <h2 id={titleId} className="mb-4 shrink-0 t-body font-medium text-ink">
          {SOCIAL.post.commentsTitle}
        </h2>
        {list}
        {composer}
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(sheet, document.body) : sheet;
}
