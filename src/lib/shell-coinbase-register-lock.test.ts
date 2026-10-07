import { readFileSync } from "node:fs";
import { PlusSquare } from "@phosphor-icons/react";
import { describe, expect, it } from "vitest";

import { activityBellLabel, ACTIVITY_BELL_UNREAD_DOT_CLASS } from "./activity";
import {
  HOUSE_ASK_AI_HEADER_CLASS,
  HOUSE_HEADER_ROUND_BUTTON_CLASS,
  HOUSE_LEAD_CHROME_CLASS,
  HOUSE_LEAD_LOGO_CLASS,
  HOUSE_LEAD_SEARCH_HEADER_FIELD_CLASS,
  HOUSE_LEAD_STACK_CLASS,
  HOUSE_THEME_TOGGLE_CLASS,
} from "./house-lead-chrome";
import {
  HOUSE_PHONE_BOTTOM_NAV_CREATE_CLASS,
  HOUSE_PHONE_BOTTOM_NAV_PILL_CLASS,
  HOUSE_PHONE_BOTTOM_NAV_UNREAD_DOT_CLASS,
} from "./house-phone-shell";
import {
  HOUSE_DEST_RAIL_ROW_COLLAPSED_CLASS,
  HOUSE_PILL_SLIDER_THUMB_BASE_CLASS,
  HOUSE_RAIL_BRAND_BAND_CLASS,
  HOUSE_SEARCH_PILL_CLASS,
  houseDestRailGlyphWeight,
} from "./house-shell";
import { SOCIAL_RAIL_CREATE_ICON } from "./nav";
import { RAIL_COLLAPSE_CHEVRON_CLASS } from "./rail-collapse";
import { SOCIAL, socialMessagesNavLabel } from "./social";
import { SOCIAL_EXPLORE_EXIT_CLASS } from "./social-chrome";
import {
  WORKSPACE_SWITCHER_SLIDER_THUMB_CLASS,
  WORKSPACE_WAFFLE_TRIGGER_CLASS,
} from "./workspace-switcher";

const lock = readFileSync("docs/design-locks/shell-coinbase-register-lock-v1.md", "utf8");
const readme = readFileSync("docs/design-locks/README.md", "utf8");
const current = readFileSync("docs/status/CURRENT.md", "utf8");
const screening = readFileSync("docs/design-locks/shell-screening-chrome-lock-v1.md", "utf8");
const unified = readFileSync("docs/design-locks/shell-unified-chrome-lock-v1.md", "utf8");
const explore = readFileSync("docs/design-locks/social-explore-for-you-immersive-lock-v2.md", "utf8");
const appShell = readFileSync("src/components/chrome/app-shell.tsx", "utf8");
const lead = readFileSync("src/components/chrome/house-lead-chrome.tsx", "utf8");
const switcher = readFileSync("src/components/chrome/workspace-switcher.tsx", "utf8");
const railBrand = readFileSync("src/components/chrome/rail-brand.tsx", "utf8");
const brandLogo = readFileSync("src/components/chrome/brand-logo.tsx", "utf8");
const ask = readFileSync("src/components/chrome/ask-assistant-header.tsx", "utf8");
const bell = readFileSync("src/components/activity/activity-bell.tsx", "utf8");
const chromeData = readFileSync("src/lib/app-shell-chrome.ts", "utf8");

/** The shell files this lock touches: no hex, no shadow but the dock's float. */
const SHELL_SOURCES = [
  "src/lib/house-lead-chrome.ts",
  "src/lib/house-shell.ts",
  "src/lib/house-phone-shell.ts",
  "src/lib/workspace-switcher.ts",
  "src/lib/rail-collapse.ts",
  "src/components/chrome/rail-brand.tsx",
  "src/components/chrome/side-nav.tsx",
  "src/components/chrome/house-lead-chrome.tsx",
  "src/components/chrome/house-phone-bottom-nav.tsx",
  "src/components/chrome/workspace-switcher.tsx",
  "src/components/chrome/ask-assistant-header.tsx",
] as const;

describe("shell Coinbase register lock v1 (Adam 2026-10-05, \"I like the designs. Let's use them.\")", () => {
  // Each founder quote is guarded on a short verbatim anchor (its first
  // clause) under the verbatim heading. Each pick is mapped by its pick
  // and where it lands, not by the question's wording.
  it("records the founder direction and the approval verbatim, and maps each pick", () => {
    expect(lock).toContain("**Date:** 2026-10-05");
    expect(lock).toContain("## Founder direction (verbatim, 2026-10-05)");
    expect(lock).toContain("> we must remain in this register.");
    expect(lock).toContain("> I want the Coinbase register");
    expect(lock).toContain("> we're not too far off already");
    expect(lock).toContain("> I like the designs. Let's use them.");
    expect(lock).toContain('**"that\'s fine, but use default text "Search Social""**');
    expect(lock).toContain("| This lock §1 (Ask; Search) |");
    expect(lock).toContain('| **"yes"** | This lock §2 (top band) |');
    expect(lock).toContain('| **"ok"** | Explore content PR — not this lock |');
    expect(lock).toContain('| **"yes"** | Messages PR — not this lock |');
    expect(lock).toContain('| **"sure"** | [`social-feed-register-lock-v1.md`](social-feed-register-lock-v1.md) |');
    for (const gate of ["**G1.**", "**G2.**", "**G3.**", "**G4.**", "**G5.**", "**G6.**", "**G7.**"]) {
      expect(lock).toContain(gate);
    }
    expect(lock).toContain("## Assumptions (stated, reversible)");
    expect(lock).toContain("## Explicit OUT");
  });

  it("decision 1a — Ask is a round grey 44 with the accent sparkle; the label is its name and tooltip only", () => {
    expect(HOUSE_ASK_AI_HEADER_CLASS).toBe(HOUSE_HEADER_ROUND_BUTTON_CLASS);
    expect(HOUSE_HEADER_ROUND_BUTTON_CLASS).toContain("size-[var(--header-control-size)]");
    expect(HOUSE_HEADER_ROUND_BUTTON_CLASS).toContain("rounded-full bg-surface-muted text-ink");
    expect(ask).toContain("aria-label={ASK_FRAME_AI.headline}");
    expect(ask).toContain("title={ASK_FRAME_AI.headline}");
    expect(ask).not.toContain("{ASK_FRAME_AI.headline}\n      </span>");
    expect(ask).not.toContain("HOUSE_ASK_AI_HEADER_LABEL_CLASS");
    expect(lock).toContain("**No visible label at any width**");
  });

  it("decision 1b — the Social header search pill reads \"Search Social\"; Education keeps its wording", () => {
    expect(SOCIAL.search.headerPlaceholder).toBe("Search Social");
    expect(HOUSE_LEAD_SEARCH_HEADER_FIELD_CLASS).toContain("h-[var(--header-control-size)]");
    expect(HOUSE_LEAD_SEARCH_HEADER_FIELD_CLASS).toContain(HOUSE_SEARCH_PILL_CLASS);
    expect(readFileSync("src/components/chrome/house-lead-search.tsx", "utf8")).toContain(
      "placeholder ?? (live ? SOCIAL.search.headerPlaceholder : EDUCATION_SEARCH.placeholder)",
    );
  });

  it("decision 2 — the real BrandLogo moves from the header to the side menu's 80 top band", () => {
    expect(railBrand).toContain("{collapsed ? <BrandEmblem /> : <BrandLogo />}");
    expect(appShell).toContain("<RailBrand");
    expect(appShell.indexOf("<RailBrand")).toBeLessThan(appShell.indexOf("data-app-rail-body"));
    expect(HOUSE_RAIL_BRAND_BAND_CLASS).toBe(
      "flex h-[var(--header-height)] shrink-0 items-center pl-[var(--shell-gutter-inline-start)]",
    );
    // BrandLogo is unchanged: one export, the same marks.
    expect(brandLogo).toContain("export function BrandLogo()");
    const logoBody = brandLogo.slice(
      brandLogo.indexOf("export function BrandLogo()"),
      brandLogo.indexOf("export function BrandEmblem()"),
    );
    expect(logoBody.match(/data-brand-logo-mark="(?:light|dark|emblem)"/g)?.length).toBe(3);
    expect(logoBody).toContain("<PhoneEmblemLight />");
    // Beside a side menu the bar shows only the phone emblem; the desktop
    // mark heads the bar only where the page has no side menu.
    expect(lead).toContain("{brandInHeader ? (");
    expect(appShell).toContain("brandInHeader={hideDestRail}");
    expect(lead).not.toContain("data-app-header-divider");
  });

  it("the header is 80, starts at the full-height side menu's edge, and pads 24 / 32", () => {
    expect(HOUSE_LEAD_STACK_CLASS).toContain("md:ml-[var(--sidebar-width)]");
    expect(HOUSE_LEAD_CHROME_CLASS).toContain("border-b border-hairline");
    expect(HOUSE_LEAD_CHROME_CLASS).toContain("md:gap-[var(--space-6)]");
  });

  it("the workspace switcher is the primary pill slider from lg: muted track, the sliding thumb, one Tab stop", () => {
    expect(switcher).toContain("<SegmentedTrack");
    // The house thumb's geometry and 220 ms motion. Its fill (the accent
    // wash, not ink) and the 44 segments at 15 / 500 are the cards lock's
    // (founder 2026-10-06, "feels like thick ink everywhere"), pinned in
    // src/lib/social-feed-cards-lock.test.ts.
    expect(WORKSPACE_SWITCHER_SLIDER_THUMB_CLASS.startsWith(HOUSE_PILL_SLIDER_THUMB_BASE_CLASS)).toBe(true);
    // Keyboard and current: one Tab stop, arrows, aria-current, Home writes no cookie.
    expect(switcher).toContain("tabIndex={workspaceSwitcherSegmentTabIndex(index, routeIndex, pills.length)}");
    expect(switcher).toContain('aria-current={lit ? "page" : undefined}');
    expect(switcher).toContain('event.key === "ArrowRight" ? 1 : -1');
  });

  it("trailing: round grey 44s 8 apart (4 on phone), the 44 avatar, and a bell dot that is never a count", () => {
    expect(HOUSE_THEME_TOGGLE_CLASS).toBe(HOUSE_HEADER_ROUND_BUTTON_CLASS);
    expect(ACTIVITY_BELL_UNREAD_DOT_CLASS).toBe(
      "pointer-events-none absolute right-1.5 top-1.5 size-3.5 rounded-full border-2 border-bg bg-accent",
    );
    expect(activityBellLabel(0)).toBe("Notifications");
    expect(activityBellLabel(5)).toBe("Notifications, new");
    expect(bell).not.toContain("data-activity-bell-badge");
    expect(bell).not.toContain('"9+"');
  });

  it("the side menu: 240 / 80, 56 rows, current = wash + filled glyph, no tiles, collapse at the foot", () => {
    // The row (56, radius full, pad 16, 15 / 500 since the cards lock) is
    // pinned in src/lib/social-feed-cards-lock.test.ts.
    expect(HOUSE_DEST_RAIL_ROW_COLLAPSED_CLASS).toContain("size-14");
    expect(houseDestRailGlyphWeight(true)).toBe("fill");
    expect(SOCIAL_RAIL_CREATE_ICON).toBe(PlusSquare);
    expect(RAIL_COLLAPSE_CHEVRON_CLASS).toContain("size-11");
    expect(appShell.indexOf("data-app-rail-body")).toBeLessThan(appShell.indexOf("data-app-rail-foot"));
    expect(socialMessagesNavLabel("Messages", 1)).toBe("Messages, 1 unread");
  });

  it("the phone bar: 60, the grey workspace pill (name out below 360), pads 16 / 12", () => {
    expect(WORKSPACE_WAFFLE_TRIGGER_CLASS).toContain("rounded-full bg-surface-muted pl-[var(--space-3)] pr-[var(--space-4)]");
    expect(WORKSPACE_WAFFLE_TRIGGER_CLASS).toContain("text-[length:var(--text-sm)] font-semibold text-ink");
    // The emblem link is a 44 × 44 hit (phone targets ≥ 44): it reaches
    // 11 into the 16 lead gutter so the 33-wide mark keeps its place.
    expect(HOUSE_LEAD_LOGO_CLASS).toContain("h-[var(--header-control-size)] min-w-[var(--header-control-size)]");
    expect(HOUSE_LEAD_LOGO_CLASS).toContain("-ml-[11px] pl-[11px]");
  });

  it("the dock: 56, no hairline, the soft float, current = the filled accent glyph, Create a 44 circle, Messages dot", () => {
    expect(HOUSE_PHONE_BOTTOM_NAV_PILL_CLASS).toBe(
      "flex h-14 w-full max-w-[420px] items-center rounded-full bg-surface shadow-[var(--elevation-float)]",
    );
    expect(HOUSE_PHONE_BOTTOM_NAV_CREATE_CLASS).toContain("size-11");
    expect(HOUSE_PHONE_BOTTOM_NAV_UNREAD_DOT_CLASS).toContain("border-2 border-surface bg-accent");
  });

  it("Explore's Exit is the grey 44 pill; the Messages dot reads the inbox without SQL", () => {
    expect(SOCIAL_EXPLORE_EXIT_CLASS).toContain("rounded-full bg-surface-muted");
    expect(SOCIAL_EXPLORE_EXIT_CLASS).toContain("text-[length:var(--text-base)] font-semibold text-ink");
    expect(chromeData).toContain(".then((supabase) => loadDmInbox(supabase))");
    expect(chromeData).toContain(".then((page) => overviewSocialUnreadTotal(page.rows))");
    expect(chromeData).toContain(").catch(() => 0),");
  });

  it("tokens only, no shadow but the dock's float, and the reference brand unnamed in the shell sources", () => {
    for (const path of SHELL_SOURCES) {
      const src = readFileSync(path, "utf8");
      const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
      expect(code, path).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(src.replace(/shadow-\[var\(--elevation-float\)\]/g, ""), path).not.toMatch(/shadow-(?!none)/);
      expect(src.replace(/Coinbase-pop A\d?/g, ""), path).not.toMatch(/Coinbase/i);
    }
  });

  it("marks the superseded locks in place and is indexed, with one status line", () => {
    expect(screening).toContain("**Superseded in part 2026-10-05** by [`shell-coinbase-register-lock-v1.md`](shell-coinbase-register-lock-v1.md)");
    expect(unified).toContain("**Superseded in part 2026-10-05** by [`shell-coinbase-register-lock-v1.md`](shell-coinbase-register-lock-v1.md)");
    expect(explore).toContain("**Superseded in part 2026-10-05** by [`shell-coinbase-register-lock-v1.md`](shell-coinbase-register-lock-v1.md)");
    expect(readme).toContain("[`shell-coinbase-register-lock-v1.md`](shell-coinbase-register-lock-v1.md)");
    expect(readme.indexOf("shell-coinbase-register-lock-v1.md")).toBeLessThan(
      readme.indexOf("[`shell-screening-chrome-lock-v1.md`]"),
    );
    const sectionAt = current.indexOf("## Shared shell chrome");
    const section = current.slice(sectionAt, current.indexOf("---", sectionAt));
    expect(section).toContain("docs/design-locks/shell-coinbase-register-lock-v1.md");
    expect(section).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });
});
