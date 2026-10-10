import "@/test/minimal-document";

import { act, useEffect, type MutableRefObject } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  useSocialPostCaptionWindow,
  type SocialPostCaptionRequest,
  type SocialPostCaptionWindowApi,
} from "@/components/social/social-post-caption-context";
import { SOCIAL, SOCIAL_ROUTES } from "@/lib/social";
import {
  SOCIAL_POST_CAPTION_ENTRY_FLAG,
  hideSocialPost,
  parseSocialPostCaptionWindow,
  resetSocialPostOwnForTests,
  socialPostCaptionWindowOpenHref,
} from "@/lib/social-post-own";

// The one Edit caption host, driven as the browser drives it
// (docs/design-locks/social-post-caption-window-lock-v1.md §3, §5): the real
// house window entry over a browser history and Next's address, with the
// window itself stubbed. A stubbed window with no changes closes when asked,
// as the shell's requestClose does.

type WindowProps = {
  authorName: string;
  baseline: string | null;
  initialDraft: string;
  initialError: string;
  waiting: boolean;
  requestRef: MutableRefObject<(() => boolean) | null>;
  onSave: (body: string | null, draft: string) => void;
  onClose: () => void;
};

// `loading`: the window's code has not arrived, so nothing mounts yet.
const view = vi.hoisted(() => ({ window: null as WindowProps | null, mounts: 0, loading: false }));

vi.mock("next/dynamic", async () => {
  const { createElement, useEffect, useLayoutEffect, useRef } = await import("react");
  function LoadedCaptionWindow(props: WindowProps) {
    const { requestRef } = props;
    const latestRef = useRef(props);
    useLayoutEffect(() => {
      view.mounts += 1;
      return () => {
        view.window = null;
      };
    }, []);
    useLayoutEffect(() => {
      latestRef.current = props;
      view.window = props;
    });
    useEffect(() => {
      requestRef.current = () => {
        latestRef.current.onClose();
        return true;
      };
      return () => {
        requestRef.current = null;
      };
    }, [requestRef]);
    return null;
  }
  return {
    default: () =>
      function CaptionWindowStub(props: WindowProps) {
        return view.loading ? null : createElement(LoadedCaptionWindow, props);
      },
  };
});

// The shell's address (an owned hop wins) and Next's.
const page = vi.hoisted(() => ({ next: "/social", owned: null as string | null }));

vi.mock("@/components/chrome/house-client-shell", () => ({
  useHouseClient: () => {
    const href = page.owned ?? page.next;
    const url = new URL(href, "https://app.test");
    const next = new URL(page.next, "https://app.test");
    return {
      pathname: url.pathname,
      search: url.search,
      href,
      screenKey: url.pathname,
      nextPathname: next.pathname,
      nextSearch: next.search,
      nextKey: next.pathname,
      navigateOwned: () => false,
    };
  },
}));

type SaveInput = {
  postId: string;
  body: string | null;
  groupSlug: string | null;
  onSaved?: () => void;
  onFailed?: (error: string) => void;
};

// The save stays with the server until a test answers it.
const saves = vi.hoisted(() => [] as SaveInput[]);

vi.mock("@/lib/social-optimistic", () => ({
  saveSocialPostCaption: (input: SaveInput) => {
    saves.push(input);
    return new Promise<void>(() => undefined);
  },
}));

import { SocialPostCaptionHost } from "./social-post-caption-host";

const ORIGIN = "https://app.test";
const FAILED = SOCIAL.post.editFailed;

function pathOf(url: string): string {
  const parsed = new URL(url, ORIGIN);
  return `${parsed.pathname}${parsed.search}`;
}

// The browser: its entries, its address and the window's listeners.
type Entry = { state: Record<string, unknown> | null; url: string };
const browser = { entries: [] as Entry[], index: 0 };
const address = { origin: ORIGIN, pathname: "/social", search: "" };
type Listener = { fn: (event: unknown) => void; once: boolean };
const listeners = new Map<string, Listener[]>();

function point(url: string) {
  const parsed = new URL(url, ORIGIN);
  address.pathname = parsed.pathname;
  address.search = parsed.search;
}

// Next patches the history calls: a write without its private `__NA` mark
// moves Next's address there, and the shell drops its owned hop.
function nextFollows(state: Record<string, unknown> | null, url: string) {
  if (state?.__NA === true) return;
  page.next = pathOf(url);
  page.owned = null;
}

const fakeHistory = {
  get state() {
    return browser.entries[browser.index]?.state ?? null;
  },
  pushState: vi.fn((state: Record<string, unknown> | null, _title: string, url: string) => {
    browser.entries.splice(browser.index + 1);
    browser.entries.push({ state, url });
    browser.index = browser.entries.length - 1;
    point(url);
    nextFollows(state, url);
  }),
  replaceState: vi.fn((state: Record<string, unknown> | null, _title: string, url: string) => {
    browser.entries[browser.index] = { state, url };
    point(url);
    nextFollows(state, url);
  }),
  // The browser goes Back later; landBack delivers it.
  back: vi.fn(),
};

function fire(type: string) {
  const list = listeners.get(type) ?? [];
  listeners.set(
    type,
    list.filter((listener) => !listener.once),
  );
  for (const listener of list) listener.fn({ type });
}

const probe: { api: SocialPostCaptionWindowApi | null } = { api: null };

function ApiProbe() {
  const api = useSocialPostCaptionWindow();
  useEffect(() => {
    probe.api = api;
  });
  return null;
}

let container: { remove(): void };
let root: Root;

function paint() {
  root.render(
    <SocialPostCaptionHost>
      <ApiProbe />
    </SocialPostCaptionHost>,
  );
}

function render() {
  act(() => paint());
}

function startAt(url: string) {
  browser.entries = [{ state: { __NA: true }, url }];
  browser.index = 0;
  point(url);
  page.next = pathOf(url);
  page.owned = null;
  render();
}

// A profile tab or activity pill: the shell pushStates with `__NA`, so Next
// keeps the address it loaded for as long as the pill is on.
function panelHop(url: string) {
  act(() => {
    fakeHistory.pushState({ __NA: true, houseClient: true }, "", url);
    page.owned = pathOf(url);
    paint();
  });
}

// A Home lane chip: the shell owns the href in the click, with no pushState,
// and Next still has to load it.
function laneHop(url: string) {
  act(() => {
    page.owned = pathOf(url);
    paint();
  });
}

function laneLands() {
  act(() => {
    const url = page.owned!;
    fakeHistory.pushState({ __NA: true }, "", url);
    page.next = url;
    page.owned = null;
    paint();
  });
}

// The browser goes Back one entry: Next restores it, the shell drops any
// owned hop, then the window's popstate listeners run.
function landBack() {
  act(() => {
    browser.index -= 1;
    const entry = browser.entries[browser.index]!;
    point(entry.url);
    page.next = pathOf(entry.url);
    page.owned = null;
    fire("popstate");
    paint();
  });
}

// A close's follow-up runs on a timer after the popstate.
async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

function trigger(): HTMLElement {
  return { isConnected: true, focus: vi.fn() } as unknown as HTMLElement;
}

function request(postId: string, authorName: string): SocialPostCaptionRequest {
  return {
    postId,
    serverBody: `${authorName} words`,
    hasMedia: false,
    media: [],
    authorName,
    authorPhotoUrl: null,
    groupSlug: null,
    trigger: trigger(),
  };
}

function open(req: SocialPostCaptionRequest) {
  act(() => probe.api!.open(req));
}

function save(words: string) {
  act(() => view.window!.onSave(words, words));
}

function answer(index: number, error: string) {
  act(() => saves[index]!.onFailed?.(error));
}

function captionPushes(): string[] {
  return fakeHistory.pushState.mock.calls
    .filter(([state]) => state?.[SOCIAL_POST_CAPTION_ENTRY_FLAG] === true)
    .map(([, , url]) => url);
}

function openHref(url: string): string {
  const parsed = new URL(url, ORIGIN);
  return socialPostCaptionWindowOpenHref(parsed.pathname, parsed.search);
}

beforeEach(() => {
  resetSocialPostOwnForTests();
  view.window = null;
  view.mounts = 0;
  view.loading = false;
  saves.length = 0;
  probe.api = null;
  listeners.clear();
  fakeHistory.pushState.mockClear();
  fakeHistory.replaceState.mockClear();
  fakeHistory.back.mockClear();
  vi.stubGlobal("location", address);
  vi.stubGlobal("history", fakeHistory);
  vi.stubGlobal("addEventListener", (type: string, fn: (event: unknown) => void, options?: unknown) => {
    const once = typeof options === "object" && options !== null && (options as { once?: boolean }).once === true;
    listeners.set(type, [...(listeners.get(type) ?? []), { fn, once }]);
  });
  vi.stubGlobal("removeEventListener", (type: string, fn: (event: unknown) => void) => {
    listeners.set(
      type,
      (listeners.get(type) ?? []).filter((listener) => listener.fn !== fn),
    );
  });
  vi.stubGlobal("requestAnimationFrame", () => 0);
  const element = document.createElement("div");
  document.body.appendChild(element);
  container = element;
  root = createRoot(element as unknown as HTMLElement);
  startAt("/social");
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

describe("Edit caption host, driven (social-post-caption-window-lock-v1)", () => {
  it("opens at once on a settled address, on its own ?caption entry, with the caption as it shows", () => {
    open(request("post-a", "Ada"));
    expect(view.window).toMatchObject({
      authorName: "Ada",
      baseline: "Ada words",
      initialDraft: "Ada words",
      initialError: "",
      waiting: false,
    });
    expect(captionPushes()).toEqual([openHref("/social")]);
    expect(parseSocialPostCaptionWindow(address.search)).toBe("caption");
  });

  // Bugbot on #804: Back while the window's code still loads closes it
  // through the host, so the post goes with it and Edit opens again.
  it("opens Edit again after Back closed a window whose code was still loading", async () => {
    view.loading = true;
    open(request("post-a", "Ada"));
    expect(view.window).toBeNull();
    expect(captionPushes()).toEqual([openHref("/social")]);
    landBack();
    await settle();
    expect(address.search).toBe("");
    expect(fakeHistory.back).not.toHaveBeenCalled();
    view.loading = false;
    render();
    // Nothing comes back on its own once the code arrives.
    expect(view.window).toBeNull();
    open(request("post-b", "Bea"));
    expect(view.window?.authorName).toBe("Bea");
    expect(captionPushes()).toEqual([openHref("/social"), openHref("/social")]);
    expect(parseSocialPostCaptionWindow(address.search)).toBe("caption");
  });

  it("keeps one caption window at a time", () => {
    open(request("post-a", "Ada"));
    open(request("post-b", "Bea"));
    expect(view.window?.authorName).toBe("Ada");
    expect(captionPushes()).toHaveLength(1);
  });

  // A profile tab or activity pill never loads in Next, so the shell's
  // address stays ahead of Next's for as long as the pill is on.
  it.each([
    [SOCIAL_ROUTES.profile, `${SOCIAL_ROUTES.profile}?tab=activity&activity=images`],
    [SOCIAL_ROUTES.profile, `${SOCIAL_ROUTES.profile}?tab=activity&activity=comments`],
    [`${SOCIAL_ROUTES.profile}?tab=activity`, `${SOCIAL_ROUTES.profile}?tab=activity&activity=videos`],
    ["/social/u/ana", "/social/u/ana?tab=activity&activity=images"],
  ])("opens at once over a profile pill Next never loads (%s, then %s)", (start, pill) => {
    startAt(start);
    panelHop(pill);
    open(request("post-a", "Ada"));
    expect(view.window?.authorName).toBe("Ada");
    expect(captionPushes()).toEqual([openHref(pill)]);
    expect(pathOf(`${address.pathname}${address.search}`)).toBe(openHref(pill));
  });

  it("opens nothing later on its own after a profile pill hop", async () => {
    startAt(SOCIAL_ROUTES.profile);
    panelHop(`${SOCIAL_ROUTES.profile}?tab=activity&activity=comments`);
    open(request("post-a", "Ada"));
    expect(view.window?.authorName).toBe("Ada");
    act(() => view.window!.onClose());
    landBack();
    await settle();
    // Back on the Posts pill: the address settles and nothing opens.
    panelHop(SOCIAL_ROUTES.profile);
    await settle();
    expect(view.window).toBeNull();
    expect(captionPushes()).toHaveLength(1);
  });

  it("waits for a Home lane that is still loading, then opens over the lane", () => {
    laneHop("/social?lane=for-you");
    open(request("post-a", "Ada"));
    expect(view.window).toBeNull();
    expect(captionPushes()).toHaveLength(0);
    laneLands();
    expect(view.window?.authorName).toBe("Ada");
    expect(captionPushes()).toEqual([openHref("/social?lane=for-you")]);
  });

  it("opens nothing when the queued Edit's card left the page before the lane landed", () => {
    laneHop("/social?lane=for-you");
    const req = request("post-a", "Ada");
    open(req);
    (req.trigger as unknown as { isConnected: boolean }).isConnected = false;
    laneLands();
    expect(view.window).toBeNull();
    expect(captionPushes()).toHaveLength(0);
  });

  it("saves in the background, then closes through Back", async () => {
    open(request("post-a", "Ada"));
    save("New words");
    expect(saves).toHaveLength(1);
    expect(saves[0]).toMatchObject({ postId: "post-a", body: "New words", groupSlug: null });
    expect(view.window).toBeNull();
    expect(fakeHistory.back).toHaveBeenCalledTimes(1);
    landBack();
    await settle();
    expect(address.search).toBe("");
    expect(view.window).toBeNull();
  });

  it("reopens a failed save with the draft and the line once nothing is open", async () => {
    open(request("post-a", "Ada"));
    save("New words");
    landBack();
    await settle();
    answer(0, FAILED);
    expect(view.window).toMatchObject({ authorName: "Ada", initialDraft: "New words", initialError: FAILED });
    expect(captionPushes()).toHaveLength(2);
    expect(parseSocialPostCaptionWindow(address.search)).toBe("caption");
  });

  it("reopens in place when that post's window is open again, waiting for the answer", async () => {
    open(request("post-a", "Ada"));
    save("New words");
    landBack();
    await settle();
    open(request("post-a", "Ada"));
    const mounts = view.mounts;
    answer(0, FAILED);
    expect(view.window).toMatchObject({ authorName: "Ada", initialDraft: "New words", initialError: FAILED });
    // A fresh window on the entry already open: no second entry.
    expect(view.mounts).toBe(mounts + 1);
    expect(captionPushes()).toHaveLength(2);
  });

  it("holds a failure behind another post's window and reopens it once that one has closed", async () => {
    open(request("post-a", "Ada"));
    save("New words");
    landBack();
    await settle();
    open(request("post-b", "Bea"));
    answer(0, FAILED);
    expect(view.window).toMatchObject({ authorName: "Bea", initialError: "" });
    act(() => view.window!.onClose());
    expect(view.window).toBeNull();
    landBack();
    await settle();
    expect(view.window).toMatchObject({ authorName: "Ada", initialDraft: "New words", initialError: FAILED });
  });

  it("holds an Edit chosen while the last window's Back is still landing, then opens it", async () => {
    open(request("post-a", "Ada"));
    act(() => view.window!.onClose());
    open(request("post-b", "Bea"));
    expect(view.window).toBeNull();
    expect(captionPushes()).toHaveLength(1);
    landBack();
    await settle();
    expect(view.window?.authorName).toBe("Bea");
    expect(captionPushes()).toHaveLength(2);
  });

  it("never reopens a post that was removed meanwhile", async () => {
    open(request("post-a", "Ada"));
    save("New words");
    landBack();
    await settle();
    act(() => hideSocialPost("post-a"));
    answer(0, FAILED);
    expect(view.window).toBeNull();
    expect(captionPushes()).toHaveLength(1);
  });

  it("drops a held failure whose post was removed before the other window closed", async () => {
    open(request("post-a", "Ada"));
    save("New words");
    landBack();
    await settle();
    open(request("post-b", "Bea"));
    answer(0, FAILED);
    act(() => hideSocialPost("post-a"));
    act(() => view.window!.onClose());
    landBack();
    await settle();
    expect(view.window).toBeNull();
    expect(captionPushes()).toHaveLength(2);
  });

  // Browser Back on a window with no changes closes it with no Back of its
  // own, so its follow-up runs at once and the held failure reopens there.
  it("keeps the entry of a window that reopens as Back closes another, so its close goes Back", async () => {
    open(request("post-a", "Ada"));
    save("New words");
    landBack();
    await settle();
    open(request("post-b", "Bea"));
    answer(0, FAILED);
    landBack();
    expect(view.window).toMatchObject({ authorName: "Ada", initialError: FAILED });
    expect(parseSocialPostCaptionWindow(address.search)).toBe("caption");
    const backs = fakeHistory.back.mock.calls.length;
    act(() => view.window!.onClose());
    // Its own entry goes Back; stripping it in place would leave a dead entry.
    expect(fakeHistory.back).toHaveBeenCalledTimes(backs + 1);
    expect(fakeHistory.replaceState).not.toHaveBeenCalled();
    landBack();
    await settle();
    expect(browser.index).toBe(0);
    expect(address.search).toBe("");
    expect(view.window).toBeNull();
  });
});
