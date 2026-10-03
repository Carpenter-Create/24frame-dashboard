import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// Session gate only. Handler deps stay mocked so a fail-open bearer check
// cannot reach Supabase or AWS while this file asserts 401.
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: {
      getClaims: async () => ({ data: null }),
    },
  }),
}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/mediaconvert", () => ({ getJob: vi.fn() }));
vi.mock("@/lib/s3", () => ({ headObjectMeta: vi.fn() }));

import { createAdminClient } from "@/lib/supabase/admin";
import { middleware, config } from "@/middleware";
import { GET as poll } from "@/app/api/cron/transcode-poll/route";
import { GET as purge } from "@/app/api/cron/title-s3-purge/route";

const SECRET = "test-cron-secret-value";

function cronPaths(): string[] {
  const vercel = JSON.parse(readFileSync("vercel.json", "utf8")) as {
    crons: { path: string }[];
  };
  return vercel.crons.map((cron) => cron.path);
}

function request(path: string, headers?: Record<string, string>) {
  return new NextRequest(`http://localhost${path}`, { headers });
}

async function redirectsToLogin(path: string): Promise<boolean> {
  const res = await middleware(request(path));
  const location = res.headers.get("location");
  if (!location) return false;
  return new URL(location).pathname === "/login";
}

describe("GC-P0-2 cron session gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = SECRET;
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("lets scheduled /api/cron paths through the session gate and keeps other APIs gated", async () => {
    const scheduled = cronPaths();
    expect(scheduled).toEqual([
      "/api/cron/transcode-poll",
      "/api/cron/title-s3-purge",
    ]);

    // Middleware still runs for cron (the exemption is isPublic, not a matcher hole).
    const matcher = config.matcher.join("\n");
    expect(matcher).not.toContain("api/cron");

    for (const path of scheduled) {
      expect(await redirectsToLogin(path)).toBe(false);
    }
    expect(await redirectsToLogin("/api/cron/")).toBe(false);

    for (const path of [
      "/api/assets/complete",
      "/api/social/cover",
      "/api/stripe/checkout",
      "/api/gc/export",
      "/api/cronfoo",
    ]) {
      expect(await redirectsToLogin(path)).toBe(true);
    }

    // Existing non-session surfaces stay public to the same gate.
    expect(await redirectsToLogin("/api/stripe/webhook")).toBe(false);
    expect(await redirectsToLogin("/api/portal/download")).toBe(false);
    expect(await redirectsToLogin("/api/mobile/request-sign-in")).toBe(false);
  });

  it("rejects a missing or wrong bearer at the handler, including a session cookie", async () => {
    const handlers = [
      ["/api/cron/transcode-poll", poll],
      ["/api/cron/title-s3-purge", purge],
    ] as const;

    for (const [path, handler] of handlers) {
      const cases = [
        request(path),
        request(path, { cookie: "sb-access-token=not-a-cron-secret" }),
        request(path, { authorization: "Bearer not-the-secret" }),
        request(path, {
          authorization: "Bearer not-the-secret",
          cookie: "sb-access-token=not-a-cron-secret",
        }),
      ];

      for (const req of cases) {
        expect(await redirectsToLogin(path)).toBe(false);
        const res = await handler(req);
        expect(res.status).toBe(401);
        expect(createAdminClient).not.toHaveBeenCalled();
      }

      delete process.env.CRON_SECRET;
      const unset = await handler(request(path, { authorization: `Bearer ${SECRET}` }));
      expect(unset.status).toBe(401);
      expect(createAdminClient).not.toHaveBeenCalled();
      process.env.CRON_SECRET = SECRET;
    }
  });
});
