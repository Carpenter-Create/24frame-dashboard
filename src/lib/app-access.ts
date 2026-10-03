// Who may use the signed-in app, and which paths are the app.
//
// Middleware applies this before a full page load renders. The (app) layout
// applies it again (enforceAppAccess) for in-app navigations, which
// middleware leaves alone.

export const APP_GATE_REDIRECT = "/onboarding";

// An org that is not active yet (or any more) finishes onboarding before the
// app. GC staff are exempt.
export function appAccessBlocked(
  activeOrg: { status: string } | null,
  isGcStaff: boolean,
): boolean {
  return !!activeOrg && activeOrg.status !== "active" && !isGcStaff;
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
