import { handleDisplay } from "@/lib/social";

// List-page helpers for the IG inbox chrome. Filter is in-memory on
// rows the inbox already loaded. No new query.
// docs/design-locks/social-dms-inbox-ig-lock-v1.md

export type SocialDmInboxListPerson = {
  name: string;
  photoUrl?: string | null;
};

export type SocialDmInboxListRow = {
  id: string;
  href: string;
  kind: string;
  label: string;
  excerpt: string | null;
  time: string;
  unreadCount: number;
  people: readonly SocialDmInboxListPerson[];
};

/** Viewer handle with `@` stripped. Empty when there is no handle. */
export function socialDmInboxTitle(handle: string | null | undefined): string {
  return handle ? handleDisplay(handle) : "";
}

export function socialDmInboxMatchesQuery(
  query: string,
  row: { label: string; excerpt?: string | null },
): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const label = row.label.toLowerCase();
  const excerpt = (row.excerpt ?? "").toLowerCase();
  return label.includes(needle) || excerpt.includes(needle);
}
