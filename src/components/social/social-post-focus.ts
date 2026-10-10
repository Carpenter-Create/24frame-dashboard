"use client";

import { socialPostRemoveFocusTarget } from "@/lib/social-post-owner";

// Where focus goes after a post is removed (social-post-owner-menu-lock-v1
// §4): into the post after the one acted on. DOM reads only, kept apart from
// the owner hook so its client test can stub them. The choice itself is
// lib's socialPostRemoveFocusTarget.

const POST_SELECTOR = "[data-social-post]";

/** The article focus moves into once `removedId` leaves: read before the
 *  post is hidden. Starts from the acting ⋯'s own article, so on a post
 *  shown twice focus goes to the post after the copy acted on. */
export function socialPostRemoveFocusNext(from: HTMLElement | null, removedId: string): HTMLElement | null {
  const acting = from?.closest<HTMLElement>(POST_SELECTOR) ?? null;
  if (!acting) return null;
  const articles = [...document.querySelectorAll<HTMLElement>(POST_SELECTOR)];
  const actingIndex = articles.indexOf(acting);
  if (actingIndex < 0) return null;
  const order = articles.map((article) => article.getAttribute("data-social-post") ?? "");
  const target = socialPostRemoveFocusTarget(order, actingIndex, removedId);
  return target === null ? null : (articles[target] ?? null);
}

/** On the next frame, if the article is still on the page: its name link,
 *  else its first shown link that is a Tab stop (the time) or enabled button
 *  (the ⋯ drawn for this width, on your own post). The face link is
 *  aria-hidden and never chosen. */
export function focusSocialPostEntry(article: HTMLElement): void {
  window.requestAnimationFrame(() => {
    if (!article.isConnected) return;
    const entry =
      article.querySelector<HTMLElement>("a[data-social-post-name]") ??
      [...article.querySelectorAll<HTMLElement>('a[href]:not([tabindex="-1"]), button:not([disabled])')].find(
        // One of the two ⋯ is display:none at each width.
        (node) => node.getClientRects().length > 0,
      );
    entry?.focus();
  });
}
