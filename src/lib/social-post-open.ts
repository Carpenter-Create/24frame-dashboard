// Comment opens the post URL.
// docs/design-locks/social-post-comment-open-lock-v1.md
// Soft-nav intercept closes with history back so the feed underneath returns.
// A hard load cannot use history: a new tab keeps a same-origin referrer and
// an empty stack, so history.back() leaves the overlay up. Close to that
// referrer path, or Social home when it is missing, cross-origin, or this post.

export type SocialPostOpenDismiss = "back" | "home";

type SameOriginPath = {
  pathname: string;
  search: string;
  href: string;
};

function sameOriginPath(value: string | null | undefined, origin: string): SameOriginPath | null {
  if (!value || !origin) return null;
  try {
    const url = new URL(value);
    if (url.origin !== origin) return null;
    return {
      pathname: url.pathname,
      search: url.search,
      href: `${url.pathname}${url.search}${url.hash}`,
    };
  } catch {
    return null;
  }
}

/** "back" pops the soft-nav entry. A path is the hard-load destination. Null is Social home. */
export function socialPostOpenCloseHref(input: {
  dismiss: SocialPostOpenDismiss;
  referrer: string | null | undefined;
  origin: string;
  href: string;
}): "back" | string | null {
  if (input.dismiss === "back") return "back";
  const destination = sameOriginPath(input.referrer, input.origin);
  if (!destination) return null;
  const here = sameOriginPath(input.href, input.origin);
  if (here && here.pathname === destination.pathname && here.search === destination.search) {
    return null;
  }
  return destination.href;
}
