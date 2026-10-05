import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { PRODUCT_NAME } from "@/lib/product";
import { SOCIAL } from "@/lib/social";
import {
  DEFAULT_LEADERBOARD_WINDOW,
  formatLeaderboardComputedAt,
  formatLeaderboardPct,
  isLeaderboardPublic,
  leaderboardHref,
  LEADERBOARD_TOP_N,
  LEADERBOARD_WINDOW_LABELS,
  LEADERBOARD_WINDOWS,
  parseLeaderboardWindow,
} from "./leaderboard";

describe("leaderboard window parse", () => {
  it("accepts 7d, 30d, and all, and defaults anything else to 7d", () => {
    expect(LEADERBOARD_WINDOWS).toEqual(["7d", "30d", "all"]);
    expect(DEFAULT_LEADERBOARD_WINDOW).toBe("7d");
    expect(parseLeaderboardWindow("7d")).toBe("7d");
    expect(parseLeaderboardWindow("30d")).toBe("30d");
    expect(parseLeaderboardWindow("all")).toBe("all");
    expect(parseLeaderboardWindow("week")).toBe("7d");
    expect(parseLeaderboardWindow(["all", "7d"])).toBe("all");
    expect(parseLeaderboardWindow(undefined)).toBe("7d");
    expect(parseLeaderboardWindow(null)).toBe("7d");
    expect(LEADERBOARD_TOP_N).toBe(10);
    expect(LEADERBOARD_WINDOW_LABELS["7d"]).toBe("7 days");
    expect(leaderboardHref("30d")).toBe("/social/leaderboard?window=30d");
  });
});

describe("leaderboard kill switch", () => {
  it("is public only when both settings are on", () => {
    expect(
      isLeaderboardPublic({ leaderboard_public: true, gamification_enabled: true }),
    ).toBe(true);
    expect(
      isLeaderboardPublic({ leaderboard_public: false, gamification_enabled: true }),
    ).toBe(false);
    expect(
      isLeaderboardPublic({ leaderboard_public: true, gamification_enabled: false }),
    ).toBe(false);
    expect(isLeaderboardPublic(null)).toBe(false);
    expect(SOCIAL.leaderboard.private).not.toMatch(/—/);
    expect(SOCIAL.leaderboard.subtitle).toContain(PRODUCT_NAME);
  });
});

describe("leaderboard formatting", () => {
  it("formats computed_at as an ISO date and pct to two decimals", () => {
    expect(formatLeaderboardComputedAt("2026-09-12T14:00:00.000Z")).toBe("2026-09-12");
    expect(formatLeaderboardComputedAt("nope")).toBeNull();
    expect(formatLeaderboardPct("12.5")).toBe("12.50%");
    expect(formatLeaderboardPct(0)).toBe("0.00%");
  });
});

describe("leaderboard stay on materialized rows", () => {
  it("never calls rebuild from the app and leaves Ask 24Frame AI off the leaderboard", () => {
    const page = readFileSync("src/app/(app)/social/leaderboard/page.tsx", "utf8");
    const lib = readFileSync("src/lib/leaderboard.ts", "utf8");
    const actions = readFileSync("src/app/(app)/social/actions.ts", "utf8");
    expect(page).toContain("loadLeaderboardBoard");
    expect(page).toContain("leaderboardHref");
    expect(lib).toContain("SOCIAL_ROUTES.leaderboard");
    expect(page).not.toContain("rebuild_leaderboards");
    expect(lib).not.toContain("rpc(");
    expect(lib).not.toContain("rebuild_leaderboards");
    expect(actions).not.toContain("rebuild_leaderboards");
    expect(actions).not.toContain("leaderboard_entries");
    expect(existsSync("src/app/(app)/aggregation/messages/page.tsx")).toBe(false);
    expect(existsSync("src/app/(app)/aggregation/messages/ask-ai-legacy-intercept.tsx")).toBe(
      false,
    );
    expect(lib).not.toMatch(/from ["']@24frame\/shared["']/);
    expect(page).not.toContain("—");
  });
});
