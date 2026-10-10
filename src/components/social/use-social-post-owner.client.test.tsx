import "@/test/minimal-document";

import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// A post's ⋯, driven (docs/design-locks/social-post-owner-menu-lock-v1.md
// §4–§6): the owner hook over a minimal document, with the request held
// until a test answers it, the clock and the frames in the test's hands, and
// fake ⋯, rows and panel that record focus.

const env = vi.hoisted(() => ({ desktop: false, pathname: "/social", caption: true, now: 0 }));
const router = vi.hoisted(() => ({ refresh: vi.fn() }));
const queryClient = vi.hoisted(() => ({ invalidateQueries: vi.fn() }));
const caption = vi.hoisted(() => ({ open: vi.fn(), warm: vi.fn() }));
const focusHelpers = vi.hoisted(() => ({ next: vi.fn(), entry: vi.fn() }));
const focusables = vi.hoisted(() => ({ list: (() => []) as (root: unknown) => unknown[] }));

type Answer = { resolve: (value: { error?: string }) => void; reject: (reason: unknown) => void };
const persist = vi.hoisted(() => ({ forms: [] as FormData[], answers: [] as Answer[] }));

vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/components/chrome/house-client-shell", () => ({ useHousePathname: () => env.pathname }));
vi.mock("@/components/chrome/house-overlay", () => ({
  useHouseDesktop: () => env.desktop,
  isHouseDesktop: () => env.desktop,
}));
vi.mock("@/components/query-provider", () => ({ useAppQueryClient: () => queryClient }));
vi.mock("@/components/social/social-post-caption-context", () => ({
  useSocialPostCaptionWindow: () => (env.caption ? caption : null),
}));
vi.mock("@/components/social/social-post-focus", () => ({
  socialPostRemoveFocusNext: (...args: unknown[]) => focusHelpers.next(...args),
  focusSocialPostEntry: (...args: unknown[]) => focusHelpers.entry(...args),
}));
vi.mock("@/lib/social-optimistic", () => ({
  persistSocialPostDelete: (form: FormData) =>
    new Promise((resolve, reject) => {
      persist.forms.push(form);
      persist.answers.push({ resolve, reject });
    }),
}));
vi.mock("@/lib/house-window", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/house-window")>()),
  houseWindowFocusables: (root: unknown) => focusables.list(root),
}));

import { SOCIAL } from "@/lib/social";
import { readSocialPostHidden, resetSocialPostOwnForTests } from "@/lib/social-post-own";
import { useSocialPostOwner } from "./use-social-post-owner";

const POST = "post-1";
const LINE = SOCIAL.post.deleteFailed;

type Owner = ReturnType<typeof useSocialPostOwner>;
const probe: { owner: Owner | null } = { owner: null };

function Probe({ groupSlug }: { groupSlug: string | null }) {
  const owner = useSocialPostOwner({
    postId: POST,
    serverBody: "words",
    hasMedia: false,
    media: [],
    authorName: "Ada",
    authorPhotoUrl: null,
    groupSlug,
  });
  useEffect(() => {
    probe.owner = owner;
  });
  return null;
}

type Fake = { name: string; isConnected: boolean; focus: ReturnType<typeof vi.fn>; contains: (node: unknown) => boolean };

function fake(name: string, inside: unknown[] = []): Fake {
  return { name, isConnected: true, focus: vi.fn(), contains: (node) => inside.includes(node) };
}

let root: Root;
let container: { remove(): void };
let groupSlug: string | null = null;
let frames: Array<FrameRequestCallback | null> = [];
let windowListeners: Array<{ type: string; fn: (event: unknown) => void }> = [];
let phone: Fake;
let desktopTrigger: Fake;
let rowA: Fake;
let rowB: Fake;
let surface: Fake;
let panel: Fake;
let active: unknown = null;

function owner(): Owner {
  return probe.owner!;
}

function paint() {
  act(() => root.render(<Probe groupSlug={groupSlug} />));
}

function attach() {
  owner().phoneTriggerRef.current = phone as unknown as HTMLButtonElement;
  owner().desktopTriggerRef.current = desktopTrigger as unknown as HTMLButtonElement;
  owner().surfaceRef.current = surface as unknown as HTMLDivElement;
  owner().panelRef.current = panel as unknown as HTMLDivElement;
}

function at(now: number, run: () => void) {
  env.now = now;
  act(run);
}

function runFrames() {
  act(() => {
    const list = frames;
    frames = [];
    for (const frame of list) frame?.(0);
  });
}

function queuedFrames(): number {
  return frames.filter(Boolean).length;
}

type KeyEvent = { type: string; key: string; shiftKey: boolean; defaultPrevented: boolean; preventDefault(): void };

function key(name: string, shiftKey = false): KeyEvent {
  const event: KeyEvent = {
    type: "keydown",
    key: name,
    shiftKey,
    defaultPrevented: false,
    preventDefault() {
      event.defaultPrevented = true;
    },
  };
  act(() => {
    (document as unknown as { dispatchEvent(event: unknown): boolean }).dispatchEvent(event);
  });
  return event;
}

async function answer(index: number, value: { error?: string }) {
  await act(async () => {
    persist.answers[index]!.resolve(value);
    await Promise.resolve();
  });
}

async function fail(index: number, reason: unknown) {
  await act(async () => {
    persist.answers[index]!.reject(reason);
    await Promise.resolve();
  });
}

/** The ⋯ opened the confirm at 1000 (the popover's Remove). */
function openConfirm() {
  at(1000, () => owner().chooseRemove());
}

beforeEach(() => {
  resetSocialPostOwnForTests();
  env.desktop = false;
  env.pathname = "/social";
  env.caption = true;
  env.now = 0;
  groupSlug = null;
  frames = [];
  windowListeners = [];
  active = null;
  persist.forms.length = 0;
  persist.answers.length = 0;
  router.refresh.mockClear();
  queryClient.invalidateQueries.mockClear();
  caption.open.mockReset();
  caption.warm.mockClear();
  focusHelpers.next.mockReset();
  focusHelpers.entry.mockReset();
  focusables.list = () => [];
  phone = fake("phone ⋯");
  desktopTrigger = fake("desktop ⋯");
  rowA = fake("Edit caption row");
  rowB = fake("Remove row");
  surface = fake("sheet", [rowA, rowB]);
  panel = fake("ask panel");
  vi.spyOn(performance, "now").mockImplementation(() => env.now);
  vi.stubGlobal("requestAnimationFrame", (frame: FrameRequestCallback) => {
    frames.push(frame);
    return frames.length;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => {
    frames[id - 1] = null;
  });
  vi.stubGlobal("addEventListener", (type: string, fn: (event: unknown) => void) => {
    windowListeners.push({ type, fn });
  });
  vi.stubGlobal("removeEventListener", (type: string, fn: (event: unknown) => void) => {
    windowListeners = windowListeners.filter((listener) => listener.type !== type || listener.fn !== fn);
  });
  Object.defineProperty(document, "activeElement", { configurable: true, get: () => active });
  (document.body as unknown as { style: Record<string, string> }).style.overflow = "scroll";
  const element = document.createElement("div");
  document.body.appendChild(element);
  container = element;
  root = createRoot(element as unknown as HTMLElement);
  paint();
  attach();
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  probe.owner = null;
  delete (document as unknown as { activeElement?: unknown }).activeElement;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("the owner hook: one request and the press guard", () => {
  it("sends one request however often Remove is pressed while it waits", () => {
    openConfirm();
    at(1600, () => void owner().remove());
    at(1650, () => void owner().remove());
    expect(persist.forms).toHaveLength(1);
    expect(owner().state).toMatchObject({ step: "confirm", pending: true });
  });

  it("ignores Remove in the first 500 ms after the confirm appears, then takes it", () => {
    openConfirm();
    at(1200, () => void owner().remove());
    expect(persist.forms).toHaveLength(0);
    expect(owner().state).toMatchObject({ step: "confirm", pending: false });
    at(1600, () => void owner().remove());
    expect(persist.forms).toHaveLength(1);
  });

  it("ignores the confirm's scrim in the first 500 ms (a double-click's second click)", () => {
    openConfirm();
    at(1200, () => owner().dismissFromScrim());
    expect(owner().state.step).toBe("confirm");
    at(1600, () => owner().dismissFromScrim());
    expect(owner().state.step).toBe("closed");
  });
});

describe("the owner hook: nothing dismisses mid-request, and a failure shows in place", () => {
  it("holds the confirm, and focus, through Keep, Esc and an address change while waiting", async () => {
    openConfirm();
    at(1600, () => void owner().remove());
    act(() => owner().dismiss());
    const escape = key("Escape");
    expect(escape.defaultPrevented).toBe(true);
    env.pathname = "/social/groups";
    paint();
    expect(owner().state).toMatchObject({ step: "confirm", pending: true });
    // Nothing sent focus back to the ⋯ behind the confirm.
    expect(queuedFrames()).toBe(0);
    expect(phone.focus).not.toHaveBeenCalled();

    await answer(0, { error: LINE });
    expect(owner().state).toMatchObject({ step: "confirm", pending: false, error: LINE });
    expect(readSocialPostHidden(POST)).toBe(false);
    expect(router.refresh).not.toHaveBeenCalled();
    expect(focusHelpers.entry).not.toHaveBeenCalled();

    // A retry clears the old line while it waits.
    at(5000, () => void owner().remove());
    expect(owner().state).toMatchObject({ step: "confirm", pending: true, error: "" });
    await answer(1, { error: LINE });
    act(() => owner().dismiss());
    expect(owner().state).toMatchObject({ step: "closed", error: "" });
  });

  it("ends the wait with the house line when the request throws", async () => {
    openConfirm();
    at(1600, () => void owner().remove());
    await fail(0, new Error("network"));
    expect(owner().state).toMatchObject({ step: "confirm", pending: false, error: SOCIAL.post.deleteFailed });
  });
});

describe("the owner hook: a removal", () => {
  it("picks the next post before hiding this one, then hides every copy, refreshes and focuses it", async () => {
    const article = { name: "the next post" };
    // The page as the DOM reads it: once the post is hidden its copies are gone.
    focusHelpers.next.mockImplementation(() => (readSocialPostHidden(POST) ? null : article));
    openConfirm();
    at(1600, () => void owner().remove());
    await answer(0, {});
    expect(focusHelpers.next).toHaveBeenCalledWith(phone, POST);
    expect(focusHelpers.entry).toHaveBeenCalledWith(article);
    expect(readSocialPostHidden(POST)).toBe(true);
    expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(1);
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["social", "following-wall"] });
    expect(router.refresh).toHaveBeenCalledTimes(1);
    expect(owner().state.step).toBe("closed");
    runFrames();
    expect(phone.focus).not.toHaveBeenCalled();
  });

  it("sends the post id, and the group only when the post has one", async () => {
    openConfirm();
    at(1600, () => void owner().remove());
    expect(persist.forms[0]!.get("post_id")).toBe(POST);
    expect(persist.forms[0]!.has("group_slug")).toBe(false);
    await answer(0, { error: LINE });
    groupSlug = "film-club";
    paint();
    at(5000, () => void owner().remove());
    expect(persist.forms[1]!.get("group_slug")).toBe("film-club");
  });
});

describe("the owner hook: idle dismissals and the address", () => {
  it("closes the sheet on Esc and returns focus to the ⋯ on the next frame", () => {
    act(() => owner().openSheet());
    expect(caption.warm).toHaveBeenCalledTimes(1);
    const escape = key("Escape");
    expect(escape.defaultPrevented).toBe(true);
    expect(owner().state.step).toBe("closed");
    expect(queuedFrames()).toBe(1);
    runFrames();
    expect(phone.focus).toHaveBeenCalledTimes(1);
  });

  it("closes the sheet from its scrim the same way", () => {
    act(() => owner().openSheet());
    act(() => owner().dismissFromScrim());
    expect(owner().state.step).toBe("closed");
    runFrames();
    expect(phone.focus).toHaveBeenCalledTimes(1);
  });

  it("closes on a house pathname change, and never on a bare popstate", () => {
    act(() => owner().openSheet());
    for (const listener of windowListeners.filter((item) => item.type === "popstate")) {
      act(() => listener.fn({ type: "popstate" }));
    }
    expect(windowListeners.some((item) => item.type === "popstate")).toBe(false);
    expect(owner().state.step).toBe("menu");
    env.pathname = "/social/explore";
    paint();
    expect(owner().state.step).toBe("closed");
  });

  it("closes an idle confirm on Esc with focus back on the ⋯", () => {
    openConfirm();
    key("Escape");
    expect(owner().state.step).toBe("closed");
    runFrames();
    expect(phone.focus).toHaveBeenCalledTimes(1);
  });
});

describe("the owner hook: focus in and Tab", () => {
  it("focuses the sheet's first row as it opens, and keeps Tab inside", () => {
    focusables.list = (rootNode) => (rootNode === surface ? [rowA, rowB] : []);
    act(() => owner().openSheet());
    runFrames();
    expect(rowA.focus).toHaveBeenCalledTimes(1);
    active = rowB;
    const tab = key("Tab");
    expect(tab.defaultPrevented).toBe(true);
    expect(rowA.focus).toHaveBeenCalledTimes(2);
    active = rowA;
    const back = key("Tab", true);
    expect(back.defaultPrevented).toBe(true);
    expect(rowB.focus).toHaveBeenCalledTimes(1);
  });

  it("holds Tab on the ask's panel while both buttons wait", () => {
    openConfirm();
    at(1600, () => void owner().remove());
    focusables.list = () => [];
    const tab = key("Tab");
    expect(tab.defaultPrevented).toBe(true);
    expect(panel.focus).toHaveBeenCalledTimes(1);
  });
});

describe("the owner hook: while it is open", () => {
  it("holds the page still while the sheet is open and gives it back on close", () => {
    act(() => owner().openSheet());
    expect(document.body.style.overflow).toBe("hidden");
    act(() => owner().dismiss());
    expect(document.body.style.overflow).toBe("scroll");
  });

  it("hands Edit caption the ⋯ at once, before the window is asked, with no later ⋯ frame", () => {
    let focusedFirst = false;
    caption.open.mockImplementation(() => {
      focusedFirst = phone.focus.mock.calls.length === 1;
    });
    act(() => owner().openSheet());
    act(() => owner().chooseEdit());
    expect(focusedFirst).toBe(true);
    expect(caption.open).toHaveBeenCalledTimes(1);
    expect(caption.open).toHaveBeenCalledWith(
      expect.objectContaining({ postId: POST, serverBody: "words", groupSlug: null, trigger: phone }),
    );
    expect(owner().state.step).toBe("closed");
    runFrames();
    expect(phone.focus).toHaveBeenCalledTimes(1);
  });

  it("closes a menu drawn for the other width and keeps a confirm", () => {
    act(() => owner().openSheet());
    env.desktop = true;
    paint();
    expect(owner().state.step).toBe("closed");
    act(() => owner().onPopoverOpenChange(true));
    expect(owner().state).toMatchObject({ step: "menu", surface: "popover" });
    env.desktop = false;
    paint();
    expect(owner().state.step).toBe("closed");
    openConfirm();
    env.desktop = true;
    paint();
    expect(owner().state.step).toBe("confirm");
    env.desktop = false;
    paint();
    expect(owner().state.step).toBe("confirm");
  });

  it("sends focus to the ⋯ drawn for the new width when a width change closes the menu", () => {
    // The sheet, then the desktop width: the sheet's rows are gone, so the
    // desktop ⋯ takes focus on the next frame, never the hidden phone ⋯.
    act(() => owner().openSheet());
    env.desktop = true;
    paint();
    expect(owner().state.step).toBe("closed");
    runFrames();
    expect(desktopTrigger.focus).toHaveBeenCalledTimes(1);
    expect(phone.focus).not.toHaveBeenCalled();
    // The popover, then the phone width: the phone ⋯ takes focus, and Radix
    // is kept from sending it to its own ⋯, now display:none.
    desktopTrigger.focus.mockClear();
    act(() => owner().onPopoverOpenChange(true));
    env.desktop = false;
    paint();
    expect(owner().state.step).toBe("closed");
    const event = { defaultPrevented: false, preventDefault: vi.fn() };
    act(() => owner().onDesktopCloseAutoFocus(event as unknown as Event));
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    runFrames();
    expect(phone.focus).toHaveBeenCalledTimes(1);
    expect(desktopTrigger.focus).not.toHaveBeenCalled();
    // A confirm stays open across a width change and keeps its focus.
    phone.focus.mockClear();
    openConfirm();
    env.desktop = true;
    paint();
    runFrames();
    expect(owner().state.step).toBe("confirm");
    expect(phone.focus).not.toHaveBeenCalled();
    expect(desktopTrigger.focus).not.toHaveBeenCalled();
  });

  it("leaves Esc and Tab to Radix while only the popover is open", () => {
    env.desktop = true;
    paint();
    act(() => owner().onPopoverOpenChange(true));
    const escape = key("Escape");
    expect(escape.defaultPrevented).toBe(false);
    expect(owner().state).toMatchObject({ step: "menu", surface: "popover" });
    expect(document.body.style.overflow).toBe("scroll");
  });

  it("keeps Radix from pulling focus back to the ⋯ after a chosen item, never after a plain dismiss", () => {
    env.desktop = true;
    paint();
    const prevented = () => {
      const event = { defaultPrevented: false, preventDefault: vi.fn() };
      act(() => owner().onDesktopCloseAutoFocus(event as unknown as Event));
      return event.preventDefault.mock.calls.length > 0;
    };
    // A plain dismiss (Esc, a click outside): Radix returns focus to the ⋯.
    act(() => owner().onPopoverOpenChange(true));
    act(() => owner().onPopoverOpenChange(false));
    expect(prevented()).toBe(false);
    // Remove: Keep already has focus.
    act(() => owner().onPopoverOpenChange(true));
    at(1000, () => owner().chooseRemove());
    expect(prevented()).toBe(true);
    act(() => owner().dismiss());
    // Edit caption with the window already open: focus stays in the window.
    active = { closest: (selector: string) => (selector === '[aria-modal="true"]' ? {} : null) };
    act(() => owner().onPopoverOpenChange(true));
    act(() => owner().chooseEdit());
    desktopTrigger.focus.mockClear();
    expect(prevented()).toBe(true);
    expect(desktopTrigger.focus).not.toHaveBeenCalled();
    // Edit caption queued (the window is not open yet): focus waits on the ⋯.
    active = { closest: () => null };
    act(() => owner().onPopoverOpenChange(true));
    act(() => owner().chooseEdit());
    desktopTrigger.focus.mockClear();
    expect(prevented()).toBe(true);
    expect(desktopTrigger.focus).toHaveBeenCalledTimes(1);
  });
});
