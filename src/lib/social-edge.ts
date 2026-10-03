import {
  isSocialMuxMediaItem,
  ownedMediaItems,
  socialMediaFrameFields,
  type SocialMediaContentType,
  type SocialMediaItem,
  type SocialMediaLane,
} from "@/lib/social-media";
import {
  socialMuxPlaybackRequiresTokens,
  socialMuxThumbnailUrl,
  type SocialMuxPlaybackPolicy,
} from "@/lib/social-mux";

// Same-origin proxy hrefs for Social avatars and media. Pages emit these
// instead of signing; Node routes re-sign. No new env — KV / Upstash names
// stay as on main.
//
// Founder decision 2026-10-03: every Social page runs on Node.js. The public
// profile, follows, search and member redirect left Vercel Edge because the
// 24Frame AI overlay opens on them and its Claude Platform on AWS client
// (@anthropic-ai/aws-sdk) is Node-only.

export const SOCIAL_NODE_RUNTIME = "nodejs" as const;

export const SOCIAL_AVATAR_ROUTE = "/api/social/avatar";
export const SOCIAL_MEDIA_ROUTE = "/api/social/media";
/** Owner cover bytes. Streams the object; never a redirect to the CDN. */
export const SOCIAL_COVER_BYTES_ROUTE = "/api/social/cover";

export function socialAvatarHref(userId: string): string {
  return `${SOCIAL_AVATAR_ROUTE}/${userId}`;
}

export function socialMediaHref(key: string): string {
  return `${SOCIAL_MEDIA_ROUTE}?key=${encodeURIComponent(key)}`;
}

export function socialAvatarFaces(userIds: readonly string[]): Map<string, string> {
  return new Map(userIds.filter(Boolean).map((id) => [id, socialAvatarHref(id)]));
}

/** Display SoT. Same name callers already import from s3-avatars. Never RSA. */
export function signedAvatarUrls(userIds: readonly string[]): Map<string, string | null> {
  return socialAvatarFaces(userIds);
}

export type SocialEdgeMediaItem = {
  kind: "image" | "video";
  url: string;
  contentType: SocialMediaContentType;
  playbackId?: string;
  playbackPolicy?: SocialMuxPlaybackPolicy;
  width?: number;
  height?: number;
};

function edgeFrame(item: SocialMediaItem): { width?: number; height?: number } {
  return socialMediaFrameFields(item) ?? {};
}

export type SocialStoryRailCoverResult = {
  kind: "image" | "video";
  url: string;
  playbackId?: string;
  playbackPolicy?: SocialMuxPlaybackPolicy;
};

/**
 * Rail / neighbor cover. Stills stay on the image proxy. Video is not a <video> src.
 * Signed Mux thumbs 403 without a JWT — leave url empty so the rail can mint one.
 * An unsigned image.mux.com src is what Safari paints as the broken-image glyph.
 */
export function socialStoryRailCover(
  media: unknown,
  authorId: string,
): SocialStoryRailCoverResult | null {
  const first = socialMediaProxies(media, authorId, "stories")[0];
  if (!first) return null;
  if (first.playbackId) {
    const needsToken = socialMuxPlaybackRequiresTokens(first.playbackPolicy);
    const url = needsToken ? "" : first.url || socialMuxThumbnailUrl(first.playbackId);
    if (!url && !needsToken) return { kind: "video", url: "" };
    return {
      kind: "image",
      url,
      playbackId: first.playbackId,
      ...(first.playbackPolicy ? { playbackPolicy: first.playbackPolicy } : {}),
    };
  }
  if (first.kind === "video") return { kind: "video", url: "" };
  if (!first.url) return null;
  return { kind: first.kind, url: first.url };
}

export function socialMediaProxies(
  media: unknown,
  authorId: string,
  lane: SocialMediaLane = "posts",
): SocialEdgeMediaItem[] {
  return ownedMediaItems(media, authorId, lane).map((item) =>
    isSocialMuxMediaItem(item)
      ? {
          kind: item.kind,
          url: socialMuxPlaybackRequiresTokens(item.playbackPolicy)
            ? ""
            : socialMuxThumbnailUrl(item.playbackId),
          contentType: item.contentType,
          playbackId: item.playbackId,
          ...(item.playbackPolicy ? { playbackPolicy: item.playbackPolicy } : {}),
          ...edgeFrame(item),
        }
      : {
          kind: item.kind,
          url: item.kind === "video" ? "" : socialMediaHref(item.key),
          contentType: item.contentType,
          ...edgeFrame(item),
        },
  );
}

export function socialMediaProxiesByPostId(
  posts: readonly { id: string; author_id: string; media: unknown }[],
): Map<string, SocialEdgeMediaItem[]> {
  return new Map(posts.map((post) => [post.id, socialMediaProxies(post.media, post.author_id)]));
}

/** Display SoT. Same name callers already import from s3-social-media. Never RSA. */
export function signedSocialMediaByPostId(
  posts: readonly { id: string; author_id: string; media: unknown }[],
): Map<string, SocialEdgeMediaItem[]> {
  return socialMediaProxiesByPostId(posts);
}
