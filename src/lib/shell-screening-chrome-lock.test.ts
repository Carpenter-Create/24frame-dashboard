import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { ACTIVITY_HREF } from "./activity";
import { CO_PRODUCTIONS_HREF } from "./co-productions";
import { HELP } from "./help";
import {
  HOUSE_PHONE_BOTTOM_NAV_CLASS,
  HOUSE_PHONE_BOTTOM_NAV_ITEM_CLASS,
  HOUSE_PHONE_BOTTOM_NAV_ITEM_ON_CLASS,
} from "./house-phone-shell";
import {
  HOUSE_HEADER_EXIT_COMPACT_CLASS,
  HOUSE_HEADER_EXIT_LABEL_CLASS,
  HOUSE_LEAD_CHROME_CLASS,
  HOUSE_LEAD_DESKTOP_BRAND_PAD_CLASS,
  HOUSE_LEAD_DESKTOP_PAD_CLASS,
  HOUSE_LEAD_LOGO_CLASS,
} from "./house-lead-chrome";
import { HOUSE_DEST_RAIL_ACTIVE_CLASS, HOUSE_RAIL_PANEL_CLASS, HOUSE_SHELL_GUTTER_X_CLASS } from "./house-shell";
import { overviewLeadActiveIndex } from "./overview";
import { SOCIAL_CREATE_FAN_ANCHOR_CLASS } from "./social-create-fan";
import { SOCIAL_EXPLORE_DESKTOP_HEADER_HOST_CLASS, SOCIAL_EXPLORE_EXIT_CLASS } from "./social-chrome";
import { resolveWorkspaceMode, type WorkspaceMode } from "./workspace";
import { availableWorkspaceOptions } from "./workspace-menu";
import { WORKSPACE_SWITCHER_SLIDER_THUMB_CLASS, workspaceSliderSegments } from "./workspace-switcher";

const lock = readFileSync("docs/design-locks/shell-screening-chrome-lock-v1.md", "utf8");
const readme = readFileSync("docs/design-locks/README.md", "utf8");
const current = readFileSync("docs/status/CURRENT.md", "utf8");
const tokens = readFileSync("src/app/tokens.css", "utf8");
const unified = readFileSync("docs/design-locks/shell-unified-chrome-lock-v1.md", "utf8");
const slider = readFileSync("docs/design-locks/shell-desktop-top-nav-slider-waffle-phone-lock-v1.md", "utf8");
const waffle = readFileSync("docs/design-locks/shell-workspace-waffle-layer-lock-v1.md", "utf8");
const wave1 = readFileSync("docs/design-locks/social-home-craft-wave-1-lock-v1.md", "utf8");
const density = readFileSync("docs/design-locks/social-home-density-craft-sequel-lock-v1.md", "utf8");
const explore = readFileSync("docs/design-locks/social-explore-for-you-immersive-lock-v2.md", "utf8");
const appShell = readFileSync("src/components/chrome/app-shell.tsx", "utf8");
const register = readFileSync("docs/design-locks/shell-coinbase-register-lock-v1.md", "utf8");

describe("shell screening chrome lock v1 (Adam 2026-10-04, \"Yes, everywhere\")", () => {
  // Each founder quote is guarded on a short verbatim anchor (its first
  // clause) under the verbatim heading, so a prose fix elsewhere in the
  // doc does not break the lock test.
  it("records the founder standard, picks, question, and answer verbatim", () => {
    expect(lock).toContain("**Date:** 2026-10-04");
    expect(lock).toContain("## Founder direction (verbatim, 2026-10-04)");
    expect(lock).toContain(
      "> A fresh, media-oriented, immersive social media experience for the film community.",
    );
    expect(lock).toContain('> "Feed, Explore from D-Screening Room", "Profile from F-Reel"');
    expect(lock).toContain("> D's header and side menu differ from today's:");
    expect(lock).toContain('Answered **"Yes, everywhere (Recommended)"**');
    expect(lock).toContain("> Quieter, smaller chrome in every workspace;");
    expect(lock).toContain("Ask 24Frame AI sparkle stays Sporty Blue (founder pick)");
    expect(lock).toContain("the phone dock shows icons only");
  });

  it("locks every shell value and the gates", () => {
    for (const value of [
      "| Height | **52** (`--header-height`).",
      // The surface value (`--bg`, 85% glass) is pinned on HOUSE_LEAD_CHROME_CLASS below.
      "| Surface |",
      "**1×18 hairline**",
      "Plain words, **13px**, side pad 10",
      "Current **600**, ink, **2px ink underline**",
      "`aria-current=\"page\"`. No track, no thumb, no grey pill",
      "**232×34** muted field",
      "**34** hairline pill",
      "Width `--sidebar-width` **200**; collapsed `--sidebar-width-collapsed` **64**",
      "**one hairline on its right**",
      "**28×28** collapse control",
      "| Rows | **36** tall, pad 10, gap 10, radius 10, 13px.",
      "Glyph **18** in a **22** slot",
      "**22×22** radius-6 `--accent` tile",
      "**40×32** radius 10, a **24×1** hairline, then **40×40** icon links",
      "**26×26** accent tile",
      "| Height | **60** (`--header-height`) |",
      "**the current workspace's name** at 13 / 500, ink",
      "Every target **44**",
      "Each target fills the pill's **46** row",
      "a **4px ink dot** 3 above the target's bottom",
      "**40** `--accent` circle, 20 Bold plus",
    ]) {
      expect(lock, value).toContain(value);
    }
    for (const gate of ["**G1.**", "**G2.**", "**G3.**", "**G4.**", "**G5.**", "**G6.**"]) {
      expect(lock).toContain(gate);
    }
    expect(lock).toContain("## Measured");
    expect(lock).toContain("## Assumptions (stated, reversible)");
  });

  // Superseded in part 2026-10-05 by the H register: the code now carries
  // the register's values, and this lock records that in place. Each pin
  // below moved to the superseding value (the register lock and its test
  // pin the rest); the screening values stay as history in the doc.
  it("records the code it locked as superseded by the register — tokens and classes moved", () => {
    expect(lock).toContain("**Superseded in part 2026-10-05** by [`shell-coinbase-register-lock-v1.md`]");
    expect(register).toContain("[`shell-screening-chrome-lock-v1.md`](shell-screening-chrome-lock-v1.md) §1 (the 52 header");
    expect(tokens).toMatch(/--header-height:\s*80px;/);
    expect(tokens).not.toMatch(/--header-height:\s*52px;/);
    expect(tokens).toMatch(/--header-desktop-control-size:\s*44px;/);
    expect(tokens).toMatch(/--sidebar-width:\s*240px;/);
    expect(tokens).toMatch(/--sidebar-width-collapsed:\s*80px;/);
    expect(tokens).toMatch(/max-width:\s*767px[\s\S]*--header-height:\s*60px;/);
    expect(tokens).toMatch(/max-width:\s*767px[\s\S]*--header-avatar-size:\s*44px;/);
    expect(tokens).not.toContain("Joshua bar 2026-09-22 raises");
    // Lanes → the pill slider's ink thumb; no inset underline.
    expect(WORKSPACE_SWITCHER_SLIDER_THUMB_CLASS).toContain("bg-ink");
    expect(WORKSPACE_SWITCHER_SLIDER_THUMB_CLASS).not.toContain("shadow-[inset_0_-2px_0_var(--text)]");
    expect(HOUSE_RAIL_PANEL_CLASS).toContain("border-r border-hairline");
    // Current row → the accent wash (no muted row, no 600).
    expect(HOUSE_DEST_RAIL_ACTIVE_CLASS).toBe("bg-accent-wash text-accent-ink");
    // Dock current → the accent filled glyph (no ink dot).
    expect(HOUSE_PHONE_BOTTOM_NAV_ITEM_ON_CLASS).toBe("text-accent");
    // Explore: the muted bar over the dark stage stays.
    expect(SOCIAL_EXPLORE_DESKTOP_HEADER_HOST_CLASS).toBe("hidden md:contents [&_[data-app-header]]:bg-bg");
    // The bar and the side menu share the page canvas (one surface in dark).
    expect(HOUSE_LEAD_CHROME_CLASS).toContain("bg-bg/85 backdrop-blur");
    expect(HOUSE_LEAD_CHROME_CLASS).not.toContain("bg-surface/85");
    expect(HOUSE_RAIL_PANEL_CLASS).toContain("bg-bg");
    // Exit → the grey 44 pill (no radius-10 34 chip).
    expect(SOCIAL_EXPLORE_EXIT_CLASS).toContain("h-[var(--header-desktop-control-size)]");
    expect(SOCIAL_EXPLORE_EXIT_CLASS).toContain("rounded-full bg-surface-muted pl-[var(--space-4)] pr-5");
    expect(SOCIAL_EXPLORE_EXIT_CLASS).not.toContain("md:ml-[var(--space-2)]");
    // md to lg: the X-only compact Exit reads the control token (44 now).
    expect(HOUSE_HEADER_EXIT_COMPACT_CLASS).toBe(
      "max-lg:w-[var(--header-desktop-control-size)] max-lg:justify-center max-lg:px-0",
    );
    expect(HOUSE_HEADER_EXIT_LABEL_CLASS).toBe("max-lg:sr-only");
    // Explore's header search icon slot is gone (the pill from xl only).
    expect(appShell).not.toContain("HOUSE_EXPLORE_HEADER_SEARCH_SLOT_CLASS");
    expect(tokens).not.toMatch(/Explore Exit compact box stay 44/);
  });

  it("marks the superseded parts of the older shell locks in place", () => {
    expect(unified).toContain("**Superseded in part 2026-10-04** by [`shell-screening-chrome-lock-v1.md`](shell-screening-chrome-lock-v1.md)");
    // The in-place notes on the unified lock's §2 (side menu) and §3 (phone
    // dock) each point at the screening section that replaced them.
    expect(unified).toContain("(shell-screening-chrome-lock-v1.md) §2");
    expect(unified).toContain("(shell-screening-chrome-lock-v1.md) §3–§4");
    expect(slider).toContain("**Superseded in part 2026-10-04 (again)** by [`shell-screening-chrome-lock-v1.md`]");
    expect(waffle).toContain("**Amended 2026-10-04 (screening chrome):** [`shell-screening-chrome-lock-v1.md`]");
    expect(waffle).toContain("supersedes \"no workspace name in the header\"");
    expect(wave1).toContain("**Superseded 2026-10-04** ([`shell-screening-chrome-lock-v1.md`]");
    expect(density).toContain("**Superseded 2026-10-04** by [`shell-screening-chrome-lock-v1.md`]");
    // Explore v2: the header row (sliding row → lanes) and the Exit chip
    // (filled 44 → muted 34) are marked where they are locked.
    expect(explore).toContain("**Superseded in part 2026-10-04** by [`shell-screening-chrome-lock-v1.md`]");
    expect(explore).toContain("sliding workspace row; **superseded 2026-10-04:**");
    expect(explore).toContain("), Exit (**superseded 2026-10-04:**");
    expect(explore).toContain("A filled header chip (44 hit) (**superseded 2026-10-04:**");
    expect(lock).toContain("[`social-explore-for-you-immersive-lock-v2.md`](social-explore-for-you-immersive-lock-v2.md)");
  });

  // Fix pass (review of the shell PR): each decision below is pinned in
  // the lock and in the code that carries it.
  it("G1: at most one lit lane — one on workspace routes, none on account and Co-Productions routes", () => {
    // G1's routes (one lit on workspace routes, none on account and
    // Co-Productions routes) are pinned in code below.
    expect(lock).toContain("at most one `aria-current=\"page\"` lane");
    expect(lock).not.toContain("exactly one `aria-current=\"page\"` lane with the 2px ink underline");
    // The lanes light index === overviewLeadActiveIndex (WorkspaceLanes).
    const lanes = workspaceSliderSegments(availableWorkspaceOptions({ isGcStaff: true }));
    const lit = (path: string, cookie: WorkspaceMode) =>
      overviewLeadActiveIndex(path, resolveWorkspaceMode(path, cookie), lanes);
    const laneAt = (path: string, cookie: WorkspaceMode) => lanes[lit(path, cookie)]?.id ?? null;
    expect(laneAt("/home", "social")).toBe("home");
    expect(laneAt("/home/news", "social")).toBe("home");
    expect(laneAt("/aggregation/dashboard", "social")).toBe("aggregation");
    expect(laneAt("/social", "aggregation")).toBe("social");
    expect(laneAt("/education", "aggregation")).toBe("education");
    expect(laneAt("/staff/queue", "staff")).toBe("staff");
    for (const path of ["/settings", ACTIVITY_HREF, HELP.href, CO_PRODUCTIONS_HREF]) {
      for (const cookie of ["aggregation", "social", "education", "staff"] as const) {
        expect(lit(path, cookie), `${path} (${cookie})`).toBe(-1);
      }
    }
  });

  it("phone dock: the pill floats 16 off the bottom and the five slots are equal", () => {
    // The 16 float and the equal slots are pinned in code below.
    expect(lock).toContain("| Float |");
    expect(lock).toContain("**Five equal slots**");
    expect(HOUSE_PHONE_BOTTOM_NAV_CLASS).toContain("pb-[max(16px,env(safe-area-inset-bottom))]");
    // The float stays 16; the register's 56 pill moves the clearance to 3.5rem.
    expect(tokens).toContain("--house-phone-dock-clearance: calc(3.5rem + max(16px, env(safe-area-inset-bottom)) + var(--space-4));");
    // A pad on the links alone floors their flex base at the pad, so
    // Create's anchor (no pad) came out 8 narrower. Every slot must share
    // the same flex sizing and the same (no) inline pad.
    const tokensOf = (cls: string) => cls.split(/\s+/).filter(Boolean);
    const inlinePad = (cls: string) =>
      tokensOf(cls).filter((t) => /^(p|px|pl|pr|ps|pe)-/.test(t)).sort();
    for (const slot of [HOUSE_PHONE_BOTTOM_NAV_ITEM_CLASS, SOCIAL_CREATE_FAN_ANCHOR_CLASS]) {
      expect(tokensOf(slot)).toEqual(expect.arrayContaining(["flex-1", "min-w-0", "h-full"]));
      expect(tokensOf(slot).filter((t) => /^(basis|grow|shrink|w|min-w|max-w)-/.test(t))).toEqual(["min-w-0"]);
    }
    expect(inlinePad(HOUSE_PHONE_BOTTOM_NAV_ITEM_CLASS)).toEqual(inlinePad(SOCIAL_CREATE_FAN_ANCHOR_CLASS));
    expect(inlinePad(HOUSE_PHONE_BOTTOM_NAV_ITEM_CLASS)).toEqual([]);
  });

  it("phone emblem: a 44 tall link, as the board's wordmark box", () => {
    expect(lock).toContain("Emblem (the existing mark) in a **44** tall link");
    expect(lock).toContain("**G4.** Phone bar 60: emblem (a 44 tall link)");
    expect(HOUSE_LEAD_LOGO_CLASS).toContain("h-[var(--header-control-size)]");
    expect(tokens).toMatch(/max-width:\s*767px[\s\S]*--header-control-size:\s*44px;/);
  });

  it("records the board departures it keeps, and the code keeps them", () => {
    const at = lock.indexOf("## Departures from the board");
    expect(at).toBeGreaterThan(-1);
    const departures = lock.slice(at, lock.indexOf("## Explicit OUT"));
    // 1 — Explore desktop rail: deferred to the Explore PR; the shell keeps it out.
    expect(departures).toContain("1. **Explore desktop rail.**");
    expect(lock).toContain("(Departure 1)");
    expect(appShell).toMatch(/const hideDestRail =[^\n]*\|\| exploreStage;/);
    expect(appShell).toContain("deferred to the\n  // Explore PR (shell-screening-chrome-lock-v1 §2 Explore, Departure 1;");
    // 2 — header pad: superseded 2026-10-05 by the register (lead 24 after
    // the side menu's edge, end 32; the 32 / 32 pair where the bar carries
    // the brand mark).
    expect(departures).toContain("2. **Header pad.**");
    expect(HOUSE_LEAD_DESKTOP_BRAND_PAD_CLASS).toBe(HOUSE_SHELL_GUTTER_X_CLASS);
    expect(HOUSE_LEAD_DESKTOP_PAD_CLASS).toBe("md:pl-[var(--space-6)] md:pr-[var(--shell-gutter-inline-end)]");
    expect(tokens).toMatch(/--shell-gutter-inline-start:\s*32px;/);
    expect(tokens).toMatch(/--shell-gutter-inline-end:\s*32px;/);
    // 3 — phone lead pad 16.
    expect(departures).toContain("3. **Phone lead pad.** 16");
    expect(HOUSE_LEAD_CHROME_CLASS).toContain("max-md:pl-[var(--chrome-gutter)]");
    // 4 — dark muted stays the house ramp; the live and board values are
    // pinned in the dark tokens below.
    expect(departures).toContain("4. **Dark muted.**");
    const dark = tokens.slice(tokens.indexOf(".dark {"));
    expect(dark).toMatch(/--surface-muted:\s*#25292f;/);
    expect(dark).toMatch(/--surface:\s*#1e2126;/);
  });

  // The tokens comments now name the register's sizes, not the
  // screening ones.
  it("keeps the tokens comments on the current shell sizes", () => {
    expect(tokens).toContain("Desktop header controls: 44, the same as phone");
    expect(tokens).not.toContain("box included, are 34 (--header-desktop-control-size, below).");
    expect(HOUSE_HEADER_EXIT_COMPACT_CLASS).toContain("w-[var(--header-desktop-control-size)]");
    // The phone block names the live rail widths.
    expect(tokens).not.toContain("--sidebar-width / 60");
    expect(tokens).toContain("Desktop rail stays --sidebar-width (240) /\n   --sidebar-width-collapsed (80) at md and up.");
  });

  it("is indexed and named on the status page", () => {
    expect(readme).toContain("[`shell-screening-chrome-lock-v1.md`](shell-screening-chrome-lock-v1.md)");
    expect(readme.indexOf("shell-screening-chrome-lock-v1.md")).toBeLessThan(
      readme.indexOf("[`shell-unified-chrome-lock-v1.md`]"),
    );
    const sectionAt = current.indexOf("## Shared shell chrome");
    const section = current.slice(sectionAt, current.indexOf("---", sectionAt));
    expect(section).toContain("docs/design-locks/shell-screening-chrome-lock-v1.md");
    expect(section).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });
});
