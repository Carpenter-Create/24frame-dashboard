import { renderServerMarkup } from "@/lib/render-server-markup";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((to: string) => {
    throw new Error(`REDIRECT:${to}`);
  }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  usePathname: () => "/social",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: () => undefined })),
}));
vi.mock("@/lib/supabase/context", () => ({ getOrgContext: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/app/(app)/social/actions", () => ({
  markSocialStoryViewed: vi.fn(async () => undefined),
}));

import { getOrgContext } from "@/lib/supabase/context";
import { createClient } from "@/lib/supabase/server";
import SocialGroupPage from "@/app/(app)/social/groups/[slug]/page";
import SocialPostPage from "@/app/(app)/social/p/[postId]/page";
import { readSocialFollowingWall } from "@/app/(app)/social/query-actions";
import SocialStoryPage from "@/app/(app)/social/stories/[id]/page";

const USER = "11111111-1111-4111-8111-111111111111";
const PLAYBACK = "playHELD0001";

function chain(rows: unknown[]) {
  const c: Record<string, unknown> = {};
  const self = () => c;
  for (const method of [
    "select",
    "eq",
    "in",
    "is",
    "gt",
    "gte",
    "lt",
    "lte",
    "or",
    "ilike",
    "order",
    "contains",
    "neq",
    "not",
    "filter",
    "match",
    "limit",
    "range",
    "insert",
    "update",
    "upsert",
    "delete",
  ]) {
    c[method] = vi.fn(self);
  }
  c.maybeSingle = vi.fn(async () => ({ data: rows[0] ?? null, error: null }));
  c.single = c.maybeSingle;
  c.then = (resolve: (value: unknown) => unknown) =>
    Promise.resolve({ data: rows, error: null, count: rows.length }).then(resolve);
  return c;
}

function stub() {
  const profile = {
    id: USER,
    handle: "ada",
    display_name: "Ada Lovelace",
    status: "active",
    bio: null,
    topics: [],
    crafts: [],
    avatar_key: null,
    welcome_video_key: null,
    welcome_mux_asset_id: null,
    welcome_mux_playback_id: null,
    cover_key: null,
  };
  const post = {
    id: "post-1",
    author_id: USER,
    body: "Held",
    group_id: null,
    like_count: 0,
    comment_count: 0,
    created_at: "2026-10-01T00:00:00.000Z",
    status: "active",
    category: null,
    media: [{ kind: "video", provider: "mux", playbackId: PLAYBACK, assetId: "assetHELD0001" }],
  };
  const story = {
    id: "story-1",
    author_id: USER,
    body: null,
    media: [{ kind: "video", provider: "mux", playbackId: PLAYBACK, assetId: "assetHELD0001" }],
    expires_at: "2099-01-01T00:00:00.000Z",
    created_at: "2026-10-01T00:00:00.000Z",
    status: "active",
  };
  const group = {
    id: "22222222-2222-4222-8222-222222222222",
    slug: "desk",
    name: "Desk",
    description: null,
    visibility: "public",
    member_count: 1,
  };
  const from = vi.fn((table: string) => {
    if (table === "profiles") return chain([profile]);
    if (table === "posts") return chain([post]);
    if (table === "stories") return chain([story]);
    if (table === "groups") return chain([group]);
    if (table === "social_music_scans") {
      return chain([{ post_id: "post-1", story_id: "story-1", status: "pending" }]);
    }
    return chain([]);
  });
  const rpc = vi.fn(async (name: string) =>
    name === "social_music_author_notices"
      ? { data: null, error: { message: "still down" } }
      : { data: [], error: null },
  );
  vi.mocked(createClient).mockResolvedValue({ from, rpc } as never);
}

describe("music notice rpc failure still renders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stub();
    vi.mocked(getOrgContext).mockResolvedValue({
      user: { id: USER, email: "ada@example.com", name: "Ada" },
      rows: [],
      orgs: [],
      activeOrg: null,
      activeRole: null,
      canOperate: false,
      isGcStaff: false,
      unread: Promise.resolve(0),
    } as never);
  });

  it("renders a group wall", async () => {
    const html = await renderServerMarkup(
      await SocialGroupPage({ params: Promise.resolve({ slug: "desk" }) }),
    );
    expect(html).toContain("data-social-group");
    expect(html).not.toContain(PLAYBACK);
  });

  it("renders a post", async () => {
    const html = await renderServerMarkup(
      await SocialPostPage({ params: Promise.resolve({ postId: "post-1" }) }),
    );
    expect(html).toContain("data-social-post-detail");
    expect(html).not.toContain(PLAYBACK);
  });

  it("renders a story", async () => {
    const html = await renderServerMarkup(
      await SocialStoryPage({ params: Promise.resolve({ id: "story-1" }) }),
    );
    expect(html).toContain("data-social-story");
    expect(html).not.toContain(PLAYBACK);
  });

  it("renders the following wall", async () => {
    const wall = await readSocialFollowingWall({});
    expect(wall).not.toBeNull();
    expect(wall?.cards.every((card) => !JSON.stringify(card.media).includes(PLAYBACK))).toBe(true);
  });
});
