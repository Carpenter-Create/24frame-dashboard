"use client";

import { useEffect, useId, useRef, type PointerEvent } from "react";
import { createPortal } from "react-dom";

import { SocialIcon } from "@/components/social/social-icon";
import { AppSheetSurface } from "@/components/chrome/house";
import { HouseScrim, useHouseDesktop } from "@/components/chrome/house-overlay";
import { AVATAR_ACCEPT } from "@/lib/account-avatar";
import { APP_SHEET_HOST_CLASS } from "@/lib/house-sheet";
import { menuSurfaceContentClass, menuSurfaceDensityForCount } from "@/lib/menu-surface";
import {
  SOCIAL_PROFILE_AVATAR_SHEET_DANGER_CLASS,
  SOCIAL_PROFILE_AVATAR_SHEET_HANDLE_CLASS,
  SOCIAL_PROFILE_AVATAR_SHEET_HANDLE_HIT_CLASS,
  SOCIAL_PROFILE_AVATAR_MENU_INLINE_CLASS,
  SOCIAL_PROFILE_AVATAR_SHEET_LIST_CLASS,
  SOCIAL_PROFILE_AVATAR_SHEET_ROW_CLASS,
} from "@/lib/social-chrome";
import { SOCIAL } from "@/lib/social";
import { SOCIAL_ICON_SIZE_HEADER } from "@/lib/social-icons";

const DISMISS_DRAG_PX = 64;

export function SocialProfileAvatarSheet({
  open,
  hasPhoto,
  pending = false,
  placement = "viewport",
  onClose,
  onPick,
  onRemove,
}: {
  open: boolean;
  hasPhoto: boolean;
  pending?: boolean;
  /** inline: the desktop Edit profile window. The house menu drops under
   *  Edit picture inside the window (the window owns Esc and scroll). */
  placement?: "viewport" | "inline";
  onClose: () => void;
  onPick: (file: File | undefined) => void;
  onRemove: () => void;
}) {
  const titleId = useId();
  const desktop = useHouseDesktop();
  const libraryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const dragStartY = useRef<number | null>(null);
  const inline = placement === "inline";

  useEffect(() => {
    if (!open || inline) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, inline, onClose]);

  if (!open) return null;

  function pickFrom(input: HTMLInputElement | null) {
    if (pending) return;
    input?.click();
  }

  function onFile(file: File | undefined) {
    onClose();
    onPick(file);
  }

  function onHandlePointerDown(event: PointerEvent<HTMLDivElement>) {
    dragStartY.current = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onHandlePointerUp(event: PointerEvent<HTMLDivElement>) {
    const start = dragStartY.current;
    dragStartY.current = null;
    if (start != null && event.clientY - start >= DISMISS_DRAG_PX) onClose();
  }

  const rows = (
        <div data-social-profile-avatar-sheet-list="" className={SOCIAL_PROFILE_AVATAR_SHEET_LIST_CLASS}>
          <button
            type="button"
            data-social-profile-avatar-library=""
            disabled={pending}
            className={SOCIAL_PROFILE_AVATAR_SHEET_ROW_CLASS}
            onClick={() => pickFrom(libraryRef.current)}
          >
            <SocialIcon name="image" size={SOCIAL_ICON_SIZE_HEADER} />
            {SOCIAL.profile.chooseFromLibrary}
          </button>
          <button
            type="button"
            data-social-profile-avatar-camera=""
            disabled={pending}
            className={SOCIAL_PROFILE_AVATAR_SHEET_ROW_CLASS}
            onClick={() => pickFrom(cameraRef.current)}
          >
            <SocialIcon name="camera" size={SOCIAL_ICON_SIZE_HEADER} />
            {SOCIAL.profile.takePhoto}
          </button>
          {hasPhoto ? (
            <button
              type="button"
              data-social-profile-avatar-remove=""
              disabled={pending}
              className={SOCIAL_PROFILE_AVATAR_SHEET_DANGER_CLASS}
              onClick={() => {
                onClose();
                onRemove();
              }}
            >
              <SocialIcon name="trash" size={SOCIAL_ICON_SIZE_HEADER} />
              {SOCIAL.profile.removePicture}
            </button>
          ) : null}
        </div>
      );

  const inputs = (
    <>
      <input
        ref={libraryRef}
        type="file"
        accept={AVATAR_ACCEPT}
        className="sr-only"
        aria-label={SOCIAL.profile.chooseFromLibrary}
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      <input
        ref={cameraRef}
        type="file"
        accept={AVATAR_ACCEPT}
        capture="user"
        className="sr-only"
        aria-label={SOCIAL.profile.takePhoto}
        onChange={(e) => onFile(e.target.files?.[0])}
      />
    </>
  );

  if (inline) {
    return (
      <div
        data-social-profile-avatar-sheet=""
        data-social-profile-avatar-sheet-placement="inline"
        data-house-overlay-host="menu-surface"
        className={SOCIAL_PROFILE_AVATAR_MENU_INLINE_CLASS}
      >
        <button
          type="button"
          tabIndex={-1}
          aria-label={SOCIAL.create.close}
          className="fixed inset-0 cursor-default"
          onClick={onClose}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className={`relative ${menuSurfaceContentClass(menuSurfaceDensityForCount(hasPhoto ? 3 : 2))}`}
        >
          <h2 id={titleId} className="sr-only">
            {SOCIAL.profile.editPicture}
          </h2>
          {rows}
          {inputs}
        </div>
      </div>
    );
  }

  const sheet = desktop ? (
    <div
      data-social-profile-avatar-sheet=""
      data-house-overlay-host="menu-surface"
      className="fixed inset-0 z-50 hidden md:flex md:items-start md:justify-end md:p-[var(--space-6)]"
    >
      <HouseScrim label={SOCIAL.create.close} onClose={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative z-10 ${menuSurfaceContentClass(menuSurfaceDensityForCount(hasPhoto ? 3 : 2))}`}
      >
        <h2 id={titleId} className="sr-only">
          {SOCIAL.profile.editPicture}
        </h2>
        {rows}
        {inputs}
      </div>
    </div>
  ) : (
    <div data-social-profile-avatar-sheet="" data-house-overlay-host="app-sheet" className={APP_SHEET_HOST_CLASS}>
      <HouseScrim label={SOCIAL.create.close} onClose={onClose} />
      <AppSheetSurface
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="gap-2 pt-3"
      >
        <div
          data-social-profile-avatar-sheet-handle=""
          className={SOCIAL_PROFILE_AVATAR_SHEET_HANDLE_HIT_CLASS}
          onPointerDown={onHandlePointerDown}
          onPointerUp={onHandlePointerUp}
        >
          <span className={SOCIAL_PROFILE_AVATAR_SHEET_HANDLE_CLASS} />
        </div>
        <h2 id={titleId} className="sr-only">
          {SOCIAL.profile.editPicture}
        </h2>
        <div data-social-profile-avatar-sheet-list="" className={SOCIAL_PROFILE_AVATAR_SHEET_LIST_CLASS}>
          <button
            type="button"
            data-social-profile-avatar-library=""
            disabled={pending}
            className={SOCIAL_PROFILE_AVATAR_SHEET_ROW_CLASS}
            onClick={() => pickFrom(libraryRef.current)}
          >
            <SocialIcon name="image" size={SOCIAL_ICON_SIZE_HEADER} />
            {SOCIAL.profile.chooseFromLibrary}
          </button>
          <button
            type="button"
            data-social-profile-avatar-camera=""
            disabled={pending}
            className={SOCIAL_PROFILE_AVATAR_SHEET_ROW_CLASS}
            onClick={() => pickFrom(cameraRef.current)}
          >
            <SocialIcon name="camera" size={SOCIAL_ICON_SIZE_HEADER} />
            {SOCIAL.profile.takePhoto}
          </button>
          {hasPhoto ? (
            <button
              type="button"
              data-social-profile-avatar-remove=""
              disabled={pending}
              className={SOCIAL_PROFILE_AVATAR_SHEET_DANGER_CLASS}
              onClick={() => {
                onClose();
                onRemove();
              }}
            >
              <SocialIcon name="trash" size={SOCIAL_ICON_SIZE_HEADER} />
              {SOCIAL.profile.removePicture}
            </button>
          ) : null}
        </div>
        <input
          ref={libraryRef}
          type="file"
          accept={AVATAR_ACCEPT}
          className="sr-only"
          aria-label={SOCIAL.profile.chooseFromLibrary}
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        <input
          ref={cameraRef}
          type="file"
          accept={AVATAR_ACCEPT}
          capture="user"
          className="sr-only"
          aria-label={SOCIAL.profile.takePhoto}
          onChange={(e) => onFile(e.target.files?.[0])}
        />
      </AppSheetSurface>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(sheet, document.body) : sheet;
}
