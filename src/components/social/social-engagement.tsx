"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { InlineNotice } from "@/components/ui/inline-notice";
import { readSocialFollowState } from "@/app/(app)/social/query-actions";
import { useAppQueryClient } from "@/components/query-provider";
import { useSocialLike } from "@/components/social/use-social-optimistic";
import {
  applyOptimisticLike,
  beginSocialFollowEpoch,
  beginSocialLikeEpoch,
  nextSocialLikeState,
  persistSocialFollowLatest,
  persistSocialLikeLatest,
  rememberSocialFollowBaseline,
  rememberSocialLikeBaseline,
  runSocialOptimisticMutation,
  socialFollowEpochIsCurrent,
  socialFollowPersistKey,
  socialLikeEpochIsCurrent,
} from "@/lib/social-optimistic";
import { SOCIAL_QUERY_STALE_MS, socialFollowQueryKey } from "@/lib/social-cache-keys";
import { applyOptimisticFollow } from "@/lib/social-query";
import {
  SOCIAL_ACTION_CLASS,
  SOCIAL_ACTION_SECONDARY_CLASS,
  SOCIAL_FOLLOW_COMPACT_CLASS,
  SOCIAL_FOLLOW_COMPACT_IDLE_CLASS,
  SOCIAL_POST_ACTION_HEART_NUDGE_CLASS,
  SOCIAL_POST_ACTION_HIT_CLASS,
  SOCIAL_POST_ACTION_LIKED_CLASS,
} from "@/lib/social-chrome";
import { SOCIAL_ICON_SIZE_POST_ACTION } from "@/lib/social-icons";
import {
  FOLLOW_CONFIRM_MS,
  followButtonLabel,
  followedConfirmCopy,
} from "@/lib/social-follow";
import { SOCIAL } from "@/lib/social";
import { cn } from "@/lib/cn";
import { SocialIcon } from "./social-icon";
import { SocialLikesSheet } from "./social-likes-sheet";

function FormError({ error }: { error: string }) {
  if (!error) return null;
  return <InlineNotice tone="error">{error}</InlineNotice>;
}

export function SocialFollowButton({
  followeeId,
  handle,
  following,
  viewerId,
  followsYou = false,
  compact = false,
  stretch = false,
}: {
  followeeId: string;
  handle: string;
  following: boolean;
  viewerId?: string;
  followsYou?: boolean;
  compact?: boolean;
  stretch?: boolean;
}) {
  const queryClient = useAppQueryClient();
  if (!queryClient) {
    return (
      <SocialFollowButtonView
        followeeId={followeeId}
        handle={handle}
        following={following}
        viewerId={viewerId}
        followsYou={followsYou}
        compact={compact}
        stretch={stretch}
        queryClient={null}
      />
    );
  }
  return (
    <SocialFollowButtonQuery
      followeeId={followeeId}
      handle={handle}
      following={following}
      viewerId={viewerId}
      followsYou={followsYou}
      compact={compact}
      stretch={stretch}
    />
  );
}

function SocialFollowButtonQuery({
  followeeId,
  handle,
  following,
  viewerId,
  followsYou,
  compact,
  stretch,
}: {
  followeeId: string;
  handle: string;
  following: boolean;
  viewerId?: string;
  followsYou: boolean;
  compact: boolean;
  stretch: boolean;
}) {
  const queryClient = useAppQueryClient();
  const query = useQuery({
    queryKey: socialFollowQueryKey(viewerId ?? "me", followeeId),
    queryFn: () => readSocialFollowState(followeeId),
    initialData: following,
    staleTime: SOCIAL_QUERY_STALE_MS,
  });
  return (
    <SocialFollowButtonView
      followeeId={followeeId}
      handle={handle}
      following={query.data ?? following}
      viewerId={viewerId}
      followsYou={followsYou}
      compact={compact}
      stretch={stretch}
      queryClient={queryClient}
    />
  );
}

function SocialFollowButtonView({
  followeeId,
  handle,
  following,
  viewerId,
  followsYou,
  compact,
  stretch,
  queryClient,
}: {
  followeeId: string;
  handle: string;
  following: boolean;
  viewerId?: string;
  followsYou: boolean;
  compact: boolean;
  stretch: boolean;
  queryClient: ReturnType<typeof useAppQueryClient>;
}) {
  const [override, setOverride] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);
  const isFollowing = override ?? following;

  // Adam lock: optimistic Following on click; InlineNotice toast only after persist.
  useEffect(() => {
    if (!confirm) return;
    const id = window.setTimeout(() => setConfirm(false), FOLLOW_CONFIRM_MS);
    return () => window.clearTimeout(id);
  }, [confirm]);

  return (
    <div
      className={
        stretch ? "flex min-w-0 flex-1 flex-col gap-1 md:flex-none" : "flex flex-col gap-1"
      }
    >
      <form
        data-social-follow=""
        className={stretch ? "min-w-0" : undefined}
        onSubmit={(event) => {
          event.preventDefault();
          const next = !isFollowing;
          const key = socialFollowPersistKey(viewerId ?? "me", followeeId);
          rememberSocialFollowBaseline(key, isFollowing);
          const epoch = beginSocialFollowEpoch(key);
          runSocialOptimisticMutation({
            apply: () => {
              setError("");
              setConfirm(false);
              setOverride(next);
              if (queryClient && viewerId) {
                applyOptimisticFollow(queryClient, {
                  viewerId,
                  targetId: followeeId,
                  following: next,
                });
              }
              return isFollowing;
            },
            persist: () =>
              persistSocialFollowLatest(key, epoch, next, { followeeId, handle }),
            rollback: (previous) => {
              if (!socialFollowEpochIsCurrent(key, epoch)) return;
              setOverride(previous);
              if (queryClient && viewerId) {
                applyOptimisticFollow(queryClient, {
                  viewerId,
                  targetId: followeeId,
                  following: previous,
                });
              }
            },
            onError: (notice) => {
              if (!socialFollowEpochIsCurrent(key, epoch)) return;
              setError(notice);
            },
            onSuccess: () => {
              if (!socialFollowEpochIsCurrent(key, epoch)) return;
              if (next) setConfirm(true);
            },
          });
        }}
      >
        <input type="hidden" name="followee_id" value={followeeId} />
        <input type="hidden" name="handle" value={handle} />
        <input type="hidden" name="following" value={isFollowing ? "1" : "0"} />
        <button
          type="submit"
          className={
            compact
              ? isFollowing
                ? SOCIAL_FOLLOW_COMPACT_IDLE_CLASS
                : SOCIAL_FOLLOW_COMPACT_CLASS
              : cn(
                  isFollowing ? SOCIAL_ACTION_SECONDARY_CLASS : SOCIAL_ACTION_CLASS,
                  stretch && "w-full",
                )
          }
        >
          {followButtonLabel(isFollowing, followsYou)}
        </button>
      </form>
      {error ? <FormError error={error} /> : null}
      {confirm ? (
        <InlineNotice data-social-follow-toast="" aria-live="polite">
          {followedConfirmCopy(handle)}
        </InlineNotice>
      ) : null}
    </div>
  );
}

export function SocialLikeButton({
  postId,
  liked,
  likeCount,
  groupSlug,
  disabled,
  icon = false,
  tone = "canvas",
}: {
  postId: string;
  liked: boolean;
  likeCount: number;
  groupSlug?: string;
  disabled?: boolean;
  icon?: boolean;
  tone?: "canvas" | "stage";
}) {
  const view = useSocialLike(postId, { liked, likeCount });
  const [error, setError] = useState("");

  function onToggle() {
    if (disabled) return;
    const previous = view;
    const next = nextSocialLikeState(previous);
    const epoch = beginSocialLikeEpoch(postId);
    rememberSocialLikeBaseline(postId, previous);
    runSocialOptimisticMutation({
      apply: () => {
        applyOptimisticLike(postId, next);
        setError("");
        return previous;
      },
      persist: () => persistSocialLikeLatest(postId, epoch, next, { groupSlug }),
      rollback: (token) => {
        if (!socialLikeEpochIsCurrent(postId, epoch)) return;
        applyOptimisticLike(postId, token);
      },
      onError: (notice) => {
        if (!socialLikeEpochIsCurrent(postId, epoch)) return;
        setError(notice);
      },
    });
  }

  return (
    <span className={icon ? "relative inline-flex shrink-0" : "inline"}>
      <button
        type="button"
        disabled={disabled}
        data-social-like=""
        aria-label={view.liked ? SOCIAL.post.unlike : SOCIAL.post.like}
        className={
          icon
            ? cn(
                SOCIAL_POST_ACTION_HIT_CLASS,
                tone === "stage"
                  ? view.liked
                    ? SOCIAL_POST_ACTION_LIKED_CLASS
                    : "text-band-ink"
                  : view.liked && "text-accent",
              )
            : "t-body-sm text-ink-2"
        }
        onClick={onToggle}
      >
        {icon ? (
          <SocialIcon
            name="heart"
            active={view.liked}
            size={SOCIAL_ICON_SIZE_POST_ACTION}
            className={SOCIAL_POST_ACTION_HEART_NUDGE_CLASS}
          />
        ) : (
          <>
            {view.likeCount} {SOCIAL.post.likes}
          </>
        )}
      </button>
      {error ? (
        <span className={icon ? "absolute top-full left-0 z-10" : undefined}>
          <FormError error={error} />
        </span>
      ) : null}
    </span>
  );
}

export function SocialLikeCount({
  postId,
  liked,
  likeCount,
}: {
  postId: string;
  liked: boolean;
  likeCount: number;
}) {
  const view = useSocialLike(postId, { liked, likeCount });
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        data-social-like-count=""
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={SOCIAL.post.likesTitle}
        className="self-start text-left t-body-sm font-semibold text-ink"
        onClick={() => setOpen(true)}
      >
        {view.likeCount} {SOCIAL.post.likes}
      </button>
      <SocialLikesSheet postId={postId} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
