"use client";

import { useSyncExternalStore } from "react";

import {
  getSocialOptimisticServerSnapshot,
  mergeSocialLike,
  readOptimisticCommentCount,
  readOptimisticLike,
  readOptimisticSocialPosts,
  socialOptimisticPostsFor,
  subscribeOptimisticCommentCounts,
  subscribeOptimisticLikes,
  subscribeOptimisticSocialPosts,
  type SocialOptimisticLike,
  type SocialOptimisticPost,
} from "@/lib/social-optimistic";
import { readSocialPostOwnVersion, socialPostLiveBody, subscribeSocialPostOwn } from "@/lib/social-post-own";

export function useSocialLike(postId: string, server: SocialOptimisticLike): SocialOptimisticLike {
  const overlay = useSyncExternalStore(
    subscribeOptimisticLikes,
    () => readOptimisticLike(postId),
    getSocialOptimisticServerSnapshot,
  );
  return overlay ?? server;
}

export function useSocialLikeView(postId: string, liked: boolean, likeCount: number): SocialOptimisticLike {
  return useSocialLike(postId, { liked, likeCount });
}

export function useSocialCommentCount(postId: string, serverCount = 0): number {
  const overlay = useSyncExternalStore(
    subscribeOptimisticCommentCounts,
    () => readOptimisticCommentCount(postId),
    getSocialOptimisticServerSnapshot,
  );
  return overlay ?? serverCount;
}

export function useSocialOptimisticPosts(
  groupSlug?: string | null,
  topic?: string | null,
): readonly SocialOptimisticPost[] {
  const pending = useSyncExternalStore(
    subscribeOptimisticSocialPosts,
    readOptimisticSocialPosts,
    (): readonly SocialOptimisticPost[] => [],
  );
  return socialOptimisticPostsFor(groupSlug, pending, topic);
}

/** The caption as this device shows it: an owner's edit shows at once on
 *  every surface that reads it, with no page refresh
 *  (docs/design-locks/social-post-caption-window-lock-v1.md). */
export function useSocialPostLiveBody(postId: string, serverBody: string | null): string | null {
  return useSyncExternalStore(
    subscribeSocialPostOwn,
    () => socialPostLiveBody(postId, serverBody),
    () => serverBody,
  );
}

/** One subscription for a list that re-reads its rows' captions. */
export function useSocialPostOwnVersion(): number {
  return useSyncExternalStore(subscribeSocialPostOwn, readSocialPostOwnVersion, () => 0);
}

export { mergeSocialLike };
