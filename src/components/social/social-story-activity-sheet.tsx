"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";

import { AppSheetHead, AppSheetSurface, Close44 } from "@/components/chrome/house";
import {
  HouseDialogFrame,
  HouseOverlayHead,
  HouseScrim,
  useHouseDesktop,
} from "@/components/chrome/house-overlay";
import { InlineNotice } from "@/components/ui/inline-notice";
import { SocialAvatar } from "@/components/social/social-avatar";
import { listStoryViewers } from "@/app/(app)/social/light-actions";
import { APP_SHEET_HOST_CLASS } from "@/lib/house-sheet";
import { displayHandle, SOCIAL, socialMemberHref } from "@/lib/social";
import { SOCIAL_PERSON_SECONDARY_CLASS, SOCIAL_STORY_ACTIVITY_NAME_CLASS } from "@/lib/social-chrome";
import type { StoryActivityViewer } from "@/lib/social-story-actions";

export function SocialStoryActivitySheet({
  storyId,
  open,
  onClose,
  viewers,
}: {
  storyId: string;
  open: boolean;
  onClose: () => void;
  viewers?: readonly StoryActivityViewer[];
}) {
  const titleId = useId();
  const desktop = useHouseDesktop();
  const provided = viewers !== undefined;
  const [people, setPeople] = useState<StoryActivityViewer[]>(viewers ? [...viewers] : []);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(!provided);
  const [loadedFor, setLoadedFor] = useState<string | null>(provided ? storyId : null);
  if (open && !provided && loadedFor !== storyId) {
    setLoadedFor(storyId);
    setLoading(true);
    setError("");
  }

  useEffect(() => {
    if (!open || provided) return undefined;
    let cancelled = false;
    void listStoryViewers(storyId).then((result) => {
      if (cancelled) return;
      setPeople(result.people);
      setError(result.error ?? "");
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, provided, storyId]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const list = (
    <div data-social-story-activity-list="" className="flex min-h-0 max-h-[70dvh] flex-col gap-2 overflow-y-auto">
      {error ? <InlineNotice tone="error">{error}</InlineNotice> : null}
      {loading ? null : people.length === 0 && !error ? (
        <p data-social-story-activity-empty="" className="py-8 text-center t-body-sm text-ink-2">
          {SOCIAL.stories.activityEmpty}
        </p>
      ) : (
        people.map((person) => (
          <Link
            key={person.id}
            href={socialMemberHref(person.handle)}
            data-social-story-activity-row={person.id}
            className="flex min-w-0 items-center gap-3 py-2"
          >
            <SocialAvatar name={person.name} photoUrl={person.photoUrl} size="sm" className="size-10" />
            <span className="min-w-0">
              <span className={SOCIAL_STORY_ACTIVITY_NAME_CLASS}>{person.name}</span>
              <span className={SOCIAL_PERSON_SECONDARY_CLASS}>{displayHandle(person.handle)}</span>
            </span>
          </Link>
        ))
      )}
    </div>
  );

  const sheet = desktop ? (
    <HouseDialogFrame
      size="form"
      titleId={titleId}
      label={SOCIAL.stories.activity}
      onClose={onClose}
      closeLabel={SOCIAL.stories.close}
    >
      <div data-social-story-activity-sheet="">
        <HouseOverlayHead
          title={SOCIAL.stories.activity}
          titleId={titleId}
          closeLabel={SOCIAL.stories.close}
          onClose={onClose}
        />
        {list}
      </div>
    </HouseDialogFrame>
  ) : (
    <div data-social-story-activity-sheet="" data-house-overlay-host="app-sheet" className={APP_SHEET_HOST_CLASS}>
      <HouseScrim label={SOCIAL.stories.close} onClose={onClose} />
      <AppSheetSurface role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <AppSheetHead>
          <h2 id={titleId} className="min-w-0 flex-1 t-heading text-ink">
            {SOCIAL.stories.activity}
          </h2>
          <Close44 label={SOCIAL.stories.close} onClick={onClose} />
        </AppSheetHead>
        {list}
      </AppSheetSurface>
    </div>
  );

  const host = <div className="relative z-[60]">{sheet}</div>;
  return typeof document !== "undefined" ? createPortal(host, document.body) : host;
}
