import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ASK_AI_OPEN_VALUE,
  ASK_AI_OVERLAY,
  ASK_AI_OVERLAY_BODY_CLASS,
  ASK_AI_OVERLAY_COMPACT_CLASS,
  ASK_AI_OVERLAY_DESKTOP_COMPACT_CLASS,
  ASK_AI_OVERLAY_DESKTOP_DOCK_CLASS,
  ASK_AI_OVERLAY_DESKTOP_EXPANDED_CLASS,
  ASK_AI_OVERLAY_EXPAND_CLASS,
  ASK_AI_OVERLAY_MARK_CLASS,
  ASK_AI_OVERLAY_PHONE_CLOCK_DOCK_CLASS,
  ASK_AI_OVERLAY_PHONE_HISTORY_CLASS,
  ASK_AI_OVERLAY_PHONE_HISTORY_COVER_CLASS,
  ASK_AI_OVERLAY_PHONE_HISTORY_HOST_CLASS,
  ASK_AI_OVERLAY_PHONE_HISTORY_LIST_CLASS,
  ASK_AI_OVERLAY_PHONE_SCROLL_CLASS,
  ASK_AI_QUERY,
  ASK_AI_RETURN_STORAGE,
  askAiCloseHref,
  askAiOverlayDesktopClass,
  askAiOverlayDesktopHostClass,
  askAiOverlayHref,
  askAiOverlayPhoneClass,
  askAiStateFromHref,
  askAiChromeOpen,
  fireAskAiOpenThen,
  isAskAiDesktopViewport,
  readAskAiOverlay,
  readAskAiReturnPath,
  rememberAskAiReturnPath,
  toggleAskAiOverlay,
} from "./ask-ai-overlay";

const THREAD = "2f1c8b6a-4d3e-4a11-9c22-7b8e1d0a5f44";
const memory = new Map<string, string>();

describe("ask AI overlay URL", () => {
  beforeEach(() => {
    memory.clear();
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value);
      },
      clear: () => memory.clear(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("opens on the current path — never an Aggregation AI land", () => {
    expect(askAiOverlayHref("/home")).toBe("/home?ai=1");
    expect(askAiOverlayHref("/social")).toBe("/social?ai=1");
    expect(askAiOverlayHref("/education")).toBe("/education?ai=1");
    expect(askAiOverlayHref("/aggregation/dashboard", "period=this-year")).toBe(
      "/aggregation/dashboard?period=this-year&ai=1",
    );
    expect(askAiOverlayHref("/home", "", THREAD)).toBe(`/home?ai=${THREAD}`);
    expect(askAiOverlayHref("/home", "ai=1", THREAD)).toBe(`/home?ai=${THREAD}`);
    expect(ASK_AI_QUERY).toBe("ai");
    expect(ASK_AI_OPEN_VALUE).toBe("1");
    expect(ASK_AI_OVERLAY.dialog).toBe("Ask 24Frame AI");
    expect(askAiOverlayPhoneClass(false)).toContain("70dvh");
    expect(askAiOverlayPhoneClass(true)).toContain("h-dvh");
    expect(askAiOverlayDesktopClass(false)).toBe(ASK_AI_OVERLAY_DESKTOP_COMPACT_CLASS);
    expect(askAiOverlayDesktopClass(true)).toBe(ASK_AI_OVERLAY_DESKTOP_EXPANDED_CLASS);
    expect(askAiOverlayDesktopClass(false)).toContain(ASK_AI_OVERLAY_DESKTOP_DOCK_CLASS);
    expect(askAiOverlayDesktopClass(false)).toContain("bottom-[var(--space-6)]");
    expect(askAiOverlayDesktopClass(false)).toContain("right-[var(--space-6)]");
    expect(askAiOverlayDesktopClass(false)).not.toContain("m-auto");
    expect(askAiOverlayDesktopClass(true)).toContain("inset-[var(--space-4)]");
    expect(askAiOverlayDesktopHostClass(false)).toContain("pointer-events-none");
    expect(askAiOverlayDesktopHostClass(true)).not.toContain("pointer-events-none");
    expect(ASK_AI_OVERLAY_COMPACT_CLASS).not.toContain("40rem");
    expect(ASK_AI_OVERLAY_EXPAND_CLASS).not.toContain("hidden");
    expect(ASK_AI_OVERLAY_EXPAND_CLASS).not.toContain("md:flex");
    expect(ASK_AI_OVERLAY_BODY_CLASS).toContain("overflow-hidden");
    expect(ASK_AI_OVERLAY_BODY_CLASS).toContain("[&_[data-ask-frame-ai-landing]]:h-full");
    expect(ASK_AI_OVERLAY_BODY_CLASS).toContain("[&_[data-ask-frame-ai-thread]]:h-full");
    expect(ASK_AI_OVERLAY_BODY_CLASS).not.toContain("overflow-auto");
    expect(askAiOverlayPhoneClass(false)).toContain("overscroll-none");
    expect(ASK_AI_OVERLAY_PHONE_SCROLL_CLASS).toContain("max-md:overflow-y-scroll");
    expect(ASK_AI_OVERLAY_PHONE_SCROLL_CLASS).toContain("max-md:overscroll-contain");
    expect(ASK_AI_OVERLAY_PHONE_SCROLL_CLASS).toContain("max-md:[touch-action:pan-y]");
    expect(ASK_AI_OVERLAY_PHONE_SCROLL_CLASS).toContain(
      "max-md:[-webkit-overflow-scrolling:touch]",
    );
    expect(ASK_AI_OVERLAY_PHONE_HISTORY_HOST_CLASS).toContain("max-md:flex");
    expect(ASK_AI_OVERLAY_PHONE_HISTORY_HOST_CLASS).toContain("flex-1");
    expect(ASK_AI_OVERLAY_PHONE_HISTORY_COVER_CLASS).toContain("max-md:absolute");
    expect(ASK_AI_OVERLAY_PHONE_HISTORY_COVER_CLASS).toContain("max-md:inset-x-[var(--space-4)]");
    expect(ASK_AI_OVERLAY_PHONE_HISTORY_COVER_CLASS).toContain("max-md:top-[44px]");
    expect(ASK_AI_OVERLAY_PHONE_HISTORY_CLASS).toContain("max-md:w-full");
    expect(ASK_AI_OVERLAY_PHONE_HISTORY_CLASS).toContain("max-md:max-w-none");
    expect(ASK_AI_OVERLAY_PHONE_HISTORY_CLASS).toContain("max-md:rounded-none");
    expect(ASK_AI_OVERLAY_PHONE_HISTORY_CLASS).toContain("max-md:border-0");
    expect(ASK_AI_OVERLAY_PHONE_HISTORY_CLASS).not.toContain("w-[384px]");
    expect(ASK_AI_OVERLAY_PHONE_HISTORY_LIST_CLASS).toContain("max-md:overflow-y-scroll");
    expect(ASK_AI_OVERLAY_PHONE_CLOCK_DOCK_CLASS).toContain("max-md:left-[var(--space-4)]");
    expect(ASK_AI_OVERLAY_PHONE_CLOCK_DOCK_CLASS).not.toContain("--content-inset");
  });

  it("reads open + thread from the current search and closes back to the same path", () => {
    expect(readAskAiOverlay("")).toEqual({ open: false, threadId: null });
    expect(readAskAiOverlay("ai=1")).toEqual({ open: true, threadId: null });
    expect(readAskAiOverlay({ ai: THREAD })).toEqual({ open: true, threadId: THREAD });
    expect(readAskAiOverlay(new URLSearchParams("q=keep&ai=1"))).toEqual({
      open: true,
      threadId: null,
    });
    expect(askAiCloseHref("/home", "ai=1")).toBe("/home");
    expect(askAiCloseHref("/titles", "q=harbor&ai=1")).toBe("/titles?q=harbor");
    expect(askAiCloseHref("/social", { ai: THREAD })).toBe("/social");
  });

  it("remembers the current workspace path for overlay return", () => {
    rememberAskAiReturnPath("/education");
    expect(memory.get(ASK_AI_RETURN_STORAGE)).toBe("/education");
    expect(readAskAiReturnPath("/home")).toBe("/education");
  });

  it("chrome / Home openers write ?ai=1 on the current path — never /messages", () => {
    const overlaySrc = readFileSync(new URL("../components/chrome/ask-ai-overlay.tsx", import.meta.url), "utf8");
    const headerSrc = readFileSync(new URL("../components/chrome/ask-assistant-header.tsx", import.meta.url), "utf8");
    const moduleSrc = readFileSync(new URL("../components/overview/overview-module.tsx", import.meta.url), "utf8");
    const sheetSrc = readFileSync(new URL("../components/chrome/account-sheet.tsx", import.meta.url), "utf8");
    const sideNavSrc = readFileSync(new URL("../components/chrome/side-nav.tsx", import.meta.url), "utf8");
    const destChipsSrc = readFileSync(
      new URL("../components/chrome/house-phone-bottom-nav.tsx", import.meta.url),
      "utf8",
    );

    expect(askAiOverlayHref("/home")).toBe("/home?ai=1");
    expect(askAiOverlayHref("/home")).not.toContain("/messages");
    expect(askAiOverlayHref("/home")).not.toContain("/dashboard");
    expect(headerSrc).toContain("AskAiOpenButton");
    expect(headerSrc).toContain("toggle");
    expect(headerSrc).not.toContain("next/link");
    expect(headerSrc).not.toMatch(/\bhref\b/);
    expect(headerSrc).not.toContain("/messages");
    expect(headerSrc).not.toContain("/dashboard");
    expect(headerSrc).not.toContain("/ai");
    expect(moduleSrc).toContain("AskAiOpenButton");
    expect(moduleSrc).toContain("data-overview-ai-ask");
    expect(sheetSrc).not.toContain("AskAiOpenButton");
    expect(sheetSrc).not.toContain('data-sheet-group-item="askAssistant"');
    expect(sideNavSrc).not.toContain("AskAiOpenButton");
    expect(sideNavSrc).not.toContain("data-side-nav-ask-ai");
    expect(destChipsSrc).toContain("housePhoneDockDestinations");
    expect(destChipsSrc).not.toContain("AskAiOpenButton");
    expect(destChipsSrc).not.toContain("/messages");

    expect(overlaySrc).not.toContain("NOOP_ASK_AI");
    expect(overlaySrc).not.toMatch(/value=\{NOOP_ASK_AI\}>\{children\}/);
    expect(overlaySrc).not.toMatch(/fallback=\{<AskAiOverlayContext\.Provider/);
    expect(overlaySrc).not.toMatch(/fallback=\{[^;]{0,120}\{children\}/);

    const openAt = overlaySrc.indexOf("toggle ? toggleAskAi(threadId) : openAskAi(threadId)");
    const closeAt = overlaySrc.indexOf("onClick?.(event)");
    expect(openAt).toBeGreaterThan(-1);
    expect(closeAt).toBeGreaterThan(-1);
    expect(openAt).toBeLessThan(closeAt);
    expect(overlaySrc).toContain("data-ask-ai-overlay-phone");
    expect(overlaySrc).toContain("data-ask-ai-overlay-phone-history");
    expect(overlaySrc).toContain("AskFrameAiHistoryPanel");
    expect(overlaySrc).toContain('import dynamic from "next/dynamic"');
    expect(overlaySrc).not.toMatch(/from "@\/components\/messages\/ask-frame-ai-landing"/);
    expect(overlaySrc).not.toMatch(/from "\.\/messages-app-header"/);
    expect(overlaySrc).toContain("ASK_AI_OVERLAY_PHONE_HISTORY_HOST_CLASS");
    expect(overlaySrc).not.toContain("ASK_AI_OVERLAY_PHONE_HISTORY_COVER_CLASS");
    expect(overlaySrc).toContain("overscroll-none");
    expect(overlaySrc).toContain("data-ask-ai-overlay-desktop");
    expect(overlaySrc).not.toContain("showModal");
    expect(overlaySrc).not.toContain("<dialog");
    expect(overlaySrc).not.toContain("m-auto");

    const order: string[] = [];
    fireAskAiOpenThen(
      () => order.push(askAiOverlayHref("/home")),
      () => order.push("close"),
    );
    expect(order).toEqual(["/home?ai=1", "close"]);
    expect(askAiStateFromHref("/home?ai=1")).toEqual({ open: true, threadId: null });
    const toggleOrder: string[] = [];
    toggleAskAiOverlay(
      false,
      () => toggleOrder.push("open"),
      () => toggleOrder.push("close"),
    );
    toggleAskAiOverlay(
      true,
      () => toggleOrder.push("open"),
      () => toggleOrder.push("close"),
    );
    expect(toggleOrder).toEqual(["open", "close"]);
    expect(askAiChromeOpen({ open: true, threadId: null })).toBe(true);
    expect(askAiChromeOpen({ open: false, threadId: null })).toBe(false);
    expect(askAiChromeOpen(null)).toBe(false);
    toggleAskAiOverlay(false, () => toggleOrder.push("reopen"), () => toggleOrder.push("stale-close"));
    expect(toggleOrder).toEqual(["open", "close", "reopen"]);
    expect(isAskAiDesktopViewport(() => ({ matches: false }))).toBe(false);
    expect(isAskAiDesktopViewport(() => ({ matches: true }))).toBe(true);
  });

  it("does not name the return slot a KEY — generic-api-key false positive", () => {
    expect(ASK_AI_RETURN_STORAGE).toBe("frame_ask_ai_return");
    expect(ASK_AI_RETURN_STORAGE).not.toMatch(/\d/);
    expect(ASK_AI_OVERLAY_MARK_CLASS).toContain("size-8");
    expect(ASK_AI_OVERLAY_MARK_CLASS).toContain("text-accent");
    expect(ASK_AI_OVERLAY_MARK_CLASS).not.toContain("#");
    const src = readFileSync(new URL("./ask-ai-overlay.ts", import.meta.url), "utf8");
    expect(src).not.toMatch(/ASK_AI_RETURN_\w*KEY\s*=/);
    expect(src).not.toContain("STORAGE_KEY");
    expect(src).not.toMatch(/\b\d[A-Za-z0-9_]*ask_ai_return\b/);
  });
});
