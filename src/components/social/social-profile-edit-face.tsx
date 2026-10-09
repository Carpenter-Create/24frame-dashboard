"use client";

import { createContext, useContext, type ReactNode } from "react";

import { HouseLink } from "@/components/chrome/house-link";
import { SocialIcon } from "@/components/social/social-icon";
import { InlineNotice } from "@/components/ui/inline-notice";
import {
  SOCIAL_PROFILE_BIO_DONE_CLASS,
  SOCIAL_PROFILE_EDIT_BACK_CLASS,
  SOCIAL_PROFILE_EDIT_BODY_CLASS,
  SOCIAL_PROFILE_EDIT_DONE_CLASS,
  SOCIAL_PROFILE_EDIT_HEADER_CLASS,
  SOCIAL_PROFILE_EDIT_HOST_CLASS,
  SOCIAL_PROFILE_EDIT_SHEET_CLASS,
} from "@/lib/social-chrome";
import { SOCIAL_ICON_SIZE_HEADER } from "@/lib/social-icons";
import { SOCIAL, SOCIAL_ROUTES } from "@/lib/social";

// Where an Edit profile face is drawn (docs/design-locks/social-profile-edit-window-lock-v1.md).
// window: the desktop window owns the header (back · title · Done); the
//   face is its body only.
// sheet: the phone sheet; the face draws back · title · Done, where Back
//   keeps the draft and Done is the one save.
// No host: a standalone face (the Home prompt's Bio route) with its own save.
export type SocialProfileEditFaceHost =
  | { kind: "window"; error: string }
  | {
      kind: "sheet";
      error: string;
      pending: boolean;
      /** Done waits (a picture or video uploading) while the face stays editable. */
      doneWaits?: boolean;
      onDone: () => void;
    };

const FaceHostContext = createContext<SocialProfileEditFaceHost | null>(null);

export const SocialProfileEditFaceHostProvider = FaceHostContext.Provider;

export function useSocialProfileEditFaceHost(): SocialProfileEditFaceHost | null {
  return useContext(FaceHostContext);
}

export function SocialProfileEditFace({
  face,
  title,
  onBack,
  backHref = SOCIAL_ROUTES.profileEdit,
  done,
  children,
}: {
  face: "name" | "handle" | "roles" | "topics" | "imdb" | "links" | "bio";
  title: string;
  onBack?: () => void;
  backHref?: string;
  /** Standalone faces only. Inside Edit, Done is always the one save. */
  done?: {
    attr: string;
    onClick: () => void;
    pending?: boolean;
    icon?: boolean;
  };
  children: ReactNode;
}) {
  const host = useContext(FaceHostContext);
  const hostAttr = { [`data-social-profile-${face}`]: "" };
  const headerAttr = { [`data-social-profile-${face}-header`]: "" };
  const backAttr = { [`data-social-profile-${face}-back`]: "" };
  const notice = host?.error ? <InlineNotice tone="error">{host.error}</InlineNotice> : null;

  if (host?.kind === "window") {
    return (
      <div {...hostAttr} className="flex flex-col gap-[var(--space-4)]">
        {children}
        {notice}
      </div>
    );
  }

  const back = onBack ? (
    <button
      type="button"
      {...backAttr}
      onClick={onBack}
      className={SOCIAL_PROFILE_EDIT_BACK_CLASS}
      aria-label={SOCIAL.profile.back}
    >
      <SocialIcon name="caret-left" size={SOCIAL_ICON_SIZE_HEADER} />
    </button>
  ) : (
    <HouseLink href={backHref} className={SOCIAL_PROFILE_EDIT_BACK_CLASS} aria-label={SOCIAL.profile.back}>
      <SocialIcon name="caret-left" size={SOCIAL_ICON_SIZE_HEADER} />
    </HouseLink>
  );

  const trailing =
    host?.kind === "sheet" ? (
      <button
        type="button"
        data-social-profile-edit-face-done=""
        disabled={host.pending || host.doneWaits}
        aria-busy={host.pending || host.doneWaits}
        onClick={host.onDone}
        className={SOCIAL_PROFILE_EDIT_DONE_CLASS}
      >
        {SOCIAL.profile.done}
      </button>
    ) : done ? (
      <button
        type="button"
        {...{ [done.attr]: "" }}
        disabled={done.pending}
        onClick={done.onClick}
        className={done.icon ? SOCIAL_PROFILE_BIO_DONE_CLASS : undefined}
        aria-label={SOCIAL.profile.done}
      >
        {done.icon ? <SocialIcon name="check" size={18} /> : SOCIAL.profile.done}
      </button>
    ) : (
      <span className="size-9 shrink-0" aria-hidden />
    );

  return (
    <div {...hostAttr} data-house-overlay-host="app-sheet" className={SOCIAL_PROFILE_EDIT_HOST_CLASS}>
      <div className={SOCIAL_PROFILE_EDIT_SHEET_CLASS}>
        <header {...headerAttr} className={SOCIAL_PROFILE_EDIT_HEADER_CLASS}>
          {back}
          <h1 className="min-w-0 flex-1 text-center text-[17px] font-semibold text-ink">{title}</h1>
          {trailing}
        </header>
        <div
          className={SOCIAL_PROFILE_EDIT_BODY_CLASS}
          inert={host?.kind === "sheet" && host.pending}
          aria-busy={(host?.kind === "sheet" && host.pending) || undefined}
        >
          {children}
          {notice}
        </div>
      </div>
    </div>
  );
}
