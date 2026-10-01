// Feed photo scale + tap immersive.
// docs/design-locks/social-feed-photo-scale-immersive-lock-v1.md
// Caption more, Escape stacking, and the dialog focus trap live here.
// Share stays on SocialPostShareButton and the post Share sheet lock.

const IMMERSIVE_CAPTION_LINES = 3;
const IMMERSIVE_CAPTION_CHARS = 140;

// Comment mounts inside the stage. Share portals to document.body.
// Either one still owns this Escape.
export const SOCIAL_IMMERSIVE_NESTED_SHEET_SELECTOR =
  "[data-social-feed-immersive] [data-social-comment-thread], [data-social-post-share-sheet]";

// Share sheet and its sent toast sit above the stage. Leave them active.
export const SOCIAL_IMMERSIVE_KEEP_ABOVE_SELECTOR =
  "[data-social-post-share-sheet], [data-social-post-share-toast]";

// Top sheet owns Tab. Share is a body portal. Comment mounts inside the stage.
export const SOCIAL_IMMERSIVE_SHARE_SHEET_SELECTOR = "[data-social-post-share-sheet]";

export const SOCIAL_IMMERSIVE_COMMENT_SHEET_SELECTOR =
  '[data-house-overlay-host="house-dialog"], [data-house-overlay-host="app-sheet"]';

export const SOCIAL_IMMERSIVE_FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function socialImmersiveCaptionNeedsMore(body: string): boolean {
  if (body.split("\n").length > IMMERSIVE_CAPTION_LINES) return true;
  return body.length > IMMERSIVE_CAPTION_CHARS;
}

export function socialImmersiveNestedSheetOpen(root: {
  querySelector(selector: string): unknown;
}): boolean {
  return root.querySelector(SOCIAL_IMMERSIVE_NESTED_SHEET_SELECTOR) != null;
}

/** Share, then the comment sheet, then the stage. */
export function socialImmersiveActiveFocusRoot<T>(share: T | null, comment: T | null, stage: T): T {
  return share ?? comment ?? stage;
}

/** Escape dismisses the stage only when no comment or Share sheet is open. */
export function socialImmersiveEscapeDismisses(key: string, nestedSheetOpen: boolean): boolean {
  return key === "Escape" && !nestedSheetOpen;
}

export function socialImmersiveShellStaysActive(input: {
  isDialog: boolean;
  alreadyInert: boolean;
  keepAbove: boolean;
}): boolean {
  return input.isDialog || input.alreadyInert || input.keepAbove;
}

export function socialImmersiveMarkShellInert(body: HTMLElement, dialog: HTMLElement): HTMLElement[] {
  const inerted: HTMLElement[] = [];
  for (const child of body.children) {
    if (!(child instanceof HTMLElement)) continue;
    if (
      socialImmersiveShellStaysActive({
        isDialog: child === dialog,
        alreadyInert: child.inert,
        keepAbove: child.matches(SOCIAL_IMMERSIVE_KEEP_ABOVE_SELECTOR),
      })
    ) {
      continue;
    }
    child.inert = true;
    inerted.push(child);
  }
  return inerted;
}

export function socialImmersiveClearShellInert(nodes: readonly HTMLElement[]): void {
  for (const node of nodes) node.inert = false;
}

export function socialImmersiveFocusables(root: {
  querySelectorAll(selector: string): Iterable<{
    closest(selector: string): unknown;
    getClientRects?: () => { length: number };
  }>;
}): HTMLElement[] {
  const found: HTMLElement[] = [];
  for (const el of root.querySelectorAll(SOCIAL_IMMERSIVE_FOCUSABLE_SELECTOR)) {
    if (el.closest("[inert]")) continue;
    // display:none (desktop md:hidden mute) has no box. Skip it so Tab
    // stays on the controls that are actually on screen.
    if (el.getClientRects && el.getClientRects().length === 0) continue;
    found.push(el as HTMLElement);
  }
  return found;
}

/**
 * Tab wrap inside the dialog. Null keeps the browser move.
 * Focus inside an unlisted control (player shadow host) is left alone.
 */
export function socialImmersiveTabWrapIndex(
  count: number,
  activeIndex: number,
  activeInsideDialog: boolean,
  shiftKey: boolean,
): number | null {
  if (count <= 0) return null;
  if (!activeInsideDialog) return shiftKey ? count - 1 : 0;
  if (activeIndex < 0) return null;
  if (shiftKey) return activeIndex === 0 ? count - 1 : null;
  return activeIndex === count - 1 ? 0 : null;
}
