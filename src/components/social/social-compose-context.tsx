"use client";

import { createContext, useContext } from "react";

// The one write composer window (docs/design-locks/social-desktop-create-composer-lock-v1.md).
// AppShell owns it and its author (the shell's account identity, the same
// face as the header avatar). The side menu's Create and the Feed's
// "Share something" both open it from here; neither mounts its own. Every
// other poster (Go live) takes the same author from here.
export type SocialComposeAuthor = { name: string; photoUrl: string | null };

export type SocialCompose = {
  open: boolean;
  onOpen: () => void;
  controls: string;
  author: SocialComposeAuthor;
};

export const SocialComposeContext = createContext<SocialCompose | null>(null);

export function useSocialCompose(): SocialCompose | null {
  return useContext(SocialComposeContext);
}
