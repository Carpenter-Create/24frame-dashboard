"use client";

import { createContext, useContext } from "react";

import type { SocialPostMediaItem } from "@/lib/social-author-post-card";

// The owner menu's line to the one caption host on the Social layout
// (social-post-caption-host). Kept apart so the post card never pulls in the
// host or the window. docs/design-locks/social-post-caption-window-lock-v1.md

export type SocialPostCaptionRequest = {
  postId: string;
  /** The caption the server sent with the card. */
  serverBody: string | null;
  /** The stored media, as the server counts it (an empty caption is allowed). */
  hasMedia: boolean;
  /** The media the card draws: shown read-only under the caption. */
  media: readonly SocialPostMediaItem[];
  authorName: string;
  authorPhotoUrl: string | null;
  groupSlug: string | null;
  /** The ⋯ that asked: focus returns to it, and a queued open needs it still on the page. */
  trigger: HTMLElement | null;
};

export type SocialPostCaptionWindowApi = {
  open: (request: SocialPostCaptionRequest) => void;
  /** Load the window's code ahead of the first open (the ⋯ menu opening). */
  warm: () => void;
};

export const SocialPostCaptionContext = createContext<SocialPostCaptionWindowApi | null>(null);

/** Null outside the Social layout: there is no caption window to open. */
export function useSocialPostCaptionWindow(): SocialPostCaptionWindowApi | null {
  return useContext(SocialPostCaptionContext);
}
