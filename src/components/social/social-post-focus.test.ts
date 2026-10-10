import { afterEach, describe, expect, it, vi } from "vitest";

import { focusSocialPostEntry, socialPostRemoveFocusNext } from "./social-post-focus";

// Where focus goes after a post is removed (social-post-owner-menu-lock-v1
// §4), over fake articles: the post after the copy acted on, then its name
// link, else its first shown Tab stop.

type FakeNode = {
  id?: string;
  isConnected?: boolean;
  focus: ReturnType<typeof vi.fn>;
  getAttribute?: (name: string) => string | null;
  getClientRects?: () => { length: number };
  closest?: (selector: string) => unknown;
  querySelector?: (selector: string) => unknown;
  querySelectorAll?: (selector: string) => unknown[];
};

function article(id: string, inside: { name?: FakeNode | null; stops?: FakeNode[] } = {}): FakeNode {
  return {
    id,
    isConnected: true,
    focus: vi.fn(),
    getAttribute: (name) => (name === "data-social-post" ? id : null),
    querySelector: (selector) => (selector === "a[data-social-post-name]" ? (inside.name ?? null) : null),
    querySelectorAll: () => inside.stops ?? [],
  };
}

function stop(shown: boolean): FakeNode {
  return { focus: vi.fn(), getClientRects: () => ({ length: shown ? 1 : 0 }) };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("socialPostRemoveFocusNext", () => {
  it("starts from the acting ⋯'s own article and skips the post's other copy", () => {
    const first = article("b");
    const x = article("x");
    const second = article("b");
    const c = article("c");
    vi.stubGlobal("document", { querySelectorAll: () => [first, x, second, c] });
    const trigger = { closest: () => second } as unknown as HTMLElement;
    expect(socialPostRemoveFocusNext(trigger, "b")).toBe(c);
    expect(socialPostRemoveFocusNext({ closest: () => first } as unknown as HTMLElement, "b")).toBe(x);
    expect(socialPostRemoveFocusNext(null, "b")).toBeNull();
  });
});

describe("focusSocialPostEntry", () => {
  function frames() {
    const queued: FrameRequestCallback[] = [];
    vi.stubGlobal("window", { requestAnimationFrame: (frame: FrameRequestCallback) => queued.push(frame) });
    return () => queued.splice(0).forEach((frame) => frame(0));
  }

  it("focuses the name link on the next frame", () => {
    const run = frames();
    const name = stop(true);
    const next = article("c", { name, stops: [stop(true)] });
    focusSocialPostEntry(next as unknown as HTMLElement);
    expect(name.focus).not.toHaveBeenCalled();
    run();
    expect(name.focus).toHaveBeenCalledTimes(1);
  });

  it("else the first Tab stop drawn at this width, never the hidden ⋯", () => {
    const run = frames();
    const hiddenPhoneMore = stop(false);
    const desktopMore = stop(true);
    focusSocialPostEntry(article("c", { stops: [hiddenPhoneMore, desktopMore] }) as unknown as HTMLElement);
    run();
    expect(hiddenPhoneMore.focus).not.toHaveBeenCalled();
    expect(desktopMore.focus).toHaveBeenCalledTimes(1);
  });

  it("does nothing once the article has left the page", () => {
    const run = frames();
    const name = stop(true);
    const gone = { ...article("c", { name }), isConnected: false };
    focusSocialPostEntry(gone as unknown as HTMLElement);
    run();
    expect(name.focus).not.toHaveBeenCalled();
  });
});
