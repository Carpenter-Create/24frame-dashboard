import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

import { LIST_PAGE, probeRange } from "@/lib/list-bounds";
import { SOCIAL_LIKERS_PAGE, SOCIAL_PROFILE_POSTS_PAGE } from "@/lib/social";
import {
  SOCIAL_EXPLORE_PEOPLE_LIMIT,
  SOCIAL_EXPLORE_POSTS_LIMIT,
  SOCIAL_FOLLOWEES_LIMIT,
  SOCIAL_FOLLOWS_LIST_LIMIT,
  SOCIAL_FOLLOWING_WALL_LIMIT,
  SOCIAL_STORIES_RAIL_LIMIT,
  encodeFollowingWallCursor,
  followingWallKeysetOrFilter,
} from "@/lib/social-home-bounds";
import {
  loadAuthorActivityComments,
  loadAuthorPosts,
  loadExploreMedia,
  loadExploreSearch,
  loadPeopleSearch,
  loadFolloweeIds,
  loadFollowingPosts,
  loadLiveStories,
  loadPostLikers,
  loadVisiblePost,
  loadProfileFollowList,
  loadProfileSocialCounts,
  type SocialPostRow,
  type SocialStoryRow,
} from "@/lib/social-feed";

function post(id: string, authorId = "u1"): SocialPostRow {
  return {
    id,
    body: id,
    author_id: authorId,
    group_id: null,
    like_count: 0,
    comment_count: 0,
    created_at: "2026-09-13T12:00:00.000Z",
    media: [],
  };
}

function authorClient(rows: SocialPostRow[] | null) {
  const range = vi.fn(async () => ({ data: rows, error: null }));
  const order = vi.fn(() => ({ range }));
  const authorEq = vi.fn(() => ({ order }));
  const groupIs = vi.fn(() => ({ eq: authorEq }));
  const statusEq = vi.fn(() => ({ is: groupIs }));
  const select = vi.fn(() => ({ eq: statusEq }));
  const from = vi.fn(() => ({ select }));
  return { from, select, statusEq, groupIs, authorEq, order, range };
}

describe("loadAuthorActivityComments", () => {
  it("joins this profile's comments to visible parent posts, newest first", async () => {
    const comments = [
      {
        id: "c1",
        post_id: "p1",
        author_id: "u1",
        body: "their note",
        created_at: "2026-09-21T12:00:00.000Z",
      },
    ];
    const posts = [post("p1")];
    const commentRange = vi.fn(async () => ({ data: comments, error: null }));
    const commentOrderId = vi.fn(() => ({ range: commentRange }));
    const commentOrder = vi.fn(() => ({ order: commentOrderId }));
    const commentLive = vi.fn(() => ({ order: commentOrder }));
    const commentEq = vi.fn(() => ({ is: commentLive }));
    const commentSelect = vi.fn(() => ({ eq: commentEq }));
    const postIn = vi.fn(async () => ({ data: posts, error: null }));
    const postStatus = vi.fn(() => ({ in: postIn }));
    const postSelect = vi.fn(() => ({ eq: postStatus }));
    const from = vi.fn((table: string) =>
      table === "comments" ? { select: commentSelect } : { select: postSelect },
    );
    const page = await loadAuthorActivityComments({ from } as never, "u1");
    expect(from).toHaveBeenCalledWith("comments");
    expect(commentSelect).toHaveBeenCalledWith("id, post_id, author_id, body, created_at");
    expect(commentEq).toHaveBeenCalledWith("author_id", "u1");
    expect(commentLive).toHaveBeenCalledWith("deleted_at", null);
    expect(commentOrder).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(page.items).toEqual([{ comment: comments[0], post: posts[0] }]);
    expect(page.truncated).toBe(false);
  });
});

describe("loadAuthorPosts", () => {
  it("reads one author's public wall with a documented probe", async () => {
    const rows = [post("p1"), post("p2")];
    const client = authorClient(rows);
    const page = await loadAuthorPosts(client as never, "u1");

    expect(client.from).toHaveBeenCalledWith("posts");
    expect(client.select).toHaveBeenCalledWith(
      "id, body, author_id, group_id, like_count, comment_count, created_at, media, category",
    );
    expect(client.statusEq).toHaveBeenCalledWith("status", "active");
    expect(client.groupIs).toHaveBeenCalledWith("group_id", null);
    expect(client.authorEq).toHaveBeenCalledWith("author_id", "u1");
    expect(client.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(client.range).toHaveBeenCalledWith(...probeRange(SOCIAL_PROFILE_POSTS_PAGE));
    expect(SOCIAL_PROFILE_POSTS_PAGE).toBe(LIST_PAGE);
    expect(page).toEqual({ posts: rows, truncated: false });
  });

  it("reports honest truncation when the probe row comes back", async () => {
    const rows = Array.from({ length: SOCIAL_PROFILE_POSTS_PAGE + 1 }, (_, i) => post(`p${i}`));
    const client = authorClient(rows);
    const page = await loadAuthorPosts(client as never, "u2");
    expect(page.posts).toHaveLength(SOCIAL_PROFILE_POSTS_PAGE);
    expect(page.posts[0]?.id).toBe("p0");
    expect(page.truncated).toBe(true);
    expect(client.authorEq).toHaveBeenCalledWith("author_id", "u2");
  });

  it("treats a null page as empty and not truncated", async () => {
    const client = authorClient(null);
    await expect(loadAuthorPosts(client as never, "u1")).resolves.toEqual({
      posts: [],
      truncated: false,
    });
  });
});

function feedChain(result: unknown) {
  const c: Record<string, unknown> = {};
  const self = () => c;
  c.select = vi.fn(self);
  c.eq = vi.fn(self);
  c.in = vi.fn(self);
  c.is = vi.fn(self);
  c.gt = vi.fn(self);
  c.or = vi.fn(self);
  c.ilike = vi.fn(self);
  c.contains = vi.fn(self);
  c.order = vi.fn(self);
  c.range = vi.fn(async () => ({ data: result, error: null }));
  c.then = (resolve: (value: unknown) => unknown) =>
    Promise.resolve({ data: result, error: null }).then(resolve);
  return c;
}

function wallPost(i: number, createdAt = `2026-09-14T12:00:${String(i).padStart(2, "0")}.000Z`): SocialPostRow {
  return {
    id: `11111111-1111-4111-8111-${String(i).padStart(12, "0")}`,
    body: `p${i}`,
    author_id: "u1",
    group_id: null,
    like_count: 0,
    comment_count: 0,
    created_at: createdAt,
    media: [],
  };
}

describe("loadProfileSocialCounts", () => {
  function countClient(counts: { followers: number; following: number; posts: number }) {
    const from = vi.fn((table: string) => {
      const chain: Record<string, unknown> = {};
      let eqCol = "";
      chain.select = vi.fn(() => chain);
      chain.eq = vi.fn((col: string) => {
        eqCol = col;
        return chain;
      });
      chain.is = vi.fn(() => chain);
      chain.then = (resolve: (value: unknown) => unknown) => {
        let count = 0;
        if (table === "follows" && eqCol === "followee_id") count = counts.followers;
        if (table === "follows" && eqCol === "follower_id") count = counts.following;
        if (table === "posts") count = counts.posts;
        return Promise.resolve({ count, error: null }).then(resolve);
      };
      return chain;
    });
    return { from };
  }

  it("counts live follow edges for followers and following", async () => {
    const client = countClient({ followers: 4, following: 1, posts: 3 });
    await expect(loadProfileSocialCounts(client as never, "u1")).resolves.toEqual({
      posts: 3,
      followers: 4,
      following: 1,
    });
    expect(client.from).toHaveBeenCalledWith("follows");
    expect(client.from).toHaveBeenCalledWith("posts");
  });
});

describe("loadFolloweeIds", () => {
  it("probes one past the followee cap and reports overflow", async () => {
    const rows = Array.from({ length: SOCIAL_FOLLOWEES_LIMIT + 1 }, (_, i) => ({
      followee_id: `f${i}`,
    }));
    const chain = feedChain(rows);
    const page = await loadFolloweeIds({ from: vi.fn(() => chain) } as never, "u1");
    expect(chain.eq).toHaveBeenCalledWith("follower_id", "u1");
    expect(chain.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(chain.order).toHaveBeenCalledWith("followee_id", { ascending: true });
    expect(chain.range).toHaveBeenCalledWith(...probeRange(SOCIAL_FOLLOWEES_LIMIT));
    expect(page.ids).toHaveLength(SOCIAL_FOLLOWEES_LIMIT);
    expect(page.truncated).toBe(true);
  });

  it("keeps an exactly-full followee page honest", async () => {
    const rows = Array.from({ length: SOCIAL_FOLLOWEES_LIMIT }, (_, i) => ({ followee_id: `f${i}` }));
    const page = await loadFolloweeIds({ from: vi.fn(() => feedChain(rows)) } as never, "u1");
    expect(page.ids).toHaveLength(SOCIAL_FOLLOWEES_LIMIT);
    expect(page.truncated).toBe(false);
  });
});

describe("loadProfileFollowList", () => {
  it("loads followers in recency order and names viewer follow edges", async () => {
    const follows = [
      { follower_id: "u3", followee_id: "u2", created_at: "2026-09-20T12:00:00.000Z" },
      { follower_id: "u4", followee_id: "u2", created_at: "2026-09-19T12:00:00.000Z" },
    ];
    const profiles = [
      { id: "u3", handle: "carol", display_name: "Carol King", status: "active" },
      { id: "u4", handle: "dan", display_name: "Dan", status: "active" },
    ];
    const from = vi.fn((table: string) => {
      if (table === "follows") {
        const chain = feedChain(follows);
        chain.in = vi.fn((col: string) => {
          if (col === "followee_id") return feedChain([{ followee_id: "u3" }]);
          return feedChain([{ follower_id: "u4" }]);
        });
        return chain;
      }
      return feedChain(profiles);
    });

    const page = await loadProfileFollowList({ from } as never, "u2", "followers", "u1");
    expect(from).toHaveBeenCalledWith("follows");
    expect(from).toHaveBeenCalledWith("profiles");
    expect(page.truncated).toBe(false);
    expect(page.people).toEqual([
      { id: "u3", handle: "carol", display_name: "Carol King", following: true, followsYou: false },
      { id: "u4", handle: "dan", display_name: "Dan", following: false, followsYou: true },
    ]);
  });

  it("loads following and probes one past the named cap", async () => {
    const rows = Array.from({ length: SOCIAL_FOLLOWS_LIST_LIMIT + 1 }, (_, i) => ({
      follower_id: "u2",
      followee_id: `f${i}`,
      created_at: "2026-09-20T12:00:00.000Z",
    }));
    const chain = feedChain(rows);
    const from = vi.fn((table: string) => (table === "follows" ? chain : feedChain([])));
    const page = await loadProfileFollowList({ from } as never, "u2", "following", "u1");
    expect(chain.eq).toHaveBeenCalledWith("follower_id", "u2");
    expect(chain.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(chain.order).toHaveBeenCalledWith("followee_id", { ascending: true });
    expect(chain.range).toHaveBeenCalledWith(...probeRange(SOCIAL_FOLLOWS_LIST_LIMIT));
    expect(page.people).toHaveLength(0);
    expect(page.truncated).toBe(true);
  });
});

describe("loadFollowingPosts", () => {
  it("probes the wall cap and does not use page-N OFFSET", async () => {
    const rows = [wallPost(1)];
    const chain = feedChain(rows);
    const page = await loadFollowingPosts({ from: vi.fn(() => chain) } as never, ["u1", "u2"]);
    expect(chain.in).toHaveBeenCalledWith("author_id", ["u1", "u2"]);
    expect(chain.or).not.toHaveBeenCalled();
    expect(chain.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(chain.order).toHaveBeenCalledWith("id", { ascending: false });
    expect(chain.range).toHaveBeenCalledWith(...probeRange(SOCIAL_FOLLOWING_WALL_LIMIT));
    expect(page).toEqual({ posts: rows, truncated: false, nextCursor: null });
  });

  it("applies created_at+id keyset at offset 0", async () => {
    const cursor = {
      createdAt: "2026-09-14T12:00:00.000Z",
      id: "11111111-1111-4111-8111-000000000099",
    };
    const chain = feedChain([]);
    await loadFollowingPosts({ from: vi.fn(() => chain) } as never, ["u1"], { cursor });
    expect(chain.or).toHaveBeenCalledWith(followingWallKeysetOrFilter(cursor));
    expect(chain.range).toHaveBeenCalledWith(...probeRange(SOCIAL_FOLLOWING_WALL_LIMIT));
    const range = chain.range as ReturnType<typeof vi.fn>;
    const [from] = range.mock.calls[0] as [number, number];
    expect(from).toBe(0);
  });

  it("drops the probe row and exposes the next cursor", async () => {
    const rows = Array.from({ length: SOCIAL_FOLLOWING_WALL_LIMIT + 1 }, (_, i) => wallPost(i));
    const page = await loadFollowingPosts({ from: vi.fn(() => feedChain(rows)) } as never, ["u1"]);
    expect(page.truncated).toBe(true);
    expect(page.posts).toHaveLength(SOCIAL_FOLLOWING_WALL_LIMIT);
    expect(page.nextCursor).toBe(encodeFollowingWallCursor(page.posts[SOCIAL_FOLLOWING_WALL_LIMIT - 1]!));
    expect(page.posts.at(-1)?.id).not.toBe(rows.at(-1)?.id);
  });

  it("skips the query when the author set is empty", async () => {
    const from = vi.fn();
    const page = await loadFollowingPosts({ from } as never, []);
    expect(from).not.toHaveBeenCalled();
    expect(page).toEqual({ posts: [], truncated: false, nextCursor: null });
  });
});

describe("loadLiveStories", () => {
  function story(i: number): SocialStoryRow {
    return {
      id: `s${i}`,
      author_id: "u1",
      body: null,
      media: [],
      expires_at: "2026-09-15T12:00:00.000Z",
      created_at: "2026-09-14T12:00:00.000Z",
    };
  }

  it("probes the rail cap and reports overflow", async () => {
    const rows = Array.from({ length: SOCIAL_STORIES_RAIL_LIMIT + 1 }, (_, i) => story(i));
    const chain = feedChain(rows);
    const now = new Date("2026-09-14T12:00:00.000Z");
    const page = await loadLiveStories({ from: vi.fn(() => chain) } as never, ["u1"], now);
    expect(chain.range).toHaveBeenCalledWith(...probeRange(SOCIAL_STORIES_RAIL_LIMIT));
    expect(page.stories).toHaveLength(SOCIAL_STORIES_RAIL_LIMIT);
    expect(page.truncated).toBe(true);
  });
});

describe("loadExploreSearch", () => {
  it("probes posts only and does not read profiles", async () => {
    const posts = Array.from({ length: SOCIAL_EXPLORE_POSTS_LIMIT + 1 }, (_, i) => ({
      id: `x${i}`,
      body: `hello ${i}`,
      author_id: "u1",
    }));
    const postsChain = feedChain(posts);
    const from = vi.fn((table: string) => {
      if (table === "profiles") throw new Error("Explore search must not read people");
      return postsChain;
    });
    const page = await loadExploreSearch({ from } as never, "ada");
    expect(postsChain.contains).toHaveBeenCalledWith(
      "media",
      JSON.stringify([{ kind: "video", provider: "mux" }]),
    );
    expect(postsChain.range).toHaveBeenCalledWith(...probeRange(SOCIAL_EXPLORE_POSTS_LIMIT));
    expect(page.truncated).toBe(true);
    expect(page.hits).toHaveLength(SOCIAL_EXPLORE_POSTS_LIMIT);
    expect(page.hits.every((hit) => hit.kind === "post")).toBe(true);
    expect(page.hits[0]).toMatchObject({
      kind: "post",
      title: "hello 0",
      authorId: "u1",
    });
  });
});

describe("loadExploreMedia", () => {
  it("probes recent public posts without a people rail", async () => {
    const posts = Array.from({ length: SOCIAL_EXPLORE_POSTS_LIMIT + 1 }, (_, i) => ({
      id: `m${i}`,
      body: `clip ${i}`,
      author_id: "u1",
    }));
    const postsChain = feedChain(posts);
    const from = vi.fn((table: string) => {
      if (table === "profiles") throw new Error("Explore media must not read people");
      return postsChain;
    });
    const page = await loadExploreMedia({ from } as never);
    expect(postsChain.contains).toHaveBeenCalledWith(
      "media",
      JSON.stringify([{ kind: "video", provider: "mux" }]),
    );
    expect(postsChain.range).toHaveBeenCalledWith(...probeRange(SOCIAL_EXPLORE_POSTS_LIMIT));
    expect(page.hits).toHaveLength(SOCIAL_EXPLORE_POSTS_LIMIT);
    expect(page.truncated).toBe(true);
  });
});

describe("loadPeopleSearch", () => {
  it("probes people independently of Explore posts", async () => {
    const people = Array.from({ length: SOCIAL_EXPLORE_PEOPLE_LIMIT + 1 }, (_, i) => ({
      id: `p${i}`,
      handle: `h${i}`,
      display_name: `N${i}`,
    }));
    const peopleChain = feedChain(people);
    const from = vi.fn((table: string) => {
      if (table === "posts") throw new Error("People search must not read posts");
      return peopleChain;
    });
    const page = await loadPeopleSearch({ from } as never, "ada");
    expect(peopleChain.range).toHaveBeenCalledWith(...probeRange(SOCIAL_EXPLORE_PEOPLE_LIMIT));
    expect(page.truncated).toBe(true);
    expect(page.people).toHaveLength(SOCIAL_EXPLORE_PEOPLE_LIMIT);
    expect(page.people[0]).toMatchObject({
      handle: "h0",
      display_name: "N0",
    });
  });

  it("omits the Member sentinel from person identity ranking input", async () => {
    const peopleChain = feedChain([{ id: "p1", handle: "joshua", display_name: "Member" }]);
    const from = vi.fn(() => peopleChain);
    const page = await loadPeopleSearch({ from } as never, "josh");
    expect(page.people[0]).toMatchObject({
      handle: "joshua",
      display_name: "Member",
    });
  });
});

describe("class 5 Social Home access lock", () => {
  it("keeps Home loaders on probe + keyset and off page-N OFFSET", () => {
    const src = readFileSync("src/lib/social-feed.ts", "utf8");
    const followees = src.slice(
      src.indexOf("export async function loadFolloweeIds"),
      src.indexOf("export async function loadIsFollowing"),
    );
    const wall = src.slice(
      src.indexOf("export async function loadFollowingPosts"),
      src.indexOf("export type SocialAuthorPostsPage"),
    );
    const stories = src.slice(
      src.indexOf("export async function loadLiveStories"),
      src.indexOf("export async function loadViewedStoryIds"),
    );
    const explore = src.slice(
      src.indexOf("export async function loadExploreSearch"),
      src.indexOf("export async function loadPeopleSearch"),
    );
    const peopleSearch = src.slice(
      src.indexOf("export async function loadPeopleSearch"),
      src.indexOf("export async function loadSuggestedPeople"),
    );
    expect(followees).toContain("probeRange(SOCIAL_FOLLOWEES_LIMIT)");
    expect(wall).toContain("probeRange(SOCIAL_FOLLOWING_WALL_LIMIT)");
    expect(wall).toContain("followingWallKeysetOrFilter");
    expect(stories).toContain("probeRange(SOCIAL_STORIES_RAIL_LIMIT)");
    expect(explore).toContain("probeRange(SOCIAL_EXPLORE_POSTS_LIMIT)");
    expect(explore).not.toContain("probeRange(SOCIAL_EXPLORE_PEOPLE_LIMIT)");
    expect(explore.match(/exploreVideoPosts\(supabase\)/g)).toHaveLength(4);
    const exploreQuery = src.slice(
      src.indexOf("function exploreVideoPosts"),
      src.indexOf("export async function loadExploreSearch"),
    );
    expect(exploreQuery).toContain('contains("media", EXPLORE_MUX_VIDEO_CONTAINS)');
    expect(peopleSearch).toContain("probeRange(SOCIAL_EXPLORE_PEOPLE_LIMIT)");
    expect(peopleSearch).not.toContain("probeRange(SOCIAL_EXPLORE_POSTS_LIMIT)");
    for (const chunk of [followees, wall, stories, explore, peopleSearch]) {
      expect(chunk).toContain("splitProbe");
      expect(chunk).not.toContain("rangeFor");
      expect(chunk).not.toMatch(/offset/i);
    }
    expect(src).not.toMatch(/get_dm_inbox|fan-out|direct_messages/i);
  });
});

describe("loadVisiblePost + loadPostLikers", () => {
  it("reads one active post and probes likers newest first", async () => {
    const row = post("p1");
    const maybeSingle = vi.fn(async () => ({ data: row, error: null }));
    const statusEq = vi.fn(() => ({ maybeSingle }));
    const idEq = vi.fn(() => ({ eq: statusEq }));
    const postSelect = vi.fn(() => ({ eq: idEq }));
    const range = vi.fn(async () => ({
      data: [{ user_id: "u2" }, { user_id: "u3" }],
      error: null,
    }));
    const orderUser = vi.fn(() => ({ range }));
    const orderCreated = vi.fn(() => ({ order: orderUser }));
    const targetEq = vi.fn(() => ({ order: orderCreated }));
    const typeEq = vi.fn(() => ({ eq: targetEq }));
    const likeSelect = vi.fn(() => ({ eq: typeEq }));
    const from = vi.fn((table: string) =>
      table === "posts" ? { select: postSelect } : { select: likeSelect },
    );
    await expect(loadVisiblePost({ from } as never, "p1")).resolves.toEqual(row);
    const likers = await loadPostLikers({ from } as never, "p1");
    expect(likeSelect).toHaveBeenCalledWith("user_id");
    expect(range).toHaveBeenCalledWith(...probeRange(SOCIAL_LIKERS_PAGE));
    expect(likers).toEqual({ userIds: ["u2", "u3"], truncated: false });
  });
});

