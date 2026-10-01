import { askGlobeeLandingHref } from "@/lib/ask-globee";
import { askAiOverlayHref } from "@/lib/ask-ai-overlay";
import { ASSISTANT_NAME } from "@/lib/product";
import { SOCIAL_ROUTES } from "@/lib/social";
import type { SocialDmInboxListRow } from "@/lib/social-dm-inbox-list";
import type { StorySendPerson } from "@/lib/social-story-actions";

// Adam product lock: 24Frame AI is pinned first in Social Messages and
// in share/send people grids. The chat is the existing shell overlay.
// This id is not a profile and not a conversation.
// docs/design-locks/social-frame-ai-pin-lock-v1.md

export const SOCIAL_FRAME_AI_ID = "24frame-ai";
export const SOCIAL_FRAME_AI_KIND = "frame-ai";

export function isSocialFrameAiTarget(id: string): boolean {
  return id === SOCIAL_FRAME_AI_ID;
}

/** Messages list. Stays on /social/dms and opens the overlay. */
export function socialFrameAiInboxHref(): string {
  return askAiOverlayHref(SOCIAL_ROUTES.dms);
}

/** Share and send sheets. Opens the overlay on the current path. */
export function socialFrameAiOpenHref(): string {
  return askGlobeeLandingHref();
}

export function socialFrameAiInboxRow(): SocialDmInboxListRow {
  return {
    id: SOCIAL_FRAME_AI_ID,
    href: socialFrameAiInboxHref(),
    kind: SOCIAL_FRAME_AI_KIND,
    label: ASSISTANT_NAME,
    excerpt: null,
    time: "",
    unreadCount: 0,
    people: [{ name: ASSISTANT_NAME }],
  };
}

/** Human threads keep inbox order under the pinned row. */
export function pinSocialFrameAiInbox(
  rows: readonly SocialDmInboxListRow[],
): SocialDmInboxListRow[] {
  const humans = rows.filter(
    (row) => row.id !== SOCIAL_FRAME_AI_ID && row.kind !== SOCIAL_FRAME_AI_KIND,
  );
  return [socialFrameAiInboxRow(), ...humans];
}

export function socialFrameAiSendPerson(): StorySendPerson {
  return {
    id: SOCIAL_FRAME_AI_ID,
    name: ASSISTANT_NAME,
    handle: "",
    photoUrl: null,
  };
}

/** People grids keep their order under the pinned target. */
export function pinSocialFrameAiPeople(
  people: readonly StorySendPerson[],
): StorySendPerson[] {
  const humans = people.filter((person) => person.id !== SOCIAL_FRAME_AI_ID);
  return [socialFrameAiSendPerson(), ...humans];
}
