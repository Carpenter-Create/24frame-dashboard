import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  socialMediaJsonContains,
  socialMediaReadGrant,
  socialMuxPlaybackJsonContains,
  socialProfileCoverReadGrant,
  socialMuxPlaybackReadGrant,
  viewerMayMintSocialMuxPlayback,
  viewerMaySignSocialMedia,
} from "@/lib/social-media-access";
import { SOCIAL_MUX_PROVIDER } from "@/lib/social-mux";

const USER = "11111111-1111-4111-8111-111111111111";
const OTHER = "33333333-3333-4333-8333-333333333333";
const OBJECT = "22222222-2222-4222-8222-222222222222";
const STORY_KEY = `stories/${OTHER}/${OBJECT}.mp4`;
const POST_KEY = `posts/${OTHER}/${OBJECT}.jpg`;
const OWN_POST = `posts/${USER}/${OBJECT}.jpg`;
const NOW = new Date("2026-09-24T00:00:00.000Z");
const LIVE = "2099-01-01T00:00:00.000Z";
const EXPIRED = "2026-09-23T00:00:00.000Z";

function storyMedia(key = STORY_KEY) {
  return [{ kind: "video", key, contentType: "video/mp4" }];
}

function postMedia(key = POST_KEY) {
  return [{ kind: "image", key, contentType: "image/jpeg" }];
}

function chain(result: { data: unknown; error?: { message: string } | null }) {
  const builder: Record<string, unknown> = {};
  const self = () => builder;
  builder.select = vi.fn(self);
  builder.eq = vi.fn(self);
  builder.gt = vi.fn(self);
  builder.contains = vi.fn(self);
  builder.in = vi.fn(self);
  builder.limit = vi.fn(self);
  builder.maybeSingle = vi.fn(() => Promise.resolve(result));
  builder.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return builder;
}

describe("socialMediaReadGrant", () => {
  it("denies a key that is not attached to a selectable row", () => {
    expect(socialMediaReadGrant({ userId: USER, key: OWN_POST, now: NOW })).toBe(false);
    expect(socialMediaReadGrant({ userId: USER, key: `stories/${USER}/${OBJECT}.mp4`, now: NOW })).toBe(false);
    expect(socialMediaReadGrant({ userId: USER, key: POST_KEY, now: NOW, posts: [] })).toBe(false);
    expect(socialMediaReadGrant({ userId: USER, key: "avatars/secret", now: NOW })).toBe(false);
    expect(socialMediaReadGrant({ userId: "", key: STORY_KEY, now: NOW })).toBe(false);
  });

  it("allows a live story the caller follows when the key is on that story", () => {
    expect(
      socialMediaReadGrant({
        userId: USER,
        key: STORY_KEY,
        now: NOW,
        followeeIds: [OTHER],
        stories: [{ author_id: OTHER, status: "active", expires_at: LIVE, media: storyMedia() }],
      }),
    ).toBe(true);
  });

  it("allows the author's own live story without a follow row", () => {
    const own = `stories/${USER}/${OBJECT}.mp4`;
    expect(
      socialMediaReadGrant({
        userId: USER,
        key: own,
        now: NOW,
        followeeIds: [],
        stories: [{ author_id: USER, status: "active", expires_at: LIVE, media: storyMedia(own) }],
      }),
    ).toBe(true);
  });

  it("fails closed for expired, unfollowed, inactive, or mismatched story keys", () => {
    const base = {
      userId: USER,
      key: STORY_KEY,
      now: NOW,
      followeeIds: [OTHER],
    };
    expect(
      socialMediaReadGrant({
        ...base,
        stories: [{ author_id: OTHER, status: "active", expires_at: EXPIRED, media: storyMedia() }],
      }),
    ).toBe(false);
    expect(
      socialMediaReadGrant({
        ...base,
        followeeIds: [],
        stories: [{ author_id: OTHER, status: "active", expires_at: LIVE, media: storyMedia() }],
      }),
    ).toBe(false);
    expect(
      socialMediaReadGrant({
        ...base,
        stories: [{ author_id: OTHER, status: "removed", expires_at: LIVE, media: storyMedia() }],
      }),
    ).toBe(false);
    expect(
      socialMediaReadGrant({
        ...base,
        stories: [
          {
            author_id: OTHER,
            status: "active",
            expires_at: LIVE,
            media: storyMedia(`stories/${OTHER}/44444444-4444-4444-8444-444444444444.mp4`),
          },
        ],
      }),
    ).toBe(false);
    const own = `stories/${USER}/${OBJECT}.mp4`;
    expect(
      socialMediaReadGrant({
        userId: USER,
        key: own,
        now: NOW,
        stories: [{ author_id: USER, status: "active", expires_at: EXPIRED, media: storyMedia(own) }],
      }),
    ).toBe(false);
  });

  it("allows an active post the session can read and denies a post that is not active", () => {
    expect(
      socialMediaReadGrant({
        userId: USER,
        key: POST_KEY,
        now: NOW,
        posts: [{ author_id: OTHER, status: "active", media: postMedia() }],
      }),
    ).toBe(true);
    expect(
      socialMediaReadGrant({
        userId: USER,
        key: OWN_POST,
        now: NOW,
        posts: [{ author_id: USER, status: "active", media: postMedia(OWN_POST) }],
      }),
    ).toBe(true);
    expect(
      socialMediaReadGrant({
        userId: USER,
        key: POST_KEY,
        now: NOW,
        posts: [{ author_id: OTHER, status: "removed", media: postMedia() }],
      }),
    ).toBe(false);
    expect(
      socialMediaReadGrant({
        userId: USER,
        key: POST_KEY,
        now: NOW,
        posts: [{ author_id: OTHER, status: "hidden", media: postMedia() }],
      }),
    ).toBe(false);
  });
});

describe("socialMediaJsonContains", () => {
  it("is a JSON string so postgrest-js contains does not emit [object Object]", () => {
    const value = socialMediaJsonContains(POST_KEY);
    const asPostgrest = (raw: unknown) => {
      if (typeof raw === "string") return `cs.${raw}`;
      if (Array.isArray(raw)) return `cs.{${raw.join(",")}}`;
      return `cs.${JSON.stringify(raw)}`;
    };
    expect(typeof value).toBe("string");
    expect(asPostgrest(value)).toBe(`cs.${JSON.stringify([{ key: POST_KEY }])}`);
    expect(asPostgrest(value)).not.toContain("[object Object]");
    expect(asPostgrest([{ key: POST_KEY }])).toContain("[object Object]");
  });
});

describe("viewerMaySignSocialMedia", () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReset();
    vi.mocked(createAdminClient).mockReset();
    vi.mocked(createAdminClient).mockReturnValue({
      from: () => {
        const query = {
          select: () => query,
          eq: () => query,
          in: () => query,
          limit: async () => ({ data: [], error: { code: "42P01", message: "relation does not exist" } }),
        };
        return query;
      },
    } as never);
  });

  it("denies an owned key when no selectable row stores it", async () => {
    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn(() => chain({ data: [] })),
    } as never);
    await expect(viewerMaySignSocialMedia(USER, OWN_POST, NOW)).resolves.toBe(false);
    expect(createClient).toHaveBeenCalledTimes(1);
  });

  it("requires a live story row for the author's own story key", async () => {
    const own = `stories/${USER}/${OBJECT}.mp4`;
    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === "follows") return chain({ data: null });
        return chain({ data: [] });
      }),
    } as never);
    await expect(viewerMaySignSocialMedia(USER, own, NOW)).resolves.toBe(false);

    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === "follows") return chain({ data: null });
        return chain({
          data: [{ author_id: USER, status: "active", expires_at: EXPIRED, media: storyMedia(own) }],
        });
      }),
    } as never);
    await expect(viewerMaySignSocialMedia(USER, own, NOW)).resolves.toBe(false);

    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === "follows") return chain({ data: null });
        return chain({
          data: [{ id: "own-story", author_id: USER, status: "active", expires_at: LIVE, media: storyMedia(own) }],
        });
      }),
    } as never);
    await expect(viewerMaySignSocialMedia(USER, own, NOW)).resolves.toBe(false);

    vi.mocked(createAdminClient).mockReturnValue(allowedScan() as never);
    await expect(viewerMaySignSocialMedia(USER, own, NOW)).resolves.toBe(true);
  });

  it("signs a followed live story and refuses when the queries fail or return nothing", async () => {
    const stories = chain({
      data: [{ id: "followed-story", author_id: OTHER, status: "active", expires_at: LIVE, media: storyMedia() }],
    });
    const from = vi.fn((table: string) => {
      if (table === "follows") return chain({ data: { followee_id: OTHER } });
      if (table === "stories") return stories;
      return chain({ data: [] });
    });
    vi.mocked(createClient).mockResolvedValue({ from } as never);
    await expect(viewerMaySignSocialMedia(USER, STORY_KEY, NOW)).resolves.toBe(false);
    vi.mocked(createAdminClient).mockReturnValue(allowedScan() as never);
    await expect(viewerMaySignSocialMedia(USER, STORY_KEY, NOW)).resolves.toBe(true);
    expect(stories.contains).toHaveBeenCalledWith("media", JSON.stringify([{ key: STORY_KEY }]));

    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === "follows") return chain({ data: null, error: { message: "denied" } });
        return chain({ data: [] });
      }),
    } as never);
    await expect(viewerMaySignSocialMedia(USER, STORY_KEY, NOW)).resolves.toBe(false);

    vi.mocked(createClient).mockRejectedValue(new Error("no session"));
    await expect(viewerMaySignSocialMedia(USER, STORY_KEY, NOW)).resolves.toBe(false);
  });

  it("refuses an expired story and a story the caller does not follow", async () => {
    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === "follows") return chain({ data: { followee_id: OTHER } });
        return chain({
          data: [{ author_id: OTHER, status: "active", expires_at: EXPIRED, media: storyMedia() }],
        });
      }),
    } as never);
    await expect(viewerMaySignSocialMedia(USER, STORY_KEY, NOW)).resolves.toBe(false);

    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === "follows") return chain({ data: null });
        return chain({
          data: [{ author_id: OTHER, status: "active", expires_at: LIVE, media: storyMedia() }],
        });
      }),
    } as never);
    await expect(viewerMaySignSocialMedia(USER, STORY_KEY, NOW)).resolves.toBe(false);
  });

  it("signs an active post the session can read and refuses a random key", async () => {
    const posts = chain({
      data: [{ author_id: OTHER, status: "active", media: postMedia() }],
    });
    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn(() => posts),
    } as never);
    await expect(viewerMaySignSocialMedia(USER, POST_KEY, NOW)).resolves.toBe(true);
    expect(posts.contains).toHaveBeenCalledWith("media", JSON.stringify([{ key: POST_KEY }]));

    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn(() => chain({ data: [] })),
    } as never);
    await expect(viewerMaySignSocialMedia(USER, POST_KEY, NOW)).resolves.toBe(false);
    await expect(viewerMaySignSocialMedia(USER, "not-a-media-key", NOW)).resolves.toBe(false);
    expect(createClient).toHaveBeenCalledTimes(2);
  });

  it("signs a profile's current cover the session can select, through profiles_select", async () => {
    const posts = chain({ data: [] });
    const profiles = chain({ data: { id: OTHER, cover_key: POST_KEY } });
    const from = vi.fn((table: string) => (table === "posts" ? posts : profiles));
    vi.mocked(createClient).mockResolvedValue({ from } as never);
    await expect(viewerMaySignSocialMedia(USER, POST_KEY, NOW)).resolves.toBe(true);
    expect(from).toHaveBeenCalledWith("profiles");
    expect(profiles.select).toHaveBeenCalledWith("id, cover_key");
    expect(profiles.eq).toHaveBeenCalledWith("id", OTHER);
    expect(profiles.eq).toHaveBeenCalledWith("cover_key", POST_KEY);

    // RLS hides the profile, or the cover was replaced: no row comes back.
    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn((table: string) => (table === "posts" ? chain({ data: [] }) : chain({ data: null }))),
    } as never);
    await expect(viewerMaySignSocialMedia(USER, POST_KEY, NOW)).resolves.toBe(false);

    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn((table: string) =>
        // A failed read never grants, whatever data came back with it.
        table === "posts"
          ? chain({ data: [] })
          : chain({ data: { id: OTHER, cover_key: POST_KEY }, error: { message: "denied" } }),
      ),
    } as never);
    await expect(viewerMaySignSocialMedia(USER, POST_KEY, NOW)).resolves.toBe(false);
  });

  it("does not sign the author's own post video without an allowed scan", async () => {
    const ownVideo = `posts/${USER}/${OBJECT}.mp4`;
    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn(() =>
        chain({
          data: [
            {
              id: "own-post",
              author_id: USER,
              status: "active",
              media: [{ kind: "video", key: ownVideo, contentType: "video/mp4" }],
            },
          ],
        }),
      ),
    } as never);
    await expect(viewerMaySignSocialMedia(USER, ownVideo, NOW)).resolves.toBe(false);
    vi.mocked(createAdminClient).mockReturnValue(allowedScan() as never);
    await expect(viewerMaySignSocialMedia(USER, ownVideo, NOW)).resolves.toBe(true);
  });

  it("does not read profiles when post media already grants the key", async () => {
    const from = vi.fn(() => chain({ data: [{ author_id: OTHER, status: "active", media: postMedia() }] }));
    vi.mocked(createClient).mockResolvedValue({ from } as never);
    await expect(viewerMaySignSocialMedia(USER, POST_KEY, NOW)).resolves.toBe(true);
    expect(from).not.toHaveBeenCalledWith("profiles");
  });
});

describe("socialProfileCoverReadGrant", () => {
  const cover = { id: OTHER, cover_key: POST_KEY };

  it("grants only the profile's current cover image in its own posts lane", () => {
    expect(socialProfileCoverReadGrant({ userId: USER, key: POST_KEY, profile: cover })).toBe(true);
    // Replaced cover, no profile row, no session.
    expect(
      socialProfileCoverReadGrant({ userId: USER, key: POST_KEY, profile: { id: OTHER, cover_key: OWN_POST } }),
    ).toBe(false);
    expect(socialProfileCoverReadGrant({ userId: USER, key: POST_KEY, profile: null })).toBe(false);
    expect(socialProfileCoverReadGrant({ userId: "", key: POST_KEY, profile: cover })).toBe(false);
    // Someone else's key stored as this profile's cover.
    expect(socialProfileCoverReadGrant({ userId: USER, key: POST_KEY, profile: { id: USER, cover_key: POST_KEY } })).toBe(
      false,
    );
    // Not an image, or not the posts lane.
    const video = `posts/${OTHER}/${OBJECT}.mp4`;
    expect(socialProfileCoverReadGrant({ userId: USER, key: video, profile: { id: OTHER, cover_key: video } })).toBe(false);
    const story = `stories/${OTHER}/${OBJECT}.jpg`;
    expect(socialProfileCoverReadGrant({ userId: USER, key: story, profile: { id: OTHER, cover_key: story } })).toBe(false);
    const upload = `posts/upload/${OTHER}/${OBJECT}.jpg`;
    expect(socialProfileCoverReadGrant({ userId: USER, key: upload, profile: { id: OTHER, cover_key: upload } })).toBe(
      false,
    );
  });
});

const PLAYBACK = "uNbxnGLKJ00yfbijDO8COxT";

function muxMedia(authorId: string, lane: "stories" | "posts") {
  return [
    {
      kind: "video" as const,
      key: `${lane}/${authorId}/${OBJECT}.mp4`,
      contentType: "video/mp4" as const,
      provider: SOCIAL_MUX_PROVIDER,
      playbackId: PLAYBACK,
      playbackPolicy: "signed" as const,
    },
  ];
}

describe("socialMuxPlaybackReadGrant", () => {
  it("denies a playback id that is not on a visible post or story", () => {
    expect(socialMuxPlaybackReadGrant({ userId: USER, playbackId: PLAYBACK, now: NOW })).toBe(false);
    expect(socialMuxPlaybackReadGrant({ userId: "", playbackId: PLAYBACK, now: NOW })).toBe(false);
    expect(socialMuxPlaybackReadGrant({ userId: USER, playbackId: "short", now: NOW })).toBe(false);
    expect(
      socialMuxPlaybackReadGrant({
        userId: USER,
        playbackId: PLAYBACK,
        now: NOW,
        posts: [{ author_id: OTHER, status: "active", media: postMedia() }],
      }),
    ).toBe(false);
    expect(
      socialMuxPlaybackReadGrant({
        userId: USER,
        playbackId: PLAYBACK,
        now: NOW,
        posts: [{ author_id: OTHER, status: "active", media: muxMedia(USER, "posts") }],
      }),
    ).toBe(false);
  });

  it("allows the author's own live story and a followed live story", () => {
    expect(
      socialMuxPlaybackReadGrant({
        userId: USER,
        playbackId: PLAYBACK,
        now: NOW,
        stories: [{ author_id: USER, status: "active", expires_at: LIVE, media: muxMedia(USER, "stories") }],
      }),
    ).toBe(true);
    expect(
      socialMuxPlaybackReadGrant({
        userId: USER,
        playbackId: PLAYBACK,
        now: NOW,
        followeeIds: [OTHER],
        stories: [{ author_id: OTHER, status: "active", expires_at: LIVE, media: muxMedia(OTHER, "stories") }],
      }),
    ).toBe(true);
  });

  it("fails closed for an unfollowed, expired, or inactive story", () => {
    const story = { author_id: OTHER, status: "active" as const, expires_at: LIVE, media: muxMedia(OTHER, "stories") };
    expect(
      socialMuxPlaybackReadGrant({ userId: USER, playbackId: PLAYBACK, now: NOW, stories: [story] }),
    ).toBe(false);
    expect(
      socialMuxPlaybackReadGrant({
        userId: USER,
        playbackId: PLAYBACK,
        now: NOW,
        followeeIds: [OTHER],
        stories: [{ ...story, expires_at: EXPIRED }],
      }),
    ).toBe(false);
    expect(
      socialMuxPlaybackReadGrant({
        userId: USER,
        playbackId: PLAYBACK,
        now: NOW,
        followeeIds: [OTHER],
        stories: [{ ...story, status: "removed" }],
      }),
    ).toBe(false);
  });

  it("allows an active post the session can read", () => {
    expect(
      socialMuxPlaybackReadGrant({
        userId: USER,
        playbackId: PLAYBACK,
        now: NOW,
        posts: [{ author_id: OTHER, status: "active", media: muxMedia(OTHER, "posts") }],
      }),
    ).toBe(true);
  });
});

function allowedScan() {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    in: vi.fn(() => query),
    limit: vi.fn(async () => ({ data: [{ id: "scan-allowed" }], error: null })),
  };
  return { from: vi.fn(() => query) };
}

const STORY_ID = "44444444-4444-4444-8444-444444444444";

function scansQuery(result: { data: unknown; error: { code?: string; message?: string } | null }) {
  const filters: Record<string, string> = {};
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn((column: string, value: string) => {
      filters[column] = value;
      return query;
    }),
    in: vi.fn(() => query),
    limit: vi.fn(async () => {
      if (result.error) return result;
      if (filters.status === "blocked") {
        const blocked = Array.isArray(result.data)
          ? result.data.filter((row) => (row as { status?: string }).status === "blocked")
          : [];
        return { data: blocked, error: null };
      }
      if (filters.status === "allowed" && filters.story_id === STORY_ID) {
        const allowed =
          Array.isArray(result.data) &&
          result.data.some((row) => (row as { status?: string }).status === "allowed");
        return {
          data: allowed
            ? [{ id: "ok", playback_id: PLAYBACK, status: "allowed", post_id: null, story_id: STORY_ID }]
            : [],
          error: null,
        };
      }
      return { data: [], error: null };
    }),
  };
  return query;
}

describe("viewerMayMintSocialMuxPlayback", () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReset();
    vi.mocked(createAdminClient).mockReset();
    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn(() => scansQuery({ data: [], error: { code: "42P01", message: "relation does not exist" } })),
    } as never);
  });

  it("mints only when a selectable row stores the playback id", async () => {
    const posts = chain({ data: [] });
    const stories = chain({
      data: [{ author_id: OTHER, status: "active", expires_at: LIVE, media: muxMedia(OTHER, "stories") }],
    });
    const follows = chain({ data: [{ followee_id: OTHER }] });
    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === "posts") return posts;
        if (table === "stories") return stories;
        return follows;
      }),
    } as never);
    await expect(viewerMayMintSocialMuxPlayback(USER, PLAYBACK, NOW)).resolves.toBe(false);
    expect(stories.contains).toHaveBeenCalledWith("media", socialMuxPlaybackJsonContains(PLAYBACK));
    expect(posts.contains).toHaveBeenCalledWith("media", socialMuxPlaybackJsonContains(PLAYBACK));

    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === "posts") return chain({ data: [], error: { message: "denied" } });
        return chain({ data: [] });
      }),
    } as never);
    await expect(viewerMayMintSocialMuxPlayback(USER, PLAYBACK, NOW)).resolves.toBe(false);
    await expect(viewerMayMintSocialMuxPlayback(USER, "short", NOW)).resolves.toBe(false);
  });

  it("refuses someone else's playback until that story has an allowed music scan", async () => {
    const stories = chain({
      data: [{ id: STORY_ID, author_id: OTHER, status: "active", expires_at: LIVE, media: muxMedia(OTHER, "stories") }],
    });
    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === "posts") return chain({ data: [] });
        if (table === "stories") return stories;
        return chain({ data: [{ followee_id: OTHER }] });
      }),
    } as never);
    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn(() => scansQuery({ data: [], error: null })),
    } as never);
    await expect(viewerMayMintSocialMuxPlayback(USER, PLAYBACK, NOW)).resolves.toBe(false);

    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn(() =>
        scansQuery({ data: [{ playback_id: PLAYBACK, status: "blocked" }], error: null }),
      ),
    } as never);
    await expect(viewerMayMintSocialMuxPlayback(USER, PLAYBACK, NOW)).resolves.toBe(false);

    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn(() =>
        scansQuery({ data: [{ playback_id: PLAYBACK, status: "allowed" }], error: null }),
      ),
    } as never);
    await expect(viewerMayMintSocialMuxPlayback(USER, PLAYBACK, NOW)).resolves.toBe(true);

    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn(() =>
        scansQuery({
          data: [
            { playback_id: PLAYBACK, status: "allowed" },
            { playback_id: PLAYBACK, status: "blocked" },
          ],
          error: null,
        }),
      ),
    } as never);
    await expect(viewerMayMintSocialMuxPlayback(USER, PLAYBACK, NOW)).resolves.toBe(false);
  });

  it("never queries messages while deciding a mux playback grant", async () => {
    const tables: string[] = [];
    const from = vi.fn((table: string) => {
      tables.push(table);
      if (table === "posts") return chain({ data: [] });
      if (table === "stories") {
        return chain({
          data: [{ id: STORY_ID, author_id: OTHER, status: "active", expires_at: LIVE, media: muxMedia(OTHER, "stories") }],
        });
      }
      if (table === "follows") return chain({ data: [{ followee_id: OTHER }] });
      return chain({ data: [{ id: "not-a-grant" }] });
    });
    vi.mocked(createClient).mockResolvedValue({ from } as never);
    await expect(viewerMayMintSocialMuxPlayback(USER, PLAYBACK, NOW)).resolves.toBe(false);
    expect(tables).toEqual(["posts", "stories", "follows"]);
    expect(tables).not.toContain("messages");

    tables.length = 0;
    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn((table: string) => {
        tables.push(table);
        return chain({ data: [] });
      }),
    } as never);
    await expect(viewerMayMintSocialMuxPlayback(USER, PLAYBACK, NOW)).resolves.toBe(false);
    expect(tables).not.toContain("messages");

    const grant = readFileSync("src/lib/social-media-access.ts", "utf8");
    const mint = grant.slice(grant.indexOf("export async function viewerMayMintSocialMuxPlayback"));
    const route = readFileSync("src/app/api/social/mux-playback/route.ts", "utf8");
    expect(mint).not.toContain("messages");
    expect(route).not.toContain("messages");
  });
});
