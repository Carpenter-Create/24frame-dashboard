"use client";

import { useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { DotsThree, PencilSimple, Trash } from "@phosphor-icons/react";

import {
  ThreadPopoverContent,
  ThreadPopoverItem,
} from "@/components/chrome/menu-surface";
import { useAppQueryClient } from "@/components/query-provider";
import { useSocialPostCaptionWindow } from "@/components/social/social-post-caption-context";
import { useSocialPostLiveBody } from "@/components/social/use-social-optimistic";
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { InlineNotice } from "@/components/ui/inline-notice";
import { PHOSPHOR_CHROME_IDLE_WEIGHT } from "@/lib/phosphor-icon";
import { SOCIAL } from "@/lib/social";
import { type SocialPostMediaItem } from "@/lib/social-author-post-card";
import { SOCIAL_POST_MORE_CLASS } from "@/lib/social-chrome";
import { THREAD_POPOVER_DELETE_ICON_CLASS, THREAD_POPOVER_ICON_CLASS } from "@/lib/house-sheet";
import { persistSocialPostDelete } from "@/lib/social-optimistic";
import {
  hideSocialPost,
  readSocialPostHidden,
  subscribeSocialPostOwn,
} from "@/lib/social-post-own";

// Owner overflow: the quiet ⋯ at the credit row's end (H · Posts; a 44
// clear hit, desktop 40, glyph 20 ink-2). Thread ··· surface — not a
// fourth round beside Like · Comment · Share.
// docs/design-locks/social-feed-register-lock-v1.md §7
// src/lib/menu-surface.ts

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

export function SocialPostOwnerMenu({
  postId,
  serverBody,
  hasMedia,
  media,
  authorName,
  authorPhotoUrl,
  groupSlug,
}: {
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
  const router = useRouter();
  const queryClient = useAppQueryClient();
  // Edit opens the caption window over the post: the one host on the Social
  // layout (docs/design-locks/social-post-caption-window-lock-v1.md). No host,
  // no Edit (never a dead control).
  const caption = useSocialPostCaptionWindow();
  const [mode, setMode] = useState<"delete" | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  // Edit opened the window: the menu must not take focus back to the ⋯.
  const openingRef = useRef(false);

  function openEdit() {
    if (!caption) return;
    openingRef.current = true;
    caption.open({
      postId,
      serverBody,
      hasMedia,
      media,
      authorName,
      authorPhotoUrl,
      groupSlug,
      trigger: triggerRef.current,
    });
  }

  function close() {
    if (pending) return;
    setMode(null);
    setError("");
  }

  async function removePost() {
    setPending(true);
    setError("");
    const form = new FormData();
    form.set("post_id", postId);
    if (groupSlug) form.set("group_slug", groupSlug);
    const result = await persistSocialPostDelete(form);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    hideSocialPost(postId);
    setMode(null);
    void queryClient?.invalidateQueries({ queryKey: ["social", "following-wall"] });
    router.refresh();
  }

  return (
    <>
      <DropdownMenu
        onOpenChange={(open) => {
          if (open) caption?.warm();
        }}
      >
        <DropdownMenuTrigger asChild>
          <button
            ref={triggerRef}
            type="button"
            data-social-post-owner=""
            aria-label={SOCIAL.post.overflow}
            className={SOCIAL_POST_MORE_CLASS}
          >
            <DotsThree className="size-5" weight={PHOSPHOR_CHROME_IDLE_WEIGHT} />
          </button>
        </DropdownMenuTrigger>
        <ThreadPopoverContent
          align="end"
          onCloseAutoFocus={(event) => {
            // Edit opened the window: focus goes to its field. A plain
            // dismiss still returns focus to the ⋯.
            if (!openingRef.current) return;
            event.preventDefault();
            openingRef.current = false;
          }}
        >
          {caption ? (
            <ThreadPopoverItem data-social-post-owner-edit="" onSelect={openEdit}>
              <PencilSimple className={THREAD_POPOVER_ICON_CLASS} weight={PHOSPHOR_CHROME_IDLE_WEIGHT} />
              {SOCIAL.post.edit}
            </ThreadPopoverItem>
          ) : null}
          <ThreadPopoverItem data-social-post-owner-delete="" danger onSelect={() => setMode("delete")}>
            <Trash className={THREAD_POPOVER_DELETE_ICON_CLASS} weight={PHOSPHOR_CHROME_IDLE_WEIGHT} />
            {SOCIAL.post.delete}
          </ThreadPopoverItem>
        </ThreadPopoverContent>
      </DropdownMenu>
      {mode === "delete" ? (
      <Dialog open onClose={close} title={SOCIAL.post.deleteTitle} size="sm">
        <p className="t-body-sm text-ink-2">{SOCIAL.post.deleteBody}</p>
        {error ? <InlineNotice tone="error">{error}</InlineNotice> : null}
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={close}>
            {SOCIAL.post.deleteKeep}
          </Button>
          <Button
            type="button"
            variant="danger"
            data-social-post-owner-delete-confirm=""
            disabled={pending}
            onClick={() => void removePost()}
          >
            {SOCIAL.post.deleteConfirm}
          </Button>
        </DialogFooter>
      </Dialog>
      ) : null}
    </>
  );
}
