import { isSocialGoLivePath, isSocialWriteComposePath, SOCIAL_ROUTES } from "@/lib/social";

// Go live is pushed on top of the page that opened it. Close replaces
// that entry with the opener so the feed stays the cached screen.
// Write compose is never an opener — that sheet is what blanked Home.

let openerHref: string | null = null;

function pathOnly(href: string): string {
  const query = href.indexOf("?");
  const hash = href.indexOf("#");
  const end = query === -1 ? hash : hash === -1 ? query : Math.min(query, hash);
  const path = end === -1 ? href : href.slice(0, end);
  return path.endsWith("/") && path !== "/" ? path.slice(0, -1) : path || "/";
}

function safeOpenerHref(href: string | null): string | null {
  if (!href || !href.startsWith("/") || href.startsWith("//")) return null;
  const path = pathOnly(href);
  if (isSocialGoLivePath(path) || isSocialWriteComposePath(path)) return null;
  return href;
}

/** Page under the Create fan or desktop Create dialog, before the camera opens. */
export function rememberSocialGoLiveOpener(href: string): void {
  const safe = safeOpenerHref(href);
  if (!safe) return;
  openerHref = safe;
}

export function clearSocialGoLiveOpener(): void {
  openerHref = null;
}

/** Where X goes. A cold visit (no opener) lands on Social home. */
export function takeSocialGoLiveExitHref(): string {
  const opener = openerHref;
  openerHref = null;
  return safeOpenerHref(opener) ?? SOCIAL_ROUTES.home;
}

export function resetSocialGoLiveOpenerForTests(): void {
  openerHref = null;
}
