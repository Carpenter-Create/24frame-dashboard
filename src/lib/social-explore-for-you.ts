import { socialAvatarHref, type SocialEdgeMediaItem } from "@/lib/social-edge";
import {
  isSocialMuxId,
  type SocialMuxPlaybackPolicy,
  type SocialMuxPlaybackTokens,
} from "@/lib/social-mux";
import { SOCIAL_ROUTES, displayHandle, normalizeHandle } from "@/lib/social";

// Explore For You v2. Video-only vertical stream. Photos stay off this host.
// docs/design-locks/social-explore-for-you-immersive-lock-v2.md

export type ExploreForYouHit = {
  id: string;
  authorId: string;
  body: string;
  likeCount: number;
  commentCount: number;
};

export type ExploreForYouAuthor = {
  handle: string;
  display_name: string;
};

export type SocialExploreForYouItem = {
  postId: string;
  playbackId: string;
  playbackPolicy?: SocialMuxPlaybackPolicy;
  body: string;
  authorId: string;
  authorHandle: string | null;
  authorName: string;
  authorPhotoUrl: string;
  likeCount: number;
  commentCount: number;
  liked: boolean;
  canLike: boolean;
  /** Present when the Explore loader already minted this signed playback. */
  playbackTokens?: SocialMuxPlaybackTokens;
};

export type ExploreForYouQuery = {
  q: string;
  tag: string;
  person: string;
  discover: boolean;
  /** `?v=` — a post id the For You stream opens at. "" when absent or not a UUID. */
  v: string;
};

/** Explore deep link: `?v=<post uuid>`. Feed Reels tiles open this. */
export const EXPLORE_FOR_YOU_VIDEO_PARAM = "v";

const EXPLORE_POST_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A post UUID, lower-cased, or "". Anything else is ignored. */
export function parseExploreForYouVideoParam(raw: string | string[] | undefined): string {
  const value = firstParam(raw);
  return EXPLORE_POST_ID_RE.test(value) ? value.toLowerCase() : "";
}

export type ExploreForYouMode = "for-you" | "keyword" | "hashtag" | "person" | "discover";

function firstParam(raw: string | string[] | undefined): string {
  return (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? "";
}

/** First Mux video on a post. Stills and native mp4 stay out. */
export function exploreForYouMuxVideo(
  media: readonly SocialEdgeMediaItem[],
): SocialEdgeMediaItem | null {
  return (
    media.find(
      (item) => item.kind === "video" && !!item.playbackId && isSocialMuxId(item.playbackId),
    ) ?? null
  );
}

export function exploreForYouVideoItems(input: {
  hits: readonly ExploreForYouHit[];
  mediaByPost: ReadonlyMap<string, readonly SocialEdgeMediaItem[]>;
  authors: ReadonlyMap<string, ExploreForYouAuthor>;
  liked: ReadonlySet<string>;
  canLike: boolean;
}): SocialExploreForYouItem[] {
  const items: SocialExploreForYouItem[] = [];
  for (const hit of input.hits) {
    const video = exploreForYouMuxVideo(input.mediaByPost.get(hit.id) ?? []);
    if (!video?.playbackId) continue;
    const author = input.authors.get(hit.authorId);
    items.push({
      postId: hit.id,
      playbackId: video.playbackId,
      ...(video.playbackPolicy ? { playbackPolicy: video.playbackPolicy } : {}),
      body: hit.body,
      authorId: hit.authorId,
      authorHandle: author?.handle ?? null,
      authorName: author?.display_name?.trim() || author?.handle || "",
      authorPhotoUrl: socialAvatarHref(hit.authorId),
      likeCount: hit.likeCount,
      commentCount: hit.commentCount,
      liked: input.liked.has(hit.id),
      canLike: input.canLike,
    });
  }
  return items;
}

export function exploreHashtagToken(raw: string): string {
  return raw.trim().replace(/^#+/, "").replace(/[%_\s]/g, "");
}

export function parseExploreForYouSearch(
  sp: Record<string, string | string[] | undefined>,
): ExploreForYouQuery {
  return {
    q: firstParam(sp.q),
    tag: exploreHashtagToken(firstParam(sp.tag)),
    person: normalizeHandle(firstParam(sp.person)) ?? "",
    discover: firstParam(sp.discover) === "1",
    v: parseExploreForYouVideoParam(sp[EXPLORE_FOR_YOU_VIDEO_PARAM]),
  };
}

/**
 * For You opened at a reel: that post first, then the For You page with
 * it removed. A missing, removed, or non-video post is null and changes
 * nothing; the video-only filter after this drops a pinned photo.
 */
export function pinExploreForYouHit<T extends { id: string }>(hits: readonly T[], pinned: T | null): T[] {
  if (!pinned) return [...hits];
  return [pinned, ...hits.filter((hit) => hit.id !== pinned.id)];
}

// discover=1 with a query is the chooser (lock C). It does not start For You.
// Selecting people, a keyword, or a hashtag drops discover and opens that
// vertical video stream. Clear is /social/explore.
export function exploreForYouStreamMode(query: ExploreForYouQuery): ExploreForYouMode {
  if (query.discover && query.q) return "discover";
  if (query.person) return "person";
  if (query.tag) return "hashtag";
  if (query.q) return "keyword";
  return "for-you";
}

export function exploreForYouHref(filter?: {
  q?: string;
  tag?: string;
  person?: string;
  discover?: boolean;
  v?: string;
}): string {
  const params = new URLSearchParams();
  if (filter?.discover) params.set("discover", "1");
  if (filter?.q) params.set("q", filter.q);
  if (filter?.tag) params.set("tag", filter.tag);
  if (filter?.person) params.set("person", filter.person);
  if (filter?.v) params.set(EXPLORE_FOR_YOU_VIDEO_PARAM, filter.v);
  const qs = params.toString();
  return qs ? `${SOCIAL_ROUTES.explore}?${qs}` : SOCIAL_ROUTES.explore;
}

export function exploreForYouFilterLabel(input: {
  mode: ExploreForYouMode;
  q: string;
  tag: string;
  personHandle: string;
  personName: string | null;
}): string | null {
  if (input.mode === "keyword") return input.q || null;
  if (input.mode === "hashtag") return input.tag ? `#${input.tag}` : null;
  if (input.mode === "person") {
    const name = input.personName?.trim();
    if (name) return name;
    return input.personHandle ? displayHandle(input.personHandle) : null;
  }
  return null;
}
