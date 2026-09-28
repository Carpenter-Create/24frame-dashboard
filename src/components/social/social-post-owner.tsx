"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DotsThree, PencilSimple, Trash } from "@phosphor-icons/react";

import {
  ThreadPopoverContent,
  ThreadPopoverItem,
} from "@/components/chrome/menu-surface";
import { useAppQueryClient } from "@/components/query-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Textarea } from "@/components/ui/textarea";
import { PHOSPHOR_CHROME_IDLE_WEIGHT } from "@/lib/phosphor-icon";
import { POST_BODY_MAX, SOCIAL } from "@/lib/social";
import { SOCIAL_POST_ACTION_HIT_CLASS } from "@/lib/social-chrome";
import { THREAD_POPOVER_DELETE_ICON_CLASS, THREAD_POPOVER_ICON_CLASS } from "@/lib/house-sheet";
import { persistSocialPostCaption, persistSocialPostDelete } from "@/lib/social-optimistic";
import {
  hideSocialPost,
  postCaptionWrite,
  readSocialPostHidden,
  rememberSocialPostCaption,
  socialPostLiveBody,
  subscribeSocialPostOwn,
} from "@/lib/social-post-own";

// Owner overflow on the author row. Thread ··· surface — not a fourth
// hit on Like · Comment · Share.
// docs/design-locks/social-home-post-actions-align-lock-v1.md
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
  hasMedia,
  place,
  href,
  permalink,
  handle,
}: {
  postId: string;
  serverBody: string | null;
  hasMedia: boolean;
  place: "above" | "below";
  href: string;
  permalink: boolean;
  handle: string;
}) {
  const body = useSyncExternalStore(
    subscribeSocialPostOwn,
    () => socialPostLiveBody(postId, serverBody),
    () => serverBody,
  );
  const above = Boolean(body) && hasMedia;
  if (place === "above" && !above) return null;
  if (place === "below" && (above || !body)) return null;
  const caption = (
    <>
      <span className="font-semibold">{handle} </span>
      {body}
    </>
  );
  const className = "t-body-sm text-ink whitespace-pre-wrap break-words";
  if (permalink) {
    return (
      <Link href={href} data-social-post-caption="" className={className}>
        {caption}
      </Link>
    );
  }
  return (
    <p data-social-post-caption="" className={className}>
      {caption}
    </p>
  );
}

export function SocialPostOwnerMenu({
  postId,
  body,
  hasMedia,
  groupSlug,
}: {
  postId: string;
  body: string | null;
  hasMedia: boolean;
  groupSlug: string | null;
}) {
  const router = useRouter();
  const queryClient = useAppQueryClient();
  const liveBody = useSyncExternalStore(
    subscribeSocialPostOwn,
    () => socialPostLiveBody(postId, body),
    () => body,
  );
  const [mode, setMode] = useState<"edit" | "delete" | null>(null);
  const [draft, setDraft] = useState(liveBody ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  function openEdit() {
    setDraft(liveBody ?? "");
    setError("");
    setMode("edit");
  }

  function close() {
    if (pending) return;
    setMode(null);
    setError("");
  }

  async function saveCaption() {
    const written = postCaptionWrite(draft, hasMedia);
    if ("error" in written) {
      setError(written.error);
      return;
    }
    setPending(true);
    setError("");
    const form = new FormData();
    form.set("post_id", postId);
    form.set("body", written.body ?? "");
    if (groupSlug) form.set("group_slug", groupSlug);
    const result = await persistSocialPostCaption(form);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    rememberSocialPostCaption(postId, written.body);
    setMode(null);
    void queryClient?.invalidateQueries({ queryKey: ["social", "following-wall"] });
    router.refresh();
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

  const saveDisabled = pending || (!hasMedia && draft.trim().length === 0);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            data-social-post-owner=""
            aria-label={SOCIAL.post.overflow}
            className={`${SOCIAL_POST_ACTION_HIT_CLASS} ml-auto`}
          >
            <DotsThree className="size-4" weight={PHOSPHOR_CHROME_IDLE_WEIGHT} />
          </button>
        </DropdownMenuTrigger>
        <ThreadPopoverContent align="end">
          <ThreadPopoverItem data-social-post-owner-edit="" onSelect={openEdit}>
            <PencilSimple className={THREAD_POPOVER_ICON_CLASS} weight={PHOSPHOR_CHROME_IDLE_WEIGHT} />
            {SOCIAL.post.edit}
          </ThreadPopoverItem>
          <ThreadPopoverItem data-social-post-owner-delete="" danger onSelect={() => setMode("delete")}>
            <Trash className={THREAD_POPOVER_DELETE_ICON_CLASS} weight={PHOSPHOR_CHROME_IDLE_WEIGHT} />
            {SOCIAL.post.delete}
          </ThreadPopoverItem>
        </ThreadPopoverContent>
      </DropdownMenu>
      {mode === "edit" ? (
      <Dialog open onClose={close} title={SOCIAL.post.editTitle} size="md">
        <form
          className="flex flex-col gap-[var(--space-3)]"
          onSubmit={(event) => {
            event.preventDefault();
            void saveCaption();
          }}
        >
          <label className="sr-only" htmlFor={`social-post-caption-${postId}`}>
            {SOCIAL.post.editTitle}
          </label>
          <Textarea
            id={`social-post-caption-${postId}`}
            value={draft}
            maxLength={POST_BODY_MAX}
            rows={4}
            variant="bare"
            placeholder={SOCIAL.home.captionPlaceholder}
            className="min-h-24 whitespace-pre-wrap break-words"
            onChange={(event) => setDraft(event.target.value)}
          />
          {error ? <InlineNotice tone="error">{error}</InlineNotice> : null}
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={close}>
              {SOCIAL.post.editCancel}
            </Button>
            <Button type="submit" data-social-post-owner-save="" disabled={saveDisabled}>
              {SOCIAL.post.editSave}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
      ) : null}
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
