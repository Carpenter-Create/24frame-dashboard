import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { signInNextParam } from "@/lib/auth-callback-next";
import {
  socialGoLiveLegacyRedirect,
  socialProfileLegacyPublicRedirect,
  socialProfileRewriteTarget,
} from "@/lib/social";

import type { Database } from "./database.types";

// Refreshes the auth session on every request and gates protected routes.
// Public paths skip the session redirect only. Token, signature, and bearer
// checks stay in the handler — this list is not authorization.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do NOT insert logic between client creation and this call — it refreshes the token.
  // getClaims() verifies the JWT locally (WebCrypto + cached JWKS) on asymmetric-key
  // projects instead of a network round-trip to the Auth server, and still calls
  // getSession() internally so an expired token is refreshed exactly as getUser() did.
  const { data: claims } = await supabase.auth.getClaims();
  const user = claims?.claims?.sub ? { id: claims.claims.sub } : null;

  const path = request.nextUrl.pathname;
  const isPublic =
    path.startsWith("/login") ||
    path.startsWith("/auth") ||
    path.startsWith("/invite") ||       // email accept (token-gated; sign-in on the page)
    path.startsWith("/portal") ||       // account-less asset-access portal (token-gated)
    path.startsWith("/api/portal") ||   // portal route handlers (token/OTP/session gated in-handler)
    path.startsWith("/api/mobile") ||   // mobile sign-in mint/send (rate-limited in-handler)
    // Vercel cron sends Authorization: Bearer CRON_SECRET and no session cookie.
    // Trailing slash keeps the exemption on /api/cron/*; the handler stays
    // fail-closed on that secret (a session is not a substitute).
    path.startsWith("/api/cron/") ||
    // Stripe webhook authenticates by signature, not a user session — must not be
    // redirected to /login (it has no cookies).
    path === "/api/stripe/webhook" ||
    // Chrome fetches the web app manifest with no session cookie. A login
    // redirect is HTML, which the browser reports as a manifest syntax error.
    // Session redirect skip only — the file is public metadata, not auth.
    path === "/manifest.webmanifest" ||
    path === "/sentry-tunnel"; // Sentry tunnel; also excluded from the matcher
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    // Sign-in lands back on the page that was asked for. API calls never
    // land as pages.
    const next = path.startsWith("/api/") ? null : signInNextParam(`${path}${request.nextUrl.search}`);
    if (next) url.searchParams.set("next", next);
    return NextResponse.redirect(url);
  }

  const liveLegacy = socialGoLiveLegacyRedirect(path);
  if (liveLegacy) {
    const url = request.nextUrl.clone();
    url.pathname = liveLegacy;
    const redirected = NextResponse.redirect(url, 307);
    for (const cookie of response.cookies.getAll()) {
      redirected.cookies.set(cookie);
    }
    return redirected;
  }

  return applySocialVanityRewrite(request, response);
}

function applySocialVanityRewrite(request: NextRequest, response: NextResponse): NextResponse {
  const legacy = socialProfileLegacyPublicRedirect(request.nextUrl.pathname);
  if (legacy) {
    const url = request.nextUrl.clone();
    url.pathname = legacy;
    const redirected = NextResponse.redirect(url, 301);
    for (const cookie of response.cookies.getAll()) {
      redirected.cookies.set(cookie);
    }
    return redirected;
  }
  const internal = socialProfileRewriteTarget(request.nextUrl.pathname);
  if (!internal) return response;
  const url = request.nextUrl.clone();
  url.pathname = internal;
  const rewritten = NextResponse.rewrite(url, { request });
  for (const cookie of response.cookies.getAll()) {
    rewritten.cookies.set(cookie);
  }
  return rewritten;
}
