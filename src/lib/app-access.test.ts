import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { APP_GATE_REDIRECT, APP_SEGMENTS, appAccessBlocked, isAppGatedPath } from "./app-access";

const STATUSES = ["registered", "awaiting_payment", "active", "payment_lapsed", "closed"] as const;

type Route = { kind: "page" | "route"; path: string };

// Every page and route handler under dir, as the URL path it serves. Route
// groups and parallel-route slots add no segment; a dynamic one stands in as "x".
function routes(dir: string, url: string[] = []): Route[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry): Route[] => {
    if (entry.isDirectory()) {
      if (dir === "src/app" && entry.name === "(app)") return [];
      const segment = /^(\(.*\)|@.*)$/.test(entry.name)
        ? []
        : [/^\[.*\]$/.test(entry.name) ? "x" : entry.name];
      return routes(join(dir, entry.name), [...url, ...segment]);
    }
    const kind = /^(page|route)\.tsx?$/.exec(entry.name)?.[1];
    return kind ? [{ kind: kind as Route["kind"], path: `/${url.join("/")}` }] : [];
  });
}

const appRoutes = routes("src/app/(app)");
const appPages = appRoutes.filter((route) => route.kind === "page").map((route) => route.path);
const appHandlers = appRoutes.filter((route) => route.kind === "route").map((route) => route.path);
const otherRoutes = routes("src/app").map((route) => route.path);

describe("appAccessBlocked", () => {
  it("sends a client org that is not active to onboarding, and never GC staff", () => {
    for (const status of STATUSES) {
      expect(appAccessBlocked({ status }, false), status).toBe(status !== "active");
      expect(appAccessBlocked({ status }, true), `staff, ${status}`).toBe(false);
    }
  });

  // Social stays reachable without an org.
  it("lets a user with no org in", () => {
    expect(appAccessBlocked(null, false)).toBe(false);
    expect(appAccessBlocked(null, true)).toBe(false);
  });

  it("redirects to a path the gate never covers", () => {
    expect(APP_GATE_REDIRECT).toBe("/onboarding");
    expect(isAppGatedPath(APP_GATE_REDIRECT)).toBe(false);
  });
});

describe("isAppGatedPath", () => {
  it("lists exactly the top-level segments with (app) pages", () => {
    const segments = new Set(appPages.map((path) => path.split("/")[1]).filter(Boolean));

    expect([...APP_SEGMENTS].sort()).toEqual([...segments].sort());
  });

  it("covers every (app) page", () => {
    expect(appPages).toContain("/");
    expect(appPages).toContain("/staff/queue");
    for (const path of appPages) expect(isAppGatedPath(path), path).toBe(true);
  });

  // Route handlers never ran the (app) layout gate. Keep their scope.
  it("leaves (app) route handlers alone", () => {
    expect(appHandlers).toContain("/aggregation/reports/x/export");
    for (const path of appHandlers) expect(isAppGatedPath(path), path).toBe(false);
  });

  it("leaves every page and route outside (app) alone", () => {
    expect(otherRoutes).toContain("/onboarding");
    for (const path of otherRoutes) expect(isAppGatedPath(path), path).toBe(false);
  });

  it("reads percent-encoded paths as the router does", () => {
    expect(isAppGatedPath("/%68ome")).toBe(true);
    expect(isAppGatedPath("/aggregation/reports/x/%65xport")).toBe(false);
    expect(isAppGatedPath("/%E0%A4%A")).toBe(false);
  });
});
