import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

type Result = { data: unknown; error: unknown };

const db = vi.hoisted(() => ({
  memberships: { data: null, error: null } as Result,
  staff: { data: null, error: null } as Result,
  throws: false,
  queries: [] as { table: string; filters: [string, unknown][] }[],
}));

type CookieWrite = { name: string; value: string; options: Record<string, unknown> };

vi.mock("@supabase/ssr", () => ({
  createServerClient: (
    _url: string,
    _key: string,
    options: { cookies: { setAll: (cookies: CookieWrite[]) => void } },
  ) => ({
    auth: {
      // Signed in, on a session that just refreshed.
      getClaims: async () => {
        options.cookies.setAll([{ name: "sb-auth", value: "refreshed", options: { path: "/" } }]);
        return { data: { claims: { sub: "user-1" } } };
      },
    },
    from: (table: string) => {
      const query = { table, filters: [] as [string, unknown][] };
      db.queries.push(query);
      const result = () => {
        if (db.throws) throw new Error("fetch failed");
        return table === "memberships" ? db.memberships : db.staff;
      };
      const builder = {
        select: () => builder,
        eq: (column: string, value: unknown) => {
          query.filters.push([column, value]);
          return builder;
        },
        maybeSingle: async () => result(),
        then: (resolve: (value: Result) => unknown, reject: (reason: unknown) => unknown) =>
          Promise.resolve().then(result).then(resolve, reject),
      };
      return builder;
    },
  }),
}));

import { middleware } from "@/middleware";

function orgs(...statuses: string[]) {
  return statuses.map((status, i) => ({ organizations: { id: `org-${i}`, status } }));
}

type Visit = { method?: string; headers?: Record<string, string> };

function visit(path: string, init: Visit = {}) {
  return middleware(new NextRequest(`http://localhost${path}`, init));
}

function sentTo(res: Response): string | null {
  const location = res.headers.get("location");
  if (!location) return null;
  const url = new URL(location);
  return `${url.pathname}${url.search}`;
}

beforeEach(() => {
  db.memberships = { data: orgs("registered"), error: null };
  db.staff = { data: null, error: null };
  db.throws = false;
  db.queries = [];
});

describe("app access gate on full page loads", () => {
  it("sends a member whose org is not active to onboarding before the page renders", async () => {
    for (const status of ["registered", "awaiting_payment", "payment_lapsed", "closed"]) {
      db.memberships = { data: orgs(status), error: null };
      const res = await visit("/aggregation/titles?tab=all");

      expect(res.status, status).toBe(307);
      expect(sentTo(res), status).toBe("/onboarding");
    }
  });

  it("keeps the refreshed session cookie on the redirect", async () => {
    const res = await visit("/home");

    expect(sentTo(res)).toBe("/onboarding");
    expect(res.headers.get("set-cookie")).toContain("sb-auth=refreshed");
  });

  it("covers every app page, profile share links included", async () => {
    for (const path of ["/", "/home", "/social/explore", "/staff/queue", "/@ada"]) {
      expect(sentTo(await visit(path)), path).toBe("/onboarding");
    }
    expect(sentTo(await visit("/home", { method: "HEAD" }))).toBe("/onboarding");
  });

  it("looks up only the signed-in user's active memberships and staff row", async () => {
    await visit("/home");

    expect(db.queries).toEqual([
      {
        table: "memberships",
        filters: [
          ["user_id", "user-1"],
          ["status", "active"],
        ],
      },
      { table: "gc_staff", filters: [["user_id", "user-1"]] },
    ]);
  });

  it("lets an active org, GC staff, and a user with no org in", async () => {
    db.memberships = { data: orgs("active"), error: null };
    expect(sentTo(await visit("/home"))).toBeNull();

    db.memberships = { data: orgs("registered"), error: null };
    db.staff = { data: { user_id: "user-1" }, error: null };
    expect(sentTo(await visit("/home"))).toBeNull();

    db.memberships = { data: [], error: null };
    db.staff = { data: null, error: null };
    expect(sentTo(await visit("/social"))).toBeNull();
  });

  // Same pick as the app: the cookie chooses among active orgs first.
  it("picks the org the way the app does", async () => {
    const cookie = { cookie: "gc_active_org=org-1" };

    db.memberships = { data: orgs("active", "registered"), error: null };
    expect(sentTo(await visit("/home", { headers: cookie }))).toBeNull();

    db.memberships = { data: orgs("registered", "payment_lapsed"), error: null };
    expect(sentTo(await visit("/home", { headers: cookie }))).toBe("/onboarding");
  });

  it("leaves the decision to the layout gate when a lookup fails", async () => {
    db.memberships = { data: null, error: { message: "timeout" } };
    expect(sentTo(await visit("/home"))).toBeNull();

    db.memberships = { data: orgs("registered"), error: null };
    db.staff = { data: null, error: { message: "timeout" } };
    expect(sentTo(await visit("/home"))).toBeNull();

    db.staff = { data: null, error: null };
    db.throws = true;
    expect(sentTo(await visit("/home"))).toBeNull();
  });

  // The layout gate still covers these. No lookup keeps in-app hops fast.
  it("skips in-app navigations, prefetches, and server actions", async () => {
    const requests: Visit[] = [
      { headers: { rsc: "1" } },
      { headers: { rsc: "1", "next-router-prefetch": "1" } },
      { method: "POST", headers: { "next-action": "abc123" } },
    ];
    for (const init of requests) {
      expect(sentTo(await visit("/home", init)), JSON.stringify(init)).toBeNull();
    }
    expect(db.queries).toEqual([]);
  });

  it("leaves paths outside the app alone", async () => {
    for (const path of [
      "/onboarding",
      "/agreement/pay",
      "/api/org/members",
      "/aggregation/reports/p1/export?format=csv",
    ]) {
      expect(sentTo(await visit(path)), path).toBeNull();
    }
    expect(db.queries).toEqual([]);
  });
});
