// Auth callback `next` allowlist (P0-1). Same-origin path-relative
// only. Reject protocol-relative, backslash, userinfo `@`, and
// schemes. Do not use `new URL(next, origin)` — that accepts `//evil`.
//
// Founder lock 2026-09-19: missing, unsafe, or leftover `/` land on
// /home. Preserve a safe allowlisted `next` when present.

import { HOME_ROOT } from "@/lib/workspace";

export const AUTH_DEFAULT_NEXT = HOME_ROOT;

function hasControlChars(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code < 32 || code === 127) return true;
  }
  return false;
}

function isSafePathRelative(value: string): boolean {
  if (!value.startsWith("/")) return false;
  if (value.startsWith("//")) return false;
  if (value.includes("\\") || value.includes("@")) return false;
  if (value.includes("://")) return false;
  if (hasControlChars(value)) return false;
  return true;
}

function isLeftoverRoot(value: string): boolean {
  return value === "/" || value.startsWith("/?");
}

function defaultAuthLand(value: string): string {
  if (value.startsWith("/?")) return `${AUTH_DEFAULT_NEXT}${value.slice(1)}`;
  return AUTH_DEFAULT_NEXT;
}

export function safeAuthCallbackNext(raw: string | null | undefined): string {
  if (!raw) return AUTH_DEFAULT_NEXT;
  if (isLeftoverRoot(raw)) return defaultAuthLand(raw);
  if (!isSafePathRelative(raw)) return AUTH_DEFAULT_NEXT;
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return AUTH_DEFAULT_NEXT;
  }
  if (decoded !== raw && !isSafePathRelative(decoded)) return AUTH_DEFAULT_NEXT;
  if (isLeftoverRoot(decoded)) return defaultAuthLand(decoded);
  return raw;
}

// The `next` a sign-in should carry: safe and not the default land, else
// null. Middleware sends the page a signed-out request was for; the login
// page and action re-check it before it goes into the emailed link.
export function signInNextParam(raw: string | string[] | null | undefined): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return null;
  const next = safeAuthCallbackNext(value);
  return next === AUTH_DEFAULT_NEXT ? null : next;
}
