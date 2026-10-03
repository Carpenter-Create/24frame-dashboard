import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Founder lock 2026-09-19 (hygiene P1-1 / P1-2 / P1-4): old doors
// hard-404. No leftover redirect() stubs, Next redirects table, or
// Ask-AI intercept hop. Live SoT stays /settings/*, /staff/queue,
// Activity, header + Home Ask AI.
// Adam 2026-09-20 B: staff ops hard-cut off /aggregation/queue|avails|
// channels|gc/* — those route files 404. No dual SoT.

const RETIRED_DOOR_PAGES = [
  "src/app/(app)/account/page.tsx",
  "src/app/(app)/account/agreements/page.tsx",
  "src/app/(app)/account/company/page.tsx",
  "src/app/(app)/refer/page.tsx",
  "src/app/(app)/aggregation/messages/page.tsx",
  "src/app/(app)/aggregation/activity/page.tsx",
  "src/app/(app)/aggregation/messages/ask-ai-legacy-intercept.tsx",
  "src/app/(app)/(operator)/aggregation/gc/page.tsx",
  "src/app/(app)/(operator)/aggregation/gc/findings/page.tsx",
  "src/app/(app)/(operator)/aggregation/gc/review/page.tsx",
  "src/app/(app)/(operator)/aggregation/queue/page.tsx",
  "src/app/(app)/(operator)/aggregation/avails/page.tsx",
  "src/app/(app)/(operator)/aggregation/channels/page.tsx",
  "src/app/(app)/(operator)/aggregation/gc/deliveries/page.tsx",
  "src/app/(app)/(operator)/aggregation/gc/finance/page.tsx",
  "src/app/(app)/(operator)/aggregation/gc/clients/page.tsx",
  "src/app/(app)/(operator)/staff/gc/page.tsx",
  "src/app/(app)/(operator)/staff/gc/findings/page.tsx",
  "src/app/(app)/(operator)/staff/gc/review/page.tsx",
] as const;

const LIVE_SOT_PAGES = [
  "src/app/(app)/settings/profile/page.tsx",
  "src/app/(app)/settings/agreements/page.tsx",
  "src/app/(app)/settings/organization/page.tsx",
  "src/app/(app)/settings/organization/company/page.tsx",
  "src/app/(app)/settings/organization/entities/new/page.tsx",
  "src/app/(app)/settings/organization/entities/[entityId]/page.tsx",
  "src/app/(app)/settings/refer/page.tsx",
  "src/app/(app)/activity/page.tsx",
  "src/app/(app)/help/page.tsx",
  "src/app/(app)/(operator)/staff/queue/page.tsx",
] as const;

describe("workspace hard-cut — old doors 404", () => {
  it("deletes retired IA route files instead of hopping", () => {
    for (const page of RETIRED_DOOR_PAGES) {
      expect(existsSync(page), page).toBe(false);
    }
    for (const page of LIVE_SOT_PAGES) {
      expect(existsSync(page), page).toBe(true);
    }
    expect(existsSync("src/lib/workspace-redirects.ts")).toBe(false);
    expect(existsSync("src/app/(app)/account/actions.ts")).toBe(true);
    expect(existsSync("src/app/(app)/account/account-profile-form.tsx")).toBe(true);
    expect(existsSync("src/app/(app)/account/company-profile-form.tsx")).toBe(true);
    expect(existsSync("src/app/(app)/aggregation/messages/message-link.tsx")).toBe(true);
    expect(existsSync("src/app/(app)/help/page.tsx")).toBe(true);
    expect(existsSync("src/app/(app)/education/help/page.tsx")).toBe(false);
    expect(existsSync("src/app/(app)/aggregation/messages/ask-frame-ai-actions.ts")).toBe(true);
    expect(
      existsSync("src/app/(app)/(operator)/staff/gc/review/review-controls.tsx"),
    ).toBe(true);
  });

  it("keeps every /staff/* route behind the (operator) gc_staff bounce", () => {
    const layout = readFileSync("src/app/(app)/(operator)/layout.tsx", "utf8");
    expect(layout).toContain('.from("gc_staff")');
    expect(layout).toContain('redirect("/login")');
    expect(layout).toContain('redirect("/")');
    expect(existsSync("src/app/(app)/(operator)/staff/queue/page.tsx")).toBe(true);
    expect(existsSync("src/app/(app)/(operator)/staff/avails/page.tsx")).toBe(true);
    expect(existsSync("src/app/(app)/(operator)/staff/channels/page.tsx")).toBe(true);
    expect(existsSync("src/app/(app)/(operator)/staff/gc/deliveries/page.tsx")).toBe(true);
    expect(existsSync("src/app/(app)/(operator)/staff/gc/finance/page.tsx")).toBe(true);
    expect(existsSync("src/app/(app)/(operator)/staff/gc/clients/page.tsx")).toBe(true);
    expect(existsSync("src/app/(app)/staff/queue/page.tsx")).toBe(false);
  });

  it("keeps Next and Vercel off leftover workspace hops", () => {
    const nextConfig = readFileSync("next.config.ts", "utf8");
    const vercel = readFileSync("vercel.json", "utf8");
    expect(nextConfig).not.toContain("WORKSPACE_REDIRECTS");
    expect(nextConfig).not.toContain("async redirects");
    expect(vercel).not.toContain('"/account"');
    expect(vercel).not.toContain('"/refer"');
    expect(vercel).not.toContain('"/messages"');
    expect(vercel).not.toContain('"/aggregation/messages"');
    expect(nextConfig).not.toContain("/aggregation/activity");
    expect(vercel).not.toContain("/aggregation/activity");
    expect(nextConfig).not.toContain('"/activity"');
    expect(vercel).not.toContain('"/activity"');
  });
});
