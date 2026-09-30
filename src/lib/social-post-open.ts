// Comment opens the post URL.
// docs/design-locks/social-post-comment-open-lock-v1.md
// Soft-nav intercept closes with history back so the feed underneath returns.
// A hard load closes to Social home unless the referrer is already this origin.

export type SocialPostOpenDismiss = "back" | "home";

export function socialPostOpenShouldGoBack(input: {
  dismiss: SocialPostOpenDismiss;
  referrer: string | null | undefined;
  origin: string;
}): boolean {
  if (input.dismiss === "back") return true;
  if (!input.referrer || !input.origin) return false;
  try {
    return new URL(input.referrer).origin === input.origin;
  } catch {
    return false;
  }
}
