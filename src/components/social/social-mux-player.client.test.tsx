import "@/test/minimal-document";

import { createElement } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

import { clearSocialMuxPlaybackTokenCache, SOCIAL_MUX_PLAYBACK_ROUTE, socialMuxThumbnailUrl } from "@/lib/social-mux";
import { minimalDocument, serializeElement, uninstallMinimalDocument } from "@/test/minimal-document";

vi.mock("next/dynamic", () => ({
  default: () =>
    function MuxPlayerStub(props: { playbackId?: string; poster?: string; onLoadedData?: () => void }) {
      return createElement("div", {
        "data-mux-player-stub": props.playbackId ?? "",
        "data-mux-poster": props.poster ?? "",
        ref: (node: { paint?: () => void } | null) => {
          if (node && props.onLoadedData) node.paint = props.onLoadedData;
        },
      });
    },
}));

import { SocialMuxPlayer } from "./social-mux-player";

const PLAYBACK_ID = "uNbxnGLKJ00yfbijDO8COxT";
const TOKENS = { playback: "play.jwt", thumbnail: "thumb.jwt", storyboard: "board.jwt" };

type NodeLike = {
  nodeType: number;
  tagName?: string;
  childNodes: NodeLike[];
  getAttribute?: (name: string) => string | null;
  dispatchEvent?: (event: Event) => boolean;
  paint?: () => void;
};

type PendingFetch = {
  resolve: (response: Response) => void;
  settled: boolean;
};

const pending: PendingFetch[] = [];

function installFetch() {
  pending.length = 0;
  vi.stubGlobal("fetch", (input: RequestInfo | URL) => {
    const url = String(input);
    expect(url).toBe(`${SOCIAL_MUX_PLAYBACK_ROUTE}?playbackId=${encodeURIComponent(PLAYBACK_ID)}`);
    return new Promise<Response>((resolve) => {
      pending.push({ resolve, settled: false });
    });
  });
}

function find(node: NodeLike, tag: string): NodeLike | null {
  if (node.tagName === tag) return node;
  for (const child of node.childNodes) {
    const match = find(child, tag);
    if (match) return match;
  }
  return null;
}

function findPlayer(node: NodeLike): NodeLike | null {
  if (node.getAttribute?.("data-mux-player-stub")) return node;
  for (const child of node.childNodes) {
    const match = findPlayer(child);
    if (match) return match;
  }
  return null;
}

describe("SocialMuxPlayer signed poster gate", () => {
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
    pending.length = 0;
    clearSocialMuxPlaybackTokenCache();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function mount(
    playbackPolicy: "signed" | "public",
    initialTokens?: { playback: string; thumbnail: string; storyboard: string },
  ) {
    installFetch();
    const host = minimalDocument();
    const node = host.createElement("div");
    host.body.appendChild(node);
    container = node as unknown as HTMLElement;
    root = createRoot(container);
    act(() => {
      root?.render(
        createElement(SocialMuxPlayer, {
          playbackId: PLAYBACK_ID,
          playbackPolicy,
          autoPlay: true,
          muted: true,
          initialTokens,
        }),
      );
    });
  }

  function html(): string {
    if (!container) return "";
    return serializeElement(container as unknown as Parameters<typeof serializeElement>[0]);
  }

  function tree(): NodeLike {
    return container as unknown as NodeLike;
  }

  async function settleTokens() {
    const entry = pending.shift();
    if (!entry) throw new Error("mux-playback was not requested");
    await act(async () => {
      entry.settled = true;
      entry.resolve(
        new Response(JSON.stringify(TOKENS), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
      for (let i = 0; i < 8; i += 1) await Promise.resolve();
    });
  }

  function decodePoster() {
    const img = find(tree(), "IMG");
    if (!img?.dispatchEvent) throw new Error("signed poster was not mounted");
    act(() => {
      img.dispatchEvent?.({ type: "load", target: img, currentTarget: img } as unknown as Event);
    });
  }

  it("paints the JWT thumb before the player and keeps it until the first frame", async () => {
    mount("signed");
    expect(html()).toContain('data-social-mux-poster="pending"');
    expect(html()).not.toContain("<img");
    expect(html()).not.toContain("image.mux.com");
    expect(html()).not.toContain("data-mux-player-stub");
    expect(pending).toHaveLength(1);

    await settleTokens();

    const thumb = socialMuxThumbnailUrl(PLAYBACK_ID, TOKENS.thumbnail);
    expect(html()).toContain("<img");
    expect(html()).toContain(thumb);
    expect(html()).not.toContain(`src="https://image.mux.com/${PLAYBACK_ID}/thumbnail.webp"`);
    expect(html()).not.toContain("data-mux-player-stub");
    expect(html()).not.toContain('data-social-mux-poster="pending"');

    decodePoster();

    expect(html()).toContain("data-mux-player-stub");
    expect(html()).toContain(thumb);
    expect(html()).toContain(`data-mux-poster="${thumb}"`);
    const player = findPlayer(tree());
    expect(player?.paint).toEqual(expect.any(Function));
    act(() => {
      player?.paint?.();
    });
    expect(html()).toContain("data-mux-player-stub");
    expect(html()).not.toContain("<img");
  });

  it("does not mint again when the signed thumb is already cached", async () => {
    mount("signed");
    await settleTokens();
    decodePoster();
    act(() => {
      root?.unmount();
    });
    root = null;
    container?.remove();
    container = null;

    mount("signed");
    expect(pending).toHaveLength(0);
    expect(html()).toContain(socialMuxThumbnailUrl(PLAYBACK_ID, TOKENS.thumbnail));
    expect(html()).not.toContain("data-mux-player-stub");
    expect(html()).not.toContain('data-social-mux-poster="pending"');
  });

  it("paints a provided JWT poster before any client mint", () => {
    mount("signed", TOKENS);
    const thumb = socialMuxThumbnailUrl(PLAYBACK_ID, TOKENS.thumbnail);
    expect(pending).toHaveLength(0);
    expect(html()).toContain("<img");
    expect(html()).toContain(thumb);
    expect(html()).not.toContain('data-social-mux-poster="pending"');
    expect(html()).not.toContain("data-mux-player-stub");
    expect(html()).not.toContain(`src="https://image.mux.com/${PLAYBACK_ID}/thumbnail.webp"`);
  });

  it("mounts a public player without waiting on a poster decode", () => {
    mount("public");
    expect(pending).toHaveLength(0);
    expect(html()).toContain("data-mux-player-stub");
    expect(html()).toContain('data-social-mux-playback="public"');
    expect(html()).not.toContain('data-social-mux-poster="pending"');
  });
});
