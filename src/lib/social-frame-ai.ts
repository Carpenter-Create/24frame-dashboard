import { ASSISTANT_NAME } from "@/lib/product";
import { SOCIAL_ROUTES } from "@/lib/social";
import type { SocialDmInboxListRow } from "@/lib/social-dm-inbox-list";
import type { SocialMuxPlaybackPolicy } from "@/lib/social-mux";
import type { StorySendPerson } from "@/lib/social-story-actions";

// Adam product lock: 24Frame AI is pinned first in Social Messages and
// in share/send people grids. Open is a DM-shaped thread on the Ask
// 24Frame AI stack. The id is not a profile and not a human DM.
// docs/design-locks/social-frame-ai-pin-lock-v1.md

export const SOCIAL_FRAME_AI_ID = "24frame-ai";
export const SOCIAL_FRAME_AI_KIND = "frame-ai";

export type SocialFrameAiShare = {
  kind: "post" | "story";
  line: string;
  authorName: string;
  authorPhotoUrl: string | null;
  caption: string | null;
  unavailable: boolean;
  mediaKind: "image" | "video" | null;
  url: string | null;
  playbackId?: string;
  playbackPolicy?: SocialMuxPlaybackPolicy;
  href: string | null;
};

// Soft opener. Once, on an empty thread. Not stored. Not sent to the model.
export const SOCIAL_FRAME_AI_OPENER = "What's on your mind?";

const SOCIAL_FRAME_AI_SHARE_PARAM_RE = /^[A-Za-z0-9_-]{1,80}$/;

export function isSocialFrameAiTarget(id: string): boolean {
  return id === SOCIAL_FRAME_AI_ID;
}

export function socialFrameAiThreadPath(): string {
  return `${SOCIAL_ROUTES.dms}/${SOCIAL_FRAME_AI_ID}`;
}

export function socialFrameAiShareParam(raw: string | null | undefined): string | null {
  const id = raw?.trim() ?? "";
  return SOCIAL_FRAME_AI_SHARE_PARAM_RE.test(id) ? id : null;
}

export function readSocialFrameAiShareSearch(
  search: Record<string, string | string[] | undefined>,
): { postId: string | null; storyId: string | null } {
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  return {
    postId: socialFrameAiShareParam(first(search.post)),
    storyId: socialFrameAiShareParam(first(search.story)),
  };
}

/** Messages row, and share/send when a post or story should ride along. */
export function socialFrameAiThreadHref(input?: {
  postId?: string | null;
  storyId?: string | null;
}): string {
  const params = new URLSearchParams();
  const postId = socialFrameAiShareParam(input?.postId);
  const storyId = socialFrameAiShareParam(input?.storyId);
  if (postId) params.set("post", postId);
  else if (storyId) params.set("story", storyId);
  const query = params.toString();
  const path = socialFrameAiThreadPath();
  return query ? `${path}?${query}` : path;
}

export function socialFrameAiInboxHref(): string {
  return socialFrameAiThreadHref();
}

/** Empty unlocked thread only. History and an in-flight send stay quiet. */
export function socialFrameAiOpenerVisible(input: {
  ready: boolean;
  storedCount: number;
  pending: boolean;
}): boolean {
  return input.ready && input.storedCount === 0 && !input.pending;
}

/** Latest Ask conversation. Pin order in the overlay history is not this thread. */
export function socialFrameAiContinuingConversation<T extends { updated_at: string }>(
  rows: readonly T[],
): T | null {
  let latest: T | null = null;
  for (const row of rows) {
    if (!latest || row.updated_at > latest.updated_at) latest = row;
  }
  return latest;
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
