import "@/test/minimal-document";

import { createElement } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

import { SOCIAL_MUX_PLAYBACK_ROUTE } from "@/lib/social-mux";
import { minimalDocument, serializeElement, uninstallMinimalDocument } from "@/test/minimal-document";

vi.mock("next/image", () => ({
  default: ({
    src,
    loading,
    className,
  }: {
    src: string;
    loading?: string;
    className?: string;
  }) => createElement("img", { src, loading, className, alt: "" }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock("next/link", async () => {
  const React = await import("react");
  function MockLink({
    href,
    children,
    ...props
  }: {
    href: string;
    children?: React.ReactNode;
  }) {
    return React.createElement("a", { href, ...props }, children);
  }
  return { __esModule: true, default: MockLink };
});

import { SocialStoriesRail } from "./social-stories-rail";

const RING = 8;
const OBJECT_ID = "22222222-2222-4222-8222-222222222222";

type Observe = {
  callback: (entries: { isIntersecting: boolean; target: Element }[]) => void;
  targets: Element[];
};

const observed: Observe[] = [];
const fetches: string[] = [];

function authorId(index: number): string {
  return `11111111-1111-4111-8111-11111111110${index}`;
}

function playbackId(index: number): string {
  return `RailMint${index}PlaybackA`;
}

function installObserver() {
  observed.length = 0;
  class IntersectionObserverStub {
    private targets: Element[] = [];
    constructor(callback: Observe["callback"]) {
      observed.push({ callback, targets: this.targets });
    }
    observe(target: Element) {
      this.targets.push(target);
    }
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);
}

function installFetch() {
  fetches.length = 0;
  vi.stubGlobal("fetch", (input: RequestInfo | URL) => {
    fetches.push(String(input));
    return new Promise<Response>(() => {});
  });
}

function card(index: number, kind: "signed" | "still") {
  const author = authorId(index);
  const key = `stories/${author}/${OBJECT_ID}.${kind === "signed" ? "mp4" : "jpg"}`;
  return {
    authorId: author,
    storyIds: [`s${index}`],
    unseen: true,
    latest: {
      id: `s${index}`,
      author_id: author,
      body: null,
      media:
        kind === "signed"
          ? [
              {
                kind: "video" as const,
                key,
                contentType: "video/mp4" as const,
                provider: "mux" as const,
                playbackId: playbackId(index),
                playbackPolicy: "signed" as const,
              },
            ]
          : [{ kind: "image" as const, key, contentType: "image/jpeg" as const }],
      expires_at: "2099-01-01T00:00:00.000Z",
      created_at: "2026-09-14T12:00:00.000Z",
    },
  };
}

describe("Social Stories rail mint", () => {
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
    fetches.length = 0;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function mount(kind: "signed" | "still") {
    installObserver();
    installFetch();
    const cards = Array.from({ length: RING }, (_, index) => card(index, kind));
    const authors = new Map(cards.map((row) => [row.authorId, { display_name: "Maya Chen", handle: "maya" }]));
    const host = minimalDocument();
    const node = host.createElement("div");
    host.body.appendChild(node);
    container = node as unknown as HTMLElement;
    root = createRoot(container);
    act(() => {
      root?.render(
        <SocialStoriesRail cards={cards} authors={authors} faces={new Map()} canCreate={false} />,
      );
    });
  }

  function html(): string {
    if (!container) return "";
    return serializeElement(container as unknown as Parameters<typeof serializeElement>[0]);
  }

  async function reportFirst(intersecting: boolean) {
    const row = observed[0];
    if (!row || row.targets.length === 0) throw new Error("rail card was not observed");
    await act(async () => {
      row.callback([{ isIntersecting: intersecting, target: row.targets[0]! }]);
    });
  }

  it("does not mint a Mux JWT for the full ring on mount", async () => {
    mount("signed");
    expect(observed.length).toBe(RING);
    expect(fetches).toHaveLength(0);
    expect(html().match(/data-social-story-mux-thumb="pending"/g)?.length).toBe(RING);
    expect(html()).not.toContain("image.mux.com");
    expect(html()).not.toContain("<img");

    await reportFirst(false);
    expect(fetches).toHaveLength(0);

    await reportFirst(true);

    expect(fetches).toEqual([
      `${SOCIAL_MUX_PLAYBACK_ROUTE}?playbackId=${encodeURIComponent(playbackId(0))}`,
    ]);
    expect(fetches).toHaveLength(1);
  });

  it("does not request a story-still signed URL for the full ring on mount", async () => {
    mount("still");
    expect(observed.length).toBe(RING);
    expect(html().match(/data-social-story-rail-cover="held"/g)?.length).toBe(RING);
    expect(html()).not.toContain("/api/social/media?key=");
    expect(fetches).toHaveLength(0);

    await reportFirst(false);
    expect(html()).not.toContain("/api/social/media?key=");

    await reportFirst(true);

    const urls = html().match(/\/api\/social\/media\?key=/g) ?? [];
    expect(urls).toHaveLength(1);
    expect(html()).toContain(encodeURIComponent(`stories/${authorId(0)}/${OBJECT_ID}.jpg`));
    expect(html()).toContain('loading="eager"');
    expect(html()).not.toContain('loading="lazy"');
    expect(html().match(/data-social-story-rail-cover="held"/g)?.length).toBe(RING - 1);
    expect(html()).not.toContain("signed-avatar");
  });
});
