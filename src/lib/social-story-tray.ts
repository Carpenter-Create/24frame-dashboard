import type { SocialPostMediaItem } from "@/lib/social-author-post-card";
import type { SocialMusicNotice } from "@/lib/social";

/** A short release is a tap. A longer press resumes and does not advance. */
export const SOCIAL_STORY_HOLD_TAP_MS = 200;
/** House spacing step. A horizontal move at least this far is a swipe. */
export const SOCIAL_STORY_SWIPE_PX = 48;

export type SocialStoryTrayItem = {
  id: string;
  createdAt: string;
  body: string | null;
  media: readonly SocialPostMediaItem[];
  musicNotice?: SocialMusicNotice;
};

export type SocialStoryTrayAuthor = {
  authorId: string;
  authorName: string;
  authorPhotoUrl: string | null;
  unseen: boolean;
  coverUrl: string | null;
  coverKind: "image" | "video" | null;
  items: readonly SocialStoryTrayItem[];
};

export type SocialStoryTrayCursor = {
  author: number;
  item: number;
};

export function storyTrayCursor(
  authors: readonly SocialStoryTrayAuthor[],
  storyId: string,
): SocialStoryTrayCursor {
  for (let author = 0; author < authors.length; author += 1) {
    const item = authors[author]?.items.findIndex((row) => row.id === storyId) ?? -1;
    if (item >= 0) return { author, item };
  }
  return { author: 0, item: 0 };
}

/** Next walks the author tray, then the next author's first item, then closes. */
export function storyTrayStep(
  authors: readonly SocialStoryTrayAuthor[],
  cursor: SocialStoryTrayCursor,
  direction: "next" | "prev",
): SocialStoryTrayCursor | "close" | null {
  const author = authors[cursor.author];
  if (!author || author.items.length === 0) return direction === "next" ? "close" : null;
  if (direction === "next") {
    if (cursor.item < author.items.length - 1) {
      return { author: cursor.author, item: cursor.item + 1 };
    }
    const next = authors[cursor.author + 1];
    if (next && next.items.length > 0) return { author: cursor.author + 1, item: 0 };
    return "close";
  }
  if (cursor.item > 0) return { author: cursor.author, item: cursor.item - 1 };
  const prev = authors[cursor.author - 1];
  if (prev && prev.items.length > 0) {
    return { author: cursor.author - 1, item: prev.items.length - 1 };
  }
  return null;
}

export function sortStoryTrayOldestFirst<T extends { createdAt: string; id: string }>(
  items: readonly T[],
): T[] {
  return [...items].sort(
    (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id.localeCompare(b.id),
  );
}

/** Tap the left third or swipe right for prev. Hold release does not advance. */
export function storyHoldRelease(input: {
  elapsedMs: number;
  dx: number;
  dy: number;
  width: number;
  x: number;
}): "next" | "prev" | "resume" {
  if (Math.abs(input.dx) >= SOCIAL_STORY_SWIPE_PX && Math.abs(input.dx) > Math.abs(input.dy)) {
    return input.dx < 0 ? "next" : "prev";
  }
  if (input.elapsedMs >= SOCIAL_STORY_HOLD_TAP_MS) return "resume";
  if (input.width <= 0) return "resume";
  return input.x < input.width / 3 ? "prev" : "next";
}
