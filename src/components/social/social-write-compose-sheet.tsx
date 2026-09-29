"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

import { AppSheetSurface } from "@/components/chrome/house";
import {
  HouseDialogFrame,
  HouseScrim,
  useHouseDesktop,
} from "@/components/chrome/house-overlay";
import { SocialCreateCompose } from "@/components/social/social-forms";
import { SOCIAL } from "@/lib/social";
import {
  bindSocialWriteComposeSheetViewport,
  SOCIAL_WRITE_COMPOSE_SHEET_DESKTOP_BODY_CLASS,
  SOCIAL_WRITE_COMPOSE_SHEET_HOST_CLASS,
  SOCIAL_WRITE_COMPOSE_SHEET_PRESENTATION,
  SOCIAL_WRITE_COMPOSE_SHEET_SURFACE_CLASS,
} from "@/lib/social-write-compose-sheet";

export function SocialWriteComposeSheet({
  open,
  onClose,
  titleId,
  authorName,
  authorHandle = null,
  authorPhotoUrl = null,
}: {
  open: boolean;
  onClose: () => void;
  titleId: string;
  authorName: string;
  authorHandle?: string | null;
  authorPhotoUrl?: string | null;
}) {
  const desktop = useHouseDesktop();
  const hostRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open || desktop) return undefined;
    const host = hostRef.current;
    const surface = surfaceRef.current;
    if (!host || !surface) return undefined;
    return bindSocialWriteComposeSheetViewport(host, surface);
  }, [open, desktop]);

  if (!open) return null;

  const compose = (
    <SocialCreateCompose
      authorName={authorName}
      authorHandle={authorHandle}
      authorPhotoUrl={authorPhotoUrl}
      initialKind="text"
      presentation="sheet"
      autoFocusBody
      onDismiss={onClose}
    />
  );
  const name = (
    <h2 id={titleId} className="sr-only">
      {SOCIAL.create.title}
    </h2>
  );

  const sheet = desktop ? (
    <HouseDialogFrame
      size="form"
      titleId={titleId}
      label={SOCIAL.create.title}
      onClose={onClose}
      closeLabel={SOCIAL.create.close}
    >
      <div
        data-social-write-compose-sheet=""
        data-social-write-compose-sheet-presentation={SOCIAL_WRITE_COMPOSE_SHEET_PRESENTATION}
        className={SOCIAL_WRITE_COMPOSE_SHEET_DESKTOP_BODY_CLASS}
      >
        {name}
        {compose}
      </div>
    </HouseDialogFrame>
  ) : (
    <div
      ref={hostRef}
      data-social-write-compose-sheet=""
      data-social-write-compose-sheet-presentation={SOCIAL_WRITE_COMPOSE_SHEET_PRESENTATION}
      data-house-overlay-host="app-sheet"
      className={SOCIAL_WRITE_COMPOSE_SHEET_HOST_CLASS}
    >
      <HouseScrim label={SOCIAL.create.close} onClose={onClose} />
      <AppSheetSurface
        ref={surfaceRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={SOCIAL_WRITE_COMPOSE_SHEET_SURFACE_CLASS}
      >
        {name}
        {compose}
      </AppSheetSurface>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(sheet, document.body) : sheet;
}
