// Profile Stage intro under the hero
// (docs/design-locks/social-profile-stage-lock-v1.md). No new data: the
// bio is the one free-text line a member writes. Its first line is the
// headline (20/480 desktop, 17/480 phone); any further lines are the
// tagline (15, ink-2), soft newlines kept. A one-line bio is a headline
// alone. The owner's empty-bio hint shows as the muted tagline.

export type SocialProfileIntro = {
  headline: string | null;
  tagline: string | null;
};

export function socialProfileIntro(
  bio?: string | null,
  emptyHint?: string | null,
): SocialProfileIntro {
  const text = (bio ?? "").trim();
  if (!text) {
    const hint = (emptyHint ?? "").trim();
    return { headline: null, tagline: hint || null };
  }
  const [first = "", ...rest] = text.split(/\r?\n/);
  const tagline = rest.join("\n").trim();
  return { headline: first.trim(), tagline: tagline || null };
}
