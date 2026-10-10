import { normalizeSocialCategory, type SocialCategoryTopic } from "@/lib/social-categories";
import type { SocialMusicNotice } from "@/lib/social";
import type { SocialMediaOrientation } from "@/lib/social-media-display";
import type { SocialMuxPlaybackPolicy } from "@/lib/social-mux";

export type SocialPostMediaItem = {
  kind: "image" | "video";
  url: string;
  playbackId?: string;
  playbackPolicy?: SocialMuxPlaybackPolicy;
  orientation?: SocialMediaOrientation;
  width?: number;
  height?: number;
  aspect?: number;
};

export type SocialPostCardModel = {
  id: string;
  body: string | null;
  likeCount: number;
  commentCount?: number;
  liked: boolean;
  createdAt: string;
  authorId: string;
  authorHandle: string | null;
  authorName: string;
  authorPhotoUrl: string | null;
  groupSlug: string | null;
  groupName: string | null;
  canLike: boolean;
  media: SocialPostMediaItem[];
  owned?: boolean;
  /**
   * The post's topic (H register §5.1): a chip on the photo, the left of
   * a video's screen band. Absent or null: no topic shown.
   */
  topic?: SocialCategoryTopic | null;
  /** Author-only. Pending or blocked music check. Never a song title. */
  musicNotice?: SocialMusicNotice;
};

// Pure card model. Lives outside the client module so server pages can call it.
// A function exported from a "use client" module is a client reference and
// cannot be invoked during RSC render (Sentry 24FRAME-3).
export function socialAuthorPostCard(input: {
  post: {
    id: string;
    body: string | null;
    author_id: string;
    like_count: number;
    comment_count?: number;
    created_at: string;
    category?: string | null;
  };
  authorHandle: string;
  authorName: string;
  authorPhotoUrl: string | null;
  liked: boolean;
  canLike: boolean;
  media: SocialPostMediaItem[];
  owned?: boolean;
  musicNotice?: SocialMusicNotice | null;
}): SocialPostCardModel {
  return {
    id: input.post.id,
    body: input.post.body,
    likeCount: input.post.like_count,
    commentCount: input.post.comment_count,
    liked: input.liked,
    createdAt: input.post.created_at,
    authorId: input.post.author_id,
    authorHandle: input.authorHandle,
    authorName: input.authorName,
    authorPhotoUrl: input.authorPhotoUrl,
    groupSlug: null,
    groupName: null,
    canLike: input.canLike,
    media: input.media,
    owned: input.owned ?? false,
    topic: normalizeSocialCategory(input.post.category),
    ...(input.musicNotice ? { musicNotice: input.musicNotice } : {}),
  };
}
