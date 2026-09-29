import "@/test/minimal-document";

import { createElement, type ReactNode } from "react";
import { readFileSync } from "node:fs";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

import { SOCIAL_FOLLOWING_MUX_ACTIVE_THRESHOLDS } from "@/lib/social-following-mux-active";
import type { SocialFollowingWallCard } from "@/lib/social-following-wall";
import { clearSocialMuxPlaybackTokenCache, SOCIAL_MUX_PLAYBACK_ROUTE } from "@/lib/social-mux";
import { minimalDocument, serializeElement, uninstallMinimalDocument } from "@/test/minimal-document";

const dynamicRegistry = vi.hoisted(() => ({
  resolve: (source: string): ((props: Record<string, unknown>) => unknown) | null =>
    source ? null : null,
}));

vi.mock("next/dynamic", () => ({
  default: (loader: () => Promise<unknown>, options?: { ssr?: boolean }) => {
    if (options?.ssr === false) {
      return function MuxPlayerStub(props: { playbackId?: string; autoPlay?: boolean; muted?: boolean }) {
        return createElement("div", {
          "data-mux-player-stub": props.playbackId ?? "",
          "data-mux-autoplay": props.autoPlay ? "yes" : "no",
          "data-mux-muted": props.muted ? "yes" : "no",
        });
      };
    }
    const source = loader.toString();
    return function SocialDynamic(props: Record<string, unknown>) {
      const Comp = dynamicRegistry.resolve(source);
      if (!Comp) return null;
      return createElement(Comp as never, props);
    };
  },
}));

vi.mock("next/image", () => ({
  default: (props: { src?: string; alt?: string }) =>
    createElement("img", { src: typeof props.src === "string" ? props.src : "", alt: props.alt ?? "" }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children?: ReactNode }) =>
    createElement("a", { href, ...rest }, children),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => undefined, refresh: () => undefined, replace: () => undefined }),
  usePathname: () => "/social",
  useSearchParams: () => new URLSearchParams(),
}));

import { SocialPostMedia } from "./social-post-media";
import { SocialFollowingWallBound } from "./social-following-wall-bound";

dynamicRegistry.resolve = (source) =>
  source.includes("social-post-media") ? (SocialPostMedia as never) : null;

const PUBLIC_LEAD = "PublicLeadPlayback001";
const SIGNED_NEXT = "SignedNextPlayback001";
const SIGNED_LATER = "SignedLaterPlayback01";
const SIGNED_AFTER = "SignedAfterPlayback01";
const SIGNED_COLD = "SignedColdPlayback0001";
const SIGNED_COLD2 = "SignedColdPlayback0002";
const SLIDE_ONE = "SlideOnePlayback0001";
const SLIDE_TWO = "SlideTwoPlayback0002";
const SLIDE_THREE = "SlideThreePlayback003";

type Observed = {
  callback: (entries: Array<{ isIntersecting: boolean; intersectionRatio: number; target: Element }>) => void;
  threshold: readonly number[];
  targets: Element[];
};

const observed: Observed[] = [];
const requested: string[] = [];

function installObserver() {
  observed.length = 0;
  class FakeObserver {
    private record: Observed;
    constructor(
      callback: Observed["callback"],
      options?: { threshold?: readonly number[] },
    ) {
      this.record = { callback, threshold: options?.threshold ?? [], targets: [] };
      observed.push(this.record);
    }
    observe(target: Element) {
      this.record.targets.push(target);
    }
    unobserve() {}
    disconnect() {
      this.record.targets = [];
    }
    takeRecords() {
      return [];
    }
  }
  vi.stubGlobal("IntersectionObserver", FakeObserver);
}

function installFetch() {
  requested.length = 0;
  vi.stubGlobal("fetch", (input: RequestInfo | URL) => {
    const url = new URL(String(input), "http://local");
    expect(url.pathname).toBe(SOCIAL_MUX_PLAYBACK_ROUTE);
    const id = url.searchParams.get("playbackId");
    if (id) requested.push(id);
    return new Promise<Response>(() => undefined);
  });
}

function show(ratios: Readonly<Record<string, number>>) {
  act(() => {
    for (const record of observed) {
      for (const target of [...record.targets]) {
        const id = target.getAttribute("data-social-mux-band");
        const ratio = id != null && Object.prototype.hasOwnProperty.call(ratios, id) ? ratios[id]! : 0;
        record.callback([
          {
            isIntersecting: ratio > 0,
            intersectionRatio: ratio,
            target,
          },
        ]);
      }
    }
  });
}

function post(
  id: string,
  playbackId: string,
  playbackPolicy: "signed" | "public",
  media?: SocialFollowingWallCard["media"],
): SocialFollowingWallCard {
  return {
    id,
    body: id,
    likeCount: 0,
    commentCount: 0,
    liked: false,
    createdAt: "2026-09-29T12:00:00.000Z",
    authorId: "11111111-1111-4111-8111-111111111111",
    authorHandle: "ada",
    authorName: "Ada",
    authorPhotoUrl: null,
    groupSlug: null,
    groupName: null,
    canLike: false,
    owned: false,
    media: media ?? [
      {
        kind: "video",
        url: "",
        contentType: "video/mp4",
        playbackId,
        playbackPolicy,
      },
    ],
  };
}

describe("Following wall Mux active gate", () => {
  let root: Root | null = null;
  let container: HTMLElement | null = null;

  afterAll(() => {
    uninstallMinimalDocument();
  });

  afterEach(() => {
    if (root) {
      const mounted = root;
      act(() => {
        mounted.unmount();
      });
    }
    root = null;
    container?.remove();
    container = null;
    observed.length = 0;
    requested.length = 0;
    clearSocialMuxPlaybackTokenCache();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function html(): string {
    if (!container) return "";
    return serializeElement(container as unknown as Parameters<typeof serializeElement>[0]);
  }

  function mount(cards: readonly SocialFollowingWallCard[], observer = true) {
    if (observer) installObserver();
    else vi.stubGlobal("IntersectionObserver", undefined);
    installFetch();
    const host = minimalDocument();
    const node = host.createElement("div");
    host.body.appendChild(node);
    container = node as unknown as HTMLElement;
    root = createRoot(container);
    act(() => {
      root?.render(
        createElement(SocialFollowingWallBound, {
          viewerId: "viewer-1",
          topic: "All",
          cursor: null,
          wall: { truncated: false, nextCursor: null, cards: [...cards] },
        }),
      );
    });
  }

  it("does not mint signed playback before a video is 60 percent on screen", () => {
    const cards = [
      post("lead", PUBLIC_LEAD, "public"),
      post("next", SIGNED_NEXT, "signed"),
      post("later", SIGNED_LATER, "signed"),
      post("after", SIGNED_AFTER, "signed"),
      post("cold", SIGNED_COLD, "signed"),
      post("cold2", SIGNED_COLD2, "signed"),
    ];
    mount(cards);

    expect(requested).toEqual([]);
    expect(html()).not.toContain("data-mux-player-stub");
    expect(html()).not.toContain("data-social-mux-player");
    expect(observed).toHaveLength(cards.length);
    expect(observed.every((row) => [...row.threshold].join() === [...SOCIAL_FOLLOWING_MUX_ACTIVE_THRESHOLDS].join())).toBe(
      true,
    );

    show({ lead: 0.9 });

    expect(requested).toEqual([SIGNED_NEXT]);
    const page = html();
    expect(page).toContain(`data-mux-player-stub="${PUBLIC_LEAD}"`);
    expect(page).toContain('data-mux-autoplay="no"');
    expect(page).toContain('data-mux-muted="no"');
    expect(page).not.toContain(`data-social-mux-player="${SIGNED_NEXT}"`);
    expect(page).not.toContain(`data-mux-player-stub="${SIGNED_NEXT}"`);
    for (const id of [SIGNED_LATER, SIGNED_AFTER, SIGNED_COLD, SIGNED_COLD2]) {
      expect(requested).not.toContain(id);
      expect(page).not.toContain(`data-social-mux-player="${id}"`);
    }
    expect(page.match(/data-social-mux-slot="mount"/g)?.length).toBe(1);
    expect(page.match(/data-social-mux-slot="warm"/g)?.length).toBe(1);
    expect(page.match(/data-social-mux-slot="closed"/g)?.length).toBe(4);

    show({ lead: 0, later: 0.9 });

    expect(requested).toEqual([SIGNED_NEXT, SIGNED_LATER, SIGNED_AFTER]);
    const moved = html();
    expect(moved).not.toContain(`data-mux-player-stub="${PUBLIC_LEAD}"`);
    expect(moved).toContain(`data-social-mux-player="${SIGNED_LATER}"`);
    expect(moved).not.toContain(`data-social-mux-player="${SIGNED_NEXT}"`);
    expect(moved).not.toContain(`data-social-mux-player="${SIGNED_AFTER}"`);
    expect(requested).not.toContain(SIGNED_COLD);
    expect(requested).not.toContain(SIGNED_COLD2);
  });

  it("mounts the visible carousel Mux slide and warms the next Mux slide", () => {
    mount([
      post("reel", SLIDE_ONE, "signed", [
        { kind: "video", url: "", contentType: "video/mp4", playbackId: SLIDE_ONE, playbackPolicy: "signed" },
        { kind: "video", url: "", contentType: "video/mp4", playbackId: SLIDE_TWO, playbackPolicy: "signed" },
        { kind: "video", url: "", contentType: "video/mp4", playbackId: SLIDE_THREE, playbackPolicy: "signed" },
      ]),
    ]);

    expect(requested).toEqual([]);
    expect(html()).not.toContain("data-social-mux-player");
    expect(observed).toHaveLength(1);

    show({ reel: 0.8 });

    expect([...requested].sort()).toEqual([SLIDE_ONE, SLIDE_TWO].sort());
    expect(requested).not.toContain(SLIDE_THREE);
    const page = html();
    expect(page).toContain(`data-social-mux-player="${SLIDE_ONE}"`);
    expect(page).not.toContain(`data-social-mux-player="${SLIDE_TWO}"`);
    expect(page).not.toContain(`data-social-mux-player="${SLIDE_THREE}"`);
    expect(page.match(/data-social-mux-slot="warm"/g)?.length).toBe(1);
    expect(page).toContain('data-social-mux-slot="mount"');
  });

  it("mounts the first video and warms the next when IntersectionObserver is missing", () => {
    mount(
      [
        post("lead", PUBLIC_LEAD, "public"),
        post("next", SIGNED_NEXT, "signed"),
        post("cold", SIGNED_COLD, "signed"),
      ],
      false,
    );

    expect(requested).toEqual([SIGNED_NEXT]);
    const page = html();
    expect(page).toContain(`data-mux-player-stub="${PUBLIC_LEAD}"`);
    expect(page).not.toContain(`data-social-mux-player="${SIGNED_NEXT}"`);
    expect(page).not.toContain(`data-social-mux-player="${SIGNED_COLD}"`);
    expect(requested).not.toContain(SIGNED_COLD);
  });

  it("keeps the band on the optimistic feed and leaves other hosts unbanded", () => {
    const feed = readFileSync("src/components/social/social-optimistic-feed.tsx", "utf8");
    const card = readFileSync("src/components/social/social-post-card.tsx", "utf8");
    const media = readFileSync("src/components/social/social-post-media.tsx", "utf8");
    const video = readFileSync("src/components/social/social-feed-video.tsx", "utf8");
    const carousel = readFileSync("src/components/social/social-feed-carousel.tsx", "utf8");
    const player = readFileSync("src/components/social/social-mux-player.tsx", "utf8");
    const wall = readFileSync("src/components/social/social-following-wall-bound.tsx", "utf8");
    const explore = readFileSync("src/lib/social-explore-mux-warm.ts", "utf8");
    const author = readFileSync("src/lib/social-author-post-card.ts", "utf8");
    const history = card.slice(card.indexOf("export function SocialAuthorHistory"), card.indexOf("export function SocialPostCard"));
    expect(feed).toContain("SocialFollowingMuxBand");
    expect(feed).toContain("muxBandId={post.id}");
    expect(feed).toContain("@/components/social/social-post-card");
    expect(feed).not.toContain("social-ui");
    expect(feed.indexOf("<SocialFollowingMuxBand")).toBeLessThan(feed.indexOf("<SocialPostCard"));
    expect(card).toContain("muxBandId={muxBandId}");
    expect(media).toContain("muxBandId={muxBandId}");
    expect(video).toContain("SocialFollowingMuxWarm");
    expect(video).toContain('role === "mount"');
    expect(video).toContain('role === "warm"');
    expect(video).not.toContain("rootMargin");
    expect(carousel).toContain("SocialMuxPlayer");
    expect(carousel).toContain("SocialFollowingMuxWarm");
    expect(carousel).not.toContain("rootMargin");
    expect(player).toContain("social-home-following-mux-active-gate-lock-v1.md");
    expect(player).not.toContain("useSocialMuxActiveGate");
    expect(player).not.toContain("rootMargin");
    expect(player).toContain("loadSocialMuxPlaybackTokens");
    expect(wall).toContain("initialData");
    expect(wall).toContain("SocialOptimisticFeed");
    expect(wall).not.toContain("SocialMuxActiveGate");
    expect(explore).toContain("EXPLORE_FOR_YOU_MUX_WARM_AHEAD = 2");
    expect(author).not.toContain("muxBandId");
    expect(history).not.toContain("muxBandId");
    expect(readFileSync("src/components/social/social-activity-history.tsx", "utf8")).not.toContain("muxBandId");
    expect(readFileSync("src/app/(app)/social/p/[postId]/page.tsx", "utf8")).not.toContain("muxBandId");
    expect(readFileSync("src/components/social/social-feed-immersive.tsx", "utf8")).not.toContain("muxBandId");
    expect(readFileSync("src/components/social/social-dm-story-share.tsx", "utf8")).not.toContain("muxBandId");
    expect(readFileSync("src/components/social/social-dm-post-share.tsx", "utf8")).not.toContain("muxBandId");
    expect(readFileSync("src/lib/social-home-bounds.ts", "utf8")).toContain("SOCIAL_FOLLOWING_WALL_LIMIT = 50");
  });
});
