"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type MutableRefObject } from "react";
import { createPortal } from "react-dom";

import { HouseDialogFrame, useHouseDesktop } from "@/components/chrome/house-overlay";
import { SocialIcon } from "@/components/social/social-icon";
import { SocialProfileAvatarSheet } from "@/components/social/social-profile-avatar-sheet";
import {
  SocialProfileEditDiscardAsk,
  SocialProfileEditFaceSwitch,
  SocialProfileEditIndexBody,
  useSocialProfileEditDraft,
  useSocialProfileEditLeaveGuard,
  type SocialProfileEditProps,
} from "@/components/social/social-profile-edit";
import { SocialProfileEditFaceHostProvider } from "@/components/social/social-profile-edit-face";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { HOUSE_HEADER_ROUND_BUTTON_CLASS } from "@/lib/house-lead-chrome";
import {
  SOCIAL_PROFILE_EDIT_WINDOW_BODY_CLASS,
  SOCIAL_PROFILE_EDIT_WINDOW_DONE_CLASS,
  SOCIAL_PROFILE_EDIT_WINDOW_FACE_CLASS,
  SOCIAL_PROFILE_EDIT_WINDOW_HEADER_CLASS,
  SOCIAL_PROFILE_EDIT_WINDOW_PANEL_CLASS,
  SOCIAL_PROFILE_EDIT_WINDOW_TITLE_CLASS,
} from "@/lib/social-chrome";
import { SOCIAL_ICON_SIZE_HEADER } from "@/lib/social-icons";
import { SOCIAL } from "@/lib/social";
import type { SocialProfileEditFace } from "@/lib/social-profile-edit";

// Desktop Edit profile: the house window over the live profile
// (docs/design-locks/social-profile-edit-window-lock-v1.md, Adam 2026-10-09,
// "build it"). The composer's 600 window; the faces push inside one still
// frame; one Done saves everything and the change is already on the
// profile as the window leaves. Leaving with changes asks inside the
// window. Esc closes the nearest layer: the photo menu, the crop, the ask
// (Keep editing), a face (Back), then the window.

const FACE_TITLES: Record<SocialProfileEditFace, string> = {
  edit: SOCIAL.profile.edit,
  name: SOCIAL.profile.name,
  handle: SOCIAL.profile.username,
  roles: SOCIAL.profile.roles,
  topics: SOCIAL.profile.topics,
  imdb: SOCIAL.profile.imdb,
  links: SOCIAL.profile.links,
  bio: SOCIAL.profile.bio,
};

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusables(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (node) => !node.closest("[inert]") && !node.classList.contains("sr-only"),
  );
}

export type SocialProfileEditWindowRequest = MutableRefObject<(() => boolean) | null>;

export function SocialProfileEditWindow({
  requestRef,
  waiting = false,
  onClose,
  onPersistFailed,
  onPersisting,
  ...props
}: SocialProfileEditProps & {
  /** The island asks the window to close (browser Back). True when it closed. */
  requestRef?: SocialProfileEditWindowRequest;
  /** An earlier window's save is still with the server: hold until it
   *  answers, so a failure reaches this window instead of hiding behind it. */
  waiting?: boolean;
  /** Leave: after Done, after Discard, or a close with nothing changed. */
  onClose: () => void;
  /** The background save failed after the window left: reopen at that face. */
  onPersistFailed: (face: SocialProfileEditFace) => void;
  /** The background save is out. */
  onPersisting?: (settled: Promise<void>) => void;
}) {
  const edit = useSocialProfileEditDraft(props);
  // A changed username, or an earlier save, is with the server: nothing
  // leaves or changes until it answers.
  const busy = edit.pending || waiting;
  const [asking, setAsking] = useState(false);
  const [held, setHeld] = useState<number | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const askTitleId = useId();
  useSocialProfileEditLeaveGuard(edit.dirty);

  // Where focus goes back to when the ask or the photo menu closes.
  const returnFocusRef = useRef<HTMLElement | null>(null);

  function restoreFocus(fallback?: string) {
    const target =
      returnFocusRef.current?.isConnected && !returnFocusRef.current.closest("[inert]")
        ? returnFocusRef.current
        : fallback
          ? frameRef.current?.querySelector<HTMLElement>(fallback)
          : null;
    returnFocusRef.current = null;
    window.requestAnimationFrame(() => (target ?? frameRef.current)?.focus());
  }

  function requestClose(): boolean {
    if (busy) return false;
    if (!edit.dirty) {
      onClose();
      return true;
    }
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setAsking(true);
    return false;
  }

  function done() {
    if (busy) return;
    edit.save({
      leave: onClose,
      // The window stays on the mounted profile: no save-hop cover.
      stayOnPage: true,
      onPersistFailed,
      onPersisting,
    });
  }

  function discard() {
    edit.discard();
    setAsking(false);
    onClose();
  }

  function keepEditing() {
    setAsking(false);
    restoreFocus("[data-social-profile-edit-close]");
  }

  function closeMenu() {
    edit.setAvatarSheet(false);
    restoreFocus("[data-social-profile-edit-picture]");
  }

  function onEscape() {
    if (busy) return;
    if (edit.avatarSheet) {
      closeMenu();
      return;
    }
    if (edit.cropOpen) {
      edit.clearCrop();
      return;
    }
    // A second Esc keeps editing: a double Esc never discards.
    if (asking) {
      keepEditing();
      return;
    }
    if (edit.face !== "edit") {
      edit.backToIndex();
      return;
    }
    requestClose();
  }

  // Latest handlers for the one document listener.
  const keys = useRef({ onEscape, done, requestClose });
  useLayoutEffect(() => {
    keys.current = { onEscape, done, requestClose };
  });
  useEffect(() => {
    if (requestRef) requestRef.current = () => keys.current.requestClose();
    return () => {
      if (requestRef) requestRef.current = null;
    };
  }, [requestRef]);

  // Below md the window is hidden (a phone uses the sheet): it holds no
  // keys and no scroll lock there, so a resize never leaves the page dead.
  const desktop = useHouseDesktop();
  useEffect(() => {
    if (!desktop) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        keys.current.onEscape();
        return;
      }
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        keys.current.done();
        return;
      }
      if (event.key !== "Tab") return;
      const frame = frameRef.current;
      if (!frame) return;
      const items = focusables(frame);
      if (items.length === 0) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !frame.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !frame.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (!frameRef.current?.contains(document.activeElement)) frameRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [desktop]);

  // One still frame: it takes the height it opens at (up to 80vh) and
  // holds it, so a face never makes the window jump.
  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame || held !== null) return;
    setHeld(Math.ceil(frame.getBoundingClientRect().height));
  }, [held]);

  // A pushed face focuses its first field; Back returns to the row it left.
  // A window that opens on a face (Interests' Topics, a failed save) focuses
  // that face's first field too; one that opens on the index keeps the frame.
  const firstFace = useRef(true);
  useEffect(() => {
    const opening = firstFace.current;
    firstFace.current = false;
    if (opening && edit.face === "edit") return;
    const body = bodyRef.current;
    if (!body) return;
    body.scrollTop = 0;
    if (edit.face === "edit") {
      const row = edit.cameFrom
        ? body.querySelector<HTMLElement>(`[data-social-profile-edit-${edit.cameFrom}-open]`)
        : null;
      row?.focus();
      return;
    }
    const field = body.querySelector<HTMLElement>("input:not([type=file]):not(.sr-only), textarea");
    (field ?? focusables(body)[0])?.focus();
  }, [edit.face, edit.cameFrom]);

  const atIndex = edit.face === "edit";
  const motionClass =
    edit.motion === "push" ? "social-profile-edit-push" : edit.motion === "pop" ? "social-profile-edit-pop" : null;

  const dialog = (
    <HouseDialogFrame
      size="form"
      titleId={titleId}
      onClose={() => {
        requestClose();
      }}
      closeLabel={SOCIAL.create.close}
      panelClassName={SOCIAL_PROFILE_EDIT_WINDOW_PANEL_CLASS}
    >
      <div
        ref={frameRef}
        tabIndex={-1}
        data-social-profile-edit=""
        data-social-profile-edit-window=""
        className="flex max-h-[80vh] min-h-0 flex-col outline-none"
        style={held === null ? undefined : { height: held }}
      >
        <header
          data-social-profile-edit-header=""
          className={SOCIAL_PROFILE_EDIT_WINDOW_HEADER_CLASS}
          inert={asking || busy}
        >
          {atIndex ? (
            <button
              type="button"
              data-social-profile-edit-close=""
              aria-label={SOCIAL.create.close}
              className={HOUSE_HEADER_ROUND_BUTTON_CLASS}
              onClick={() => {
                requestClose();
              }}
            >
              <SocialIcon name="x" size={SOCIAL_ICON_SIZE_HEADER} />
            </button>
          ) : (
            <button
              type="button"
              data-social-profile-edit-back=""
              aria-label={SOCIAL.profile.back}
              className={HOUSE_HEADER_ROUND_BUTTON_CLASS}
              onClick={edit.backToIndex}
            >
              <SocialIcon name="caret-left" size={SOCIAL_ICON_SIZE_HEADER} />
            </button>
          )}
          <h2 id={titleId} className={SOCIAL_PROFILE_EDIT_WINDOW_TITLE_CLASS}>
            {FACE_TITLES[edit.face]}
          </h2>
          <Button
            data-social-profile-edit-done=""
            disabled={busy || edit.cropOpen}
            aria-busy={busy}
            className={SOCIAL_PROFILE_EDIT_WINDOW_DONE_CLASS}
            onClick={done}
          >
            {SOCIAL.profile.done}
          </Button>
        </header>
        <div
          ref={bodyRef}
          className={SOCIAL_PROFILE_EDIT_WINDOW_BODY_CLASS}
          inert={asking || busy}
          aria-busy={busy || undefined}
        >
          <div key={edit.face} className={cn(SOCIAL_PROFILE_EDIT_WINDOW_FACE_CLASS, motionClass)}>
            {atIndex ? (
              <SocialProfileEditIndexBody
                edit={edit}
                avatarMenu={
                  <SocialProfileAvatarSheet
                    open={edit.avatarSheet}
                    hasPhoto={Boolean(edit.previewPhoto)}
                    pending={edit.uploading}
                    placement="inline"
                    onClose={closeMenu}
                    onPick={edit.beginCrop}
                    onRemove={() => void edit.onPhotoRemove()}
                  />
                }
              />
            ) : (
              <SocialProfileEditFaceHostProvider value={{ kind: "window", error: edit.error }}>
                <SocialProfileEditFaceSwitch edit={edit} />
              </SocialProfileEditFaceHostProvider>
            )}
          </div>
        </div>
        {asking ? (
          <SocialProfileEditDiscardAsk
            edit={edit}
            variant="strip"
            titleId={askTitleId}
            onKeep={keepEditing}
            onDiscard={discard}
          />
        ) : null}
      </div>
    </HouseDialogFrame>
  );

  return typeof document === "undefined" ? dialog : createPortal(dialog, document.body);
}
