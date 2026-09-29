import "@/test/minimal-document";

import { createElement, type ReactNode } from "react";
import { readFileSync } from "node:fs";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

import { SOCIAL_FOLLOWING_MUX_ACTIVE_ROOT_MARGIN } from "@/lib/social-following-mux-active";
import type { SocialFollowingWallCard } from "@/lib/social-following-wall";
import { clearSocialMuxPlaybackTokenCache, SOCIAL_MUX_PLAYBACK_ROUTE } from "@/lib/social-mux";
import { minimalDocument, serializeElement, uninstallMinimalDocument } from "@/test/minimal-document";

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

import { SocialFollowingWallBound } from "./social-following-wall-bound";

const SIGNED_NEAR = ["VisibleOnePlayback01", "VisibleTwoPlayback02"] as const;
const SIGNED_COLD = ["ColdThreePlayback003", "ColdFourPlayback0004", "ColdFivePlayback0005"] as const;
const PUBLIC_NEAR = "PublicNearPlayback001";
const PUBLIC_COLD = "PublicColdPlayback001";

type Observed = {
  callback: (entries: Array<{ isIntersecting: boolean; target: Element }>) => void;
  rootMargin: string;
  targets: Element[];
};

const observed: Observed[] = [];
const requested: string[] = [];

function installObserver() {
  observed.length = 0;
  class FakeObserver {
    private record: Observed;
    constructor(callback: Observed["callback"], options?: { rootMargin?: string }) {
      this.record = { callback, rootMargin: options?.rootMargin ?? "", targets: [] };
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

function show(ids: ReadonlySet<string>) {
  act(() => {
    for (const record of observed) {
      for (const target of [...record.targets]) {
        const id = target.getAttribute("data-social-mux-player");
        record.callback([{ isIntersecting: id != null && ids.has(id), target }]);
      }
    }
  });
}

function post(id: string, playbackId: string, playbackPolicy: "signed" | "public"): SocialFollowingWallCard {
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
    media: [
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

  function mount(cards: readonly SocialFollowingWallCard[]) {
    installObserver();
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

  it("does not mint every signed video on the Following first page", () => {
    const cards = [
      post("a", SIGNED_NEAR[0], "signed"),
      post("b", SIGNED_NEAR[1], "signed"),
      post("c", PUBLIC_NEAR, "public"),
      post("d", SIGNED_COLD[0], "signed"),
      post("e", SIGNED_COLD[1], "signed"),
      post("f", SIGNED_COLD[2], "signed"),
      post("g", PUBLIC_COLD, "public"),
    ];
    mount(cards);

    expect(requested).toEqual([]);
    expect(html()).not.toContain("data-mux-player-stub");
    expect(observed).toHaveLength(cards.length);
    expect(observed.every((row) => row.rootMargin === SOCIAL_FOLLOWING_MUX_ACTIVE_ROOT_MARGIN)).toBe(true);

    show(new Set<string>([...SIGNED_NEAR, PUBLIC_NEAR]));

    expect([...requested].sort()).toEqual([...SIGNED_NEAR].sort());
    for (const id of [...SIGNED_COLD, PUBLIC_COLD, PUBLIC_NEAR]) {
      expect(requested).not.toContain(id);
    }

    const page = html();
    expect(page).toContain(`data-mux-player-stub="${PUBLIC_NEAR}"`);
    expect(page).toContain('data-mux-autoplay="no"');
    expect(page).toContain('data-mux-muted="no"');
    expect(page).not.toContain(`data-mux-player-stub="${PUBLIC_COLD}"`);
    expect(page.match(/data-social-mux-active="live"/g)?.length).toBe(3);
    expect(page.match(/data-social-mux-active="cold"/g)?.length).toBe(4);
    for (const id of SIGNED_COLD) {
      expect(page).toContain(`data-social-mux-player="${id}"`);
      expect(page).toContain('data-social-mux-playback="pending"');
    }

    show(new Set<string>([...SIGNED_NEAR, PUBLIC_NEAR, SIGNED_COLD[0]]));
    expect(requested.filter((id) => id === SIGNED_COLD[0])).toHaveLength(1);
    expect(requested).not.toContain(SIGNED_COLD[1]);
    expect(requested).not.toContain(SIGNED_COLD[2]);
  });

  it("keeps the Following feed inside the gate and withholds mint until armed", () => {
    const wall = readFileSync("src/components/social/social-following-wall-bound.tsx", "utf8");
    const player = readFileSync("src/components/social/social-mux-player.tsx", "utf8");
    expect(wall.indexOf("<SocialMuxActiveGate>")).toBeGreaterThan(-1);
    expect(wall.indexOf("<SocialMuxActiveGate>")).toBeLessThan(wall.indexOf("<SocialOptimisticFeed"));
    expect(player).toContain("socialFollowingMuxPlaybackArmed");
    expect(player).toContain("SOCIAL_FOLLOWING_MUX_ACTIVE_ROOT_MARGIN");
    const mint = player.indexOf("loadSocialMuxPlaybackTokens(");
    expect(mint).toBeGreaterThan(-1);
    expect(player.lastIndexOf("if (!armed) return", mint)).toBeGreaterThan(-1);
    expect(player.lastIndexOf("if (!armed) return", mint)).toBeLessThan(mint);
  });
});
