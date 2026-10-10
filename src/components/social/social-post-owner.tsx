"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { DotsThree, PencilSimple, Trash } from "@phosphor-icons/react";

import {
  ThreadPopoverContent,
  ThreadPopoverItem,
} from "@/components/chrome/menu-surface";
import { SocialPostOwnerSheet, SocialPostRemoveDialog } from "@/components/social/social-post-owner-sheet";
import { useSocialPostOwner } from "@/components/social/use-social-post-owner";
import { useSocialPostLiveBody } from "@/components/social/use-social-optimistic";
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { menuHostClass } from "@/lib/menu-host";
import { PHOSPHOR_CHROME_IDLE_WEIGHT } from "@/lib/phosphor-icon";
import { SOCIAL } from "@/lib/social";
import { type SocialPostMediaItem } from "@/lib/social-author-post-card";
import { SOCIAL_POST_MORE_CLASS } from "@/lib/social-chrome";
import { THREAD_POPOVER_DELETE_ICON_CLASS, THREAD_POPOVER_ICON_CLASS } from "@/lib/house-sheet";
import {
  readSocialPostHidden,
  subscribeSocialPostOwn,
} from "@/lib/social-post-own";

// Owner overflow: the quiet ⋯ at the header's end (a 44 clear hit, desktop
// 40, glyph 20 ink-2), not a fourth round beside Like · Comment · Share.
// It reads Edit caption · Remove. Drawn once for each width through the
// menu-family gate (menuHostClass; lib/menu-host.ts post-owner-menu): on a
// phone the house AppSheet card of rows (Family A), on desktop the thread ···
// popover (MenuSurface). Remove asks first with the house ask.
// docs/design-locks/social-post-owner-menu-lock-v1.md
// docs/design-locks/social-feed-register-lock-v1.md §7
// docs/design-locks/mobile-menu-family-tree-v1.md

export function SocialPostPresence({
  postId,
  children,
}: {
  postId: string;
  children: ReactNode;
}) {
  const hidden = useSyncExternalStore(
    subscribeSocialPostOwn,
    () => readSocialPostHidden(postId),
    () => false,
  );
  if (hidden) return null;
  return children;
}

export function SocialPostCaptionPlace({
  postId,
  serverBody,
  className,
  empty = null,
}: {
  postId: string;
  serverBody: string | null;
  /** The words' one style (cards lock): a caption and a text body alike. */
  className: string;
  /** Drawn in the words' place while the live body is empty. */
  empty?: ReactNode;
}) {
  const body = useSocialPostLiveBody(postId, serverBody);
  // Under the header, the words alone (the name sits just above, so no
  // handle prefix). Wraps; never clamped. Plain text: the permalink is the
  // time's 44 hit, so the words are no sub-44 phone target. The live body
  // follows an owner's edit, so a caption written later replaces `empty`.
  // docs/design-locks/social-feed-cards-lock-v1.md
  if (!body) return empty;
  return (
    <p data-social-post-caption="" className={className}>
      {body}
    </p>
  );
}

export function SocialPostOwnerMenu(props: {
  postId: string;
  /** The caption the server sent with the card. */
  serverBody: string | null;
  /** The stored media, as the server counts it. */
  hasMedia: boolean;
  /** The media the card draws: shown read-only in the caption window. */
  media: readonly SocialPostMediaItem[];
  authorName: string;
  authorPhotoUrl: string | null;
  groupSlug: string | null;
}) {
  const {
    state,
    host,
    canEdit,
    surfaceRef,
    panelRef,
    phoneTriggerRef,
    desktopTriggerRef,
    openSheet,
    onPopoverOpenChange,
    chooseEdit,
    chooseRemove,
    dismiss,
    dismissFromScrim,
    remove,
    onDesktopCloseAutoFocus,
  } = useSocialPostOwner(props);
  const ask = {
    pending: state.pending,
    error: state.error,
    panelRef,
    onKeep: dismiss,
    onRemove: () => void remove(),
    onScrimKeep: dismissFromScrim,
  };
  const glyph = <DotsThree className="size-5" weight={PHOSPHOR_CHROME_IDLE_WEIGHT} />;

  return (
    <>
      {/* Phone: opens the sheet on click (Radix opens on finger-down, and a
          sheet rising under a finger still down would take the release as a
          scrim tap). */}
      <button
        ref={phoneTriggerRef}
        type="button"
        data-social-post-owner=""
        data-menu-host="phone"
        data-menu-family="A"
        aria-label={SOCIAL.post.overflow}
        aria-haspopup="dialog"
        aria-expanded={host === "sheet"}
        className={`${SOCIAL_POST_MORE_CLASS} ${menuHostClass("phone")}`}
        onClick={openSheet}
      >
        {glyph}
      </button>
      {/* Desktop: the thread ··· popover; `contents` keeps the ⋯ a flex child. */}
      <span data-menu-host="desktop" data-menu-family="desktop" className={menuHostClass("desktop", "slot")}>
        <DropdownMenu open={state.step === "menu" && state.surface === "popover"} onOpenChange={onPopoverOpenChange}>
          <DropdownMenuTrigger asChild>
            <button
              ref={desktopTriggerRef}
              type="button"
              data-social-post-owner=""
              aria-label={SOCIAL.post.overflow}
              className={SOCIAL_POST_MORE_CLASS}
            >
              {glyph}
            </button>
          </DropdownMenuTrigger>
          <ThreadPopoverContent align="end" data-menu-family="desktop" onCloseAutoFocus={onDesktopCloseAutoFocus}>
            {canEdit ? (
              <ThreadPopoverItem data-social-post-owner-edit="" onSelect={chooseEdit}>
                <PencilSimple className={THREAD_POPOVER_ICON_CLASS} weight={PHOSPHOR_CHROME_IDLE_WEIGHT} />
                {SOCIAL.post.editTitle}
              </ThreadPopoverItem>
            ) : null}
            <ThreadPopoverItem data-social-post-owner-remove="" danger onSelect={chooseRemove}>
              <Trash className={THREAD_POPOVER_DELETE_ICON_CLASS} weight={PHOSPHOR_CHROME_IDLE_WEIGHT} />
              {SOCIAL.post.deleteConfirm}
            </ThreadPopoverItem>
          </ThreadPopoverContent>
        </DropdownMenu>
      </span>
      {host === "sheet" ? (
        <SocialPostOwnerSheet
          face={state.step === "confirm" ? "confirm" : "menu"}
          canEdit={canEdit}
          surfaceRef={surfaceRef}
          onEdit={chooseEdit}
          onRemoveRow={chooseRemove}
          onClose={dismiss}
          {...ask}
        />
      ) : null}
      {host === "dialog" ? <SocialPostRemoveDialog {...ask} /> : null}
    </>
  );
}
