import type { createClient } from "@/lib/supabase/server";
import { LIST_PAGE, probeRange, rangeFor, splitProbe } from "@/lib/list-bounds";
import type { SocialCategoryTopic } from "@/lib/social-categories";
import {
  SOCIAL_EXPLORE_PEOPLE_LIMIT,
  SOCIAL_EXPLORE_POSTS_LIMIT,
  SOCIAL_FOLLOWEES_LIMIT,
  SOCIAL_FOLLOWS_LIST_LIMIT,
  SOCIAL_FOLLOWING_WALL_LIMIT,
  SOCIAL_FOR_YOU_PEOPLE_LIMIT,
  SOCIAL_STORIES_RAIL_LIMIT,
  followingWallKeysetOrFilter,
  encodeFollowingWallCursor,
  type FollowingWallCursor,
} from "@/lib/social-home-bounds";
import {
  SOCIAL_LIKERS_PAGE,
  SOCIAL_PROFILE_POSTS_PAGE,
  SOCIAL_ROUTES,
  type SocialFollowsTab,
} from "@/lib/social";
import {
  socialPostMatchesActivityMedia,
  type SocialActivityPill,
} from "@/lib/social-activity";
import type { SocialCommentRow } from "@/lib/social-comments";
import { SOCIAL_MUX_PROVIDER } from "@/lib/social-mux";
import {
  SOCIAL_MUTUALS_NAME_CAP,
  SOCIAL_MUTUALS_PROBE,
  emptySocialProfileMutuals,
  socialMutualFromProfile,
  type SocialProfileMutuals,
} from "@/lib/social-profile-mutuals";
import { rankSocialSuggestedPeople, socialPostAffinityScore } from "@/lib/social-role-affinity";
import { isStoryLive, oldestLiveStoryId, storyRailUnseen } from "@/lib/social-stories";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

export type SocialProfileRow = {
  id: string;
  handle: string;
  display_name: string;
  status: string;
  bio?: string | null;
  welcome_video_key?: string | null;
  cover_key?: string | null;
  crafts?: string[] | null;
  topics?: string[] | null;
  imdb_url?: string | null;
  website_url?: string | null;
};

export const SOCIAL_POST_FEED_SELECT =
  "id, body, author_id, group_id, like_count, comment_count, created_at, media, category";

export type SocialPostRow = {
  id: string;
  body: string | null;
  author_id: string;
  group_id: string | null;
  like_count: number;
  comment_count: number;
  created_at: string;
  media: unknown;
  category?: string | null;
};

export type SocialStoryRow = {
  id: string;
  author_id: string;
  body: string | null;
  media: unknown;
  expires_at: string;
  created_at: string;
};

export type SocialStoryRailCard = {
  authorId: string;
  storyIds: string[];
  /** Newest row. Rail preview face. Not the open href. */
  latest: SocialStoryRow;
  /** Oldest live id. Tray / Home card href. */
  openId?: string;
  unseen: boolean;
};

export async function loadOwnProfile(
  supabase: ServerClient,
  userId: string,
): Promise<SocialProfileRow | null> {
  const { data } = await supabase
    .from("profiles")
    .select("id, handle, display_name, status, bio")
    .eq("id", userId)
    .maybeSingle();
  return data;
}

export type SocialFolloweePage = {
  ids: string[];
  truncated: boolean;
};

export async function loadFolloweeIds(
  supabase: ServerClient,
  followerId: string,
): Promise<SocialFolloweePage> {
  const { data } = await supabase
    .from("follows")
    .select("followee_id")
    .eq("follower_id", followerId)
    .order("created_at", { ascending: false })
    .order("followee_id", { ascending: true })
    .range(...probeRange(SOCIAL_FOLLOWEES_LIMIT));
  const { rows, truncated } = splitProbe(data, SOCIAL_FOLLOWEES_LIMIT);
  return { ids: rows.map((row) => row.followee_id), truncated };
}

export async function loadIsFollowing(
  supabase: ServerClient,
  followerId: string,
  followeeId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("follows")
    .select("followee_id")
    .eq("follower_id", followerId)
    .eq("followee_id", followeeId)
    .maybeSingle();
  return !!data;
}

export async function loadProfileMutuals(
  supabase: ServerClient,
  viewerId: string,
  profileId: string,
): Promise<SocialProfileMutuals> {
  if (!viewerId || viewerId === profileId) return emptySocialProfileMutuals();
  const followees = await loadFolloweeIds(supabase, viewerId);
  const candidate = followees.ids.filter((id) => id !== profileId);
  if (candidate.length === 0) return emptySocialProfileMutuals();

  const { data } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("followee_id", profileId)
    .in("follower_id", candidate)
    .order("created_at", { ascending: false })
    .range(...probeRange(SOCIAL_MUTUALS_PROBE));
  const { rows } = splitProbe(data, SOCIAL_MUTUALS_PROBE);
  const overlapIds = [...new Set(rows.map((row) => row.follower_id))];
  if (overlapIds.length === 0) return emptySocialProfileMutuals();

  const shownIds = overlapIds.slice(0, SOCIAL_MUTUALS_NAME_CAP);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, handle, display_name")
    .in("id", shownIds);
  const byId = new Map((profiles ?? []).map((row) => [row.id, row]));
  const people = shownIds
    .map((id) => {
      const row = byId.get(id);
      return row ? socialMutualFromProfile(row) : null;
    })
    .filter((row): row is NonNullable<typeof row> => !!row);
  if (people.length === 0) return emptySocialProfileMutuals();
  return { people, extra: Math.max(0, overlapIds.length - people.length) };
}

export type SocialProfileCounts = {
  posts: number;
  followers: number;
  following: number;
};

// Live follows rows are the count SoT. follows has no id column;
// profiles.follower_count is leftover denormalized storage.
export async function loadProfileSocialCounts(
  supabase: ServerClient,
  profileId: string,
): Promise<SocialProfileCounts> {
  const [followers, following, posts] = await Promise.all([
    supabase
      .from("follows")
      .select("follower_id", { count: "exact", head: true })
      .eq("followee_id", profileId),
    supabase
      .from("follows")
      .select("followee_id", { count: "exact", head: true })
      .eq("follower_id", profileId),
    supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("author_id", profileId)
      .eq("status", "active")
      .is("group_id", null),
  ]);

  return {
    posts: posts.count ?? 0,
    followers: followers.count ?? 0,
    following: following.count ?? 0,
  };
}

export type SocialFollowsListPerson = {
  id: string;
  handle: string;
  display_name: string;
  following: boolean;
  followsYou: boolean;
};

export type SocialFollowsListPage = {
  people: SocialFollowsListPerson[];
  truncated: boolean;
};

/**
 * Public followers or following for one profile. Live follows rows are the
 * graph SoT. Probe so a cap cannot look finished. Viewer follow edges are a
 * second, named read so Follow / Follow back / Following stay honest.
 */
export async function loadProfileFollowList(
  supabase: ServerClient,
  profileId: string,
  tab: SocialFollowsTab,
  viewerId: string,
): Promise<SocialFollowsListPage> {
  const personCol = tab === "followers" ? "follower_id" : "followee_id";
  const profileCol = tab === "followers" ? "followee_id" : "follower_id";
  const { data } = await supabase
    .from("follows")
    .select("follower_id, followee_id, created_at")
    .eq(profileCol, profileId)
    .order("created_at", { ascending: false })
    .order(personCol, { ascending: true })
    .range(...probeRange(SOCIAL_FOLLOWS_LIST_LIMIT));
  const { rows, truncated } = splitProbe(data, SOCIAL_FOLLOWS_LIST_LIMIT);
  const ids = [...new Set(rows.map((row) => (tab === "followers" ? row.follower_id : row.followee_id)))];
  if (ids.length === 0) return { people: [], truncated };

  const otherIds = ids.filter((id) => id !== viewerId);
  const [{ data: profiles }, followingPage, followerPage] = await Promise.all([
    supabase.from("profiles").select("id, handle, display_name, status").eq("status", "active").in("id", ids),
    otherIds.length > 0
      ? supabase.from("follows").select("followee_id").eq("follower_id", viewerId).in("followee_id", otherIds)
      : Promise.resolve({ data: [] as { followee_id: string }[] }),
    otherIds.length > 0
      ? supabase.from("follows").select("follower_id").eq("followee_id", viewerId).in("follower_id", otherIds)
      : Promise.resolve({ data: [] as { follower_id: string }[] }),
  ]);
  const byId = new Map((profiles ?? []).map((row) => [row.id, row]));
  const followingIds = new Set((followingPage.data ?? []).map((row) => row.followee_id));
  const followerIds = new Set((followerPage.data ?? []).map((row) => row.follower_id));
  const people = ids
    .map((id) => {
      const row = byId.get(id);
      if (!row) return null;
      return {
        id: row.id,
        handle: row.handle,
        display_name: row.display_name,
        following: followingIds.has(row.id),
        followsYou: followerIds.has(row.id),
      };
    })
    .filter((row): row is SocialFollowsListPerson => !!row);
  return { people, truncated };
}

export type SocialFollowingWallPage = {
  posts: SocialPostRow[];
  truncated: boolean;
  nextCursor: string | null;
};

/**
 * Home following wall. Mapping C: posts.author_id = profiles.id.
 * created_at+id keyset; probe so the page cannot look finished.
 * Caller supplies the followee IN() set so followee truncation stays a
 * separate, named path.
 */
export async function loadFollowingPosts(
  supabase: ServerClient,
  authorIds: readonly string[],
  opts?: { category?: SocialCategoryTopic | null; cursor?: FollowingWallCursor | null },
): Promise<SocialFollowingWallPage> {
  if (authorIds.length === 0) return { posts: [], truncated: false, nextCursor: null };
  let query = supabase
    .from("posts")
    .select(SOCIAL_POST_FEED_SELECT)
    .eq("status", "active")
    .is("group_id", null)
    .in("author_id", authorIds);
  if (opts?.category) query = query.eq("category", opts.category);
  if (opts?.cursor) query = query.or(followingWallKeysetOrFilter(opts.cursor));
  const { data } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(...probeRange(SOCIAL_FOLLOWING_WALL_LIMIT));
  const { rows, truncated } = splitProbe(data, SOCIAL_FOLLOWING_WALL_LIMIT);
  const last = rows[rows.length - 1];
  return {
    posts: rows,
    truncated,
    nextCursor: truncated && last ? encodeFollowingWallCursor(last) : null,
  };
}

export type SocialAuthorPostsPage = {
  posts: SocialPostRow[];
  truncated: boolean;
};

/**
 * One author's public wall posts. Mapping C: `posts.author_id` = `profiles.id`.
 * Group walls stay on the group route. Probe so a cap is visible, not silent.
 */
export async function loadAuthorPosts(
  supabase: ServerClient,
  authorId: string,
): Promise<SocialAuthorPostsPage> {
  const { data } = await supabase
    .from("posts")
    .select(SOCIAL_POST_FEED_SELECT)
    .eq("status", "active")
    .is("group_id", null)
    .eq("author_id", authorId)
    .order("created_at", { ascending: false })
    .range(...probeRange(SOCIAL_PROFILE_POSTS_PAGE));
  const { rows, truncated } = splitProbe(data, SOCIAL_PROFILE_POSTS_PAGE);
  return { posts: rows, truncated };
}

export async function loadVisiblePosts(
  supabase: ServerClient,
  groupId?: string,
): Promise<SocialPostRow[]> {
  let query = supabase
    .from("posts")
    .select(SOCIAL_POST_FEED_SELECT)
    .eq("status", "active");
  if (groupId) query = query.eq("group_id", groupId);
  const { data } = await query
    .order("created_at", { ascending: false })
    .range(...rangeFor(LIST_PAGE));
  return data ?? [];
}

export type SocialStoriesPage = {
  stories: SocialStoryRow[];
  truncated: boolean;
};

export async function loadLiveStories(
  supabase: ServerClient,
  authorIds: readonly string[],
  now = new Date(),
): Promise<SocialStoriesPage> {
  if (authorIds.length === 0) return { stories: [], truncated: false };
  const { data } = await supabase
    .from("stories")
    .select("id, author_id, body, media, expires_at, created_at")
    .eq("status", "active")
    .gt("expires_at", now.toISOString())
    .in("author_id", authorIds)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(...probeRange(SOCIAL_STORIES_RAIL_LIMIT));
  const live = (data ?? []).filter((row) => isStoryLive(row.expires_at, now));
  const { rows, truncated } = splitProbe(live, SOCIAL_STORIES_RAIL_LIMIT);
  return { stories: rows, truncated };
}

export async function loadViewedStoryIds(
  supabase: ServerClient,
  viewerId: string,
  storyIds: readonly string[],
): Promise<Set<string>> {
  if (storyIds.length === 0) return new Set();
  const { data } = await supabase
    .from("story_views")
    .select("story_id")
    .eq("viewer_id", viewerId)
    .in("story_id", storyIds);
  return new Set((data ?? []).map((row) => row.story_id));
}

export function groupStoryRail(
  stories: readonly SocialStoryRow[],
  viewedIds: ReadonlySet<string>,
): SocialStoryRailCard[] {
  const byAuthor = new Map<string, SocialStoryRow[]>();
  for (const story of stories) {
    const current = byAuthor.get(story.author_id) ?? [];
    current.push(story);
    byAuthor.set(story.author_id, current);
  }
  return [...byAuthor.entries()].map(([authorId, rows]) => ({
    authorId,
    storyIds: rows.map((row) => row.id),
    latest: rows[0],
    openId: oldestLiveStoryId(rows) ?? rows[0]?.id,
    unseen: storyRailUnseen(rows.map((row) => row.id), viewedIds),
  }));
}

export async function loadStoryById(
  supabase: ServerClient,
  storyId: string,
): Promise<SocialStoryRow | null> {
  const { data } = await supabase
    .from("stories")
    .select("id, author_id, body, media, expires_at, created_at")
    .eq("id", storyId)
    .eq("status", "active")
    .maybeSingle();
  return data;
}

export async function loadOwnPostFacts(
  supabase: ServerClient,
  userId: string,
): Promise<{ hasIntro: boolean; hasPost: boolean; hasStory: boolean }> {
  const [{ data: posts }, { data: stories }] = await Promise.all([
    supabase
      .from("posts")
      .select("id, body")
      .eq("author_id", userId)
      .eq("status", "active")
      .range(...rangeFor(20)),
    supabase
      .from("stories")
      .select("id")
      .eq("author_id", userId)
      .eq("status", "active")
      .range(...rangeFor(1)),
  ]);
  const rows = posts ?? [];
  return {
    hasPost: rows.length > 0,
    hasIntro: rows.some((row) => !!row.body?.trim()),
    hasStory: (stories ?? []).length > 0,
  };
}

export type SocialExploreHit = {
  kind: "post";
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
  authorId: string;
  media: unknown;
  body: string;
  likeCount: number;
  commentCount: number;
};

const EXPLORE_POST_COLUMNS = "id, body, author_id, category, media, like_count, comment_count";

// jsonb @> needle. postgrest-js sends a JSON string as cs.<json>.
// Explore's cap counts Mux videos. A photo window must not empty For You.
const EXPLORE_MUX_VIDEO_CONTAINS = JSON.stringify([
  { kind: "video", provider: SOCIAL_MUX_PROVIDER },
]);

function exploreVideoPosts(supabase: ServerClient) {
  return supabase
    .from("posts")
    .select(EXPLORE_POST_COLUMNS)
    .eq("status", "active")
    .is("group_id", null)
    .contains("media", EXPLORE_MUX_VIDEO_CONTAINS);
}

export type SocialExplorePage = {
  hits: SocialExploreHit[];
  truncated: boolean;
};

export type SocialSuggestedPerson = {
  id: string;
  handle: string;
  display_name: string;
  crafts?: string[] | null;
  topics?: string[] | null;
};

export type SocialPeopleSearchPage = {
  people: SocialSuggestedPerson[];
  truncated: boolean;
};

function rankExplorePosts<T extends { id: string; category?: string | null }>(
  rows: readonly T[],
  viewer: { topics?: unknown; crafts?: unknown } | readonly string[],
): T[] {
  return [...rows].sort((a, b) => {
    const delta = socialPostAffinityScore(b.category, viewer) - socialPostAffinityScore(a.category, viewer);
    if (delta !== 0) return delta;
    return a.id.localeCompare(b.id);
  });
}

function explorePostHits(
  rows: readonly {
    id: string;
    body: string | null;
    author_id: string;
    media?: unknown;
    category?: string | null;
    like_count?: number | null;
    comment_count?: number | null;
  }[],
  viewer: { topics?: unknown; crafts?: unknown } | readonly string[],
): SocialExploreHit[] {
  return rankExplorePosts(rows, viewer).map((post) => ({
    kind: "post" as const,
    id: post.id,
    title: post.body?.trim() || "Post",
    subtitle: null,
    href: SOCIAL_ROUTES.explore,
    authorId: post.author_id,
    media: post.media ?? [],
    body: post.body?.trim() ?? "",
    likeCount: post.like_count ?? 0,
    commentCount: post.comment_count ?? 0,
  }));
}

export async function loadExploreSearch(
  supabase: ServerClient,
  query: string,
  viewer: { topics?: unknown; crafts?: unknown } | readonly string[] = [],
): Promise<SocialExplorePage> {
  const needle = query.trim();
  if (!needle) {
    return { hits: [], truncated: false };
  }
  const like = `%${needle.replace(/[%_]/g, "")}%`;
  const { data: posts } = await exploreVideoPosts(supabase)
    .ilike("body", like)
    .range(...probeRange(SOCIAL_EXPLORE_POSTS_LIMIT));
  const postsPage = splitProbe(posts, SOCIAL_EXPLORE_POSTS_LIMIT);
  return {
    hits: explorePostHits(postsPage.rows, viewer),
    truncated: postsPage.truncated,
  };
}

export async function loadExploreMedia(
  supabase: ServerClient,
  viewer: { topics?: unknown; crafts?: unknown } | readonly string[] = [],
): Promise<SocialExplorePage> {
  const { data: posts } = await exploreVideoPosts(supabase)
    .order("created_at", { ascending: false })
    .range(...probeRange(SOCIAL_EXPLORE_POSTS_LIMIT));
  const postsPage = splitProbe(posts, SOCIAL_EXPLORE_POSTS_LIMIT);
  return {
    hits: explorePostHits(postsPage.rows, viewer),
    truncated: postsPage.truncated,
  };
}

export async function loadExploreHashtag(
  supabase: ServerClient,
  tag: string,
  viewer: { topics?: unknown; crafts?: unknown } | readonly string[] = [],
): Promise<SocialExplorePage> {
  const needle = tag.trim().replace(/^#+/, "").replace(/[%_]/g, "");
  if (!needle) return { hits: [], truncated: false };
  const like = `%#${needle}%`;
  const { data: posts } = await exploreVideoPosts(supabase)
    .ilike("body", like)
    .range(...probeRange(SOCIAL_EXPLORE_POSTS_LIMIT));
  const postsPage = splitProbe(posts, SOCIAL_EXPLORE_POSTS_LIMIT);
  return {
    hits: explorePostHits(postsPage.rows, viewer),
    truncated: postsPage.truncated,
  };
}

export async function loadExploreByAuthor(
  supabase: ServerClient,
  authorId: string,
  viewer: { topics?: unknown; crafts?: unknown } | readonly string[] = [],
): Promise<SocialExplorePage> {
  if (!authorId) return { hits: [], truncated: false };
  const { data: posts } = await exploreVideoPosts(supabase)
    .eq("author_id", authorId)
    .order("created_at", { ascending: false })
    .range(...probeRange(SOCIAL_EXPLORE_POSTS_LIMIT));
  const postsPage = splitProbe(posts, SOCIAL_EXPLORE_POSTS_LIMIT);
  return {
    hits: explorePostHits(postsPage.rows, viewer),
    truncated: postsPage.truncated,
  };
}

export async function loadExploreProfileByHandle(
  supabase: ServerClient,
  handle: string,
): Promise<{ id: string; handle: string; display_name: string } | null> {
  const needle = handle.trim();
  if (!needle) return null;
  const { data } = await supabase
    .from("profiles")
    .select("id, handle, display_name, status")
    .eq("status", "active")
    .eq("handle", needle)
    .maybeSingle();
  if (!data?.id || data.status !== "active" || !data.handle) return null;
  return { id: data.id, handle: data.handle, display_name: data.display_name ?? "" };
}

export async function loadPeopleSearch(
  supabase: ServerClient,
  query: string,
  viewer: { topics?: unknown; crafts?: unknown } | readonly string[] = [],
): Promise<SocialPeopleSearchPage> {
  const needle = query.trim();
  if (!needle) {
    return { people: [], truncated: false };
  }
  const like = `%${needle.replace(/[%_]/g, "")}%`;
  const { data: people } = await supabase
    .from("profiles")
    .select("id, handle, display_name, crafts, topics")
    .eq("status", "active")
    .or(`handle.ilike.${like},display_name.ilike.${like}`)
    .range(...probeRange(SOCIAL_EXPLORE_PEOPLE_LIMIT));
  const peoplePage = splitProbe(people, SOCIAL_EXPLORE_PEOPLE_LIMIT);
  return {
    people: rankSocialSuggestedPeople(
      peoplePage.rows.map((person) => ({
        ...person,
        crafts: person.crafts ?? [],
        topics: person.topics ?? [],
      })),
      viewer,
    ),
    truncated: peoplePage.truncated,
  };
}

export async function loadSuggestedPeople(
  supabase: ServerClient,
  excludeIds: readonly string[],
  viewer: { topics?: unknown; crafts?: unknown } | readonly string[] = [],
  limit = SOCIAL_FOR_YOU_PEOPLE_LIMIT,
): Promise<SocialSuggestedPerson[]> {
  const { data } = await supabase
    .from("profiles")
    .select("id, handle, display_name, crafts, topics")
    .eq("status", "active")
    .order("handle", { ascending: true })
    .range(...probeRange(SOCIAL_EXPLORE_PEOPLE_LIMIT));
  const blocked = new Set(excludeIds.filter(Boolean));
  const available = (data ?? []).filter((row) => !blocked.has(row.id));
  return rankSocialSuggestedPeople(available, viewer).slice(0, limit);
}

export async function loadProfilesByIds(
  supabase: ServerClient,
  ids: string[],
): Promise<Map<string, SocialProfileRow>> {
  if (ids.length === 0) return new Map();
  const { data } = await supabase
    .from("profiles")
    .select("id, handle, display_name, status")
    .in("id", ids);
  return new Map((data ?? []).map((row) => [row.id, row]));
}

export async function loadGroupsByIds(
  supabase: ServerClient,
  ids: string[],
): Promise<Map<string, { id: string; slug: string; name: string }>> {
  if (ids.length === 0) return new Map();
  const { data } = await supabase.from("groups").select("id, slug, name").in("id", ids);
  return new Map((data ?? []).map((row) => [row.id, row]));
}

export async function loadStoryLikeCounts(
  supabase: ServerClient,
  storyIds: readonly string[],
): Promise<Map<string, number>> {
  if (storyIds.length === 0) return new Map();
  const { data, error } = await supabase
    .from("stories")
    .select("id, like_count")
    .in("id", [...storyIds]);
  if (error || !data) return new Map();
  return new Map(data.map((row) => [row.id, row.like_count]));
}

export async function loadLikedStoryIds(
  supabase: ServerClient,
  userId: string,
  storyIds: readonly string[],
): Promise<Set<string>> {
  if (!userId || storyIds.length === 0) return new Set();
  const { data, error } = await supabase
    .from("likes")
    .select("target_id")
    .eq("user_id", userId)
    .eq("target_type", "story_item")
    .in("target_id", [...storyIds]);
  if (error || !data) return new Set();
  return new Set(data.map((row) => row.target_id));
}

export async function loadLikedPostIds(
  supabase: ServerClient,
  userId: string,
  postIds: string[],
): Promise<Set<string>> {
  if (postIds.length === 0) return new Set();
  const { data } = await supabase
    .from("likes")
    .select("target_id")
    .eq("user_id", userId)
    .eq("target_type", "post")
    .in("target_id", postIds);
  return new Set((data ?? []).map((row) => row.target_id));
}

export async function loadVisiblePost(
  supabase: ServerClient,
  postId: string,
): Promise<SocialPostRow | null> {
  const { data } = await supabase
    .from("posts")
    .select(SOCIAL_POST_FEED_SELECT)
    .eq("id", postId)
    .eq("status", "active")
    .maybeSingle();
  return data;
}

export type SocialLikersPage = {
  userIds: string[];
  truncated: boolean;
};

export async function loadPostLikers(
  supabase: ServerClient,
  postId: string,
): Promise<SocialLikersPage> {
  const { data } = await supabase
    .from("likes")
    .select("user_id")
    .eq("target_type", "post")
    .eq("target_id", postId)
    .order("created_at", { ascending: false })
    .order("user_id", { ascending: true })
    .range(...probeRange(SOCIAL_LIKERS_PAGE));
  const { rows, truncated } = splitProbe(data, SOCIAL_LIKERS_PAGE);
  return { userIds: rows.map((row) => row.user_id), truncated };
}

export type SocialCommentsPage = {
  comments: SocialCommentRow[];
  truncated: boolean;
};

/** Oldest-first thread. App + RLS hide soft-deleted rows. */
export async function loadPostComments(
  supabase: ServerClient,
  postId: string,
): Promise<SocialCommentsPage> {
  const { data } = await supabase
    .from("comments")
    .select("id, post_id, author_id, body, created_at")
    .eq("post_id", postId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .range(...probeRange(SOCIAL_PROFILE_POSTS_PAGE));
  const { rows, truncated } = splitProbe(data, SOCIAL_PROFILE_POSTS_PAGE);
  return { comments: rows, truncated };
}

export type SocialActivityCommentItem = {
  comment: SocialCommentRow;
  post: SocialPostRow;
};

export type SocialActivityCommentsPage = {
  items: SocialActivityCommentItem[];
  truncated: boolean;
};

/**
 * Activity Comments pill: this profile's comments on visible parent posts.
 * Newest first. Join stays viewer-visible — posts RLS filters the parent.
 */
export async function loadAuthorActivityComments(
  supabase: ServerClient,
  authorId: string,
): Promise<SocialActivityCommentsPage> {
  const { data } = await supabase
    .from("comments")
    .select("id, post_id, author_id, body, created_at")
    .eq("author_id", authorId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(...probeRange(SOCIAL_PROFILE_POSTS_PAGE));
  const { rows, truncated } = splitProbe(data, SOCIAL_PROFILE_POSTS_PAGE);
  const postIds = [...new Set(rows.map((row) => row.post_id))];
  if (postIds.length === 0) return { items: [], truncated };

  const { data: posts } = await supabase
    .from("posts")
    .select(SOCIAL_POST_FEED_SELECT)
    .eq("status", "active")
    .in("id", postIds);
  const byId = new Map((posts ?? []).map((row) => [row.id, row]));
  const items: SocialActivityCommentItem[] = [];
  for (const comment of rows) {
    const post = byId.get(comment.post_id);
    if (!post) continue;
    items.push({
      comment,
      post: {
        id: post.id,
        body: post.body,
        author_id: post.author_id,
        group_id: post.group_id,
        like_count: post.like_count,
        comment_count: post.comment_count,
        created_at: post.created_at,
        media: post.media,
        category: post.category,
      },
    });
  }
  return { items, truncated };
}

export async function loadAuthorActivityPosts(
  supabase: ServerClient,
  authorId: string,
  pill: Extract<SocialActivityPill, "posts" | "images" | "videos">,
): Promise<SocialAuthorPostsPage> {
  const page = await loadAuthorPosts(supabase, authorId);
  if (pill === "posts") return page;
  return {
    posts: page.posts.filter((post) => socialPostMatchesActivityMedia(post.media, pill)),
    truncated: page.truncated,
  };
}
