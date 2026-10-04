"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  clearSocialProfileCover,
  presignSocialMediaUpload,
  saveSocialProfileCover,
} from "@/app/(app)/social/actions";
import { SocialIcon } from "@/components/social/social-icon";
import { InlineNotice } from "@/components/ui/inline-notice";
import { cropRectFile, readAccountAvatarCropPreview } from "@/lib/account-avatar-crop";
import { cn } from "@/lib/cn";
import { HOUSE_CLIENT_SHELL } from "@/lib/house-client-shell";
import { SOCIAL } from "@/lib/social";
import {
  coverFailureCopy,
  coverFilePickOpensReposition,
  coverNoticeText,
  loadOwnCoverSourceFile,
} from "@/lib/social-profile-cover-load";
import {
  COVER_CROP_MAX_BYTES,
  COVER_CROP_OUTPUT_HEIGHT,
  COVER_CROP_OUTPUT_NAME,
  COVER_CROP_OUTPUT_WIDTH,
  COVER_CROP_VIEW_HEIGHT,
  COVER_CROP_VIEW_WIDTH,
  SOCIAL_PROFILE_COVER_ACCEPT,
} from "@/lib/social-profile-cover";
import {
  COVER_FOCUS_CENTER,
  COVER_ZOOM_MIN,
  COVER_ZOOM_STEP,
  type CoverFocus,
  type CoverFraming,
  type CoverImageSize,
  type CoverPoint,
  coverCropFrame,
  coverCropRect,
  coverDragKeyAction,
  coverEditorHint,
  coverFocusFromCrop,
  coverMaxZoom,
  coverPinchZoom,
  coverPointerDistance,
  coverPreviewBox,
  coverWheelZoom,
  coverZoomTo,
  moveCoverFocus,
} from "@/lib/social-profile-cover-frame";
import {
  coverMenuClosesOnDocumentPress,
  coverRepositionAction,
  coverTrailTarget,
  nextCoverPillMode,
} from "@/lib/social-profile-cover-menu";
import {
  type CoverUploadResult,
  coverSourceUploadable,
  socialProfileCoverSaveForm,
  uploadCoverFile,
} from "@/lib/social-profile-cover-save";
import {
  SOCIAL_ACTION_CLASS,
  SOCIAL_ACTION_SECONDARY_CLASS,
  SOCIAL_PROFILE_COVER_DRAG_CLASS,
  SOCIAL_PROFILE_COVER_DRAG_IMAGE_CLASS,
  SOCIAL_PROFILE_COVER_EDIT_CLASS,
  SOCIAL_PROFILE_COVER_MENU_CLASS,
  SOCIAL_PROFILE_COVER_MENU_ITEM_CLASS,
  SOCIAL_PROFILE_COVER_PILL_ANCHOR_CLASS,
  SOCIAL_PROFILE_COVER_TRAIL_ACTIONS_CLASS,
  SOCIAL_PROFILE_COVER_TRAIL_BUTTON_CLASS,
  SOCIAL_PROFILE_COVER_TRAIL_NOTICE_CLASS,
  SOCIAL_PROFILE_COVER_TRAIL_TEXT_CLASS,
  SOCIAL_PROFILE_COVER_ZOOM_CLASS,
  SOCIAL_PROFILE_COVER_ZOOM_INPUT_CLASS,
} from "@/lib/social-chrome";
import { socialMediaKindFor } from "@/lib/social-media";
import { SOCIAL_ICON_SIZE_HEADER } from "@/lib/social-icons";
import { patchSocialProfileOptimistic } from "@/lib/social-profile-edit";

type CoverMode = "idle" | "menu" | "reposition";

// One finger drags; two fingers pinch-zoom. Each starts from the focus it
// had when the finger count changed.
type CoverGesture =
  | { kind: "drag"; startX: number; startY: number; origin: CoverFocus; width: number }
  | { kind: "pinch"; distance: number; origin: CoverFocus };

// What the editor frames: a freshly picked file (its original is kept with
// the save) or the stored original (Reposition; the server keeps it).
type CoverEditSource = "picked" | "stored";

// docs/design-locks/social-profile-header-linkedin-lock-v1.md — what the
// member frames is what lands. One focus drives the preview, the crop and
// the stored framing (src/lib/social-profile-cover-frame.ts).
export function SocialProfileCoverUpload({
  coverUrl,
  coverFraming = null,
  onPreview,
}: {
  coverUrl?: string | null;
  /** Stored framing of the kept original and its cover. Null: Reposition opens the file picker. */
  coverFraming?: CoverFraming | null;
  onPreview?: (url: string | null) => void;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef(false);
  const ownedPreview = useRef<string | null>(null);
  const loadGen = useRef(0);
  const sourceUpload = useRef<{ gen: number; pending: Promise<CoverUploadResult> } | null>(null);
  // The cover version a stored-original edit opened (its compare-and-swap token).
  const openedCover = useRef<string | null>(null);
  // The blob a save last put on the band. A late failure undoes only its own.
  const bandPreview = useRef<string | null>(null);
  const saveBlocked = useRef(false);
  const captureEl = useRef<HTMLElement | null>(null);
  // Pointers down on the drag surface (captured), by pointerId, at their latest position.
  const pointers = useRef(new Map<number, CoverPoint>());
  const gesture = useRef<CoverGesture | null>(null);
  // The focus the running gesture last set, so a finger joining or leaving
  // continues from it rather than from a render that has not landed yet.
  const gestureFocus = useRef<CoverFocus | null>(null);
  const [trail, setTrail] = useState<HTMLElement | null>(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [mode, setMode] = useState<CoverMode>("idle");

  const [editSource, setEditSource] = useState<CoverEditSource>("picked");
  const [repositionFile, setRepositionFile] = useState<File | null>(null);
  const [repositionPreview, setRepositionPreview] = useState<string | null>(null);
  const [repositionSize, setRepositionSize] = useState<CoverImageSize | null>(null);
  const [focus, setFocus] = useState<CoverFocus>(COVER_FOCUS_CENTER);

  const hasCover = Boolean(coverUrl?.trim());
  const repositionAction = coverRepositionAction({ hasCover, hasSource: coverFraming !== null });

  // The trail lives in SocialProfileIdentity (the head row). Resolve it when
  // the root mounts, and again before showing editor chrome in case the
  // stored node was replaced.
  const resolveTrail = useCallback(() => {
    const next = coverTrailTarget(rootRef.current);
    setTrail((current) => (current === next && current?.isConnected ? current : next));
  }, []);

  const attachRoot = useCallback(
    (node: HTMLDivElement | null) => {
      rootRef.current = node;
      if (node) resolveTrail();
    },
    [resolveTrail],
  );

  // Arm the outside listener on a later turn than the open click so that
  // gesture cannot close the menu. A press on the circle is stopped above
  // and is not an outside close; the click toggles.
  useEffect(() => {
    if (mode !== "menu") return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMode((current) => (current === "menu" ? "idle" : current));
    };
    const onPointer = (event: MouseEvent) => {
      const host = menuRef.current;
      const inside = Boolean(host?.contains(event.target as Node));
      if (!coverMenuClosesOnDocumentPress("menu", inside)) return;
      setMode((current) => (current === "menu" ? "idle" : current));
    };
    const timer = window.setTimeout(() => {
      document.addEventListener("mousedown", onPointer);
      document.addEventListener("keydown", onKey);
    }, 0);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [mode]);

  // Opening the editor focuses the drag surface; closing it after Save or
  // Cancel returns focus to the edit circle.
  useEffect(() => {
    if (mode === "reposition") {
      surfaceRef.current?.focus({ preventScroll: true });
      return;
    }
    if (mode === "idle" && restoreFocus.current) {
      restoreFocus.current = false;
      editButtonRef.current?.focus({ preventScroll: true });
    }
  }, [mode]);

  // One pointer drags, two pinch. A finger joining or leaving re-anchors the
  // gesture at the focus it reached, so nothing jumps.
  const anchorGesture = useCallback((el: HTMLElement, origin: CoverFocus) => {
    const [first, second] = [...pointers.current.values()];
    if (first && second) {
      gesture.current = { kind: "pinch", distance: coverPointerDistance(first, second), origin };
    } else if (first) {
      gesture.current = {
        kind: "drag",
        startX: first.x,
        startY: first.y,
        origin,
        width: el.getBoundingClientRect().width,
      };
    } else {
      gesture.current = null;
    }
  }, []);

  // Zoom (wheel, keys, slider) and arrow nudges. While a pointer is held they
  // re-anchor its gesture at the focus they produce, so the next pointer
  // move carries on from there instead of undoing them.
  const changeFocus = useCallback(
    (change: (current: CoverFocus) => CoverFocus) => {
      const active = gesture.current;
      const el = captureEl.current;
      if (!active || !el) {
        setFocus(change);
        return;
      }
      const next = change(gestureFocus.current ?? active.origin);
      gestureFocus.current = next;
      anchorGesture(el, next);
      setFocus(next);
    },
    [anchorGesture],
  );

  // Ctrl/Cmd + wheel and a trackpad pinch (a wheel with ctrlKey) zoom the
  // cover, never the page. React's wheel listener is passive, so this one
  // is native to be able to preventDefault. A plain wheel still scrolls.
  useEffect(() => {
    const el = surfaceRef.current;
    if (mode !== "reposition" || !el) return undefined;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      if (uploading || !repositionSize) return;
      const size = repositionSize;
      const { deltaY, deltaMode } = event;
      changeFocus((current) =>
        coverZoomTo(current, coverWheelZoom(current.zoom, deltaY, deltaMode), size),
      );
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [changeFocus, mode, repositionSize, uploading]);

  useEffect(() => {
    const input = fileRef.current;
    return () => {
      loadGen.current += 1;
      input?.blur();
      const prev = ownedPreview.current;
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
    };
  }, []);

  const releaseOwnedPreview = useCallback(() => {
    const prev = ownedPreview.current;
    if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
    ownedPreview.current = null;
  }, []);

  const rememberPreview = useCallback(
    (url: string, owned: boolean) => {
      releaseOwnedPreview();
      if (owned && url.startsWith("blob:")) ownedPreview.current = url;
      setRepositionPreview(url);
    },
    [releaseOwnedPreview],
  );

  const releasePointer = useCallback(() => {
    const el = captureEl.current;
    const ids = [...pointers.current.keys()];
    captureEl.current = null;
    pointers.current.clear();
    gesture.current = null;
    gestureFocus.current = null;
    if (!el) return;
    for (const id of ids) {
      try {
        if (el.hasPointerCapture(id)) el.releasePointerCapture(id);
      } catch {
        // The pointer already ended.
      }
    }
  }, []);

  const clearReposition = useCallback(() => {
    releaseOwnedPreview();
    setRepositionFile(null);
    setRepositionPreview(null);
    setRepositionSize(null);
    setFocus(COVER_FOCUS_CENTER);
    if (fileRef.current) fileRef.current.value = "";
  }, [releaseOwnedPreview]);

  const dismissCoverEdit = useCallback(() => {
    loadGen.current += 1;
    sourceUpload.current = null;
    openedCover.current = null;
    saveBlocked.current = false;
    releasePointer();
    fileRef.current?.blur();
    clearReposition();
    setUploading(false);
    setError("");
    setMode("idle");
  }, [clearReposition, releasePointer]);

  function cancelReposition() {
    restoreFocus.current = true;
    dismissCoverEdit();
  }

  useEffect(() => {
    const node = rootRef.current;
    const screen = node?.closest(`[${HOUSE_CLIENT_SHELL.screenAttr}]`);
    if (!(screen instanceof HTMLElement)) return undefined;
    const onHide = () => {
      if (!screen.hasAttribute("hidden")) return;
      dismissCoverEdit();
    };
    const observer = new MutationObserver(onHide);
    observer.observe(screen, { attributes: true, attributeFilter: ["hidden"] });
    onHide();
    return () => observer.disconnect();
  }, [dismissCoverEdit]);

  function beginUpload() {
    setMode("idle");
    if (fileRef.current) fileRef.current.value = "";
    fileRef.current?.click();
  }

  // Reposition reopens the kept original at its stored framing. The current
  // cover is that exact window, so it stands in until the original decodes.
  // Save sends the opened cover version back, so it cannot land on a cover
  // another tab or device has replaced since.
  function beginReposition(framing: CoverFraming) {
    const url = coverUrl?.trim();
    if (!url || uploading) return;
    resolveTrail();
    saveBlocked.current = false;
    sourceUpload.current = null;
    openedCover.current = framing.coverKey;
    const { crop } = framing;
    const gen = (loadGen.current += 1);
    setError("");
    setEditSource("stored");
    setRepositionFile(null);
    setRepositionSize(null);
    setFocus(COVER_FOCUS_CENTER);
    rememberPreview(url, false);
    setMode("reposition");
    void loadOwnCoverSourceFile(SOCIAL.profile.coverCropFailed).then(async (loaded) => {
      if (loadGen.current !== gen) return;
      if (!loaded.file) {
        setError(loaded.notice);
        return;
      }
      try {
        const next = await readAccountAvatarCropPreview(loaded.file);
        if (loadGen.current !== gen) {
          URL.revokeObjectURL(next.url);
          return;
        }
        const size = { width: next.width, height: next.height };
        rememberPreview(next.url, true);
        setRepositionFile(loaded.file);
        setRepositionSize(size);
        setFocus(coverFocusFromCrop(crop, size));
      } catch {
        if (loadGen.current === gen) setError(SOCIAL.profile.coverCropFailed);
      }
    });
  }

  function onRepositionClick() {
    if (repositionAction === "reopen" && coverFraming) {
      beginReposition(coverFraming);
      return;
    }
    if (repositionAction === "pick") beginUpload();
  }

  async function removeCover() {
    resolveTrail();
    setMode("idle");
    setError("");
    setUploading(true);
    try {
      bandPreview.current = null;
      patchSocialProfileOptimistic({ coverUrl: null });
      onPreview?.(null);
      const result = await clearSocialProfileCover();
      if (result.error) {
        setError(coverNoticeText(result.error, SOCIAL.profile.coverCropFailed));
      }
    } catch {
      setError(SOCIAL.profile.coverCropFailed);
    } finally {
      setUploading(false);
    }
  }

  function onFilePick(file: File | undefined) {
    if (!coverFilePickOpensReposition(file, uploading) || !file) return;
    const picked = file;
    resolveTrail();
    fileRef.current?.blur();
    setError("");
    setEditSource("picked");
    setFocus(COVER_FOCUS_CENTER);
    setRepositionSize(null);
    sourceUpload.current = null;
    openedCover.current = null;
    if (socialMediaKindFor(picked.type) !== "image") {
      saveBlocked.current = true;
      setRepositionFile(null);
      setMode("reposition");
      setError(SOCIAL.home.mediaType);
      return;
    }
    saveBlocked.current = false;
    const gen = (loadGen.current += 1);
    releaseOwnedPreview();
    setRepositionPreview(null);
    setRepositionFile(picked);
    setMode("reposition");
    // The original uploads while the member frames; Save adds the crop.
    // Best effort: a cover saves without an original if this fails.
    if (coverSourceUploadable(picked)) {
      sourceUpload.current = {
        gen,
        pending: uploadCoverFile(picked, presignSocialMediaUpload).catch(
          (): CoverUploadResult => ({ ok: false, error: null }),
        ),
      };
    }
    void readAccountAvatarCropPreview(picked)
      .then((next) => {
        if (loadGen.current !== gen) {
          URL.revokeObjectURL(next.url);
          return;
        }
        rememberPreview(next.url, true);
        setRepositionSize({ width: next.width, height: next.height });
      })
      .catch(() => {
        if (loadGen.current !== gen) return;
        setError(SOCIAL.home.mediaType);
      });
  }

  function rollbackPreview(previewUrl: string) {
    // A newer save or Remove owns the band now: leave it as it is.
    if (bandPreview.current === previewUrl) {
      bandPreview.current = null;
      onPreview?.(null);
      patchSocialProfileOptimistic({ coverUrl: null });
    }
    URL.revokeObjectURL(previewUrl);
  }

  async function onSaveReposition() {
    if (uploading) return;
    if (saveBlocked.current) {
      setError(SOCIAL.home.mediaType);
      return;
    }
    const file = repositionFile;
    const size = repositionSize;
    if (!file || !size) return;
    // A dismissed editor (hidden screen, unmount) bumps loadGen. A late result
    // may still undo its own band preview, but must not close, clear or error
    // a newer editing session.
    const gen = loadGen.current;
    const live = () => loadGen.current === gen;
    const opened = editSource === "stored" ? openedCover.current : null;
    setError("");
    setUploading(true);
    let previewUrl: string | null = null;

    try {
      const cropped = await cropRectFile(
        file,
        coverCropFrame(focus, size),
        COVER_CROP_VIEW_WIDTH,
        COVER_CROP_VIEW_HEIGHT,
        COVER_CROP_OUTPUT_WIDTH,
        COVER_CROP_OUTPUT_HEIGHT,
        COVER_CROP_OUTPUT_NAME,
        COVER_CROP_MAX_BYTES,
      );
      const crop = coverCropRect(focus, size);

      previewUrl = URL.createObjectURL(cropped);
      bandPreview.current = previewUrl;
      onPreview?.(previewUrl);
      patchSocialProfileOptimistic({ coverUrl: previewUrl });

      const pendingSource =
        editSource === "picked" && sourceUpload.current?.gen === gen
          ? sourceUpload.current.pending
          : null;
      const [upload, source] = await Promise.all([
        uploadCoverFile(cropped, presignSocialMediaUpload),
        pendingSource,
      ]);
      if (!upload.ok) {
        rollbackPreview(previewUrl);
        if (live()) setError(coverNoticeText(upload.error, SOCIAL.home.uploadFailed));
        return;
      }

      const keptSource = source?.ok ? source.item : null;
      const result = await saveSocialProfileCover(
        socialProfileCoverSaveForm({
          item: upload.item,
          source: keptSource,
          // Stored: new framing of the kept original. Picked: framing only
          // travels with its original.
          crop: editSource === "stored" || keptSource ? crop : null,
          opened,
        }),
      );
      if (result.error) {
        rollbackPreview(previewUrl);
        if (live()) setError(coverNoticeText(result.error, SOCIAL.home.uploadFailed));
      } else if (live()) {
        sourceUpload.current = null;
        openedCover.current = null;
        clearReposition();
        restoreFocus.current = true;
        setMode("idle");
      }
    } catch (e) {
      if (previewUrl) rollbackPreview(previewUrl);
      if (live()) {
        setError(
          coverFailureCopy(
            e,
            previewUrl ? SOCIAL.home.uploadFailed : SOCIAL.profile.coverCropFailed,
          ),
        );
      }
    } finally {
      if (live()) setUploading(false);
    }
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (mode !== "reposition" || !repositionSize || uploading) return;
    if (pointers.current.size >= 2) return;
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    captureEl.current = el;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    anchorGesture(el, gestureFocus.current ?? focus);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const point = pointers.current.get(e.pointerId);
    const active = gesture.current;
    if (!point || !active || mode !== "reposition" || !repositionSize || uploading) return;
    point.x = e.clientX;
    point.y = e.clientY;
    let next: CoverFocus;
    if (active.kind === "pinch") {
      const [first, second] = [...pointers.current.values()];
      if (!first || !second) return;
      const zoom = coverPinchZoom(active.origin.zoom, active.distance, coverPointerDistance(first, second));
      next = coverZoomTo(active.origin, zoom, repositionSize);
    } else {
      next = moveCoverFocus(
        active.origin,
        { x: e.clientX - active.startX, y: e.clientY - active.startY },
        repositionSize,
        active.width,
      );
    }
    gestureFocus.current = next;
    setFocus(next);
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    pointers.current.delete(e.pointerId);
    try {
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    } catch {
      // The pointer already ended.
    }
    if (pointers.current.size === 0) {
      releasePointer();
      return;
    }
    // Pinch to one finger: that finger drags on from where the pinch left off.
    anchorGesture(el, gestureFocus.current ?? focus);
  }

  function onDragKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const action = coverDragKeyAction(
      e.key,
      e.shiftKey,
      uploading,
      e.ctrlKey || e.metaKey || e.altKey,
    );
    if (!action) return;
    e.preventDefault();
    if (action.type === "cancel") {
      cancelReposition();
      return;
    }
    if (!repositionSize) return;
    const size = repositionSize;
    if (action.type === "zoom") {
      const { step } = action;
      changeFocus((current) => coverZoomTo(current, current.zoom + step, size));
      return;
    }
    if (action.type !== "nudge") return;
    const { delta } = action;
    const width = e.currentTarget.getBoundingClientRect().width;
    changeFocus((current) => moveCoverFocus(current, delta, size, width));
  }

  function onZoomInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (uploading || !repositionSize) return;
    const size = repositionSize;
    const zoom = Number(e.currentTarget.value);
    changeFocus((current) => coverZoomTo(current, zoom, size));
  }

  const isReposition = mode === "reposition";
  const hint = isReposition ? coverEditorHint(focus, repositionSize) : null;
  const slack = hint === "drag";
  const maxZoom = repositionSize ? coverMaxZoom(repositionSize) : COVER_ZOOM_MIN;
  const ready = Boolean(repositionFile && repositionSize);
  const preview = coverPreviewBox(focus, repositionSize);
  const coverLabel = hasCover ? SOCIAL.profile.editCover : SOCIAL.profile.addCover;
  const hintText =
    hint === "drag" ? SOCIAL.profile.coverDragHint : hint === "zoom" ? SOCIAL.profile.coverZoomHint : null;

  // Nothing paints over the image except the avatar: the hint, Zoom,
  // Cancel/Save and errors sit in the head trail below the band.
  const trailContent = (
    <>
      {hintText ? <p className={SOCIAL_PROFILE_COVER_TRAIL_TEXT_CLASS}>{hintText}</p> : null}
      {isReposition ? (
        <label data-social-cover-zoom="" className={SOCIAL_PROFILE_COVER_ZOOM_CLASS}>
          <span>{SOCIAL.profile.coverZoom}</span>
          <input
            type="range"
            min={COVER_ZOOM_MIN}
            max={maxZoom}
            step={COVER_ZOOM_STEP}
            value={focus.zoom}
            disabled={uploading || !ready || maxZoom <= COVER_ZOOM_MIN}
            className={SOCIAL_PROFILE_COVER_ZOOM_INPUT_CLASS}
            onChange={onZoomInput}
          />
        </label>
      ) : null}
      {isReposition ? (
        <div data-social-cover-actions="" className={SOCIAL_PROFILE_COVER_TRAIL_ACTIONS_CLASS}>
          <button
            type="button"
            disabled={uploading}
            className={cn(SOCIAL_ACTION_SECONDARY_CLASS, SOCIAL_PROFILE_COVER_TRAIL_BUTTON_CLASS)}
            onClick={cancelReposition}
          >
            {SOCIAL.profile.coverCancel}
          </button>
          <button
            type="button"
            disabled={uploading || !ready}
            className={cn(SOCIAL_ACTION_CLASS, SOCIAL_PROFILE_COVER_TRAIL_BUTTON_CLASS)}
            onClick={() => void onSaveReposition()}
          >
            {uploading ? SOCIAL.profile.uploadingPhoto : SOCIAL.profile.coverSaveChanges}
          </button>
        </div>
      ) : null}
      {error ? (
        <div aria-live="polite" className={SOCIAL_PROFILE_COVER_TRAIL_NOTICE_CLASS}>
          <InlineNotice tone="error">{error}</InlineNotice>
        </div>
      ) : null}
    </>
  );

  return (
    <div ref={attachRoot} className="contents">
      {isReposition ? (
        <div
          ref={surfaceRef}
          data-social-cover-drag=""
          data-slack={slack ? "" : undefined}
          role="group"
          tabIndex={0}
          // The hint when there is one. Before the original decodes, or when
          // it can neither move nor zoom, the surface is named for what it is.
          aria-label={hintText ?? SOCIAL.profile.editCover}
          aria-busy={!ready}
          className={SOCIAL_PROFILE_COVER_DRAG_CLASS}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          // A capture lost without pointerup must not leave a stale finger behind.
          onLostPointerCapture={onPointerUp}
          onKeyDown={onDragKeyDown}
        >
          {repositionPreview ? (
            // eslint-disable-next-line @next/next/no-img-element -- local blob of the original for reposition
            <img
              src={repositionPreview}
              alt=""
              draggable={false}
              className={SOCIAL_PROFILE_COVER_DRAG_IMAGE_CLASS}
              // The saved crop's own frame (coverCropFrame), as a box on the band.
              style={preview ?? undefined}
              onError={() => setError(SOCIAL.profile.coverCropFailed)}
            />
          ) : null}
        </div>
      ) : (
        <div
          className={SOCIAL_PROFILE_COVER_PILL_ANCHOR_CLASS}
          ref={menuRef}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <button
            ref={editButtonRef}
            type="button"
            data-social-profile-cover-edit=""
            disabled={uploading}
            aria-busy={uploading}
            aria-expanded={mode === "menu"}
            aria-haspopup="menu"
            aria-label={coverLabel}
            title={coverLabel}
            className={SOCIAL_PROFILE_COVER_EDIT_CLASS}
            onClick={() => {
              setMode((current) => {
                if (current === "reposition") return current;
                return nextCoverPillMode(current);
              });
            }}
          >
            <SocialIcon name="pencil-simple" size={SOCIAL_ICON_SIZE_HEADER} />
          </button>

          {mode === "menu" ? (
            <div data-social-cover-menu="" className={SOCIAL_PROFILE_COVER_MENU_CLASS}>
              <button
                type="button"
                className={SOCIAL_PROFILE_COVER_MENU_ITEM_CLASS}
                onClick={beginUpload}
              >
                <SocialIcon name="image" size={SOCIAL_ICON_SIZE_HEADER} />
                {SOCIAL.profile.coverChoose}
              </button>
              <button
                type="button"
                className={SOCIAL_PROFILE_COVER_MENU_ITEM_CLASS}
                onClick={beginUpload}
              >
                <SocialIcon name="upload-simple" size={SOCIAL_ICON_SIZE_HEADER} />
                {SOCIAL.profile.coverUpload}
              </button>
              {hasCover ? (
                <>
                  <button
                    type="button"
                    data-social-cover-reposition={repositionAction ?? undefined}
                    className={SOCIAL_PROFILE_COVER_MENU_ITEM_CLASS}
                    onClick={onRepositionClick}
                  >
                    <SocialIcon name="image" size={SOCIAL_ICON_SIZE_HEADER} />
                    {SOCIAL.profile.coverReposition}
                  </button>
                  <button
                    type="button"
                    className={SOCIAL_PROFILE_COVER_MENU_ITEM_CLASS}
                    onClick={() => void removeCover()}
                  >
                    <SocialIcon name="trash" size={SOCIAL_ICON_SIZE_HEADER} />
                    {SOCIAL.profile.coverRemove}
                  </button>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept={SOCIAL_PROFILE_COVER_ACCEPT}
        className="sr-only"
        aria-hidden
        tabIndex={-1}
        onChange={(e) => {
          const picked = e.target.files?.[0];
          e.target.value = "";
          onFilePick(picked);
        }}
      />
      {trail ? createPortal(trailContent, trail) : null}
    </div>
  );
}
