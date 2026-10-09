import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/home",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
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
    prefetch?: boolean;
  }) {
    return React.createElement("a", { href, ...props }, children);
  }
  return { __esModule: true, default: MockLink, useLinkStatus: () => ({ pending: false }) };
});

import { HousePhoneAppShell } from "@/components/chrome/house-phone-app-shell";
import {
  HOUSE_LEAD_SCROLL_TO_TOP,
  HOUSE_LEAD_SCROLL_TO_TOP_MEDIA,
  HOUSE_LEAD_SCROLL_TO_TOP_MIN_HEIGHT,
  HOUSE_LEAD_SCROLL_TO_TOP_OFFSET,
  HOUSE_LEAD_SCROLL_TO_TOP_OVERFLOW_ANCHOR,
  HOUSE_LEAD_SCROLL_TO_TOP_SELECTOR,
  HOUSE_LEAD_SCROLL_TO_TOP_TOUCH_GRACE_MS,
  houseLeadScrollToTopIsTap,
} from "./house-lead-scroll-to-top";

const shellSrc = readFileSync(
  "src/components/chrome/house-phone-app-shell.tsx",
  "utf8",
);
const componentSrc = readFileSync(
  "src/components/chrome/house-lead-scroll-to-top.tsx",
  "utf8",
);
const libSrc = readFileSync("src/lib/house-lead-scroll-to-top.ts", "utf8");
const appShellSrc = readFileSync(
  "src/components/chrome/app-shell.tsx",
  "utf8",
);

describe("HouseLeadScrollToTop — iOS status-bar tap contract", () => {
  it("keeps the G9 nested scroll contract on `[data-house-lead-scroll]`", () => {
    // Bridge does not flip the shell scroll ancestor — main stays the
    // scrolling element that Home / Aggregation / Social / Education
    // read. If G9 changes, this bridge stops being the right fix.
    expect(appShellSrc.match(/data-house-lead-scroll/g)?.length).toBe(1);
    expect(HOUSE_LEAD_SCROLL_TO_TOP_SELECTOR).toBe("[data-house-lead-scroll]");
    expect(HOUSE_LEAD_SCROLL_TO_TOP.selector).toBe("[data-house-lead-scroll]");
  });

  it("locks the 1px window headroom · coarse-pointer gate · scroll-to-0 tap signal", () => {
    expect(HOUSE_LEAD_SCROLL_TO_TOP_OFFSET).toBe(1);
    expect(HOUSE_LEAD_SCROLL_TO_TOP_MIN_HEIGHT).toBe("calc(100dvh + 1px)");
    expect(HOUSE_LEAD_SCROLL_TO_TOP_MEDIA).toBe("(pointer: coarse)");
    expect(HOUSE_LEAD_SCROLL_TO_TOP).toEqual({
      selector: HOUSE_LEAD_SCROLL_TO_TOP_SELECTOR,
      offset: HOUSE_LEAD_SCROLL_TO_TOP_OFFSET,
      media: HOUSE_LEAD_SCROLL_TO_TOP_MEDIA,
      minHeight: HOUSE_LEAD_SCROLL_TO_TOP_MIN_HEIGHT,
      overflowAnchor: HOUSE_LEAD_SCROLL_TO_TOP_OVERFLOW_ANCHOR,
    });
  });

  it("turns off html scroll anchoring while it holds the window at 1", () => {
    // With anchoring on (Chromium, so Android), a layout shift in the phone
    // chrome pulls the window to 0, which would read as a status-bar tap
    // and scroll the page to the top.
    expect(HOUSE_LEAD_SCROLL_TO_TOP_OVERFLOW_ANCHOR).toBe("none");
    const bridge = readFileSync("src/components/chrome/house-lead-scroll-to-top.tsx", "utf8");
    expect(bridge).toContain("root.style.overflowAnchor = HOUSE_LEAD_SCROLL_TO_TOP_OVERFLOW_ANCHOR;");
    expect(bridge).toContain("root.style.overflowAnchor = previousOverflowAnchor;");
  });

  it("only treats a window scroll to 0 as a status-bar tap", () => {
    expect(houseLeadScrollToTopIsTap(0)).toBe(true);
    // Any other position — including the held headroom — leaves the
    // bridge inert. This is what stops a normal shell / inner scroll
    // from being interpreted as a status-bar tap.
    expect(houseLeadScrollToTopIsTap(HOUSE_LEAD_SCROLL_TO_TOP_OFFSET)).toBe(
      false,
    );
    expect(houseLeadScrollToTopIsTap(2)).toBe(false);
    expect(houseLeadScrollToTopIsTap(1200)).toBe(false);
    // Band lock v1.4: a 0 a finger made (a drag that reached the document,
    // or its momentum) is not a status-bar tap; the OS tap sends no touch.
    expect(houseLeadScrollToTopIsTap(0, true)).toBe(false);
    expect(houseLeadScrollToTopIsTap(0, false)).toBe(true);
  });

  it("ignores a window at 0 that a finger made, and puts the window back either way", () => {
    expect(HOUSE_LEAD_SCROLL_TO_TOP_TOUCH_GRACE_MS).toBe(400);
    expect(componentSrc).toContain("if (houseLeadScrollToTopIsTap(window.scrollY, fingerRecent())) {");
    expect(componentSrc).toContain('window.addEventListener("touchstart", onTouch, { passive: true, capture: true });');
    expect(componentSrc).toContain('window.addEventListener("touchend", onTouch, { passive: true, capture: true });');
    expect(componentSrc).toContain("HOUSE_LEAD_SCROLL_TO_TOP_TOUCH_STALE_MS");
    const onScroll = componentSrc.slice(componentSrc.indexOf("const onScroll = () => {"), componentSrc.indexOf('window.addEventListener("scroll"'));
    // The restore to 1 sits outside the tap branch.
    expect(onScroll.lastIndexOf("window.scrollTo(0, HOUSE_LEAD_SCROLL_TO_TOP_OFFSET);")).toBeGreaterThan(
      onScroll.indexOf("      }\n"),
    );
  });

  it("mounts inside HousePhoneAppShell so every workspace answers a tap", () => {
    // Every house lead shell (Aggregation / Social / Education / Home)
    // mounts through HousePhoneAppShell — the bridge lives there so
    // there is no Home-only fork.
    expect(shellSrc).toContain('from "./house-lead-scroll-to-top"');
    expect(shellSrc).toContain("<HouseLeadScrollToTop />");
    expect(shellSrc.match(/<HouseLeadScrollToTop/g)?.length).toBe(1);

    const html = renderToStaticMarkup(
      createElement(HousePhoneAppShell, { workspace: "aggregation" }, null),
    );
    // Component renders null (client effect only) — server output
    // stays clean. What we lock is that HousePhoneAppShell contains
    // its wiring and no lookalike phone-only shell is introduced.
    expect(html).toContain("data-house-phone-app-shell");
    expect(html).toContain("data-house-phone-bottom-nav");
  });

  it("uses matchMedia, window.scrollTo, and the [data-house-lead-scroll] selector", () => {
    expect(componentSrc).toContain('"use client"');
    expect(componentSrc).toContain("useEffect");
    expect(componentSrc).toContain("window.matchMedia");
    expect(componentSrc).toContain("HOUSE_LEAD_SCROLL_TO_TOP_MEDIA");
    expect(componentSrc).toContain("window.scrollTo(0, HOUSE_LEAD_SCROLL_TO_TOP_OFFSET)");
    expect(componentSrc).toContain(
      'document\n          .querySelectorAll<HTMLElement>(HOUSE_LEAD_SCROLL_TO_TOP_SELECTOR)',
    );
    expect(componentSrc).toContain(
      'scroller.scrollTo({ top: 0, behavior: "smooth" })',
    );
    expect(componentSrc).toContain(
      "root.style.minHeight = HOUSE_LEAD_SCROLL_TO_TOP_MIN_HEIGHT",
    );
    expect(componentSrc).toContain("previousMinHeight");
    expect(componentSrc).toContain("passive: true");
    expect(componentSrc).toContain("removeEventListener");
    // Coarse-pointer gate keeps desktop unchanged.
    expect(componentSrc).toContain(
      "if (!window.matchMedia(HOUSE_LEAD_SCROLL_TO_TOP_MEDIA).matches) return;",
    );
    expect(libSrc).toContain("Adam");
    expect(libSrc).toContain("2026-09-19");
    expect(libSrc).toContain("house-united");
    expect(libSrc).toContain("G9");
    // Do not silently invert the scroll contract. If the shell moves
    // to document-scroll, this bridge is no longer the right fix and
    // the failing G9 assertion above will catch it first.
    expect(libSrc).not.toContain("no lookalike phone-only shell");
  });

  it("keeps the bottom-nav scroll-hide reading the same nested scroller", () => {
    // Bottom nav hides (and the bar covers the workspace band) on scroll-down of
    // `[data-house-lead-scroll]`. The shell's one tracker reads it
    // (shell-phone-workspace-band-lock-v1 §5). The bridge must not change
    // that read path — a workspace fork there would drop the hide
    // behavior on Home.
    const tracker = readFileSync(
      "src/components/chrome/house-phone-chrome-state.tsx",
      "utf8",
    );
    expect(tracker).toContain(
      'querySelector<HTMLElement>("[data-house-lead-scroll]")',
    );
    expect(tracker).toContain(
      "const readY = () => (scroller ? scroller.scrollTop : window.scrollY);",
    );
  });
});
