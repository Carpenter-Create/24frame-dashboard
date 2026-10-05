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
import { ASK_FRAME_AI } from "@/lib/ask-frame-ai";
import { SOCIAL, SOCIAL_ROUTES } from "@/lib/social";
import { SOCIAL_CATEGORY_ALL } from "@/lib/social-categories";
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

// `contains` is the Explore video-post read (the Reels rail source). It
// switches this chain to `explore` rows so the wall and the rail differ.
function chain(result: unknown, explore: unknown = []) {
  const c: Record<string, unknown> = {};
  let rows = result;
  const self = () => c;
  c.select = vi.fn(self);
  c.eq = vi.fn(self);
  c.in = vi.fn(self);
  c.is = vi.fn(self);
  c.gt = vi.fn(self);
  c.or = vi.fn(self);
  c.ilike = vi.fn(self);
  c.order = vi.fn(self);
  c.contains = vi.fn(() => {
    rows = explore;
    return c;
  });
  c.range = vi.fn(async () => ({ data: rows, error: null }));
  c.maybeSingle = vi.fn(async () => ({
    data: Array.isArray(rows) ? (rows[0] ?? null) : rows,
    error: null,
  }));
  c.then = (resolve: (value: unknown) => unknown) =>
    Promise.resolve({ data: rows, error: null }).then(resolve);
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
  explore = [],
  profiles = [],
}: {
  explore?: unknown[];
  profiles?: { id: string; handle: string; display_name: string; status: string }[];
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
    if (table === "profiles") return chain(profile ? [profile, ...profiles] : profiles);
    if (table === "posts") return chain(posts, explore);
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
    // H · Feed (founder 2026-10-05; replaces G's tabs → topic words → story
    // tiles → composer bar → wall in the 620 column): slider → story cards
    // → composer → topic chips → wall, in the 600 column.
    expect(html).toContain('data-social-home-stack="lock_slider_stories_composer_topics_wall"');
    expect(html).not.toContain("lock_topics_composer_stories_wall");
    expect(html).not.toContain("lock_tabs_topics_stories_composer_wall");
    const stackClass = html.match(/data-social-home-stack="lock_slider_stories_composer_topics_wall"[^>]*class="([^"]+)"/)?.[1];
    expect(stackClass).toContain("md:max-w-[600px]");
    expect(stackClass).not.toContain("lg:max-w-[720px]");
    expect(stackClass).not.toContain("gap-[var(--space-2)]");
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).not.toContain("/social/create?kind=text");
    expect(html).toContain("data-social-composer-write");
    expect(html).not.toContain('data-social-create-sheet="composer"');
    expect(html).toContain(SOCIAL.create.title);
    expect(html).not.toContain("data-social-composer-action");
    expect(html).not.toContain("data-social-home-topics-composer-divider");
    // The composer is one 44 row with the grey pill (no 52 muted bar).
    const composer = html.match(/data-social-home-composer="" class="([^"]+)"/)?.[1] ?? "";
    expect(composer).not.toContain("h-[52px]");
    expect(composer).not.toContain("bg-surface-muted");
    expect(composer).not.toContain("border-y");
    expect(html).toMatch(/data-social-composer-prompt="" class="[^"]*rounded-full[^"]*bg-surface-muted/);
    const order = ["data-social-home-lanes", "data-social-stories", "data-social-home-composer", "data-social-home-topics", "data-social-home-wall"];
    for (let i = 1; i < order.length; i += 1) {
      expect(html.indexOf(order[i - 1]!)).toBeGreaterThan(-1);
      expect(html.indexOf(order[i - 1]!)).toBeLessThan(html.indexOf(order[i]!));
    }
    expect(html).toContain('<nav aria-label="Feed scope" data-social-home-lanes=""');
    // The slider: the shared SegmentedTrack with the remount persist key.
    expect(html).toContain('data-segmented-persist="social-feed-scope"');
    expect(html.indexOf('data-social-home-lane="following"')).toBeLessThan(
      html.indexOf('data-social-home-lane="for-you"'),
    );
    expect(html.indexOf('data-social-home-lane="for-you"')).toBeLessThan(
      html.indexOf('data-social-home-topic="All"'),
    );
    expect(html).toMatch(/data-social-home-lane="following"[^>]*data-segmented-selected=""/);
    expect(html).toMatch(/data-social-home-lane="following"[^>]*aria-current="page"/);
    expect(html).not.toMatch(/data-social-home-lane="for-you"[^>]*aria-current/);
    expect(html).not.toMatch(/>Topics</);
    expect(html).toContain("Share something");
    expect(html).not.toContain("Write something");
    expect(html).not.toContain("What's on your mind");
    expect(html).not.toContain("Topics for you");
    expect(html).not.toContain("data-social-for-you-topics");
    expect(html).not.toContain("data-social-stories-tall");
    expect(html).toContain('role="group" aria-label="Stories"');
    expect(html).toContain("h-[192px] w-[108px]");
    expect(html).not.toContain("h-[100px] w-14");
    expect(html).toContain(`aria-label="${SOCIAL.stories.yourStoryCreate}"`);
    expect(html).toContain(`>${SOCIAL.stories.create}<`);
    expect(html).not.toContain("data-social-home-tabs");
    expect(html).toContain('data-social-home-lane="following"');
    expect(html).toContain('data-social-home-lane="for-you"');
    expect(html).toMatch(/data-social-home-lane="following"[^>]*data-social-home-lane-active=""/);
    expect(html).toContain(SOCIAL.home.followingTab);
    expect(html).toContain(SOCIAL.home.forYouTab);
    expect(html).toContain("data-social-stories");
    expect(html).toContain("data-social-following-empty");
    expect(html).toContain("data-social-for-you");
    // H grid (replaces G's 620 / 40 / 244): 600 column, 48 gap, the 296
    // For you rail from xl.
    expect(html).toContain("md:max-w-[600px]");
    expect(html).toContain("xl:max-w-[944px]");
    expect(html).toContain("gap-12");
    expect(html).toContain("w-[296px]");
    expect(html).not.toContain("lg:max-w-[620px]");
    expect(html).not.toContain("w-[244px]");
    expect(html).toContain('data-social-for-you-layout="aside"');
    expect(html).not.toContain("lg:max-w-[1052px]");
    expect(html).not.toContain("w-[300px]");
    // Nothing to suggest here: the rail stays empty, with no heading and
    // no accessible name of its own.
    const aside = html.slice(html.indexOf('data-social-for-you-layout="aside"'));
    expect(aside).not.toContain(`>${SOCIAL.forYou.title}<`);
    expect(aside).not.toContain("data-social-for-you-heading");
    expect(aside.slice(0, aside.indexOf(">"))).not.toContain("aria-label");
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
    // The topic row already marks "All": the empty wall repeats no filled pill.
    expect(html).not.toContain("data-social-empty-lenses");
    expect(html.split(`>${SOCIAL_CATEGORY_ALL}<`).length - 1).toBe(1);
    const emptyWall = html.slice(html.indexOf("data-social-following-empty"));
    expect(emptyWall).not.toContain(`>${SOCIAL_CATEGORY_ALL}<`);
    expect(html).not.toContain("data-social-lenses");
    expect(html).not.toContain("Education");
    expect(html).not.toContain("data-social-need-profile");
    expect(html).not.toContain("Cinematographers");
    expect(html).not.toContain("Composers");
    expect(html).not.toContain("data-social-post-form");
    expect(html).not.toContain("Globee");
    expect(html).not.toContain(ASK_FRAME_AI.headline);
  });

  it("selects the Topics rail chip from the topic search param", async () => {
    stubClient({ profile: ensured });
    vi.mocked(getOrgContext).mockResolvedValue(ctx({ hasOrg: false }) as never);

    const music = await renderHome({ topic: "music" });
    expect(music).toMatch(/data-social-home-topic="Music"[^>]*data-social-home-topic-active=""/);
    expect(music).not.toMatch(/data-social-home-topic="All"[^>]*data-social-home-topic-active=""/);
    // An empty Music wall shows no stale filled "All" under the Music word.
    expect(music).toContain("data-social-following-empty");
    expect(music.slice(music.indexOf("data-social-following-empty"))).not.toContain(`>${SOCIAL_CATEGORY_ALL}<`);

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
    // H · Feed (founder decision 5, "sure"): the rail's "For you" heading
    // over the course as one soft grey card labelled with its workspace.
    expect(html).toContain(`<h2 data-social-for-you-heading=""`);
    expect(html).toMatch(/data-social-for-you-heading="" class="[^"]*">For you<\/h2>/);
    expect(html).toContain(SOCIAL.forYou.latestCourseEyebrow);
    expect(html).toContain('data-course-card-density="feature"');
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

// Feed Reels rail (Adam 2026-10-04): after every 3 wall posts, from the
// For you Explore list, stills only, each tile opens Explore at that reel.
// docs/design-locks/social-feed-reel-rail-lock-v1.md
describe("Social home Reels rail", () => {
  const AUTHOR_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const reel = (n: number, frame = { width: 1080, height: 1920 }) => ({
    id: `9999999${n}-9999-4999-8999-999999999999`,
    body: `Reel ${n} caption`,
    author_id: AUTHOR_B,
    category: null,
    like_count: 0,
    comment_count: 0,
    media: [
      {
        kind: "video",
        key: `posts/${AUTHOR_B}/8888888${n}-8888-4888-8888-888888888888.mp4`,
        contentType: "video/mp4",
        provider: "mux",
        playbackId: "uNbxnGLKJ00yfbijDO8COxT",
        playbackPolicy: "signed",
        ...frame,
      },
    ],
  });
  const wallPost = (n: number) => ({
    id: `p${n}`,
    body: `post ${n}`,
    author_id: "u1",
    group_id: null,
    like_count: 0,
    created_at: `2026-09-12T14:0${n}:00.000Z`,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(signedAvatarUrls).mockReturnValue(new Map());
    vi.mocked(signedSocialMediaByPostId).mockReturnValue(new Map());
    vi.mocked(ensureOwnSocialProfile).mockResolvedValue(ensured);
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);
  });

  it("puts a rail of For you reels after the third post, linking each to Explore", async () => {
    const { from } = stubClient({
      profile: ensured,
      posts: [1, 2, 3, 4].map(wallPost),
      explore: [reel(1), reel(2), reel(3, { width: 1920, height: 1080 })],
      profiles: [{ id: AUTHOR_B, handle: "priya", display_name: "Priya Nair", status: "active" }],
    });
    const html = await renderHome();
    expect(from).toHaveBeenCalledWith("posts");
    const rail = html.indexOf('data-social-feed-reels="0"');
    expect(rail).toBeGreaterThan(html.indexOf('data-social-post="p3"'));
    expect(rail).toBeLessThan(html.indexOf('data-social-post="p4"'));
    expect(html).toContain('<section aria-label="Reels" data-social-feed-reels="0"');
    expect(html).toContain(`href="/social/explore?v=${reel(1).id}"`);
    expect(html).toContain(`href="/social/explore?v=${reel(2).id}"`);
    // The landscape clip is not a reel.
    expect(html).not.toContain(`/social/explore?v=${reel(3).id}`);
    expect(html).toContain('aria-label="Priya Nair, Reel 1 caption. Opens in Explore"');
    expect(html).toContain(SOCIAL.reels.previous);
    expect(html).toContain(SOCIAL.reels.next);
    // Stills only, held until the rail nears the viewport: no player, no mint.
    const railHtml = html.slice(rail, html.indexOf('data-social-post="p4"'));
    expect(railHtml).not.toContain("data-social-mux-player");
    expect(railHtml).not.toContain("<video");
    expect(railHtml).toContain('data-social-feed-reel-still="held"');
    expect(railHtml).not.toContain("image.mux.com");
    expect(railHtml).not.toContain("accent");
  });

  it("skips the rail under two reels, under three posts, and in For you", async () => {
    stubClient({ profile: ensured, posts: [1, 2, 3].map(wallPost), explore: [reel(1)] });
    expect(await renderHome()).not.toContain("data-social-feed-reels");

    stubClient({ profile: ensured, posts: [1, 2].map(wallPost), explore: [reel(1), reel(2)] });
    expect(await renderHome()).not.toContain("data-social-feed-reels");

    const { from } = stubClient({ profile: ensured, posts: [1, 2, 3].map(wallPost), explore: [reel(1), reel(2)] });
    const forYou = await renderHome({ lane: "for-you" });
    expect(forYou).not.toContain("data-social-feed-reels");
    // For you renders suggested people, not the post wall: the Explore read is skipped.
    const postChains = from.mock.results
      .filter((_, i) => from.mock.calls[i]?.[0] === "posts")
      .map((result) => result.value as { contains: ReturnType<typeof vi.fn> });
    expect(postChains.every((c) => c.contains.mock.calls.length === 0)).toBe(true);
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
