import { existsSync, readFileSync } from "node:fs";
import { createElement } from "react";
import { renderServerMarkup } from "@/lib/render-server-markup";
import { beforeEach, describe, expect, it, vi } from "vitest";

// #712 loads post media through next/dynamic so Home stays off the Mux
// graph. renderToStaticMarkup does not wait for that chunk, so this
// page test resolves the media face the same way social-ui.test does.
const dynamicRegistry = vi.hoisted(() => ({
  resolve: (source: string): ((props: Record<string, unknown>) => unknown) | null =>
    source ? null : null,
}));

vi.mock("next/dynamic", () => ({
  default: (loader: () => Promise<unknown>) => {
    const source = loader.toString();
    return function SocialDynamic(props: Record<string, unknown>) {
      const Comp = dynamicRegistry.resolve(source);
      if (!Comp) return null;
      return createElement(Comp as never, props);
    };
  },
}));

import { getOrgContext } from "@/lib/supabase/context";
import { createClient } from "@/lib/supabase/server";
import { signedAvatarUrls, signedSocialMediaByPostId } from "@/lib/social-edge";
import { ASK_GLOBEE } from "@/lib/ask-globee";
import { SOCIAL, SOCIAL_ROUTES } from "@/lib/social";
import {
  SOCIAL_FOLLOWEES_LIMIT,
  SOCIAL_FOLLOWING_WALL_LIMIT,
  SOCIAL_STORIES_RAIL_LIMIT,
  encodeFollowingWallCursor,
} from "@/lib/social-home-bounds";
import { ensureOwnSocialProfile } from "@/lib/social-profile";
import { SocialPostMedia } from "@/components/social/social-post-media";
import SocialHomePage from "./page";

dynamicRegistry.resolve = (source) =>
  source.includes("social-post-media") ? (SocialPostMedia as never) : null;

vi.mock("next/navigation", () => ({
  redirect: vi.fn((to: string) => {
    throw new Error(`REDIRECT:${to}`);
  }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
}));
vi.mock("@/lib/supabase/context", () => ({ getOrgContext: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/social-edge", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/social-edge")>();
  return {
    ...actual,
    signedAvatarUrls: vi.fn(() => new Map()),
    signedSocialMediaByPostId: vi.fn(() => new Map()),
  };
});
vi.mock("@/lib/s3-education", () => ({
  signedEducationCoverUrls: vi.fn().mockResolvedValue(new Map()),
}));
vi.mock("@/lib/social-profile", () => ({
  ensureOwnSocialProfile: vi.fn(),
}));
vi.mock("@/app/(app)/social/actions", () => ({
  createSocialProfile: vi.fn(),
  createSocialPost: vi.fn(),
  presignSocialMediaUpload: vi.fn(),
  toggleSocialLike: vi.fn(),
  createSocialGroup: vi.fn(),
  joinSocialGroup: vi.fn(),
  openSocialDm: vi.fn(),
  sendSocialDm: vi.fn(),
  addSocialDmPeople: vi.fn(),
  setSocialDmTitle: vi.fn(),
  markSocialDmRead: vi.fn(),
}));

function ctx({ hasOrg = false }: { hasOrg?: boolean } = {}) {
  const org = hasOrg ? { id: "org-1", name: "Acme", status: "active" } : null;
  return {
    user: { id: "u1", email: "ada@example.com" },
    rows: org ? [{ role: "account_owner", organizations: org }] : [],
    orgs: org ? [{ id: org.id, name: org.name }] : [],
    activeOrg: org,
    activeRole: org ? "account_owner" : null,
    canOperate: !!org,
    isGcStaff: false,
    unread: Promise.resolve(0),
  };
}

function chain(result: unknown) {
  const c: Record<string, unknown> = {};
  const self = () => c;
  c.select = vi.fn(self);
  c.eq = vi.fn(self);
  c.in = vi.fn(self);
  c.is = vi.fn(self);
  c.gt = vi.fn(self);
  c.or = vi.fn(self);
  c.ilike = vi.fn(self);
  c.order = vi.fn(self);
  c.range = vi.fn(async () => ({ data: result, error: null }));
  c.maybeSingle = vi.fn(async () => ({
    data: Array.isArray(result) ? (result[0] ?? null) : result,
    error: null,
  }));
  c.then = (resolve: (value: unknown) => unknown) =>
    Promise.resolve({ data: result, error: null }).then(resolve);
  return c;
}

async function renderHome(query: Record<string, string> = {}) {
  return renderServerMarkup(
    await SocialHomePage({
      searchParams: Promise.resolve(query),
    }),
  );
}

function stubClient({
  profile = null,
  posts = [],
  follows = [],
  stories = [],
  courses = [],
}: {
  profile?: { id: string; handle: string; display_name: string; status: string; bio?: string | null } | null;
  courses?: {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    cover_key: string | null;
    is_flagship_free: boolean;
    price_cents: number | null;
    catalog_code: string;
    status: string;
    position: number;
    instructor_id: string | null;
    created_at: string;
  }[];
  posts?: {
    id: string;
    body: string;
    author_id: string;
    group_id: string | null;
    like_count: number;
    created_at: string;
    media?: unknown;
    category?: string | null;
  }[];
  follows?: { followee_id: string }[];
  stories?: {
    id: string;
    author_id: string;
    body: string | null;
    media: unknown;
    expires_at: string;
    created_at: string;
  }[];
} = {}) {
  const from = vi.fn((table: string) => {
    if (table === "profiles") return chain(profile ? [profile] : []);
    if (table === "posts") return chain(posts);
    if (table === "groups") return chain([]);
    if (table === "likes") return chain([]);
    if (table === "follows") return chain(follows);
    if (table === "stories") return chain(stories);
    if (table === "story_views") return chain([]);
    if (table === "courses") return chain(courses);
    throw new Error(`unexpected from(${table})`);
  });
  const rpc = vi.fn().mockResolvedValue({ data: [], error: null });
  vi.mocked(createClient).mockResolvedValue({ from, rpc } as never);
  return { from, rpc };
}

const ensured = {
  id: "u1",
  handle: "ada",
  display_name: "Ada Lovelace",
  status: "active",
  bio: null,
};

describe("Social home", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(signedAvatarUrls).mockReturnValue(new Map());
    vi.mocked(signedSocialMediaByPostId).mockReturnValue(new Map());
    vi.mocked(ensureOwnSocialProfile).mockResolvedValue(ensured);
  });

  it("renders for a signed-in user without an org", async () => {
    stubClient({ profile: ensured });
    vi.mocked(getOrgContext).mockResolvedValue(ctx({ hasOrg: false }) as never);

    const html = await renderHome();
    expect(html).toContain("data-social-home");
    expect(html).toContain(SOCIAL.home.title);
    expect(html).toContain(SOCIAL.home.subtitle);
    expect(html).not.toContain("Posts from people you follow");
    expect(html).toContain("data-social-home-composer");
    expect(html).toContain('data-social-home-stack="lock_topics_composer_stories_wall"');
    const stackClass = html.match(/data-social-home-stack="lock_topics_composer_stories_wall"[^>]*class="([^"]+)"/)?.[1]
      ?? html.match(/class="([^"]+)"[^>]*data-social-home-stack="lock_topics_composer_stories_wall"/)?.[1];
    expect(stackClass).toContain("gap-[var(--space-2)]");
    expect(stackClass).not.toContain("gap-[var(--space-4)]");
    expect(stackClass).toContain("lg:max-w-[470px]");
    expect(stackClass).not.toContain("lg:max-w-[720px]");
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).not.toContain("/social/create?kind=text");
    expect(html).toContain("data-social-composer-write");
    expect(html).not.toContain('data-social-create-sheet="composer"');
    expect(html).toContain(SOCIAL.create.title);
    expect(html).not.toContain("data-social-composer-action");
    expect(html).not.toContain("data-social-home-topics-composer-divider");
    expect(html.indexOf("data-social-home-topics")).toBeLessThan(html.indexOf("data-social-home-composer"));
    expect(html).toContain("border-y");
    expect(html).toContain("border-x-0");
    expect(html).toContain("py-[var(--space-2)]");
    expect(html.indexOf("data-social-home-composer")).toBeLessThan(html.indexOf("data-social-stories"));
    expect(html.indexOf("data-social-home-topics")).toBeLessThan(html.indexOf("data-social-stories"));
    expect(html.indexOf('data-social-home-lane="following"')).toBeLessThan(
      html.indexOf('data-social-home-lane="for-you"'),
    );
    expect(html.indexOf('data-social-home-lane="for-you"')).toBeLessThan(
      html.indexOf('data-social-home-topic="All"'),
    );
    expect(html).not.toMatch(/>Topics</);
    expect(html).toContain("Share something");
    expect(html).not.toContain("Write something");
    expect(html).not.toContain("What's on your mind");
    expect(html).not.toContain("Topics for you");
    expect(html).not.toContain("data-social-for-you-topics");
    expect(html).toContain("data-social-stories-tall");
    expect(html).not.toContain("data-social-home-tabs");
    expect(html).toContain('data-social-home-lane="following"');
    expect(html).toContain('data-social-home-lane="for-you"');
    expect(html).toMatch(/data-social-home-lane="following"[^>]*data-social-home-lane-active=""/);
    expect(html).toContain(SOCIAL.home.followingTab);
    expect(html).toContain(SOCIAL.home.forYouTab);
    expect(html).toContain("data-social-stories");
    expect(html).toContain("data-social-following-empty");
    expect(html).toContain("data-social-for-you");
    expect(html).toContain("lg:max-w-[470px]");
    expect(html).toContain("lg:max-w-[802px]");
    expect(html).not.toContain("lg:max-w-[720px]");
    expect(html).not.toContain("lg:max-w-[1052px]");
    expect(html).not.toContain("lg:ml-auto");
    expect(html).toContain("gap-[32px]");
    expect(html).toContain("w-[300px]");
    expect(html).not.toContain("lg:max-w-[600px]");
    expect(html).not.toContain("lg:max-w-[932px]");
    expect(html).not.toContain("data-social-latest-course");
    expect(html).not.toContain(SOCIAL.forYou.latestCourse);
    expect(html).not.toContain("data-social-recent-chats");
    expect(html).not.toContain("data-social-chats-empty");
    expect(html).not.toContain(SOCIAL.home.recentChats);
    expect(html).toContain("data-social-home-activity-empty");
    expect(html).toContain("data-social-home-activity-write");
    expect(html).toContain("data-social-home-activity-story");
    expect(html).toContain('href="/social/stories/new"');
    expect(html).not.toContain("No stories yet");
    expect(html).not.toContain("No posts yet");
    expect(html).toMatch(/data-social-home-topic="All"[^>]*data-social-home-topic-active=""/);
    expect(html).toContain('data-social-home-topic="Acting"');
    expect(html).toContain("Cinematography");
    expect(html).toContain("Music");
    expect(html).not.toContain("data-social-first-win");
    expect(html).not.toContain("data-social-checklist");
    expect(html).not.toContain("data-social-home-setup");
    expect(html).not.toContain(SOCIAL.checklist.title);
    expect(html).toContain("data-social-for-you");
    expect(html).toContain(SOCIAL.home.empty);
    expect(html).toContain(SOCIAL.home.emptyHint);
    expect(html).toContain(SOCIAL.home.subtitle);
    expect(html).toContain(SOCIAL.home.findPeople);
    expect(html).toContain("/social/search?intent=people");
    expect(html).not.toContain("Explore creators");
    expect(html).not.toContain('href="/social/explore"');
    expect(html).not.toContain("One clear next step");
    expect(html).not.toContain("Social-native");
    expect(html).not.toContain("Loved the reel");
    expect(html).not.toContain('"/messages"');
    expect(html).toContain("data-social-empty-lenses");
    expect(html).not.toContain("data-social-lenses");
    expect(html).not.toContain("Education");
    expect(html).not.toContain("data-social-need-profile");
    expect(html).not.toContain("Cinematographers");
    expect(html).not.toContain("Composers");
    expect(html).not.toContain("data-social-post-form");
    expect(html).not.toContain("Globee");
    expect(html).not.toContain(ASK_GLOBEE.headline);
  });

  it("selects the Topics rail chip from the topic search param", async () => {
    stubClient({ profile: ensured });
    vi.mocked(getOrgContext).mockResolvedValue(ctx({ hasOrg: false }) as never);

    const music = await renderHome({ topic: "music" });
    expect(music).toMatch(/data-social-home-topic="Music"[^>]*data-social-home-topic-active=""/);
    expect(music).not.toMatch(/data-social-home-topic="All"[^>]*data-social-home-topic-active=""/);

    const unknown = await renderHome({ topic: "cousins" });
    expect(unknown).toMatch(/data-social-home-topic="All"[^>]*data-social-home-topic-active=""/);
  });

  it("omits Finish setting up from Home once a profile exists", async () => {
    const { from } = stubClient({ profile: ensured });
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);

    const html = await renderHome();
    expect(ensureOwnSocialProfile).toHaveBeenCalled();
    expect(from).toHaveBeenCalledWith("stories");
    expect(html).toContain("data-social-home-composer");
    expect(html).toContain("data-social-story-create");
    expect(html).not.toContain("data-social-first-win");
    expect(html).not.toContain("data-social-checklist");
    expect(html).not.toContain("data-social-home-setup");
    expect(html).not.toContain(SOCIAL.checklist.title);
    expect(html).not.toContain("data-social-need-profile");
    expect(html).not.toContain("data-social-post-form");
  });

  it("shows a signed author face on a feed post", async () => {
    stubClient({
      profile: { id: "u1", handle: "ada", display_name: "Ada Lovelace", status: "active" },
      posts: [
        {
          id: "p1",
          body: "hello",
          author_id: "u1",
          group_id: null,
          like_count: 0,
          created_at: "2026-09-12T14:00:00.000Z",
        },
      ],
    });
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);
    vi.mocked(signedAvatarUrls).mockReturnValue(
      new Map([["u1", "https://s3.example/signed-avatar"]]),
    );

    const html = await renderHome();
    expect(html).toContain('data-social-post="p1"');
    expect(html).toContain("Ada Lovelace");
    expect(html).toContain("https%3A%2F%2Fs3.example%2Fsigned-avatar");
    expect(html).toContain("data-social-home-composer");
    expect(html).not.toContain("data-social-checklist");
    expect(html).not.toContain(SOCIAL.checklist.title);
    expect(html).not.toContain("AL");
    expect(html).not.toContain("data-social-avatar-ring");
  });

  it("renders signed post media from posts.media keys", async () => {
    stubClient({
      profile: { id: "u1", handle: "ada", display_name: "Ada Lovelace", status: "active" },
      posts: [
        {
          id: "p1",
          body: "hello",
          author_id: "u1",
          group_id: null,
          like_count: 0,
          created_at: "2026-09-12T14:00:00.000Z",
          media: [{ kind: "image", key: "posts/u1/a.jpg", contentType: "image/jpeg" }],
        },
      ],
    });
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);
    vi.mocked(signedSocialMediaByPostId).mockReturnValue(
      new Map([
        [
          "p1",
          [{ kind: "image", url: "https://cf.example/signed-image", contentType: "image/jpeg" }],
        ],
      ]),
    );

    const html = await renderHome();
    expect(html).toContain("data-social-post-image");
    expect(html).toContain("https%3A%2F%2Fcf.example%2Fsigned-image");
  });

  it("sends an unauthenticated visitor to login", async () => {
    stubClient();
    vi.mocked(getOrgContext).mockResolvedValue(null as never);
    await expect(SocialHomePage({ searchParams: Promise.resolve({}) })).rejects.toThrow("REDIRECT:/login");
  });

  it("exposes followee, story, and wall truncation instead of a silent max", async () => {
    const follows = Array.from({ length: SOCIAL_FOLLOWEES_LIMIT + 1 }, (_, i) => ({
      followee_id: `u${i + 2}`,
    }));
    const posts = Array.from({ length: SOCIAL_FOLLOWING_WALL_LIMIT + 1 }, (_, i) => ({
      id: `11111111-1111-4111-8111-${String(i).padStart(12, "0")}`,
      body: `hello ${i}`,
      author_id: "u1",
      group_id: null,
      like_count: 0,
      created_at: `2026-09-14T12:00:${String(i).padStart(2, "0")}.000Z`,
    }));
    const stories = Array.from({ length: SOCIAL_STORIES_RAIL_LIMIT + 1 }, (_, i) => ({
      id: `s${i}`,
      author_id: "u1",
      body: null,
      media: [],
      expires_at: "2099-01-01T00:00:00.000Z",
      created_at: "2026-09-14T12:00:00.000Z",
    }));
    stubClient({ profile: ensured, posts, follows, stories });
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);

    const html = await renderHome();
    expect(html).toContain("data-social-followees-truncated");
    expect(html).toContain(SOCIAL.home.truncatedFollowees);
    expect(html).toContain("data-social-stories-truncated");
    expect(html).toContain(SOCIAL.home.truncatedStories);
    expect(html).toContain("data-social-wall-truncated");
    expect(html).toContain(SOCIAL.home.truncatedWall);
    expect(html).toContain("data-social-wall-older");
    expect(html).toContain(SOCIAL.home.olderPosts);
    const lastKept = posts[SOCIAL_FOLLOWING_WALL_LIMIT - 1]!;
    expect(html).toContain(`after=${encodeURIComponent(encodeFollowingWallCursor(lastKept))}`);
    expect(html).toContain(`data-social-post="${posts[0]!.id}"`);
    expect(html).not.toContain(`data-social-post="${posts[SOCIAL_FOLLOWING_WALL_LIMIT]!.id}"`);
  });

  it("shows Latest course from the Education catalog on the right rail", async () => {
    stubClient({
      profile: ensured,
      courses: [
        {
          id: "c1",
          slug: "catalog-basics",
          title: "Catalog basics",
          description: null,
          cover_key: null,
          is_flagship_free: true,
          price_cents: null,
          catalog_code: "EDU-1",
          status: "published",
          position: 2,
          instructor_id: null,
          created_at: "2026-09-01T12:00:00.000Z",
        },
        {
          id: "c2",
          slug: "rights-desk",
          title: "Rights desk",
          description: null,
          cover_key: null,
          is_flagship_free: true,
          price_cents: null,
          catalog_code: "EDU-2",
          status: "published",
          position: 1,
          instructor_id: null,
          created_at: "2026-09-18T12:00:00.000Z",
        },
      ],
    });
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);

    const html = await renderHome();
    expect(html).toContain("data-social-latest-course");
    expect(html).toContain(SOCIAL.forYou.latestCourse);
    expect(html).toContain("Rights desk");
    expect(html).toContain("/education/rights-desk");
    expect(html).toContain('data-course-card="rights-desk"');
    expect(html).not.toContain("Catalog basics");
    expect(html).not.toContain("data-social-for-you-topics");
  });

  it("does not surface Recent chats on Home; Messages stay on /social/dms", async () => {
    const { rpc } = stubClient({ profile: ensured });
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);

    const html = await renderHome();
    expect(rpc).not.toHaveBeenCalledWith("get_dm_inbox", expect.anything());
    expect(html).not.toContain("data-social-recent-chats");
    expect(html).not.toContain("data-social-chat-row");
    expect(html).not.toContain(SOCIAL.home.recentChats);
    expect(html).not.toContain("data-social-chats-empty");
    expect(SOCIAL_ROUTES.dms).toBe("/social/dms");
    expect(html).not.toContain('"/messages"');
  });

  it("opens For you as suggested people and locked topics, not an invented feed", async () => {
    stubClient({ profile: ensured });
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);
    const html = await renderHome({ lane: "for-you" });
    expect(html).toContain("data-social-for-you-lane");
    expect(html).not.toContain("data-social-home-setup");
    expect(html).toContain(SOCIAL.forYou.people);
    expect(html).not.toMatch(/>Topics</);
    expect(html.indexOf("data-social-home-topics")).toBeLessThan(html.indexOf("data-social-for-you-lane"));
    expect(html).toMatch(/data-social-home-lane="for-you"[^>]*data-social-home-lane-active=""/);
    expect(html).toMatch(/data-social-home-topic="All"[^>]*data-social-home-topic-active=""/);
    expect(html).not.toContain("data-social-home-tabs");
    expect(html).not.toContain("data-social-for-you-topics");
    expect(html).not.toContain("data-social-latest-course");
    expect(html).toContain("Cinematography");
    expect(html).not.toContain("Education");
    expect(html).not.toContain("Riley Okonkwo");
    expect(html).not.toContain("#MicroDramaPilot");
    expect(html).not.toContain("data-social-feed");
  });
});

describe("messages clash lock", () => {
  it("does not steal /messages for DMs", () => {
    const home = readFileSync("src/app/(app)/social/page.tsx", "utf8");
    const dms = readFileSync("src/app/(app)/social/dms/page.tsx", "utf8");
    const dmLoaders = readFileSync("src/lib/social-dms.ts", "utf8");
    expect(home).not.toContain('"/messages"');
    expect(dms).toContain("loadDmInbox");
    expect(dmLoaders).toContain("get_dm_inbox");
    expect(existsSync("src/app/(app)/aggregation/messages/page.tsx")).toBe(false);
    expect(existsSync("src/app/(app)/aggregation/messages/ask-ai-legacy-intercept.tsx")).toBe(
      false,
    );
  });
});
