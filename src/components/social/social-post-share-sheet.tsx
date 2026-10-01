"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";

import { listStorySendPeople, sendSocialPostShare } from "@/app/(app)/social/light-actions";
import { HouseScrim } from "@/components/chrome/house-overlay";
import { SocialFrameAiOpen } from "@/components/social/social-frame-ai-face";
import { SocialAvatar } from "@/components/social/social-avatar";
import { SocialIcon } from "@/components/social/social-icon";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Input } from "@/components/ui/input";
import { displayHandle, SOCIAL } from "@/lib/social";
import { isSocialFrameAiTarget, pinSocialFrameAiPeople } from "@/lib/social-frame-ai";
import {
  postSharePermalink,
  postShareSelectBlocked,
  postShareSelection,
  postShareSheetError,
  postShareToggle,
  postShareToast,
  postShareUiAfter,
} from "@/lib/social-post-share";
import {
  storySendPeopleQuery,
  type StorySendPerson,
} from "@/lib/social-story-actions";

// Post Share lock v1. One IG-dark drawer. Select morphs this same drawer.
// Phone docks to the bottom. Desktop centers the same sheet.
// docs/design-locks/social-post-share-sheet-ig-lock-v1.md
// Cites stories-send-dm-craft-lock-v1.md and house-overlay-dual-host-v1.md.
// Do not lock document.body overflow. iOS Safari treats that, plus a
// focused field, as a history scroll restore.

function holdSheetFieldViewport() {
  const scrolling = document.scrollingElement;
  const left = scrolling?.scrollLeft ?? window.scrollX;
  const top = scrolling?.scrollTop ?? window.scrollY;
  requestAnimationFrame(() => {
    window.scrollTo(left, top);
  });
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export function SocialPostShareSheet({
  postId,
  open,
  onClose,
  onSent,
  directory,
  initialQuery = "",
  initialSelectedIds = [],
}: {
  postId: string;
  open: boolean;
  onClose: () => void;
  onSent?: () => void;
  directory?: readonly StorySendPerson[];
  initialQuery?: string;
  initialSelectedIds?: readonly string[];
}) {
  const titleId = useId();
  const searchId = useId();
  const provided = directory !== undefined;
  const [people, setPeople] = useState<StorySendPerson[]>(directory ? [...directory] : []);
  const [query, setQuery] = useState(initialQuery);
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    postShareSelection(initialSelectedIds).filter((id) => !isSocialFrameAiTarget(id)),
  );
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(!provided);
  const [sending, setSending] = useState(false);
  const [attemptId] = useState(() => crypto.randomUUID());

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open || provided) return undefined;
    let cancelled = false;
    void listStorySendPeople().then((result) => {
      if (cancelled) return;
      setPeople(result.people);
      setError(result.error ?? "");
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, provided]);

  useEffect(() => {
    if (!copied) return undefined;
    const id = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(id);
  }, [copied]);

  if (!open) return null;

  const shown = storySendPeopleQuery(loading ? people : pinSocialFrameAiPeople(people), query);
  const searching = query.trim().length > 0;
  const selected = selectedIds.length > 0;
  const permalink =
    typeof window === "undefined" ? postSharePermalink(postId, "") : postSharePermalink(postId, window.location.origin);

  function toggle(personId: string) {
    if (sending) return;
    setSelectedIds((current) => {
      const next = postShareToggle(current, personId);
      return next === current ? current : [...next];
    });
  }

  async function send() {
    if (selectedIds.length === 0 || sending) return;
    setSending(true);
    setError("");
    const form = new FormData();
    form.set("post_id", postId);
    form.set("attempt_id", attemptId);
    for (const id of selectedIds) form.append("peer_id", id);
    const message = note.trim();
    if (message) form.set("note", message);
    const result = postShareSheetError(await sendSocialPostShare(form), people);
    const outcome = postShareUiAfter(result);
    if (outcome.close) {
      if (postShareToast(result).show) onSent?.();
      onClose();
      return;
    }
    setError(outcome.error);
    setSending(false);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(permalink);
      setCopied(true);
    } catch {
      setCopied(false);
      setError(SOCIAL.post.shareUnavailable);
    }
  }

  async function shareSystem() {
    if (typeof navigator.share !== "function") {
      setError(SOCIAL.post.shareUnavailable);
      return;
    }
    try {
      await navigator.share({ title: SOCIAL.post.share, url: permalink });
    } catch (shareError) {
      if (isAbortError(shareError)) return;
      setError(SOCIAL.post.shareUnavailable);
    }
  }

  const personFace = (person: StorySendPerson, size: string) => (
    <span className="relative shrink-0">
      <SocialAvatar name={person.name} photoUrl={person.photoUrl} size="sm" className={size} />
      {selectedIds.includes(person.id) ? (
        <span
          data-social-post-share-check=""
          className="absolute -bottom-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full bg-[#1769FF] text-white"
        >
          <SocialIcon name="check" size={12} className="text-white" />
        </span>
      ) : null}
    </span>
  );

  const sheet = (
    <div
      data-social-post-share-sheet=""
      data-social-post-share-host="ig-drawer"
      className="fixed inset-0 z-[60] flex items-end justify-center md:items-center"
    >
      <HouseScrim label={SOCIAL.post.shareClose} onClose={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex max-h-[90vh] w-full min-h-0 flex-col overflow-hidden rounded-t-[16px] bg-[#181818] p-4 pb-[max(16px,env(safe-area-inset-bottom))] shadow-none md:max-w-[420px] md:rounded-[16px]"
      >
        <h2 id={titleId} className="sr-only">
          {SOCIAL.post.share}
        </h2>
        <div
          data-social-post-share-grab=""
          className="mx-auto mb-4 h-1 w-9 shrink-0 rounded-full bg-white/40"
        />
        <div className="flex shrink-0 items-center gap-2">
          <div className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-[20px] bg-[#2A2A2E] px-3">
            <SocialIcon name="magnifying-glass" size={16} className="shrink-0 text-white/70" />
            <label className="sr-only" htmlFor={searchId}>
              {SOCIAL.post.shareSearch}
            </label>
            <Input
              id={searchId}
              type="text"
              variant="bare"
              enterKeyHint="search"
              data-social-post-share-search=""
              value={query}
              placeholder={SOCIAL.post.shareSearch}
              autoComplete="off"
              className="h-10 min-w-0 flex-1 text-white caret-white placeholder:text-white/60"
              onFocus={holdSheetFieldViewport}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.preventDefault();
              }}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          {searching ? (
            <button
              type="button"
              data-social-post-share-cancel=""
              className="h-10 shrink-0 px-2 t-body-sm font-medium text-white"
              onClick={() => setQuery("")}
            >
              {SOCIAL.post.shareCancel}
            </button>
          ) : null}
        </div>
        {error ? (
          <InlineNotice tone="error" className="mt-4">
            {error}
          </InlineNotice>
        ) : null}
        <div className="mt-4 min-h-0 flex-auto overflow-y-auto">
          {loading ? null : shown.length === 0 && !error ? (
            <p data-social-post-share-empty="" className="py-8 text-center t-body-sm text-white/70">
              {searching ? SOCIAL.search.noResults : SOCIAL.post.shareEmpty}
            </p>
          ) : searching ? (
            <ul data-social-post-share-results="" className="flex flex-col">
              {shown.map((person) => (
                <li key={person.id}>
                  {isSocialFrameAiTarget(person.id) ? (
                    <SocialFrameAiOpen
                      className="flex w-full min-w-0 items-center gap-3 py-2 text-left"
                      faceClassName="size-10"
                      label={person.name}
                      labelClassName="block break-words t-body font-medium text-white"
                      marker={{ "data-social-post-share-result": person.id }}
                      onOpen={onClose}
                    />
                  ) : (
                    <button
                      type="button"
                      data-social-post-share-result={person.id}
                      disabled={sending || postShareSelectBlocked(selectedIds.length, selectedIds.includes(person.id))}
                      aria-pressed={selectedIds.includes(person.id)}
                      className="flex w-full min-w-0 items-center gap-3 py-2 text-left"
                      onClick={() => toggle(person.id)}
                    >
                      {personFace(person, "size-10")}
                      <span className="min-w-0 flex-1">
                        <span className="block break-words t-body font-medium text-white">{person.name}</span>
                        <span className="block break-words t-body-sm text-white/60">{displayHandle(person.handle)}</span>
                      </span>
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div data-social-post-share-grid="" className="grid grid-cols-3 gap-4">
              {shown.map((person) =>
                isSocialFrameAiTarget(person.id) ? (
                  <SocialFrameAiOpen
                    key={person.id}
                    className="flex min-w-0 flex-col items-center gap-2"
                    faceClassName="size-14"
                    label={person.name}
                    labelClassName="w-full break-words text-center t-body-sm text-white"
                    marker={{ "data-social-post-share-cell": person.id }}
                    onOpen={onClose}
                  />
                ) : (
                  <button
                    key={person.id}
                    type="button"
                    data-social-post-share-cell={person.id}
                    disabled={sending || postShareSelectBlocked(selectedIds.length, selectedIds.includes(person.id))}
                    aria-pressed={selectedIds.includes(person.id)}
                    className="flex min-w-0 flex-col items-center gap-2"
                    onClick={() => toggle(person.id)}
                  >
                    {personFace(person, "size-14")}
                    <span className="w-full break-words text-center t-body-sm text-white">{person.name}</span>
                  </button>
                ),
              )}
            </div>
          )}
        </div>
        {selected ? null : (
          <div data-social-post-share-secondary="" className="mt-4 flex gap-4">
            <button
              type="button"
              data-social-post-share-copy=""
              className="flex min-w-0 flex-col items-center gap-2"
              onClick={() => void copyLink()}
            >
              <span className="flex size-12 items-center justify-center rounded-full bg-[#2A2A2E] text-white">
                <SocialIcon name="link" size={22} />
              </span>
              <span className="break-words text-center t-body-sm text-white">
                {copied ? SOCIAL.post.shareCopied : SOCIAL.post.shareCopyLink}
              </span>
            </button>
            <button
              type="button"
              data-social-post-share-system=""
              className="flex min-w-0 flex-col items-center gap-2"
              onClick={() => void shareSystem()}
            >
              <span className="flex size-12 items-center justify-center rounded-full bg-[#2A2A2E] text-white">
                <SocialIcon name="share-network" size={22} />
              </span>
              <span className="break-words text-center t-body-sm text-white">{SOCIAL.post.shareTo}</span>
            </button>
          </div>
        )}
        <div
          data-social-post-share-footer={selected ? "open" : "closed"}
          className="grid shrink-0 transition-[grid-template-rows] duration-200 ease-out"
          style={{ gridTemplateRows: selected ? "1fr" : "0fr" }}
        >
          <div className={selected ? "min-h-0" : "min-h-0 overflow-hidden"}>
            <label className="sr-only" htmlFor={`${searchId}-note`}>
              {SOCIAL.post.writeMessage}
            </label>
            <div className="mt-4 flex h-10 w-full items-center rounded-[20px] bg-[#2A2A2E] px-4">
              <Input
                id={`${searchId}-note`}
                type="text"
                variant="bare"
                enterKeyHint="done"
                data-social-post-share-note=""
                value={note}
                placeholder={SOCIAL.post.writeMessage}
                autoComplete="off"
                className="h-full w-full text-white caret-white placeholder:text-white/60"
                onFocus={holdSheetFieldViewport}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.preventDefault();
                }}
                onChange={(event) => setNote(event.target.value)}
              />
            </div>
            <button
              type="button"
              data-social-post-share-submit=""
              disabled={!selected || sending}
              className="mt-4 flex h-12 w-full items-center justify-center rounded-[24px] bg-[#1769FF] t-body font-medium text-white disabled:bg-[#2A2A2E] disabled:text-white/40"
              onClick={() => void send()}
            >
              {SOCIAL.post.send}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(sheet, document.body) : sheet;
}
