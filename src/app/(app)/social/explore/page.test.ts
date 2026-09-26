import { createElement } from "react";
import { readFileSync } from "node:fs";
import { renderServerMarkup } from "@/lib/render-server-markup";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getOrgContext } from "@/lib/supabase/context";
import { createClient } from "@/lib/supabase/server";
import { SOCIAL, SOCIAL_ROUTES } from "@/lib/social";
import { SOCIAL_EXPLORE_POSTS_LIMIT } from "@/lib/social-home-bounds";
import SocialExplorePage from "./page";

vi.mock("next/image", () => ({
  default: ({
    src,
    className,
  }: {
    src: string;
    className?: string;
  }) => createElement("img", { src, className, alt: "" }),
}));
vi.mock("next/dynamic", () => ({
  default: () =>
    function MuxPlayerStub(props: { playbackId?: string; autoPlay?: boolean; muted?: boolean }) {
      return createElement("div", {
        "data-mux-player-stub": props.playbackId ?? "",
        "data-mux-autoplay": props.autoPlay ? "yes" : "no",
        "data-mux-muted": props.muted ? "yes" : "no",
      });
    },
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((to: string) => {
    throw new Error(`REDIRECT:${to}`);
  }),
}));
vi.mock("@/lib/supabase/context", () => ({ getOrgContext: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/s3-avatars", () => ({
  signedAvatarUrl: vi.fn().mockResolvedValue(null),
  signedAvatarUrls: vi.fn().mockResolvedValue(new Map()),
}));
vi.mock("@/lib/s3-education", () => ({
  signedEducationCoverUrls: vi.fn(async () => new Map()),
}));
vi.mock("@/lib/social-profile", () => ({
  ensureOwnSocialProfile: vi.fn().mockResolvedValue({
    id: "u1",
    handle: "ada",
    display_name: "Ada Lovelace",
    status: "active",
    crafts: [],
  }),
}));

const AUTHOR = "11111111-1111-4111-8111-111111111111";
const STILL = "22222222-2222-4222-8222-222222222222";
const CLIP = "33333333-3333-4333-8333-333333333333";
const PLAYBACK = "uNbxnGLKJ00yfbijDO8COxT";

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

function emptyQuery() {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain.select = vi.fn(self);
  chain.eq = vi.fn(self);
  chain.is = vi.fn(self);
  chain.or = vi.fn(self);
  chain.ilike = vi.fn(self);
  chain.contains = vi.fn(self);
  chain.order = vi.fn(self);
  chain.in = vi.fn(async () => ({ data: [], error: null }));
  chain.range = vi.fn(async () => ({ data: [], error: null }));
  chain.maybeSingle = vi.fn(async () => ({ data: null, error: null }));
  return chain;
}

function postsQuery(posts: unknown[]) {
  const chain = emptyQuery();
  chain.range = vi.fn(async () => ({ data: posts, error: null }));
  return chain;
}

function muxMedia(objectId = CLIP) {
  return {
    kind: "video",
    key: `posts/${AUTHOR}/${objectId}.mp4`,
    contentType: "video/mp4",
    provider: "mux",
    playbackId: PLAYBACK,
    playbackPolicy: "public",
  };
}

function stub() {
  vi.mocked(createClient).mockResolvedValue({ from: vi.fn(() => emptyQuery()) } as never);
}

describe("Social Explore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stub();
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);
  });

  it("opens a vertical video For You and does not paint the Home layout", async () => {
    const html = await renderServerMarkup(
      await SocialExplorePage({ searchParams: Promise.resolve({}) }),
    );
    const src = readFileSync("src/app/(app)/social/explore/page.tsx", "utf8");
    const host = readFileSync("src/components/social/social-explore-for-you.tsx", "utf8");
    expect(html).toContain("data-social-explore");
    expect(html).toContain("data-social-explore-for-you");
    expect(html).toContain(SOCIAL.explore.title);
    expect(html).toContain(SOCIAL.explore.empty);
    expect(html).toContain("data-social-explore-search");
    expect(html).toContain('name="discover"');
    expect(html).toContain('value="1"');
    expect(html).toContain("data-social-explore-stream");
    expect(html).toContain(SOCIAL.explore.searchPlaceholder);
    expect(html).toContain("bg-[#0A0A0B]");
    expect(html).toContain("snap-y");
    expect(html).not.toContain("data-social-lenses");
    expect(html).not.toContain("data-social-feed");
    expect(html).not.toContain("data-social-explore-grid");
    expect(html).not.toContain("data-social-for-you");
    expect(html).not.toContain("lg:max-w-[1052px]");
    expect(html).not.toContain("/social/p/");
    expect(src).toContain("SocialExploreForYouStream");
    expect(src).toContain("SOCIAL_EXPLORE_FOR_YOU_HOST_CLASS");
    expect(src).toContain('export const runtime = "nodejs"');
    expect(src).toContain("loadExploreMedia");
    expect(src).toContain("socialMediaProxiesByPostId");
    expect(src).toContain("SocialExploreForYouSkeleton");
    expect(src).not.toContain("fallback={<SocialExploreSkeleton");
    expect(src).not.toContain("SocialDesktopForYouSlot");
    expect(src).not.toContain("signSocialForYouCourseCovers");
    expect(src).not.toContain("socialPostHref");
    expect(src).not.toContain("SOCIAL_PROFILE_GRID_CLASS");
    expect(host).not.toContain("socialPostHref");
    expect(host).not.toContain("line-clamp");
    expect(host).not.toContain('fit="contain"');
  });

  it("sends an unauthenticated visitor to login", async () => {
    vi.mocked(getOrgContext).mockResolvedValue(null as never);
    await expect(SocialExplorePage({ searchParams: Promise.resolve({}) })).rejects.toThrow(
      "REDIRECT:/login",
    );
  });

  it("names the video bound when the probe overflows", async () => {
    const posts = Array.from({ length: SOCIAL_EXPLORE_POSTS_LIMIT + 1 }, (_, i) => ({
      id: `x${i}`,
      body: `Clip ${i}`,
      author_id: AUTHOR,
      like_count: 0,
      comment_count: 0,
      media: [muxMedia()],
    }));
    const postsChain = postsQuery(posts);
    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === "posts") return postsChain;
        return emptyQuery();
      }),
    } as never);

    const html = await renderServerMarkup(
      await SocialExplorePage({ searchParams: Promise.resolve({ q: "ada" }) }),
    );
    expect(postsChain.contains).toHaveBeenCalledWith(
      "media",
      JSON.stringify([{ kind: "video", provider: "mux" }]),
    );
    expect(html).toContain("data-social-explore-truncated");
    expect(html).toContain(SOCIAL.explore.truncated);
    expect(html).toContain("Clip 0");
    expect(html).not.toContain(`Clip ${SOCIAL_EXPLORE_POSTS_LIMIT}`);
    expect(html).not.toContain("data-social-explore-grid");
    expect(html).toContain("data-social-explore-clear");
    expect(html).toContain(`href="${SOCIAL_ROUTES.explore}"`);
  });

  it("keeps photos out of the vertical stream", async () => {
    const posts = [
      {
        id: "m1",
        body: "Night still",
        author_id: AUTHOR,
        media: [
          {
            kind: "image",
            key: `posts/${AUTHOR}/${STILL}.jpg`,
            contentType: "image/jpeg",
          },
        ],
      },
    ];
    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === "posts") return postsQuery(posts);
        return emptyQuery();
      }),
    } as never);

    const html = await renderServerMarkup(
      await SocialExplorePage({ searchParams: Promise.resolve({}) }),
    );
    expect(html).toContain("data-social-explore-empty");
    expect(html).toContain(SOCIAL.explore.empty);
    expect(html).not.toContain("Night still");
    expect(html).not.toContain("data-social-explore-image");
    expect(html).not.toContain("data-social-explore-grid");
    expect(html).not.toContain("aspect-square");
    expect(html).not.toContain("/social/p/");
  });

  it("plays the first Mux video full-bleed and stays off the Home post face", async () => {
    const posts = [
      {
        id: "v1",
        body: "Night clip",
        author_id: AUTHOR,
        like_count: 3,
        comment_count: 1,
        media: [
          {
            kind: "image",
            key: `posts/${AUTHOR}/${STILL}.jpg`,
            contentType: "image/jpeg",
          },
          muxMedia(),
        ],
      },
    ];
    const profiles = emptyQuery();
    profiles.in = vi.fn(async () => ({
      data: [{ id: AUTHOR, handle: "ada", display_name: "Ada Lovelace", status: "active" }],
      error: null,
    }));
    const postsChain = postsQuery(posts);
    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === "posts") return postsChain;
        if (table === "profiles") return profiles;
        return emptyQuery();
      }),
    } as never);

    const html = await renderServerMarkup(
      await SocialExplorePage({ searchParams: Promise.resolve({}) }),
    );
    expect(html).toContain("data-social-explore-item");
    expect(html).toContain("data-social-mux-player");
    expect(html).toContain("object-cover");
    expect(html).toContain("Night clip");
    expect(html).toContain('href="/social/u/ada"');
    expect(html).toContain("data-social-explore-author");
    expect(html).toContain("data-social-like");
    expect(html).toContain("data-social-comment-open");
    expect(html).toContain("data-social-post-share");
    expect(html).toContain("data-social-explore-rail");
    expect(html).toContain("flex-col");
    expect(html).toContain("rgb(0_0_0/0.4)");
    expect(html).toContain("120px");
    expect(html).toContain("data-mux-autoplay=\"yes\"");
    expect(html).toContain("data-mux-muted=\"yes\"");
    expect(postsChain.contains).toHaveBeenCalledWith(
      "media",
      JSON.stringify([{ kind: "video", provider: "mux" }]),
    );
    expect(html).not.toContain("/social/p/");
    expect(html).not.toContain("data-social-explore-image");
    expect(html).not.toContain("object-contain");
  });

  it("starts a video stream from people, keywords, and hashtags", async () => {
    const profiles = emptyQuery();
    profiles.range = vi.fn(async () => ({
      data: [
        {
          id: AUTHOR,
          handle: "ada",
          display_name: "Ada Lovelace",
          crafts: [],
          topics: [],
        },
      ],
      error: null,
    }));
    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn((table: string) => (table === "profiles" ? profiles : emptyQuery())),
    } as never);

    const html = await renderServerMarkup(
      await SocialExplorePage({ searchParams: Promise.resolve({ discover: "1", q: "ada" }) }),
    );
    expect(html).toContain("data-social-explore-discover");
    expect(html).not.toContain("data-social-explore-stream");
    expect(html).not.toContain(SOCIAL.explore.empty);
    expect(html).not.toContain("data-mux-player");
    expect(html).toContain("data-social-explore-person=\"ada\"");
    expect(html).toContain('href="/social/explore?person=ada"');
    expect(html).toContain("data-social-explore-keyword");
    expect(html).toContain('href="/social/explore?q=ada"');
    expect(html).toContain("data-social-explore-hashtag");
    expect(html).toContain('href="/social/explore?tag=ada"');
    expect(html).toContain('href="/social/explore"');
    expect(html).toContain(SOCIAL.explore.people);
    expect(html).toContain(SOCIAL.explore.keywords);
    expect(html).toContain(SOCIAL.explore.hashtags);
    expect(html).not.toContain("data-social-explore-grid");
    expect(html).not.toContain("data-social-suggested-people");
    expect(html).not.toContain('name="discover"');
  });

  it("does not open the chooser once person, tag, or q already loads a stream", async () => {
    for (const sp of [{ q: "ada" }, { tag: "night" }, { person: "ada" }] as const) {
      const html = await renderServerMarkup(await SocialExplorePage({ searchParams: Promise.resolve(sp) }));
      expect(html).toContain("data-social-explore-stream");
      expect(html).not.toContain("data-social-explore-discover");
      expect(html).not.toContain('name="discover"');
    }
  });
});
