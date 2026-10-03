import type { Database } from "@/lib/supabase/database.types";

// Who may use the signed-in app, and which paths are the app.
//
// Middleware applies this before a full page load renders. The (app) layout
// applies it again (enforceAppAccess) for in-app navigations, which
// middleware leaves alone.

type OrgStatus = Database["public"]["Enums"]["org_status"];

export const APP_GATE_REDIRECT = "/onboarding";

// An org that has not finished onboarding (agreement and first payment)
// finishes it before the app. A lapsed or closed org keeps the dashboard:
// distribution and the revenue tail continue (domain-spec §3, §8, §17).
// A status missing here is treated as unfinished.
const APP_STATUS_IN: Record<OrgStatus, boolean> = {
  registered: false,
  awaiting_payment: false,
  active: true,
  payment_lapsed: true,
  closed: true,
};

// GC staff are exempt.
export function appAccessBlocked(
  activeOrg: { status: OrgStatus } | null,
  isGcStaff: boolean,
): boolean {
  return !!activeOrg && APP_STATUS_IN[activeOrg.status] !== true && !isGcStaff;
}

// Top-level segments with pages in the (app) route group, (operator)
// included. app-access.test.ts keeps this in step with src/app.
export const APP_SEGMENTS: ReadonlySet<string> = new Set([
  "activity",
  "aggregation",
  "co-productions",
  "education",
  "help",
  "home",
  "settings",
  "social",
  "staff",
]);

// Route handlers skip layouts, so the (app) gate has never covered them.
const APP_ROUTE_HANDLERS = [/^\/aggregation\/reports\/[^/]+\/export\/?$/];

export function isAppGatedPath(path: string): boolean {
  let decoded = path;
  try {
    decoded = decodeURI(path);
  } catch {
    // Malformed escapes: match the raw path.
  }
  if (APP_ROUTE_HANDLERS.some((handler) => handler.test(decoded))) return false;
  return decoded === "/" || APP_SEGMENTS.has(decoded.split("/")[1] ?? "");
}
