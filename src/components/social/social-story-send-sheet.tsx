"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";

import { SocialFrameAiOpen } from "@/components/social/social-frame-ai-face";
import { SocialAvatar } from "@/components/social/social-avatar";
import { SocialIcon } from "@/components/social/social-icon";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Input } from "@/components/ui/input";
import { listStorySendPeople, sendSocialStoryItem } from "@/app/(app)/social/light-actions";
import { HouseScrim } from "@/components/chrome/house-overlay";
import { displayHandle, SOCIAL } from "@/lib/social";
import { isSocialFrameAiTarget, pinSocialFrameAiPeople } from "@/lib/social-frame-ai";
import {
  storySendPeopleQuery,
  storySendToast,
  storySendUiAfter,
  type StorySendPerson,
} from "@/lib/social-story-actions";

// Send craft v1.5. One IG-dark drawer. Select morphs this same drawer.
// Do not lock document.body overflow. iOS Safari treats that, plus a
// focused field, as a history scroll restore. The shell then replaces
// the route and /social/loading paints the home skeleton.

function holdSheetFieldViewport() {
  const scrolling = document.scrollingElement;
  const left = scrolling?.scrollLeft ?? window.scrollX;
  const top = scrolling?.scrollTop ?? window.scrollY;
  requestAnimationFrame(() => {
    window.scrollTo(left, top);
  });
}

export function SocialStorySendSheet({
  storyId,
  open,
  onClose,
  onSent,
  directory,
  initialQuery = "",
  initialSelectedId = null,
}: {
  storyId: string;
  open: boolean;
  onClose: () => void;
  onSent?: () => void;
  directory?: readonly StorySendPerson[];
  initialQuery?: string;
  initialSelectedId?: string | null;
}) {
  const titleId = useId();
  const searchId = useId();
  const provided = directory !== undefined;
  const [people, setPeople] = useState<StorySendPerson[]>(directory ? [...directory] : []);
  const [query, setQuery] = useState(initialQuery);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialSelectedId && !isSocialFrameAiTarget(initialSelectedId) ? initialSelectedId : null,
  );
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(!provided);
  const [sending, setSending] = useState(false);

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

  if (!open) return null;

  const shown = storySendPeopleQuery(loading ? people : pinSocialFrameAiPeople(people), query);
  const searching = query.trim().length > 0;
  const selected = selectedId !== null && people.some((person) => person.id === selectedId);

  function toggle(personId: string) {
    if (sending) return;
    setSelectedId((current) => (current === personId ? null : personId));
  }

  async function send() {
    if (!selectedId || sending) return;
    setSending(true);
    setError("");
    const form = new FormData();
    form.set("story_id", storyId);
    form.set("peer_id", selectedId);
    const message = note.trim();
    if (message) form.set("note", message);
    const result = await sendSocialStoryItem(form);
    const outcome = storySendUiAfter(result);
    if (outcome.close) {
      if (storySendToast(result).show) onSent?.();
      onClose();
      return;
    }
    setError(outcome.error);
    setSending(false);
  }

  const personFace = (person: StorySendPerson, size: string) => (
    <span className="relative shrink-0">
      <SocialAvatar name={person.name} photoUrl={person.photoUrl} size="sm" className={size} />
      {selectedId === person.id ? (
        <span
          data-social-story-send-check=""
          className="absolute -bottom-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full bg-[#1769FF] text-white"
        >
          <SocialIcon name="check" size={12} className="text-white" />
        </span>
      ) : null}
    </span>
  );

  const sheet = (
    <div
      data-social-story-send-sheet=""
      data-social-story-send-host="ig-drawer"
      className="fixed inset-0 z-[60] flex items-end justify-center"
    >
      <HouseScrim label={SOCIAL.stories.close} onClose={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex h-[70vh] max-h-[90vh] w-full flex-col rounded-t-[16px] bg-[#181818] p-4 pb-[max(16px,env(safe-area-inset-bottom))] shadow-none md:max-w-[420px]"
      >
        <h2 id={titleId} className="sr-only">
          {SOCIAL.stories.send}
        </h2>
        <div
          data-social-story-send-grab=""
          className="mx-auto mb-4 h-1 w-9 shrink-0 rounded-full bg-white/40"
        />
        <div className="flex shrink-0 items-center gap-2">
          <div className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-[20px] bg-[#2A2A2E] px-3">
            <SocialIcon name="magnifying-glass" size={16} className="shrink-0 text-white/70" />
            <label className="sr-only" htmlFor={searchId}>
              {SOCIAL.stories.search}
            </label>
            <Input
              id={searchId}
              type="text"
              variant="bare"
              enterKeyHint="search"
              data-social-story-send-search=""
              value={query}
              placeholder={SOCIAL.stories.search}
              autoComplete="off"
              className="h-10 min-w-0 flex-1 text-white placeholder:text-white/60"
              onFocus={holdSheetFieldViewport}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.preventDefault();
              }}
              onChange={(event) => setQuery(event.target.value)}
            />
            {searching ? (
              <button
                type="button"
                data-social-story-send-clear=""
                className="flex size-6 shrink-0 items-center justify-center text-white/70"
                aria-label={SOCIAL.stories.cancel}
                onClick={() => setQuery("")}
              >
                <SocialIcon name="x" size={14} />
              </button>
            ) : null}
          </div>
          {searching ? (
            <button
              type="button"
              data-social-story-send-cancel=""
              className="h-10 shrink-0 px-2 t-body-sm font-medium text-white"
              onClick={() => setQuery("")}
            >
              {SOCIAL.stories.cancel}
            </button>
          ) : (
            <button
              type="button"
              data-social-story-send-group=""
              aria-label={SOCIAL.stories.newGroup}
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#2A2A2E] text-white"
            >
              <SocialIcon name="users" size={20} />
            </button>
          )}
        </div>
        {error ? (
          <InlineNotice tone="error" className="mt-4">
            {error}
          </InlineNotice>
        ) : null}
        <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
          {loading ? null : shown.length === 0 && !error ? (
            <p data-social-story-send-empty="" className="py-8 text-center t-body-sm text-white/70">
              {searching ? SOCIAL.search.noResults : SOCIAL.stories.sendEmpty}
            </p>
          ) : searching ? (
            <ul data-social-story-send-results="" className="flex flex-col">
              {shown.map((person) => (
                <li key={person.id}>
                  {isSocialFrameAiTarget(person.id) ? (
                    <SocialFrameAiOpen
                      className="flex w-full min-w-0 items-center gap-3 py-2 text-left"
                      faceClassName="size-10"
                      label={person.name}
                      labelClassName="block break-words t-body font-medium text-white"
                      marker={{ "data-social-story-send-result": person.id }}
                      storyId={storyId}
                      onOpen={onClose}
                    />
                  ) : (
                    <button
                      type="button"
                      data-social-story-send-result={person.id}
                      disabled={sending}
                      aria-pressed={selectedId === person.id}
                      className="flex w-full min-w-0 items-center gap-3 py-2 text-left"
                      onClick={() => toggle(person.id)}
                    >
                      {personFace(person, "size-10")}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate t-body font-medium text-white">{person.name}</span>
                        <span className="block truncate t-body-sm text-white/60">{displayHandle(person.handle)}</span>
                      </span>
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div data-social-story-send-grid="" className="grid grid-cols-3 gap-4">
              {shown.map((person) =>
                isSocialFrameAiTarget(person.id) ? (
                  <SocialFrameAiOpen
                    key={person.id}
                    className="flex min-w-0 flex-col items-center gap-2"
                    faceClassName="size-14"
                    label={person.name}
                    labelClassName="w-full break-words text-center t-body-sm text-white"
                    marker={{ "data-social-story-send-cell": person.id }}
                    storyId={storyId}
                    onOpen={onClose}
                  />
                ) : (
                  <button
                    key={person.id}
                    type="button"
                    data-social-story-send-cell={person.id}
                    disabled={sending}
                    aria-pressed={selectedId === person.id}
                    className="flex min-w-0 flex-col items-center gap-2"
                    onClick={() => toggle(person.id)}
                  >
                    {personFace(person, "size-14")}
                    <span className="w-full truncate text-center t-body-sm text-white">{person.name}</span>
                  </button>
                ),
              )}
            </div>
          )}
        </div>
        <div
          data-social-story-send-footer={selected ? "open" : "closed"}
          className="grid shrink-0 transition-[grid-template-rows] duration-200 ease-out"
          style={{ gridTemplateRows: selected ? "1fr" : "0fr" }}
        >
          <div className={selected ? "min-h-0" : "min-h-0 overflow-hidden"}>
            <label className="sr-only" htmlFor={`${searchId}-note`}>
              {SOCIAL.stories.writeMessage}
            </label>
            <div className="mt-4 flex h-10 w-full items-center rounded-[20px] bg-[#2A2A2E] px-4">
              <Input
                id={`${searchId}-note`}
                type="text"
                variant="bare"
                enterKeyHint="done"
                data-social-story-send-note=""
                value={note}
                placeholder={SOCIAL.stories.writeMessage}
                autoComplete="off"
                className="h-full w-full text-white placeholder:text-white/60"
                onFocus={holdSheetFieldViewport}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.preventDefault();
                }}
                onChange={(event) => setNote(event.target.value)}
              />
            </div>
            <button
              type="button"
              data-social-story-send-submit=""
              disabled={!selected || sending}
              className="mt-4 flex h-12 w-full items-center justify-center rounded-[24px] bg-[#1769FF] t-body font-medium text-white disabled:bg-[#2A2A2E] disabled:text-white/40"
              onClick={() => void send()}
            >
              {SOCIAL.stories.sendCta}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(sheet, document.body) : sheet;
}
