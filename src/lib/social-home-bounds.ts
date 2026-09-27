import { UNPAGINATED_MAX } from "@/lib/list-bounds";
import {
  SOCIAL_CATEGORY_ALL,
  SOCIAL_CATEGORY_PARAM,
  socialCategorySlug,
  type SocialCategoryLabel,
} from "@/lib/social-categories";

/**
 * Social Home access paths (class 5). Mapping C: profiles.id — no org_id.
 *
 * ACCESS PATH + CARDINALITY (independent caps; do not share PostgREST max_rows):
 *   follows by follower_id     — followee IN() set for Home. Cap SOCIAL_FOLLOWEES_LIMIT.
 *   profile followers/following — live follows for one profile. Cap SOCIAL_FOLLOWS_LIST_LIMIT.
 *   posts following wall       — active, group_id is null, author_id IN (self+followees).
 *                                created_at+id keyset (`after=`). Cap SOCIAL_FOLLOWING_WALL_LIMIT.
 *   stories rail               — live (expires_at > now), same author set. Cap SOCIAL_STORIES_RAIL_LIMIT.
 *   Explore For You            — video posts. Cap SOCIAL_EXPLORE_POSTS_LIMIT.
 *   Explore people discovery   — filter choices, then that author's videos. Cap SOCIAL_EXPLORE_PEOPLE_LIMIT.
 *   People search              — header Search people intent. Cap SOCIAL_EXPLORE_PEOPLE_LIMIT.
 *   Home recent chats          — retired from Social Home. Cap SOCIAL_HOME_CHATS_LIMIT
 *                                remains for leftover preview helpers. Full inbox stays on Messages.
 *
 * Each loader probes limit+1 and splitProbe so a short page cannot look finished.
 * Following wall uses range(0, limit) after a keyset WHERE — never page-N OFFSET.
 * Existing posts_author_created_idx (author_id, created_at desc) covers the IN()+time
 * order; id is the unique tie-break. No new RPC.
 */

/** Followee IDs for the Home IN() set. Missing authors hide their posts and stories. */
export const SOCIAL_FOLLOWEES_LIMIT = UNPAGINATED_MAX;

/** Followers / following list on a public profile. Independent of the Home IN() set. */
export const SOCIAL_FOLLOWS_LIST_LIMIT = UNPAGINATED_MAX;

/** Home following wall page. Keyset on (created_at desc, id desc). */
export const SOCIAL_FOLLOWING_WALL_LIMIT = 50;

/** Live stories on the Home rail. Independent of the wall page. */
export const SOCIAL_STORIES_RAIL_LIMIT = 80;

/** People-search hits (header Search). Independent of Explore posts. */
export const SOCIAL_EXPLORE_PEOPLE_LIMIT = 20;

/** Explore post / media hits. Independent of people search. */
export const SOCIAL_EXPLORE_POSTS_LIMIT = 20;

/** Home For you + Search suggested people. Filtered from the people probe. */
export const SOCIAL_FOR_YOU_PEOPLE_LIMIT = 3;

/** Retired Social Home chats preview cap. Full inbox stays on Messages. */
export const SOCIAL_HOME_CHATS_LIMIT = 4;

export const SOCIAL_FOLLOWING_WALL_CURSOR_PARAM = "after";

export type FollowingWallCursor = {
  createdAt: string;
  id: string;
};

const ISO_CREATED_AT =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function encodeFollowingWallCursor(row: { created_at: string; id: string }): string {
  return `${row.created_at}|${row.id}`;
}

export function parseFollowingWallCursor(raw: string | null | undefined): FollowingWallCursor | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const sep = trimmed.lastIndexOf("|");
  if (sep <= 0 || sep === trimmed.length - 1) return null;
  const createdAt = trimmed.slice(0, sep);
  const id = trimmed.slice(sep + 1);
  if (!ISO_CREATED_AT.test(createdAt) || !UUID_RE.test(id)) return null;
  return { createdAt, id };
}

export function parseFollowingWallCursorParam(
  raw: string | string[] | undefined,
): FollowingWallCursor | null {
  return parseFollowingWallCursor(Array.isArray(raw) ? raw[0] : raw);
}

/** Quote so timestamptz `:` / `.` stay values, not PostgREST separators. */
export function quotePostgrestValue(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/** `(created_at, id) < cursor` for `.or(...)` — offset stays 0. */
export function followingWallKeysetOrFilter(cursor: FollowingWallCursor): string {
  const createdAt = quotePostgrestValue(cursor.createdAt);
  const id = quotePostgrestValue(cursor.id);
  return `created_at.lt.${createdAt},and(created_at.eq.${createdAt},id.lt.${id})`;
}

export function socialFollowingWallHref(opts?: {
  topic?: SocialCategoryLabel | null;
  after?: string | null;
}): string {
  const params = new URLSearchParams();
  const topic = opts?.topic;
  if (topic && topic !== SOCIAL_CATEGORY_ALL) {
    params.set(SOCIAL_CATEGORY_PARAM, socialCategorySlug(topic));
  }
  if (opts?.after) params.set(SOCIAL_FOLLOWING_WALL_CURSOR_PARAM, opts.after);
  const query = params.toString();
  return query ? `/social?${query}` : "/social";
}
