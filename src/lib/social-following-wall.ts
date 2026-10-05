import { normalizeSocialCategory, type SocialCategoryTopic } from "@/lib/social-categories";
import type { SocialEdgeMediaItem } from "@/lib/social-edge";
import type { SocialFollowingWallPage, SocialPostRow, SocialProfileRow } from "@/lib/social-feed";
import { socialPersonLabel } from "@/lib/social";
import { socialPostOwnedBy } from "@/lib/social-post-own";

// Query-owned Following wall view. RSC boot seeds this shape; the client
// bound paints from query.data after that. Do not keep a second mapper
// in the page or the bound.

export type SocialFollowingWallCard = {
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
  owned: boolean;
  /** The post's topic (the tagger's category), or null: the topic chip on the media. */
  topic: SocialCategoryTopic | null;
  media: SocialEdgeMediaItem[];
};

export type SocialFollowingWallView = {
  truncated: boolean;
  nextCursor: string | null;
  cards: SocialFollowingWallCard[];
};

export function socialFollowingWallView(input: {
  wall: Pick<SocialFollowingWallPage, "posts" | "truncated" | "nextCursor">;
  authors: ReadonlyMap<string, Pick<SocialProfileRow, "handle" | "display_name">>;
  faces: ReadonlyMap<string, string | null>;
  groups: ReadonlyMap<string, { slug: string; name: string }>;
  liked: ReadonlySet<string>;
  media: ReadonlyMap<string, readonly SocialEdgeMediaItem[]>;
  canLike: boolean;
  viewerId: string;
}): SocialFollowingWallView {
  return {
    truncated: input.wall.truncated,
    nextCursor: input.wall.nextCursor,
    cards: input.wall.posts.map((post) => socialFollowingWallCard(post, input)),
  };
}

function socialFollowingWallCard(
  post: SocialPostRow,
  input: {
    authors: ReadonlyMap<string, Pick<SocialProfileRow, "handle" | "display_name">>;
    faces: ReadonlyMap<string, string | null>;
    groups: ReadonlyMap<string, { slug: string; name: string }>;
    liked: ReadonlySet<string>;
    media: ReadonlyMap<string, readonly SocialEdgeMediaItem[]>;
    canLike: boolean;
    viewerId: string;
  },
): SocialFollowingWallCard {
  const author = input.authors.get(post.author_id);
  const group = post.group_id ? input.groups.get(post.group_id) : null;
  return {
    id: post.id,
    body: post.body,
    likeCount: post.like_count,
    commentCount: post.comment_count,
    liked: input.liked.has(post.id),
    createdAt: post.created_at,
    authorId: post.author_id,
    authorHandle: author?.handle ?? null,
    authorName: socialPersonLabel({
      handle: author?.handle ?? "",
      displayName: author?.display_name,
    }),
    authorPhotoUrl: input.faces.get(post.author_id) ?? null,
    groupSlug: group?.slug ?? null,
    groupName: group?.name ?? null,
    canLike: input.canLike,
    owned: socialPostOwnedBy(post.author_id, input.viewerId),
    topic: normalizeSocialCategory(post.category),
    media: [...(input.media.get(post.id) ?? [])],
  };
}
