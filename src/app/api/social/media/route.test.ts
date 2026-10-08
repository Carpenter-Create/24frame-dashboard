import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/auth", () => ({ getAuthUser: vi.fn() }));
vi.mock("@/lib/s3-social-media", () => ({ signedSocialMediaUrl: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { getAuthUser } from "@/lib/supabase/auth";
import { signedSocialMediaUrl } from "@/lib/s3-social-media";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { GET } from "./route";

const UID = "11111111-1111-4111-8111-111111111111";
const OTHER = "33333333-3333-4333-8333-333333333333";
const OBJECT = "22222222-2222-4222-8222-222222222222";
const KEY = `posts/${UID}/${OBJECT}.jpg`;
const OWN_STORY = `stories/${UID}/${OBJECT}.mp4`;
const FOREIGN_POST = `posts/${OTHER}/${OBJECT}.jpg`;
const FOREIGN_STORY = `stories/${OTHER}/${OBJECT}.mp4`;
// Wall-clock dates expire this fixture and the live grant becomes a 403.
const LIVE = "2099-01-01T00:00:00.000Z";
const EXPIRED = "2020-01-01T00:00:00.000Z";

function mediaRequest(key: string) {
  return new Request(`http://local/api/social/media?key=${encodeURIComponent(key)}`);
}

function chain(result: { data: unknown; error?: { message: string } | null }) {
  const builder: Record<string, unknown> = {};
  const self = () => builder;
  builder.select = vi.fn(self);
  builder.eq = vi.fn(self);
  builder.gt = vi.fn(self);
  builder.contains = vi.fn(self);
  builder.limit = vi.fn(self);
  builder.maybeSingle = vi.fn(() => Promise.resolve(result));
  builder.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return builder;
}

function mockRows(rows: Record<string, { data: unknown; error?: { message: string } | null }>) {
  vi.mocked(createClient).mockResolvedValue({
    from: vi.fn((table: string) => chain(rows[table] ?? { data: null })),
  } as never);
}

function videoScan(released: boolean) {
  const query = {
    select: () => query,
    eq: () => query,
    in: () => query,
    limit: async () => ({ data: released ? [{ id: "scan-allowed" }] : [], error: null }),
  };
  vi.mocked(createAdminClient).mockReturnValue({ from: () => query } as never);
}

describe("GET /api/social/media", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRows({});
    videoScan(false);
  });

  it("is 401 without a session and does not sign", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null);
    const res = await GET(mediaRequest(KEY));
    expect(res.status).toBe(401);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    expect(signedSocialMediaUrl).not.toHaveBeenCalled();
  });

  it("is 400 for a forbidden key and does not sign", async () => {
    vi.mocked(getAuthUser).mockResolvedValue({ id: UID, email: "ada@example.com" });
    const res = await GET(new Request("http://local/api/social/media?key=avatars/secret"));
    expect(res.status).toBe(400);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    expect(signedSocialMediaUrl).not.toHaveBeenCalled();
  });

  it("is 403 for an owned key with no selectable row and does not sign", async () => {
    vi.mocked(getAuthUser).mockResolvedValue({ id: UID, email: "ada@example.com" });
    const res = await GET(mediaRequest(KEY));
    expect(res.status).toBe(403);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    expect(res.headers.get("Location")).toBeNull();
    expect(signedSocialMediaUrl).not.toHaveBeenCalled();
    expect(createClient).toHaveBeenCalled();
  });

  it("302s a freshly signed GET when an active post the session can read stores the key", async () => {
    vi.mocked(getAuthUser).mockResolvedValue({ id: UID, email: "ada@example.com" });
    vi.mocked(signedSocialMediaUrl).mockResolvedValue("https://media.example/signed");
    mockRows({
      posts: {
        data: [
          {
            author_id: UID,
            status: "active",
            media: [{ kind: "image", key: KEY, contentType: "image/jpeg" }],
          },
        ],
      },
    });
    const res = await GET(mediaRequest(KEY));
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("https://media.example/signed");
    expect(res.headers.get("Cache-Control")).toBe("private, max-age=300");
    expect(signedSocialMediaUrl).toHaveBeenCalledWith(KEY);
  });

  it("302s the caller's own live story and refuses that key once it has expired", async () => {
    vi.mocked(getAuthUser).mockResolvedValue({ id: UID, email: "ada@example.com" });
    vi.mocked(signedSocialMediaUrl).mockResolvedValue("https://media.example/story");
    const ownStory = {
      id: "55555555-5555-4555-8555-555555555555",
      author_id: UID,
      status: "active",
      expires_at: LIVE,
      media: [{ kind: "video", key: OWN_STORY, contentType: "video/mp4" }],
    };
    mockRows({
      follows: { data: null },
      stories: { data: [ownStory] },
    });
    const unscanned = await GET(mediaRequest(OWN_STORY));
    expect(unscanned.status).toBe(403);
    expect(signedSocialMediaUrl).not.toHaveBeenCalled();

    videoScan(true);
    const live = await GET(mediaRequest(OWN_STORY));
    expect(live.status).toBe(302);
    expect(signedSocialMediaUrl).toHaveBeenCalledWith(OWN_STORY);

    vi.mocked(signedSocialMediaUrl).mockClear();
    mockRows({
      follows: { data: null },
      stories: {
        data: [
          {
            author_id: UID,
            status: "active",
            expires_at: EXPIRED,
            media: [{ kind: "video", key: OWN_STORY, contentType: "video/mp4" }],
          },
        ],
      },
    });
    const expired = await GET(mediaRequest(OWN_STORY));
    expect(expired.status).toBe(403);
    expect(expired.headers.get("Cache-Control")).toBe("private, no-store");
    expect(expired.headers.get("Location")).toBeNull();
    expect(signedSocialMediaUrl).not.toHaveBeenCalled();
  });

  it("302s a followed live story and an active post the session can read", async () => {
    vi.mocked(getAuthUser).mockResolvedValue({ id: UID, email: "ada@example.com" });
    vi.mocked(signedSocialMediaUrl).mockResolvedValue("https://media.example/signed");
    mockRows({
      follows: { data: { followee_id: OTHER } },
      stories: {
        data: [
          {
            id: "66666666-6666-4666-8666-666666666666",
            author_id: OTHER,
            status: "active",
            expires_at: LIVE,
            media: [{ kind: "video", key: FOREIGN_STORY, contentType: "video/mp4" }],
          },
        ],
      },
    });
    const held = await GET(mediaRequest(FOREIGN_STORY));
    expect(held.status).toBe(403);
    expect(signedSocialMediaUrl).not.toHaveBeenCalled();

    videoScan(true);
    const story = await GET(mediaRequest(FOREIGN_STORY));
    expect(story.status).toBe(302);
    expect(signedSocialMediaUrl).toHaveBeenCalledWith(FOREIGN_STORY);

    vi.mocked(signedSocialMediaUrl).mockClear();
    mockRows({
      posts: {
        data: [
          {
            author_id: OTHER,
            status: "active",
            media: [{ kind: "image", key: FOREIGN_POST, contentType: "image/jpeg" }],
          },
        ],
      },
      profiles: { data: null },
    });
    const post = await GET(mediaRequest(FOREIGN_POST));
    expect(post.status).toBe(302);
    expect(post.headers.get("Location")).toBe("https://media.example/signed");
    expect(signedSocialMediaUrl).toHaveBeenCalledWith(FOREIGN_POST);
  });

  it("is 403 for a foreign key, an expired story, and a non-follow, and does not sign", async () => {
    vi.mocked(getAuthUser).mockResolvedValue({ id: UID, email: "ada@example.com" });

    const foreign = await GET(mediaRequest(FOREIGN_POST));
    expect(foreign.status).toBe(403);
    expect(foreign.headers.get("Cache-Control")).toBe("private, no-store");
    expect(foreign.headers.get("Location")).toBeNull();

    mockRows({
      follows: { data: { followee_id: OTHER } },
      stories: {
        data: [
          {
            author_id: OTHER,
            status: "active",
            expires_at: EXPIRED,
            media: [{ kind: "video", key: FOREIGN_STORY, contentType: "video/mp4" }],
          },
        ],
      },
    });
    const expired = await GET(mediaRequest(FOREIGN_STORY));
    expect(expired.status).toBe(403);
    expect(expired.headers.get("Location")).toBeNull();

    mockRows({
      follows: { data: null },
      stories: {
        data: [
          {
            author_id: OTHER,
            status: "active",
            expires_at: LIVE,
            media: [{ kind: "video", key: FOREIGN_STORY, contentType: "video/mp4" }],
          },
        ],
      },
    });
    const unfollowed = await GET(mediaRequest(FOREIGN_STORY));
    expect(unfollowed.status).toBe(403);
    expect(unfollowed.headers.get("Location")).toBeNull();
    expect(signedSocialMediaUrl).not.toHaveBeenCalled();
  });

  it("is 404 when the grant allows the key but signing returns nothing", async () => {
    vi.mocked(getAuthUser).mockResolvedValue({ id: UID, email: "ada@example.com" });
    vi.mocked(signedSocialMediaUrl).mockResolvedValue(null);
    mockRows({
      posts: {
        data: [
          {
            author_id: UID,
            status: "active",
            media: [{ kind: "image", key: KEY, contentType: "image/jpeg" }],
          },
        ],
      },
    });
    const res = await GET(mediaRequest(KEY));
    expect(res.status).toBe(404);
    expect(res.headers.get("Location")).toBeNull();
    expect(signedSocialMediaUrl).toHaveBeenCalledWith(KEY);
  });
});
