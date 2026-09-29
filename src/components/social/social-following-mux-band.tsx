"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  SOCIAL_FOLLOWING_MUX_ACTIVE_THRESHOLDS,
  socialFollowingMuxActiveId,
  socialFollowingMuxRoleForPost,
  type SocialFollowingMuxRole,
} from "@/lib/social-following-mux-active";
import {
  loadSocialMuxPlaybackTokens,
  socialMuxPlaybackRequiresTokens,
  type SocialMuxPlaybackPolicy,
} from "@/lib/social-mux";

// Home Following and group feeds that share SocialOptimisticFeed.
// Profile, activity, single-post, immersive, and DM omit this provider.
// docs/design-locks/social-home-following-mux-active-gate-lock-v1.md

type SocialFollowingMuxBandValue = {
  order: readonly string[];
  activeId: string | null;
  report: (postId: string, ratio: number | null) => void;
};

const SocialFollowingMuxBandContext = createContext<SocialFollowingMuxBandValue | null>(null);

export function SocialFollowingMuxBand({
  order,
  children,
}: {
  order: readonly string[];
  children: ReactNode;
}) {
  const ratios = useRef(new Map<string, number>());
  const orderRef = useRef(order);
  const [activeId, setActiveId] = useState<string | null>(null);
  const report = useCallback((postId: string, ratio: number | null) => {
    if (ratio == null) ratios.current.delete(postId);
    else ratios.current.set(postId, ratio);
    const next = socialFollowingMuxActiveId(orderRef.current, ratios.current);
    setActiveId((current) => (current === next ? current : next));
  }, []);
  useEffect(() => {
    orderRef.current = order;
    const next = socialFollowingMuxActiveId(order, ratios.current);
    setActiveId((current) => (current === next ? current : next));
  }, [order]);
  const value = useMemo(
    () => ({ order, activeId, report }),
    [order, activeId, report],
  );
  return (
    <SocialFollowingMuxBandContext.Provider value={value}>{children}</SocialFollowingMuxBandContext.Provider>
  );
}

export function useSocialFollowingMuxRole(postId: string | undefined): SocialFollowingMuxRole | "unbanded" {
  const band = useContext(SocialFollowingMuxBandContext);
  if (!postId || !band) return "unbanded";
  return socialFollowingMuxRoleForPost({
    postId,
    activeId: band.activeId,
    order: band.order,
  });
}

/**
 * Viewport observer. Missing IntersectionObserver mounts the first video
 * and leaves the warm slot to the role helper. A null ratio drops the post.
 */
export function useSocialFollowingMuxObserve(
  postId: string | undefined,
  nodeRef: { readonly current: HTMLElement | null },
): void {
  const band = useContext(SocialFollowingMuxBandContext);
  const report = band?.report;
  const lead = Boolean(postId && band && band.order[0] === postId);
  useEffect(() => {
    if (!postId || !report) return undefined;
    if (typeof IntersectionObserver === "undefined") {
      if (lead) report(postId, 1);
      return () => {
        report(postId, null);
      };
    }
    const node = nodeRef.current;
    if (!node) {
      if (lead) report(postId, 1);
      return () => {
        report(postId, null);
      };
    }
    let cancelled = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (cancelled) return;
        const entry = entries[entries.length - 1];
        if (!entry) return;
        report(postId, entry.isIntersecting ? entry.intersectionRatio : 0);
      },
      { root: null, threshold: [...SOCIAL_FOLLOWING_MUX_ACTIVE_THRESHOLDS] },
    );
    observer.observe(node);
    return () => {
      cancelled = true;
      observer.disconnect();
      report(postId, null);
    };
  }, [postId, report, nodeRef, lead]);
}

/** Signed JWT only. Does not mount Mux JS and does not set preload. */
export function SocialFollowingMuxWarm({
  playbackId,
  playbackPolicy,
}: {
  playbackId: string;
  playbackPolicy?: SocialMuxPlaybackPolicy;
}) {
  useEffect(() => {
    if (!socialMuxPlaybackRequiresTokens(playbackPolicy)) return undefined;
    const controller = new AbortController();
    void loadSocialMuxPlaybackTokens(playbackId, controller.signal);
    return () => controller.abort();
  }, [playbackId, playbackPolicy]);
  return null;
}
