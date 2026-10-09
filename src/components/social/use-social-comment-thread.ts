"use client";

import { useEffect, useState } from "react";

import { SOCIAL } from "@/lib/social";
import type { SocialCommentCard } from "@/lib/social-comments";
import { normalizeCommentBody } from "@/lib/social-comments";
import {
  applyOptimisticCommentCount,
  persistSocialComment,
  persistSocialCommentDelete,
  runSocialOptimisticMutation,
} from "@/lib/social-optimistic";

// One comment thread's state: the load, the optimistic post (rolled back
// with the text returned to the field on failure), and remove. The thread
// calls it once, so the page, the phone sheet and the desktop window share
// one draft and one list (a resize across md keeps both).
// docs/design-locks/social-comments-window-lock-v1.md

export type SocialCommentThreadState = {
  comments: SocialCommentCard[];
  loading: boolean;
  error: string;
  body: string;
  setBody: (body: string) => void;
  /** A comment is with the server: one in flight at a time. */
  pending: boolean;
  /** Post the field (Post, or ⌘/Ctrl+Enter in the window). True once a
   *  comment is sent. */
  submit: () => boolean;
  remove: (comment: SocialCommentCard) => void;
};

export function useSocialCommentThread({
  postId,
  groupSlug,
  canComment,
  commentCount,
}: {
  postId: string;
  groupSlug?: string | null;
  canComment: boolean;
  commentCount: number;
}): SocialCommentThreadState {
  const [comments, setComments] = useState<SocialCommentCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      let res: Response;
      try {
        res = await fetch(`/api/social/comments?post_id=${encodeURIComponent(postId)}`, {
          cache: "no-store",
        });
      } catch {
        // A dropped connection takes the same line as a failed load.
        if (cancelled) return;
        setError(SOCIAL.post.commentFailed);
        setLoading(false);
        return;
      }
      const json = (await res.json().catch(() => null)) as {
        error?: string;
        comments?: SocialCommentCard[];
        truncated?: boolean;
      } | null;
      if (cancelled) return;
      if (!res.ok || json?.error) {
        setError(json?.error || SOCIAL.post.commentFailed);
        setLoading(false);
        return;
      }
      const rows = json?.comments ?? [];
      setComments(rows);
      // A page cut at the list bound is not the post's count.
      if (!json?.truncated) applyOptimisticCommentCount(postId, rows.length);
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [postId]);

  function submit(): boolean {
    if (!canComment || pending) return false;
    const nextBody = normalizeCommentBody(body);
    if (!nextBody) {
      setError(body.trim() ? SOCIAL.post.commentTooLong : SOCIAL.post.commentMissing);
      return false;
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
    return true;
  }

  function remove(comment: SocialCommentCard) {
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

  return { comments, loading, error, body, setBody, pending, submit, remove };
}
