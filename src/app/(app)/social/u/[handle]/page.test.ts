import { readFileSync } from "node:fs";
import { renderServerMarkup } from "@/lib/render-server-markup";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getOrgContext } from "@/lib/supabase/context";
import { createClient } from "@/lib/supabase/server";
import { signedAvatarUrl } from "@/lib/s3-avatars";
import { signedSocialMediaByPostId } from "@/lib/s3-social-media";
import { SOCIAL } from "@/lib/social";
import {
  SOCIAL_PROFILE_ACTION_PILL_CLASS,
  SOCIAL_PROFILE_ACTION_PILL_SECONDARY_CLASS,
} from "@/lib/social-chrome";
import { ensureOwnSocialProfile } from "@/lib/social-profile";
import SocialPublicProfilePage, { generateMetadata } from "./page";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((to: string) => {
    throw new Error(`REDIRECT:${to}`);
  }),
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock("@/lib/supabase/context", () => ({ getOrgContext: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/s3-avatars", () => ({
  signedAvatarUrl: vi.fn().mockResolvedValue(null),
  signedAvatarUrls: vi.fn().mockResolvedValue(new Map()),
}));
vi.mock("@/lib/s3-social-media", () => ({
  signedSocialMediaItems: vi.fn().mockResolvedValue([]),
  signedSocialMediaByPostId: vi.fn().mockResolvedValue(new Map()),
}));
vi.mock("@/lib/social-profile", () => ({
  ensureOwnSocialProfile: vi.fn(),
  SOCIAL_PROFILE_COLUMNS:
    "id, handle, display_name, status, bio, welcome_video_key, welcome_mux_asset_id, welcome_mux_playback_id, welcome_mux_upload_id, cover_key, crafts, topics, imdb_url, website_url",
}));
vi.mock("@/app/(app)/social/actions", () => ({
  toggleSocialFollow: vi.fn(),
  openSocialDm: vi.fn(),
  toggleSocialLike: vi.fn(),
}));

function ctx(userId = "u1") {
  return {
    user: { id: userId, email: "ada@example.com" },
    rows: [],
    orgs: [],
    activeOrg: null,
    activeRole: null,
    canOperate: false,
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
  c.order = vi.fn(self);
  c.range = vi.fn(async () => ({ data: result, error: null }));
  c.maybeSingle = vi.fn(async () => ({
    data: Array.isArray(result) ? (result[0] ?? null) : result,
    error: null,
  }));
  c.then = (resolve: (value: unknown) => unknown) =>
    Promise.resolve({
      data: result,
      error: null,
      count: Array.isArray(result) ? result.length : 0,
    }).then(resolve);
  return c;
}

type PublicProfile = {
  id: string;
  handle: string;
  display_name: string;
  status: string;
  bio: string | null;
  cover_key?: string | null;
  crafts?: string[] | null;
  topics?: string[] | null;
  imdb_url?: string | null;
  website_url?: string | null;
};

const ada: PublicProfile = {
  id: "u2",
  handle: "ada",
  display_name: "Ada Lovelace",
  status: "active",
  bio: "Writes engines.",
};

const viewer: PublicProfile = {
  id: "u1",
  handle: "bob",
  display_name: "Bob One",
  status: "active",
  bio: null,
};

function stubClient({
  member = ada,
  posts = [],
}: {
  member?: PublicProfile | null;
  posts?: {
    id: string;
    body: string;
    author_id: string;
    group_id: string | null;
    like_count: number;
    created_at: string;
    media?: unknown;
  }[];
} = {}) {
  const from = vi.fn((table: string) => {
    if (table === "profiles") return chain(member ? [member] : []);
    if (table === "posts") return chain(posts);
    if (table === "likes") return chain([]);
    if (table === "follows") return chain([]);
    if (table === "stories") return chain([]);
    if (table === "comments") return chain([]);
    if (table === "courses") return chain([]);
    if (table === "social_music_scans") return chain([]);
    throw new Error(`unexpected from(${table})`);
  });
  vi.mocked(createClient).mockResolvedValue({
    from,
    rpc: vi.fn(async () => ({ data: [], error: null })),
  } as never);
  return { from };
}

async function renderPublic(handle = "@ada") {
  return renderServerMarkup(
    await SocialPublicProfilePage({ params: Promise.resolve({ handle }) }),
  );
}

describe("Social public profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(signedAvatarUrl).mockResolvedValue(null);
    vi.mocked(signedSocialMediaByPostId).mockResolvedValue(new Map());
    vi.mocked(ensureOwnSocialProfile).mockResolvedValue(viewer);
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);
  });

  it("shows that author's posts under the identity header", async () => {
    stubClient({
      posts: [
        {
          id: "p9",
          body: "Public engine note",
          author_id: "u2",
          group_id: null,
          like_count: 1,
          created_at: "2026-09-13T12:00:00.000Z",
        },
      ],
    });

    const html = await renderPublic();
    expect(html).toContain("data-social-member");
    expect(html).toContain("data-social-profile-identity");
    // Stage lock: every visitor sees the hero; with no cover it is the band fill.
    expect(html).toContain("data-social-profile-hero");
    expect(html).not.toContain('data-social-profile-cover=""');
    expect(html).toContain("data-social-profile-cover-empty");
    expect(html).not.toContain("data-social-profile-cover-edit");
    const head = html.slice(
      html.indexOf("data-social-profile-head"),
      html.indexOf("data-social-profile-face"),
    );
    expect(head).toContain("data-social-avatar");
    expect(head).toContain("Ada Lovelace");
    expect(head).not.toContain("data-social-profile-stats");
    expect(head).not.toContain("-mt-[40px]");
    expect(head).not.toContain("-mt-[calc(");
    expect(head).not.toContain("md:-mt-");
    expect(head).not.toContain("data-social-profile-avatar-hang");
    expect(head).not.toContain("h-[112px]");
    // Visitors (isSelf too) get no head trail.
    expect(head).not.toContain("data-social-profile-head-trail");
    expect(html).not.toContain("data-social-profile-avatar-edit");
    expect(html).toContain("Ada Lovelace");
    expect(html).toContain("@ada");
    expect(html).toContain("Writes engines.");
    expect(html).toContain("Public engine note");
    expect(html).toContain('data-social-post="p9"');
    expect(html).toContain("data-social-activity");
    expect(html).toContain("data-social-activity-feed");
    expect(html).not.toContain("data-social-author-history");
    expect(html).toContain("data-social-follow");
    expect(html).toContain("data-social-share");
    const actionsAt = html.indexOf("data-social-profile-actions");
    const shareAt = html.indexOf("data-social-share", actionsAt);
    const share = html.slice(shareAt, html.indexOf("</button>", shareAt));
    expect(html.indexOf("data-social-follow", actionsAt)).toBeLessThan(shareAt);
    // Stage lock: Follow is the accent pill (stretches on phone), Share the hairline pill.
    const follow = html.slice(html.indexOf("data-social-follow", actionsAt), shareAt);
    expect(follow).toContain(SOCIAL_PROFILE_ACTION_PILL_CLASS);
    expect(share).toContain(SOCIAL_PROFILE_ACTION_PILL_SECONDARY_CLASS);
    expect(share).toContain(`>${SOCIAL.profile.shareProfile}`);
    expect(share).not.toContain(`>${SOCIAL.profile.share}<`);
    expect(html).toContain("data-social-profile-tabs");
    expect(html).toContain('data-social-profile-stat="followers"');
    expect(html).toContain('href="/social/u/ada/follows"');
    expect(html).toContain('href="/social/u/ada/follows?tab=following"');
    expect(html).toContain(SOCIAL.profile.activityTab);
    expect(html).toContain(SOCIAL.profile.activityPosts);
    expect(html).toContain(SOCIAL.profile.highlightsTab);
    expect(html).toContain(SOCIAL.profile.creditsTab);
    expect(html).toContain('data-social-profile-tab="activity"');
    expect(html).toContain('data-social-profile-tab="credits"');
    expect(html).not.toContain('data-social-profile-tab="interests"');
    expect(html).not.toContain(SOCIAL.profile.interestsTab);
    expect(html).not.toContain('data-social-profile-tab="posts"');
    expect(html).toContain('data-social-activity-pill="posts"');
    expect(html).toContain("overflow-x-auto");
    expect(html).toContain('data-social-share-url="https://24frame.co/@ada"');
    expect(html).not.toContain("data-social-profile-url");
    expect(html).not.toContain(">24frame.co/@ada<");
    expect(html).not.toContain("Copies ");
    expect(html).not.toContain("data-social-share-hint");
    expect(html).toContain("data-social-for-you");
    expect(html).toContain("lg:max-w-[720px]");
    expect(html).toContain("lg:max-w-[1052px]");
    expect(html).toContain("gap-[32px]");
    expect(html).not.toContain("lg:max-w-[600px]");
    expect(html).not.toContain("lg:max-w-[932px]");
    expect(html).toContain("w-[300px]");
    expect(html).toContain("lg:flex");
    expect(html).not.toContain("max-w-[935px]");
    expect(html).not.toContain("md:max-w-[892px]");
    expect(html).not.toContain("lg:max-w-[892px]");
    expect(html).not.toContain("Education");
    expect(html).not.toContain("data-social-open-dm");
    expect(html).not.toContain("data-social-profile-form");
    expect(html).not.toContain("data-social-bio-form");
    expect(html).not.toContain("data-social-profile-photo");
    expect(html).not.toContain("data-social-profile-roles");
    expect(html).not.toContain("data-social-profile-topics");
    expect(html).not.toContain("data-social-profile-imdb");
  });

  it("shows the cover in the hero when the visited profile has a cover photo", async () => {
    stubClient({
      member: { ...ada, cover_key: "posts/u2/cover.jpg" },
    });
    const html = await renderPublic();
    expect(html).toContain("data-social-profile-cover");
    expect(html).toContain("posts%2Fu2%2Fcover.jpg");
    expect(html).not.toContain("data-social-profile-cover-empty");
    expect(html).not.toContain("data-social-profile-cover-edit");
    const hero = html.slice(html.indexOf("data-social-profile-stage"), html.indexOf("data-social-profile-face"));
    expect(hero).not.toContain("bg-accent-wash");
    // The cover layer sits under the identity inside the hero.
    expect(hero.indexOf('data-social-profile-cover=""')).toBeLessThan(hero.indexOf("data-social-profile-head"));
    const head = html.slice(
      html.indexOf("data-social-profile-head"),
      html.indexOf("data-social-profile-face"),
    );
    expect(head).not.toContain("-mt-[40px]");
    expect(head).not.toContain("md:-mt-");
    expect(head.indexOf("data-social-avatar")).toBeLessThan(head.indexOf("data-social-profile-name"));
    expect(head).not.toContain("data-social-profile-avatar-hang");
    expect(head).toContain("data-social-avatar");
    expect(head).toContain("Ada Lovelace");
    expect(head).not.toContain("data-social-profile-stats");
  });

  it("prints individual Profession pills after bio and omits a Professions prefix", async () => {
    stubClient({
      member: { ...ada, crafts: ["actor", "producer"] },
    });
    const html = await renderPublic();
    expect(html).toContain("data-social-profile-roles");
    expect(html).toContain('data-social-profile-role="actor"');
    expect(html).toContain('data-social-profile-role="producer"');
    expect(html).toContain("Actor");
    expect(html).toContain("Producer");
    expect(html).not.toContain("Actor · Producer");
    expect(html).toContain("bg-surface-muted");
    // Stage lock: wrapping chips, never a sideways scroll rail.
    const roles = html.slice(
      html.indexOf("data-social-profile-roles"),
      html.indexOf('data-social-profile-role="producer"') + 80,
    );
    expect(roles).not.toContain("data-house-chip-rail");
    expect(roles).not.toContain("overflow-x-auto");
    expect(roles).toContain("flex-wrap");
    expect(html).not.toContain("data-social-profile-roles-more");
    expect(html).toContain("data-social-profile-handle");
    const head = html.slice(html.indexOf("data-social-profile-head"), html.indexOf("data-social-profile-face"));
    expect(head).toContain("data-social-avatar");
    expect(head).toContain("data-social-profile-name");
    expect(head).toContain("data-social-profile-handle");
    expect(head).toContain("@ada");
    expect(head.indexOf("data-social-profile-name")).toBeLessThan(head.indexOf("data-social-profile-handle"));
    expect(head).not.toContain("data-social-profile-meta");
    expect(head).not.toContain("data-social-profile-stats");
    expect(head).not.toContain("max-w-xs");
    expect(head).not.toContain("grid w-full grid-cols-3");
    expect(head).not.toContain("flex min-w-0 max-w-xs flex-1 items-center");
    expect(html.indexOf("data-social-profile-name")).toBeLessThan(html.indexOf("data-social-profile-face"));
    // Stage order under the hero: intro (bio), actions, stats, roles.
    expect(html.indexOf("data-social-profile-face")).toBeLessThan(html.indexOf("data-social-profile-intro"));
    expect(html.indexOf("data-social-profile-intro")).toBeLessThan(html.indexOf("data-social-profile-actions"));
    expect(html.indexOf("data-social-profile-actions")).toBeLessThan(html.indexOf("data-social-profile-stats"));
    expect(html.indexOf("data-social-profile-stats")).toBeLessThan(html.indexOf("data-social-profile-roles"));
    expect(html).not.toContain("Roles:");
    expect(html).not.toContain("Professions:");
    expect(html).not.toContain("Topics:");
  });

  it("keeps Roles on the face and lists Topics only on Interests", async () => {
    stubClient({
      member: { ...ada, crafts: ["actor"], topics: ["Acting", "Financing"] },
    });
    const listed = await renderPublic();
    const listedFace = listed.slice(
      listed.indexOf("data-social-profile-face"),
      listed.indexOf("data-social-profile-tabs"),
    );
    expect(listedFace).toContain('data-social-profile-role="actor"');
    expect(listedFace).not.toContain("data-social-profile-topic");
    expect(listed).toContain('data-social-profile-tab="interests"');
    expect(listed).not.toContain("data-social-profile-interests");
    expect(listed).not.toContain("Topics:");

    const html = await renderServerMarkup(
      await SocialPublicProfilePage({
        params: Promise.resolve({ handle: "@ada" }),
        searchParams: Promise.resolve({ tab: "interests" }),
      }),
    );
    const face = html.slice(
      html.indexOf("data-social-profile-face"),
      html.indexOf("data-social-profile-tabs"),
    );
    expect(face).toContain("data-social-profile-roles");
    expect(face).toContain('data-social-profile-role="actor"');
    expect(face).not.toContain("data-social-profile-topics");
    expect(face).not.toContain("data-social-profile-topic");
    const panelStart = html.indexOf("data-social-profile-interests");
    const panelEnd = html.indexOf("data-social-for-you", panelStart);
    const panel = html.slice(panelStart, panelEnd === -1 ? undefined : panelEnd);
    expect(panel).toContain('data-social-profile-topic="Acting"');
    expect(panel).toContain('data-social-profile-topic="Financing"');
    expect(panel).toContain("flex-wrap");
    expect(panel).not.toContain("truncate");
    expect(panel).not.toContain("text-ellipsis");
    expect(html).not.toContain("data-social-profile-interests-edit");
    expect(panel).not.toContain(">Actor<");
    expect(face).toContain(">Actor<");
  });

  it("omits Interests for a visitor with no Topics and falls back from the deep link", async () => {
    stubClient({ member: ada });
    const html = await renderPublic();
    expect(html).not.toContain('data-social-profile-tab="interests"');
    expect(html).not.toContain("data-social-profile-interests");

    await expect(
      SocialPublicProfilePage({
        params: Promise.resolve({ handle: "@ada" }),
        searchParams: Promise.resolve({ tab: "interests" }),
      }),
    ).rejects.toThrow("REDIRECT:/social/u/ada");
  });

  it("keeps Interests on the viewer's own public route when Topics are empty", async () => {
    stubClient({ member: { ...viewer, bio: null } });
    vi.mocked(ensureOwnSocialProfile).mockResolvedValue(viewer);
    vi.mocked(getOrgContext).mockResolvedValue(ctx("u1") as never);

    const html = await renderServerMarkup(
      await SocialPublicProfilePage({
        params: Promise.resolve({ handle: "@bob" }),
        searchParams: Promise.resolve({ tab: "interests" }),
      }),
    );
    expect(html).toContain('data-social-profile-tab="interests"');
    expect(html).toContain("data-social-profile-interests-empty");
    expect(html).toContain('href="/social/profile/edit?face=topics"');
    expect(html).not.toContain("data-social-profile-topic=");
  });

  it("renders Instagram as a quiet icon and omits the links row when empty", async () => {
    stubClient({
      member: { ...ada, website_url: "https://instagram.com/ada" },
    });
    const html = await renderPublic();
    expect(html).toContain("data-social-profile-links");
    expect(html).toContain('data-social-profile-link="instagram"');
    expect(html).toContain('data-social-profile-link-glyph="instagram-logo"');
    expect(html).toContain('href="https://instagram.com/ada"');
    expect(html).toContain('aria-label="Instagram"');
    expect(html).not.toContain(">instagram.com/ada<");
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).not.toContain(">https://instagram.com/ada<");

    stubClient({ member: ada });
    const empty = await renderPublic();
    expect(empty).not.toContain("data-social-profile-links");
    expect(empty).not.toContain("data-social-profile-link");
  });

  it("prints a quiet IMDb link when the member claim is set", async () => {
    stubClient({
      member: { ...ada, imdb_url: "https://www.imdb.com/name/nm0000158/" },
    });
    const html = await renderPublic();
    expect(html).toContain("data-social-profile-imdb");
    expect(html).toContain('data-social-profile-link-glyph="film-slate"');
    expect(html).toContain('href="https://www.imdb.com/name/nm0000158/"');
    expect(html).toContain(`aria-label="${SOCIAL.profile.imdb}"`);
    expect(html).not.toContain(">imdb.com/name/nm0000158<");
    expect(html).not.toContain("Connect to scrape");
  });

  it("renders the same public profile for a bare handle param", async () => {
    stubClient({
      posts: [
        {
          id: "p9",
          body: "Public engine note",
          author_id: "u2",
          group_id: null,
          like_count: 1,
          created_at: "2026-09-13T12:00:00.000Z",
        },
      ],
    });

    const html = await renderPublic("ada");
    expect(html).toContain("data-social-member");
    expect(html).toContain("Ada Lovelace");
    expect(html).toContain("@ada");
    expect(html).toContain("Public engine note");
    expect(html).not.toContain(SOCIAL.member.missing);
  });

  it("still accepts an @-decorated route param if one is passed", async () => {
    stubClient();
    const html = await renderPublic("@ada");
    expect(html).toContain("data-social-member");
    expect(html).toContain("Ada Lovelace");
    expect(html).toContain("@ada");
    expect(html).not.toContain(SOCIAL.member.missing);
  });

  it("shows an honest empty state when that author has no posts", async () => {
    stubClient({ posts: [] });
    const html = await renderPublic();
    expect(html).toContain("data-social-empty");
    expect(html).toContain(SOCIAL.profile.activityPostsEmpty);
    expect(html).toContain(SOCIAL.profile.activityPostsEmptyHint);
    const empty = html.slice(html.indexOf("data-social-empty"));
    expect(empty).not.toContain(SOCIAL.profile.sharePost);
    expect(empty).not.toContain(SOCIAL.profile.edit);
    expect(empty).not.toContain(SOCIAL.profile.completeIdentity);
    expect(empty).not.toContain(SOCIAL.profile.postsEmptyHint);
    expect(html).not.toContain("data-social-author-empty");
    expect(html).not.toContain("data-social-author-posts");
  });

  it("shows the locked Highlights empty state as curated collections", async () => {
    stubClient({
      posts: [
        {
          id: "p9",
          body: "Public engine note",
          author_id: "u2",
          group_id: null,
          like_count: 1,
          created_at: "2026-09-13T12:00:00.000Z",
        },
      ],
    });
    const html = await renderServerMarkup(
      await SocialPublicProfilePage({
        params: Promise.resolve({ handle: "@ada" }),
        searchParams: Promise.resolve({ tab: "highlights" }),
      }),
    );
    expect(html).toContain('data-social-profile-tab="highlights"');
    expect(html).toContain(SOCIAL.profile.highlightsEmpty);
    expect(html).toContain(SOCIAL.profile.highlightsEmptyHint);
    expect(html).not.toContain("Live stories appear here for 24 hours.");
    expect(html).not.toMatch(/24 hours/i);
    expect(html).not.toContain("Public engine note");
    expect(html).not.toContain("data-social-author-history");
    expect(html).not.toContain(SOCIAL.profile.creditsEmpty);
  });

  it("shows the locked Credits blank empty state on a public profile", async () => {
    stubClient({
      posts: [
        {
          id: "p9",
          body: "Public engine note",
          author_id: "u2",
          group_id: null,
          like_count: 1,
          created_at: "2026-09-13T12:00:00.000Z",
        },
      ],
    });
    const html = await renderServerMarkup(
      await SocialPublicProfilePage({
        params: Promise.resolve({ handle: "@ada" }),
        searchParams: Promise.resolve({ tab: "credits" }),
      }),
    );
    expect(html).toContain('data-social-profile-tab="credits"');
    expect(html).toContain('data-social-icon="film-slate"');
    expect(html).toContain(SOCIAL.profile.creditsEmpty);
    expect(html).not.toContain("Public engine note");
    expect(html).not.toContain("data-social-author-history");
    expect(html).not.toContain(SOCIAL.profile.highlightsEmpty);
  });

  it("does not show follow or edit on the viewer's own public route", async () => {
    stubClient({ member: { ...viewer, bio: null } });
    vi.mocked(ensureOwnSocialProfile).mockResolvedValue(viewer);
    vi.mocked(getOrgContext).mockResolvedValue(ctx("u1") as never);

    const html = await renderPublic("@bob");
    expect(html).toContain("Bob One");
    expect(html).toContain("data-social-activity");
    expect(html).not.toContain("data-social-author-history");
    expect(html).not.toContain("data-social-follow");
    expect(html).not.toContain("data-social-profile-form");
    expect(html).not.toContain("data-social-profile-photo");
  });

  it("drops a hidden Interests deep link when the handle casing redirects", async () => {
    stubClient({ member: { ...ada, handle: "AdamC" } });
    await expect(
      SocialPublicProfilePage({
        params: Promise.resolve({ handle: "adamc" }),
        searchParams: Promise.resolve({ tab: "interests" }),
      }),
    ).rejects.toThrow("REDIRECT:/@AdamC");
  });

  it("redirects a casing miss to the stored public URL", async () => {
    stubClient({ member: { ...ada, handle: "AdamC" } });
    await expect(renderPublic("adamc")).rejects.toThrow("REDIRECT:/@AdamC");
  });

  it("hard-redirects retired ?tab=posts to Activity + Posts", async () => {
    stubClient();
    await expect(
      SocialPublicProfilePage({
        params: Promise.resolve({ handle: "@ada" }),
        searchParams: Promise.resolve({ tab: "posts" }),
      }),
    ).rejects.toThrow("REDIRECT:/social/u/ada");
  });

  it("maps a casing miss plus ?tab=posts onto the stored Activity land", async () => {
    stubClient({ member: { ...ada, handle: "AdamC" } });
    await expect(
      SocialPublicProfilePage({
        params: Promise.resolve({ handle: "adamc" }),
        searchParams: Promise.resolve({ tab: "posts" }),
      }),
    ).rejects.toThrow("REDIRECT:/@AdamC");
  });

  it("sets the public canonical to https://24frame.co/@handle", async () => {
    await expect(generateMetadata({ params: Promise.resolve({ handle: "AdamC" }) })).resolves.toEqual({
      alternates: { canonical: "https://24frame.co/@AdamC" },
    });
    await expect(generateMetadata({ params: Promise.resolve({ handle: "ab" }) })).resolves.toEqual({});
  });

  it("keeps the stored casing when the requested handle already matches", async () => {
    stubClient({ member: { ...ada, handle: "AdamC" } });
    const html = await renderPublic("AdamC");
    expect(html).toContain("@AdamC");
    expect(html).toContain('data-social-share-url="https://24frame.co/@AdamC"');
    expect(html).not.toContain("/social/@");
  });

  it("uses the same empty state for a missing handle or an RLS-null row", async () => {
    const { from } = stubClient({ member: null });
    const html = await renderPublic("@missing");
    expect(html).toContain("data-social-member-missing");
    expect(html).toContain(SOCIAL.member.missing);
    expect(html).not.toContain("data-social-author-history");
    expect(from).not.toHaveBeenCalledWith("posts");
  });

  it("renders Activity on the public profile with Comments empty, not Posts grid", async () => {
    stubClient();
    const html = await renderServerMarkup(
      await SocialPublicProfilePage({
        params: Promise.resolve({ handle: "@ada" }),
        searchParams: Promise.resolve({ tab: "activity", activity: "comments" }),
      }),
    );
    expect(html).toContain('data-social-profile-tab="activity"');
    expect(html).toContain("data-social-activity");
    expect(html).toContain(SOCIAL.profile.activityCommentsEmpty);
    expect(html).not.toContain("data-social-author-history");
    expect(html).not.toContain("data-social-profile-grid");
  });

  it("signs the account face and reuses Home post cards", async () => {
    stubClient({
      posts: [
        {
          id: "p9",
          body: "hello",
          author_id: "u2",
          group_id: null,
          like_count: 0,
          created_at: "2026-09-13T12:00:00.000Z",
        },
      ],
    });
    vi.mocked(signedAvatarUrl).mockResolvedValue("https://s3.example/signed-avatar");

    const html = await renderPublic();
    expect(html).toContain('src="/api/social/avatar/u2"');
    expect(html).toContain('data-social-post="p9"');

    const src = readFileSync("src/app/(app)/social/u/[handle]/page.tsx", "utf8");
    expect(src).toContain("socialAvatarHref");
    expect(src).toContain('export const runtime = "nodejs"');
    expect(src).toContain("loadAuthorActivityPosts");
    expect(src).toContain("SocialProfileTabPanels");
    expect(readFileSync("src/components/social/social-profile-tab-panels.tsx", "utf8")).toContain(
      "SocialActivityHistory",
    );
    expect(src).not.toContain("SocialAuthorHistory");
    expect(src).toContain("isLegacySocialProfilePostsTab");
    expect(src).toContain("socialProfileCasingRedirect");
    expect(src).toContain("generateMetadata");
    expect(src).toContain("socialProfileCanonicalUrl");
    expect(src).toContain("loadProfileMutuals");
    expect(src).not.toContain("putAvatarObject");
    expect(src).not.toContain("uploadAccountPhoto");
    expect(src).not.toContain("S3_AVATARS_BUCKET");
  });
});
