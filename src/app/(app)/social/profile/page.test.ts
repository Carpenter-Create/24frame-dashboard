import { readFileSync } from "node:fs";
import { cookies } from "next/headers";
import { renderServerMarkup } from "@/lib/render-server-markup";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getOrgContext } from "@/lib/supabase/context";
import { createClient } from "@/lib/supabase/server";
import {
  signedAvatarUrls,
  signedSocialMediaByPostId,
  socialAvatarHref,
  socialMediaHref,
} from "@/lib/social-edge";
import { SOCIAL, SOCIAL_PROFILE_POSTS_PAGE } from "@/lib/social";
import { ensureOwnSocialProfile, ensureOwnSocialProfileResult } from "@/lib/social-profile";
import { SOCIAL_PROFILE_OPTIMISTIC_COOKIE } from "@/lib/social-profile-edit";
import SocialProfilePage from "./page";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((to: string) => {
    throw new Error(`REDIRECT:${to}`);
  }),
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: () => undefined })),
}));
vi.mock("@/lib/supabase/context", () => ({ getOrgContext: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/social-edge", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/social-edge")>();
  return {
    ...actual,
    signedAvatarUrls: vi.fn((ids: readonly string[]) => actual.signedAvatarUrls(ids)),
    signedSocialMediaByPostId: vi.fn((posts) => actual.signedSocialMediaByPostId(posts)),
    socialAvatarHref: vi.fn((id: string) => actual.socialAvatarHref(id)),
    socialMediaHref: vi.fn((key: string) => actual.socialMediaHref(key)),
  };
});
vi.mock("@/lib/s3-education", () => ({
  signedEducationCoverUrls: vi.fn().mockResolvedValue(new Map()),
}));
vi.mock("@/lib/social-profile", () => ({
  ensureOwnSocialProfileResult: vi.fn(),
  ensureOwnSocialProfile: vi.fn(),
}));
vi.mock("@/app/(app)/social/actions", () => ({
  createSocialProfile: vi.fn(),
  updateSocialBio: vi.fn(),
  toggleSocialLike: vi.fn(),
}));
vi.mock("@/app/(app)/account/actions", () => ({
  uploadAccountPhoto: vi.fn(),
}));

function ctx() {
  return {
    user: { id: "u1", email: "ada@example.com" },
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

function stubClient({
  profile = null,
  posts = [],
}: {
  profile?: {
    id: string;
    handle: string;
    display_name: string;
    status: string;
    bio?: string | null;
    welcome_video_key?: string | null;
    crafts?: string[] | null;
    topics?: string[] | null;
    imdb_url?: string | null;
    website_url?: string | null;
  } | null;
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
    if (table === "profiles") return chain(profile ? [profile] : []);
    if (table === "posts") return chain(posts);
    if (table === "likes") return chain([]);
    if (table === "follows") return chain([]);
    if (table === "stories") return chain([]);
    if (table === "comments") return chain([]);
    if (table === "courses") return chain([]);
    throw new Error(`unexpected from(${table})`);
  });
  vi.mocked(createClient).mockResolvedValue({ from } as never);
  return { from };
}

const ensured = {
  id: "u1",
  handle: "ada",
  display_name: "Ada Lovelace",
  status: "active",
  bio: "Writes engines.",
};

describe("Social profile public face", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(signedAvatarUrls).mockReturnValue(new Map());
    vi.mocked(signedSocialMediaByPostId).mockReturnValue(new Map());
    vi.mocked(socialAvatarHref).mockImplementation((id: string) => `/api/social/avatar/${id}`);
    vi.mocked(socialMediaHref).mockImplementation(
      (key: string) => `/api/social/media?key=${encodeURIComponent(key)}`,
    );
    vi.mocked(ensureOwnSocialProfileResult).mockResolvedValue({
      profile: ensured,
      error: null,
    });
    vi.mocked(ensureOwnSocialProfile).mockResolvedValue(ensured);
  });

  it("shows the public face after ensure and does not insert on render", async () => {
    const { from } = stubClient({ profile: ensured });
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);

    const html = await renderServerMarkup(await SocialProfilePage());
    expect(html).toContain("data-social-profile");
    expect(html).toContain("https://24frame.co/@ada");
    expect(html).toContain('data-social-share-url="https://24frame.co/@ada"');
    expect(html).not.toContain("data-social-profile-url");
    expect(html).not.toContain("data-social-profile-links");
    expect(html).not.toContain(">24frame.co/@ada<");
    expect(html).not.toContain("Copies ");
    expect(html).not.toContain("data-social-share-hint");
    expect(html).toContain("@ada");
    expect(html).toContain("data-social-profile-tabs");
    expect(html).toContain(SOCIAL.profile.activityTab);
    expect(html).toContain(SOCIAL.profile.activityPosts);
    expect(html).toContain(SOCIAL.profile.highlightsTab);
    expect(html).toContain(SOCIAL.profile.creditsTab);
    expect(html).toContain(SOCIAL.profile.interestsTab);
    expect(html).toContain('data-social-profile-tab="activity"');
    expect(html).toContain('data-social-profile-tab="credits"');
    expect(html).toContain('data-social-profile-tab="interests"');
    expect(html).toContain('href="/social/profile?tab=interests"');
    expect(html).not.toContain('data-social-profile-tab="posts"');
    expect(html).toContain("data-social-activity");
    expect(html).toContain('data-social-activity-pill="posts"');
    expect(html).toContain("overflow-x-auto");
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
    expect(html).toContain("data-social-share");
    expect(html).not.toContain("Education");
    expect(html).not.toContain("Reels");
    expect(html).not.toContain("Globee");
    expect(html).not.toContain("app.24frame.co");
    expect(from).not.toHaveBeenCalledWith("memberships");
  });

  it("renders the public face with history and the header Edit profile button", async () => {
    stubClient({
      profile: ensured,
      posts: [
        {
          id: "p1",
          body: "First engine note",
          author_id: "u1",
          group_id: null,
          like_count: 2,
          created_at: "2026-09-13T12:00:00.000Z",
        },
      ],
    });
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);

    const html = await renderServerMarkup(await SocialProfilePage());
    expect(html).toContain("data-social-profile-identity");
    expect(html).toContain("Ada Lovelace");
    expect(html).toContain("@ada");
    expect(html).toContain("Writes engines.");
    expect(html).toContain("data-social-profile-bio");
    expect(html).toContain("First engine note");
    expect(html).toContain('data-social-post="p1"');
    expect(html).toContain("data-social-activity");
    expect(html).toContain("data-social-activity-feed");
    expect(html).not.toContain("data-social-author-history");
    expect(html).toContain(SOCIAL.profile.edit);
    expect(html).toContain('href="/social/profile/edit"');
    expect(html).not.toContain('href="#social-profile-edit"');
    const actionsAt = html.indexOf("data-social-profile-actions");
    const shareAt = html.indexOf("data-social-share", actionsAt);
    const share = html.slice(shareAt, html.indexOf("</button>", shareAt));
    expect(html.slice(actionsAt, shareAt)).toContain("bg-accent");
    expect(html.slice(actionsAt, shareAt)).toContain(SOCIAL.profile.edit);
    expect(share).toContain(`aria-label="${SOCIAL.profile.shareProfile}"`);
    expect(share).toContain("size-[44px]");
    expect(share).toContain("min-h-[44px]");
    expect(share).toContain("min-w-[44px]");
    expect(share).not.toContain("flex-1");
    expect(share).not.toContain(`>${SOCIAL.profile.share}<`);
    expect(html).not.toContain("id=\"social-profile-edit\"");
    expect(html).not.toContain("<summary");
    expect(html).not.toContain("data-social-profile-form");
    expect(html).not.toContain("data-social-bio-form");
    expect(html).not.toContain("data-social-profile-photo");
    expect(html).not.toContain(SOCIAL.profile.uploadPhoto);
    expect(html).toContain("data-social-profile-cover");
    expect(html).toContain("data-social-profile-cover-empty");
    expect(html).toContain("data-social-profile-cover-edit");
    expect(html).toContain("bg-accent-wash");
    const head = html.slice(
      html.indexOf("data-social-profile-head"),
      html.indexOf("data-social-profile-face"),
    );
    expect(head).toContain("-mt-[calc(var(--social-profile-avatar)/2)]");
    expect(head).not.toContain("-mt-[40px]");
    expect(head).not.toContain("md:-mt-");
    expect(head).toContain("data-social-profile-name");
    expect(head.indexOf("data-social-avatar")).toBeLessThan(head.indexOf("data-social-profile-name"));
    expect(html).toContain("data-social-profile-avatar-edit");
    expect(html).toContain("/api/social/avatar/u1");
  });

  it("renders the signed account face and uploads through Settings", async () => {
    stubClient({ profile: ensured });
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);
    vi.mocked(socialAvatarHref).mockReturnValue("https://s3.example/signed-avatar");

    const html = await renderServerMarkup(await SocialProfilePage());
    expect(html).toContain("https%3A%2F%2Fs3.example%2Fsigned-avatar");
    expect(html).toContain("Ada Lovelace");
    expect(html).not.toContain("AL");
    expect(html).not.toContain("data-social-profile-photo");
    expect(html).not.toContain("data-social-profile-form");

    const src = readFileSync("src/app/(app)/social/profile/page.tsx", "utf8");
    expect(src).toContain("socialAvatarHref");
    expect(src).not.toContain("SocialProfilePhotoForm");
    expect(src).toContain("loadAuthorActivityPosts");
    expect(src).not.toContain("SocialAuthorHistory");
    expect(src).not.toContain("putAvatarObject");
    expect(src).not.toContain("uploadAccountPhoto");
    expect(src).not.toContain("S3_AVATARS_BUCKET");
  });

  it("shows an honest empty history when the author has no posts", async () => {
    stubClient({ profile: ensured, posts: [] });
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);

    const html = await renderServerMarkup(await SocialProfilePage());
    expect(html).toContain("data-social-empty");
    expect(html).toContain(SOCIAL.profile.activityPostsEmpty);
    expect(html).toContain(SOCIAL.profile.activityPostsEmptyHint);
    expect(html).not.toContain(SOCIAL.profile.sharePost);
    expect(html).not.toContain("/social/create?kind=media");
    const empty = html.slice(html.indexOf("data-social-empty"));
    expect(empty).not.toContain(SOCIAL.profile.edit);
    expect(empty).not.toContain(SOCIAL.profile.completeIdentity);
    expect(empty).not.toContain("/social/profile/edit");
    expect(empty).not.toContain(SOCIAL.profile.postsEmptyOwnHint);
    expect(html.match(/href="\/social\/profile\/edit"/g)?.length).toBe(1);
    expect(html).not.toContain("data-social-author-empty");
    expect(html).not.toContain("data-social-author-posts");
    expect(html).not.toContain("data-social-author-truncated");
    expect(html).not.toContain("Sets");
    expect(html).not.toContain("Riley Okonkwo");
    expect(html).toContain(SOCIAL.profile.edit);
    expect(html).toContain('href="/social/profile/edit"');
    expect(html).not.toContain("id=\"social-profile-edit\"");
    expect(html).not.toContain("<summary");
    expect(html).not.toContain("data-social-welcome-video");
    expect(html).not.toContain("data-social-profile-roles");
    expect(html).not.toContain("data-social-profile-topics");
  });

  it("prints individual Profession pills after bio and omits them when crafts is empty", async () => {
    stubClient({
      profile: { ...ensured, crafts: ["actor", "producer", "screenwriter", "investor"] },
    });
    vi.mocked(ensureOwnSocialProfileResult).mockResolvedValue({
      profile: { ...ensured, crafts: ["actor", "producer", "screenwriter", "investor"] },
      error: null,
    });
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);

    const html = await renderServerMarkup(await SocialProfilePage());
    expect(html).toContain("data-social-profile-roles");
    expect(html).toContain('data-social-profile-role="actor"');
    expect(html).toContain('data-social-profile-role="producer"');
    expect(html).toContain('data-social-profile-role="screenwriter"');
    expect(html).toContain('data-social-profile-role="investor"');
    expect(html).toContain("Actor");
    expect(html).toContain("Investor");
    expect(html).not.toContain("Actor · Producer");
    expect(html).not.toContain("Actor · Producer · Screenwriter +1");
    expect(html).not.toContain("data-social-profile-roles-more");
    expect(html).not.toContain("+1");
    expect(html).toContain("bg-surface-muted");
    expect(html).toContain("data-house-chip-rail");
    expect(html).toContain('data-house-chip-rail-row="0"');
    expect(html).not.toContain('data-house-chip-rail-row="1"');
    const roles = html.slice(
      html.indexOf("data-social-profile-roles"),
      html.indexOf('data-social-profile-role="investor"') + 80,
    );
    expect(roles).toContain("overflow-x-auto");
    expect(roles).toContain("no-scrollbar");
    expect(roles).not.toContain("flex-wrap");
    expect(html).toContain("w-fit");
    expect(html).toContain("inline-flex");
    expect(html).not.toContain("grid w-full grid-cols-3");
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
    expect(html).not.toContain("data-social-profile-cover-dims");
    expect(html).not.toContain("1784");
    expect(html.indexOf("data-social-profile-name")).toBeLessThan(html.indexOf("data-social-profile-face"));
    expect(html.indexOf("data-social-profile-face")).toBeLessThan(html.indexOf("data-social-profile-stats"));
    expect(html.indexOf("data-social-profile-stats")).toBeLessThan(html.indexOf("data-social-profile-bio"));
    expect(html.indexOf("data-social-profile-bio")).toBeLessThan(html.indexOf("data-social-profile-roles"));
    expect(html).not.toContain("data-social-profile-mutuals");
    expect(html).not.toContain("Roles:");
    expect(html).not.toContain("Professions:");
    expect(html).not.toContain("data-social-profile-imdb");
  });

  it("keeps Roles on the face and lists Topics on the Interests tab", async () => {
    stubClient({
      profile: {
        ...ensured,
        crafts: ["actor"],
        topics: ["Acting", "Financing"],
      },
    });
    vi.mocked(ensureOwnSocialProfileResult).mockResolvedValue({
      profile: {
        ...ensured,
        crafts: ["actor"],
        topics: ["Acting", "Financing"],
      },
      error: null,
    });
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);

    const html = await renderServerMarkup(
      await SocialProfilePage({ searchParams: Promise.resolve({ tab: "interests" }) }),
    );
    const face = html.slice(
      html.indexOf("data-social-profile-face"),
      html.indexOf("data-social-profile-tabs"),
    );
    expect(face).toContain("data-social-profile-roles");
    expect(face).toContain('data-social-profile-role="actor"');
    expect(face).not.toContain("data-social-profile-topics");
    expect(face).not.toContain("data-social-profile-topic");
    expect(html).toContain('data-social-profile-tab="interests"');
    expect(html).toContain("data-social-profile-interests");
    expect(html).not.toContain("data-social-profile-interests-empty");
    const panelStart = html.indexOf("data-social-profile-interests");
    const panelEnd = html.indexOf("data-social-for-you", panelStart);
    const panel = html.slice(panelStart, panelEnd === -1 ? undefined : panelEnd);
    expect(panel).toContain('data-social-profile-topic="Acting"');
    expect(panel).toContain('data-social-profile-topic="Financing"');
    expect(panel).toContain("flex-wrap");
    expect(panel).not.toContain("truncate");
    expect(panel).not.toContain("text-ellipsis");
    expect(html).not.toContain("Topics:");
    expect(html).not.toContain("data-social-activity");
  });

  it("keeps an empty Interests tab on the own profile and links to the Topics drill", async () => {
    stubClient({ profile: ensured });
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);

    const html = await renderServerMarkup(
      await SocialProfilePage({ searchParams: Promise.resolve({ tab: "interests" }) }),
    );
    const face = html.slice(
      html.indexOf("data-social-profile-face"),
      html.indexOf("data-social-profile-tabs"),
    );
    expect(face).not.toContain("data-social-profile-topic");
    expect(html).toContain('data-social-profile-tab="interests"');
    expect(html).toContain("data-social-profile-interests-empty");
    const emptyStart = html.indexOf("data-social-profile-interests-empty");
    const emptyEnd = html.indexOf("data-social-for-you", emptyStart);
    const empty = html.slice(emptyStart, emptyEnd === -1 ? undefined : emptyEnd);
    expect(empty).toContain(SOCIAL.profile.interestsEmpty);
    expect(empty).toContain(SOCIAL.profile.interestsEmptyOwnHint);
    expect(empty).toContain('href="/social/profile/edit?face=topics"');
    expect(empty).toContain(`>${SOCIAL.profile.topics}<`);
    expect(empty).not.toContain("data-social-profile-topic=");
  });

  it("prints a quiet IMDb name link when the claim is set", async () => {
    stubClient({
      profile: { ...ensured, imdb_url: "https://www.imdb.com/name/nm0000158/" },
    });
    vi.mocked(ensureOwnSocialProfileResult).mockResolvedValue({
      profile: { ...ensured, imdb_url: "https://www.imdb.com/name/nm0000158/" },
      error: null,
    });
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);

    const html = await renderServerMarkup(await SocialProfilePage());
    expect(html).toContain("data-social-profile-imdb");
    expect(html).toContain('data-social-profile-link-glyph="film-slate"');
    expect(html).toContain('href="https://www.imdb.com/name/nm0000158/"');
    expect(html).toContain(`aria-label="${SOCIAL.profile.imdb}"`);
    expect(html).not.toContain(">imdb.com/name/nm0000158<");
    expect(html).not.toContain("Connect to scrape");
    expect(html).not.toContain(">https://www.imdb.com/name/nm0000158/<");
  });

  it("renders Instagram as a quiet icon and omits the links row when empty", async () => {
    stubClient({
      profile: { ...ensured, website_url: "https://instagram.com/ada" },
    });
    vi.mocked(ensureOwnSocialProfileResult).mockResolvedValue({
      profile: { ...ensured, website_url: "https://instagram.com/ada" },
      error: null,
    });
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);

    const html = await renderServerMarkup(await SocialProfilePage());
    expect(html).toContain("data-social-profile-links");
    expect(html).toContain('data-social-profile-link="instagram"');
    expect(html).toContain('data-social-profile-link-glyph="instagram-logo"');
    expect(html).toContain('href="https://instagram.com/ada"');
    expect(html).toContain('aria-label="Instagram"');
    expect(html).not.toContain(">instagram.com/ada<");
    expect(html).not.toContain(">https://instagram.com/ada<");
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("renders a closed welcome band when a welcome key is stored", async () => {
    stubClient({
      profile: { ...ensured, welcome_video_key: "posts/u1/welcome.mp4" },
    });
    vi.mocked(ensureOwnSocialProfileResult).mockResolvedValue({
      profile: { ...ensured, welcome_video_key: "posts/u1/welcome.mp4" },
      error: null,
    });
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);

    const html = await renderServerMarkup(await SocialProfilePage());
    expect(html).toContain("data-social-welcome-video");
    expect(html).toContain("data-social-video-closed");
    expect(html).not.toContain("welcome.mp4");
    expect(html).not.toContain("<video");
    expect(html).not.toContain("/api/social/media");
    expect(html.indexOf("data-social-welcome-video")).toBeLessThan(html.indexOf("data-social-profile-tabs") || html.length);
  });

  it("names the bound when author history is truncated", async () => {
    const posts = Array.from({ length: SOCIAL_PROFILE_POSTS_PAGE + 1 }, (_, i) => ({
      id: `p${i}`,
      body: `Post ${i}`,
      author_id: "u1",
      group_id: null,
      like_count: 0,
      created_at: "2026-09-13T12:00:00.000Z",
    }));
    stubClient({ profile: ensured, posts });
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);

    const html = await renderServerMarkup(await SocialProfilePage());
    expect(html).toContain("data-social-activity-truncated");
    expect(html).toContain(SOCIAL.profile.postsTruncated);
    expect(html).toContain('data-social-post="p0"');
    expect(html).not.toContain(`data-social-post="p${SOCIAL_PROFILE_POSTS_PAGE}"`);
    expect(html).not.toContain("data-social-author-truncated");
  });

  it("hard-redirects retired ?tab=posts to Activity + Posts", async () => {
    stubClient({ profile: ensured });
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);

    await expect(
      SocialProfilePage({ searchParams: Promise.resolve({ tab: "posts" }) }),
    ).rejects.toThrow("REDIRECT:/social/profile");
  });

  it("renders Activity pills and a calm Comments empty — not a bare list", async () => {
    stubClient({ profile: ensured });
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);

    const html = await renderServerMarkup(
      await SocialProfilePage({
        searchParams: Promise.resolve({ tab: "activity", activity: "comments" }),
      }),
    );
    expect(html).toContain('data-social-profile-tab="activity"');
    expect(html).toContain("data-social-activity");
    expect(html).toContain("data-social-activity-pills");
    expect(html).toContain('data-social-activity-pill="comments"');
    expect(html).toContain(SOCIAL.profile.activityCommentsEmpty);
    expect(html).not.toContain("data-social-author-history");
    expect(html).not.toContain("Boost");
    expect(html).not.toContain("Impressions");
  });

  it("shows the locked Highlights empty state as curated collections", async () => {
    stubClient({
      profile: ensured,
      posts: [
        {
          id: "p1",
          body: "First engine note",
          author_id: "u1",
          group_id: null,
          like_count: 2,
          created_at: "2026-09-13T12:00:00.000Z",
        },
      ],
    });
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);

    const html = await renderServerMarkup(
      await SocialProfilePage({ searchParams: Promise.resolve({ tab: "highlights" }) }),
    );
    expect(html).toContain('data-social-profile-tab="highlights"');
    expect(html).toContain(SOCIAL.profile.highlightsEmpty);
    expect(html).toContain(SOCIAL.profile.highlightsEmptyHint);
    expect(html).not.toContain("Live stories appear here for 24 hours.");
    expect(html).not.toMatch(/24 hours/i);
    expect(html).not.toContain("First engine note");
    expect(html).not.toContain("data-social-author-history");
    expect(html).not.toContain(SOCIAL.profile.creditsEmpty);
  });

  it("shows the locked Credits blank empty state and no invented credits", async () => {
    stubClient({
      profile: ensured,
      posts: [
        {
          id: "p1",
          body: "First engine note",
          author_id: "u1",
          group_id: null,
          like_count: 2,
          created_at: "2026-09-13T12:00:00.000Z",
        },
      ],
    });
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);

    const html = await renderServerMarkup(
      await SocialProfilePage({ searchParams: Promise.resolve({ tab: "credits" }) }),
    );
    expect(html).toContain('data-social-profile-tab="credits"');
    expect(html).toContain('data-social-profile-tab-active=""');
    expect(html).toContain('data-social-icon="film-slate"');
    expect(html).toContain(SOCIAL.profile.creditsEmpty);
    expect(html).toContain(SOCIAL.profile.creditsEmptyOwnHint);
    expect(html).not.toContain("First engine note");
    expect(html).not.toContain("data-social-author-history");
    expect(html).not.toContain(SOCIAL.profile.highlightsEmpty);
    expect(html).not.toContain("Analytics");
    expect(html).not.toContain("Your credits will appear");
  });

  it("shows @handle after ensure, not an empty create form", async () => {
    stubClient({ profile: ensured });
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);

    const html = await renderServerMarkup(await SocialProfilePage());
    expect(html).toContain("@ada");
    expect(html).toContain("https://24frame.co/@ada");
    expect(html).toContain("Ada Lovelace");
    expect(html).not.toContain('value="@ada"');
    expect(html).not.toContain("data-social-handle-field");
  });

  it("keeps SocialHandleField on the empty create form when ensure fails", async () => {
    stubClient();
    vi.mocked(ensureOwnSocialProfileResult).mockResolvedValue({
      profile: null,
      error: "null value in column birth_date",
    });
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);

    const html = await renderServerMarkup(await SocialProfilePage());
    expect(html).toContain("data-social-handle-field");
    expect(html).toContain("data-social-handle-prefix");
    expect(html).toContain('value=""');
    expect(html).not.toContain('value="@"');
    expect(html).toContain("data-social-handle-url");
    expect(html).toContain("https://24frame.co/@");
    expect(html).toContain(SOCIAL.profile.handlePlaceholder);
    expect(html).toContain("null value in column birth_date");
    expect(html).not.toContain("Ada Lovelace");
    expect(html).not.toContain("data-social-author-history");
  });

  it("paints a Save-hop cookie identity before the server row lands", async () => {
    stubClient({ profile: ensured });
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);
    vi.mocked(cookies).mockResolvedValueOnce({
      get: (name: string) =>
        name === SOCIAL_PROFILE_OPTIMISTIC_COOKIE
          ? {
              value: encodeURIComponent(
                JSON.stringify({ handle: "ada", displayName: "Ada Byron" }),
              ),
            }
          : undefined,
    } as never);

    const html = await renderServerMarkup(await SocialProfilePage());
    expect(html).toContain("Ada Byron");
    expect(html).toContain("@ada");
    expect(html).not.toContain("Ada Lovelace");
  });
});
