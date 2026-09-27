import "@/test/minimal-document";

import { readFileSync } from "node:fs";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

import { SocialStoryMuxThumb } from "@/components/social/social-story-mux-thumb";
import { SOCIAL_MUX_PLAYBACK_ROUTE, socialMuxThumbnailUrl } from "@/lib/social-mux";
import { installMinimalDocument, minimalDocument, serializeElement, uninstallMinimalDocument } from "@/test/minimal-document";

const PLAYBACK_A = "uNbxnGLKJ00yfbijDO8COxT";
const PLAYBACK_B = "zSecondPlaybackId01";
const THUMB_TOKEN = "thumb.jwt";

type PendingFetch = {
  url: string;
  resolve: (response: Response) => void;
  reject: (error: unknown) => void;
  settled: boolean;
};

const pending: PendingFetch[] = [];

function abortError(): DOMException {
  return new DOMException("The operation was aborted.", "AbortError");
}

function installFetch() {
  pending.length = 0;
  vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    return new Promise<Response>((resolve, reject) => {
      const entry: PendingFetch = { url, resolve, reject, settled: false };
      const finish = (settle: () => void) => {
        if (entry.settled) return;
        entry.settled = true;
        settle();
      };
      pending.push(entry);
      init?.signal?.addEventListener("abort", () => {
        finish(() => reject(abortError()));
      });
    });
  });
}

async function settleFetch(response: Response) {
  const entry = pending.shift();
  if (!entry) throw new Error("mux-playback was not requested");
  await act(async () => {
    if (!entry.settled) {
      entry.settled = true;
      entry.resolve(response);
    }
    for (let i = 0; i < 8; i += 1) await Promise.resolve();
  });
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("SocialStoryMuxThumb client mint", () => {
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
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function mount(props: { playbackId: string; playbackPolicy?: "signed" | "public"; url?: string }) {
    installFetch();
    const host = minimalDocument();
    const node = host.createElement("div");
    host.body.appendChild(node);
    container = node as unknown as HTMLElement;
    root = createRoot(container);
    act(() => {
      root?.render(
        <SocialStoryMuxThumb
          playbackId={props.playbackId}
          playbackPolicy={props.playbackPolicy}
          url={props.url ?? ""}
        />,
      );
    });
  }

  function html(): string {
    if (!container) return "";
    return serializeElement(container as unknown as Parameters<typeof serializeElement>[0]);
  }

  it("paints the thumbnail only after a token for this playback id", async () => {
    mount({ playbackId: PLAYBACK_A, playbackPolicy: "signed" });
    expect(html()).toContain('data-social-story-mux-thumb="pending"');
    expect(pending[0]?.url).toBe(
      `${SOCIAL_MUX_PLAYBACK_ROUTE}?playbackId=${encodeURIComponent(PLAYBACK_A)}`,
    );

    await settleFetch(
      jsonResponse(200, { playback: "play.jwt", thumbnail: THUMB_TOKEN, storyboard: "board.jwt" }),
    );

    expect(html()).toContain("<img");
    expect(html()).toContain(socialMuxThumbnailUrl(PLAYBACK_A, THUMB_TOKEN));
    expect(html()).not.toContain('data-social-story-mux-thumb="pending"');
  });

  it("stays pending when mux-playback is not ok", async () => {
    mount({ playbackId: PLAYBACK_A, playbackPolicy: "signed" });
    await settleFetch(jsonResponse(401, { error: "unauthorized" }));

    expect(html()).toContain('data-social-story-mux-thumb="pending"');
    expect(html()).not.toContain("image.mux.com");
    expect(html()).not.toContain("<img");
  });

  it("stays pending when mux-playback JSON is not a token set", async () => {
    mount({ playbackId: PLAYBACK_A, playbackPolicy: "signed" });
    await settleFetch(jsonResponse(200, { playback: "play.jwt" }));

    expect(html()).toContain('data-social-story-mux-thumb="pending"');
    expect(html()).not.toContain("image.mux.com");
    expect(html()).not.toContain("<img");
  });

  it("stays pending when mux-playback JSON does not parse", async () => {
    mount({ playbackId: PLAYBACK_A, playbackPolicy: "signed" });
    await settleFetch(new Response("not-json", { status: 200, headers: { "content-type": "application/json" } }));

    expect(html()).toContain('data-social-story-mux-thumb="pending"');
    expect(html()).not.toContain("image.mux.com");
    expect(html()).not.toContain("<img");
  });

  it("drops a minted token immediately when playbackId changes", async () => {
    mount({ playbackId: PLAYBACK_A, playbackPolicy: "signed" });
    await settleFetch(
      jsonResponse(200, { playback: "play.jwt", thumbnail: THUMB_TOKEN, storyboard: "board.jwt" }),
    );
    expect(html()).toContain(socialMuxThumbnailUrl(PLAYBACK_A, THUMB_TOKEN));

    await act(async () => {
      root?.render(
        <SocialStoryMuxThumb playbackId={PLAYBACK_B} playbackPolicy="signed" url="" />,
      );
    });

    expect(html()).toContain('data-social-story-mux-thumb="pending"');
    expect(html()).not.toContain(THUMB_TOKEN);
    expect(html()).not.toContain("image.mux.com");
    expect(html()).not.toContain("<img");
    expect(pending.some((entry) => entry.url.includes(encodeURIComponent(PLAYBACK_B)))).toBe(true);
  });

  it("drops a minted token immediately when playback is no longer signed", async () => {
    mount({ playbackId: PLAYBACK_A, playbackPolicy: "signed" });
    await settleFetch(
      jsonResponse(200, { playback: "play.jwt", thumbnail: THUMB_TOKEN, storyboard: "board.jwt" }),
    );

    await act(async () => {
      root?.render(
        <SocialStoryMuxThumb
          playbackId={PLAYBACK_A}
          playbackPolicy="public"
          url="https://image.mux.com/public-still.webp"
        />,
      );
    });

    expect(html()).toContain(socialMuxThumbnailUrl(PLAYBACK_A));
    expect(html()).not.toContain("public-still.webp");
    expect(html()).not.toContain(THUMB_TOKEN);
    expect(html()).not.toContain('data-social-story-mux-thumb="pending"');
  });

  it("paints the first frame and ignores a caller url on public playback", () => {
    mount({
      playbackId: PLAYBACK_A,
      playbackPolicy: "public",
      url: "https://image.mux.com/public-still.webp?time=12",
    });
    expect(html()).toContain(socialMuxThumbnailUrl(PLAYBACK_A));
    expect(html()).toContain("time=0");
    expect(html()).not.toContain("time=12");
    expect(html()).not.toContain("public-still.webp");
    expect(pending).toHaveLength(0);
  });

  it("does not reuse the prior mint when signed playback returns for the same id", async () => {
    mount({ playbackId: PLAYBACK_A, playbackPolicy: "signed" });
    await settleFetch(
      jsonResponse(200, { playback: "play.jwt", thumbnail: THUMB_TOKEN, storyboard: "board.jwt" }),
    );

    await act(async () => {
      root?.render(
        <SocialStoryMuxThumb
          playbackId={PLAYBACK_A}
          playbackPolicy="public"
          url="https://image.mux.com/public-still.webp"
        />,
      );
    });

    await act(async () => {
      root?.render(<SocialStoryMuxThumb playbackId={PLAYBACK_A} playbackPolicy="signed" url="" />);
    });

    expect(html()).toContain('data-social-story-mux-thumb="pending"');
    expect(html()).not.toContain(THUMB_TOKEN);
    expect(html()).not.toContain("image.mux.com");
    expect(html()).not.toContain("<img");
  });

  it("clears the minimal document globals after the file", () => {
    const src = readFileSync(new URL("../../test/minimal-document.ts", import.meta.url), "utf8");
    const at = src.indexOf("installMinimalDocument();\n");
    expect(src.slice(at, at + 90)).toContain("afterAll(() => {\n  uninstallMinimalDocument();");
    expect(globalThis.document).toBeTruthy();
    uninstallMinimalDocument();
    expect("document" in globalThis).toBe(false);
    expect("window" in globalThis).toBe(false);
    expect("HTMLIFrameElement" in globalThis).toBe(false);
    expect("IS_REACT_ACT_ENVIRONMENT" in globalThis).toBe(false);
    installMinimalDocument();
  });
});
