"use server";

import { headers } from "next/headers";

import { signInNextParam } from "@/lib/auth-callback-next";
import {
  DASHBOARD_SIGN_IN_RATE_LIMITED,
  DASHBOARD_SIGN_IN_SEND_FAILED,
  DASHBOARD_SIGN_IN_SENT,
  issueDashboardSignInLink,
} from "@/lib/auth-magic-link";
import {
  AUTH_SES_SUPPRESSED_USER_MESSAGE,
  isAuthSesSuppressedError,
} from "@/lib/auth-ses";
import {
  assertDashboardSignInAllowed,
  clientIpFromForwarded,
  DashboardSignInRateLimitError,
} from "@/lib/dashboard-sign-in-rate-limit";

export type LoginState = { ok: boolean; message: string };

// Magic-link only (domain-spec §21 decision): no passwords, no OAuth.
// Dashboard send uses generateLink + SES (link-only house mail). It does
// not call signInWithOtp — that fires GoTrue/hosted Auth mail. Mobile uses the
// same mint helper via /api/mobile/request-sign-in with house mail that includes
// the enterable OTP. Abuse hygiene is app-layer rate limits on this path
// (per-email + IP/global). Turnstile is not used on dashboard login; portal OTP
// still verifies Turnstile. AuthSesSuppressedError is a first-class send
// failure — not a generic mail outage.
export async function requestMagicLink(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { ok: false, message: "Enter your email address." };
  // The page a signed-out visit asked for. Re-checked: the form is client input.
  const next = signInNextParam(formData.get("next")?.toString());

  const hdrs = await headers();
  const origin = hdrs.get("origin");
  const ip = clientIpFromForwarded(hdrs.get("x-forwarded-for"));

  try {
    await assertDashboardSignInAllowed({ email, ip });
    await issueDashboardSignInLink({ email, requestOrigin: origin, ...(next ? { next } : {}) });
  } catch (err) {
    if (err instanceof DashboardSignInRateLimitError) {
      return { ok: false, message: DASHBOARD_SIGN_IN_RATE_LIMITED };
    }
    if (isAuthSesSuppressedError(err)) {
      console.warn("[dashboard-sign-in] SES destination suppressed", err.recipient);
      return { ok: false, message: AUTH_SES_SUPPRESSED_USER_MESSAGE };
    }
    console.error(
      "[dashboard-sign-in] mint/send failed",
      err instanceof Error ? err.message : err,
    );
    return { ok: false, message: DASHBOARD_SIGN_IN_SEND_FAILED };
  }
  return { ok: true, message: DASHBOARD_SIGN_IN_SENT };
}
