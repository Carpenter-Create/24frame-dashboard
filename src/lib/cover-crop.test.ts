import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  clampRectCropOffset,
  defaultRectCropFrame,
  rectCoverDrawSize,
  rectCropSourceRect,
} from "./account-avatar-crop";
import {
  COVER_CROP_MAX_BYTES,
  COVER_CROP_OUTPUT_HEIGHT,
  COVER_CROP_OUTPUT_NAME,
  COVER_CROP_OUTPUT_WIDTH,
  COVER_CROP_VIEW_HEIGHT,
  COVER_CROP_VIEW_WIDTH,
  SOCIAL_PROFILE_COVER_STAGE,
} from "./social-profile-cover";
import { SOCIAL } from "./social";
import {
  SOCIAL_PROFILE_COVER_DRAG_CLASS,
  SOCIAL_PROFILE_COVER_DRAG_IMAGE_CLASS,
  SOCIAL_PROFILE_COVER_PHONE_OUTLINE_CLASS,
  SOCIAL_PROFILE_COVER_ZOOM_CLASS,
  SOCIAL_PROFILE_COVER_ZOOM_INPUT_CLASS,
} from "./social-chrome";
import { SOCIAL_IMAGE_MAX_BYTES } from "./social-media";

describe("rectangular cover crop math", () => {
  it("cover-fits a landscape image into the 4:1 viewport", () => {
    const draw = rectCoverDrawSize(2000, 1000, 320, 80, 1);
    expect(draw.width).toBe(320);
    expect(draw.height).toBe(160);
  });

  it("cover-fits a portrait image into the 4:1 viewport", () => {
    const draw = rectCoverDrawSize(500, 1000, 320, 80, 1);
    expect(draw.width).toBe(320);
    expect(draw.height).toBe(640);
  });

  it("scales by the zoom factor", () => {
    const draw = rectCoverDrawSize(2000, 1000, 320, 80, 2);
    expect(draw.width).toBe(640);
    expect(draw.height).toBe(320);
  });

  it("clamps pan within the rectangular viewport", () => {
    const draw = rectCoverDrawSize(2000, 1000, 320, 80, 1);
    expect(clampRectCropOffset(0, 0, draw.width, draw.height, 320, 80)).toEqual({
      offsetX: 0,
      offsetY: 0,
    });
    expect(clampRectCropOffset(10, 10, draw.width, draw.height, 320, 80)).toEqual({
      offsetX: 0,
      offsetY: 0,
    });
    expect(clampRectCropOffset(0, -200, draw.width, draw.height, 320, 80)).toEqual({
      offsetX: 0,
      offsetY: -80,
    });
  });

  it("centers a landscape default frame", () => {
    const frame = defaultRectCropFrame(2000, 1000, 320, 80);
    expect(frame.scale).toBe(1);
    expect(frame.offsetX).toBe(0);
    expect(frame.offsetY).toBe(-40);
  });

  it("maps the rect view back onto source pixels", () => {
    const frame = defaultRectCropFrame(2000, 1000, 320, 80);
    const rect = rectCropSourceRect(2000, 1000, 320, 80, frame);
    expect(rect.sx).toBeCloseTo(0);
    expect(rect.sy).toBeCloseTo(250);
    expect(rect.sw).toBe(2000);
    expect(rect.sh).toBe(500);
  });

  it("maps a panned frame correctly", () => {
    const frame = { scale: 1, offsetX: 0, offsetY: 0 };
    const rect = rectCropSourceRect(2000, 1000, 320, 80, frame);
    expect(rect.sx).toBeCloseTo(0);
    expect(rect.sy).toBeCloseTo(0);
    expect(rect.sw).toBe(2000);
    expect(rect.sh).toBe(500);
  });
});

describe("cover crop constants (Stage lock: frame once at 16:7)", () => {
  it("outputs a 2400×1050 crop", () => {
    expect(COVER_CROP_OUTPUT_WIDTH).toBe(2400);
    expect(COVER_CROP_OUTPUT_HEIGHT).toBe(1050);
    expect(COVER_CROP_OUTPUT_WIDTH).toBe(SOCIAL_PROFILE_COVER_STAGE.outputWidth);
    expect(COVER_CROP_OUTPUT_HEIGHT).toBe(SOCIAL_PROFILE_COVER_STAGE.outputHeight);
    expect(COVER_CROP_OUTPUT_WIDTH / COVER_CROP_OUTPUT_HEIGHT).toBe(16 / 7);
  });

  it("view aspect matches the 16:7 frame", () => {
    expect(COVER_CROP_VIEW_WIDTH).toBe(320);
    expect(COVER_CROP_VIEW_HEIGHT).toBe(140);
    expect(COVER_CROP_VIEW_WIDTH / COVER_CROP_VIEW_HEIGHT).toBe(16 / 7);
  });

  it("output file is named cover.jpg", () => {
    expect(COVER_CROP_OUTPUT_NAME).toBe("cover.jpg");
  });

  it("max bytes is the posts stills lane cap (10 MB)", () => {
    expect(COVER_CROP_MAX_BYTES).toBe(10 * 1024 * 1024);
    expect(COVER_CROP_MAX_BYTES).toBe(SOCIAL_IMAGE_MAX_BYTES);
  });
});

describe("cover FB-exact copy", () => {
  it("has the exact FB cover edit copy strings", () => {
    expect(SOCIAL.profile.editCover).toBe("Edit cover photo");
    expect(SOCIAL.profile.addCover).toBe("Add cover photo");
    expect(SOCIAL.profile.coverChoose).toBe("Choose cover photo");
    expect(SOCIAL.profile.coverUpload).toBe("Upload photo");
    expect(SOCIAL.profile.coverReposition).toBe("Reposition");
    expect(SOCIAL.profile.coverRemove).toBe("Remove");
    expect(SOCIAL.profile.coverDragHint).toBe(
      "Drag or use arrow keys to reposition image",
    );
    expect(SOCIAL.profile.coverZoomHint).toBe("Zoom in to reposition image");
    expect(SOCIAL.profile.coverZoom).toBe("Zoom");
    // Founder (2026-10-04): "remove the 'your cover photo is public' copy. that's obvious."
    expect(SOCIAL.profile).not.toHaveProperty("coverPublicNote");
    expect(SOCIAL.profile.coverSaveChanges).toBe("Save changes");
    expect(SOCIAL.profile.coverCancel).toBe("Cancel");
    expect(SOCIAL.profile.coverCropFailed).toBeTruthy();
  });
});

describe("cover upload component (FB-exact)", () => {
  const src = readFileSync(
    "src/components/social/social-profile-cover-upload.tsx",
    "utf8",
  );
  const chrome = readFileSync("src/lib/social-chrome.ts", "utf8");
  const slice = (from: string, to: string) => src.slice(src.indexOf(from), src.indexOf(to, src.indexOf(from)));

  it("uses the glass pill: pencil plus the existing label on desktop, the label sr-only on phone", () => {
    expect(src).toContain("SOCIAL_PROFILE_COVER_EDIT_CLASS");
    expect(src).not.toContain("SOCIAL_PROFILE_COVER_PILL_CLASS");
    expect(src).toContain('name="pencil-simple"');
    expect(src).not.toContain('name="camera"');
    expect(src).toContain("editCover");
    expect(src).toContain("addCover");
    const button = slice("data-social-profile-cover-edit", "</button>");
    expect(button).toContain("title={coverLabel}");
    // The label is the content (accessible name): visible from md, sr-only on phone.
    expect(button).toContain("<span className={SOCIAL_PROFILE_COVER_EDIT_LABEL_CLASS}>{coverLabel}</span>");
    expect(button).not.toContain("aria-label=");
    const label = chrome.slice(chrome.indexOf("SOCIAL_PROFILE_COVER_EDIT_LABEL_CLASS ="));
    expect(label.slice(0, label.indexOf(";"))).toContain('"max-md:sr-only"');
  });

  it("has a menu with all four FB items: Choose / Upload / Reposition / Remove", () => {
    expect(src).toContain("coverChoose");
    expect(src).toContain("coverUpload");
    expect(src).toContain("coverReposition");
    expect(src).toContain("coverRemove");
    expect(src).toContain("SOCIAL_PROFILE_COVER_MENU_CLASS");
    expect(src).toContain("SOCIAL_PROFILE_COVER_MENU_ITEM_CLASS");
  });

  it("has menu icons matching FB: image, upload-simple, image, trash", () => {
    expect(src).toContain('name="image"');
    expect(src).toContain('name="upload-simple"');
    expect(src).toContain('name="trash"');
  });

  it("keeps the original: Reposition reopens it, a cover without one opens the picker", () => {
    const click = slice("function onRepositionClick", "async function removeCover");
    expect(click).toContain('repositionAction === "reopen"');
    expect(click).toContain("beginReposition(coverFraming)");
    expect(click).toContain('repositionAction === "pick"');
    expect(click).toContain("beginUpload()");
    const reposition = slice("function beginReposition", "function onRepositionClick");
    expect(reposition).toContain("loadOwnCoverSourceFile");
    expect(reposition).not.toContain("loadOwnCoverFile(");
    expect(reposition).toContain("coverFocusFromCrop(crop, size)");
    // The cover version it opened rides back with Save as a compare-and-swap token.
    expect(reposition).toContain("openedCover.current = framing.coverKey");
    expect(reposition).toContain('setEditSource("stored")');
    expect(reposition).toContain('setMode("reposition")');
    expect(reposition).not.toContain("fileRef");
    expect(reposition).not.toContain("fetch(");
    // The stored original is never named by the client.
    expect(src).not.toContain("cover_source_key");
    expect(src).not.toContain("sourceKey");
  });

  it("saves the crop, and the original with its framing only for a picked file", () => {
    const save = slice("async function onSaveReposition", "function onPointerDown");
    expect(save).toContain("coverCropFrame(focus, size)");
    expect(save).toContain("coverCropRect(focus, size)");
    expect(save).toContain("uploadCoverFile(cropped, presignSocialMediaUpload)");
    expect(save).toContain('editSource === "picked"');
    expect(save).toContain("socialProfileCoverSaveForm");
    expect(save).toContain('crop: editSource === "stored" || keptSource ? crop : null');
    // Stored original: the opened cover version travels with the save; a picked file sends none.
    expect(save).toContain('const opened = editSource === "stored" ? openedCover.current : null;');
    const form = save.slice(save.indexOf("socialProfileCoverSaveForm({"), save.indexOf("}),", save.indexOf("socialProfileCoverSaveForm({")));
    expect(form).toMatch(/\n\s+opened,\n/);
    expect(slice("function onFilePick", "function rollbackPreview")).toContain("openedCover.current = null");
    const pick = slice("function onFilePick", "function rollbackPreview");
    expect(pick).toContain("coverSourceUploadable(picked)");
    expect(pick).toContain("uploadCoverFile(picked, presignSocialMediaUpload)");
    expect(pick).toContain('setEditSource("picked")');
  });

  it("frames with one focus model: no ghost, no fixed pan scale", () => {
    expect(src).not.toContain("opacity-70");
    expect(src).not.toContain("computeCropFrame");
    expect(src).not.toContain("heightDesktop");
    expect(src).not.toContain("panOffset");
    expect(src).not.toContain("SOCIAL_PROFILE_COVER_LOCK_A");
    expect(src).not.toContain("SOCIAL_PROFILE_COVER_REPOSITION_BAR_CLASS");
    expect(src).not.toContain("SOCIAL_PROFILE_COVER_DRAG_HINT_CLASS");
    expect(src).not.toContain("data-social-cover-reposition-bar");
    expect(src).toContain("coverCropFrame");
    expect(src).toContain("moveCoverFocus");
    // The preview is the saved crop's own frame (coverPreviewBox wraps
    // coverCropFrame), not a separate object-position guess.
    expect(src).toContain("const preview = coverPreviewBox(focus, repositionSize);");
    const image = slice("<img\n              src={repositionPreview}", "/>");
    expect(image).toContain("style={preview ?? undefined}");
    expect(src).not.toContain("coverObjectPosition");
    expect(src).not.toContain("objectPosition");
  });

  it("drags and nudges on a focusable surface over the --band token", () => {
    const surface = slice("data-social-cover-drag", "</div>");
    expect(surface).toContain("tabIndex={0}");
    expect(surface).toContain('role="group"');
    // The surface names what it does now: drag, or zoom in first. With no
    // hint (still decoding, or it can neither move nor zoom) it never tells
    // anyone to drag; it is named for what it is.
    expect(surface).toContain("aria-label={hintText ?? SOCIAL.profile.editCover}");
    expect(surface).not.toContain("?? SOCIAL.profile.coverDragHint");
    expect(surface).not.toContain("?? SOCIAL.profile.coverZoomHint");
    expect(surface).toContain("className={SOCIAL_PROFILE_COVER_DRAG_CLASS}");
    expect(surface).toContain("onKeyDown={onDragKeyDown}");
    expect(surface).toContain("onPointerDown={onPointerDown}");
    // The preview sits in flow inside the surface. A positioned image paints
    // after the surface's own outline and hides the inset focus ring.
    expect(surface).toContain("className={SOCIAL_PROFILE_COVER_DRAG_IMAGE_CLASS}");
    expect(surface).not.toContain("SOCIAL_PROFILE_COVER_IMAGE_CLASS");
    const imageTokens = SOCIAL_PROFILE_COVER_DRAG_IMAGE_CLASS.split(/\s+/);
    expect(imageTokens).toEqual(expect.arrayContaining(["block", "size-full", "object-cover", "[grid-area:1/1]"]));
    // The phone outline shares the preview's grid cell. Neither is positioned,
    // so the surface's inset focus ring paints over both (G10).
    const outlineTokens = SOCIAL_PROFILE_COVER_PHONE_OUTLINE_CLASS.split(/\s+/);
    expect(outlineTokens).toEqual(expect.arrayContaining(["[grid-area:1/1]", "pointer-events-none", "border-dashed", "border-band-ink"]));
    for (const token of [...imageTokens, ...outlineTokens]) {
      expect(token).not.toMatch(/^(?:[\w-]+:)*(?:absolute|relative|fixed|sticky|-?inset-|-?z-|-?top-|-?left-)/);
    }
    // Nothing outside the phone area is dimmed: desktop shows the whole frame.
    expect(SOCIAL_PROFILE_COVER_PHONE_OUTLINE_CLASS).not.toMatch(/\bbg-|opacity-|shadow-|ring-/);
    const drag = chrome.slice(chrome.indexOf("SOCIAL_PROFILE_COVER_DRAG_CLASS ="));
    const dragDef = drag.slice(0, drag.indexOf(";"));
    expect(dragDef).toContain("absolute inset-0");
    expect(dragDef).toContain("grid grid-cols-1 grid-rows-1");
    expect(dragDef).toContain("rounded-[var(--radius-xl)]");
    expect(dragDef).toContain("bg-band");
    expect(dragDef).toContain("touch-none");
    expect(dragDef).toContain("focus-visible:outline-offset-[-2px]!");
    expect(dragDef).toContain("focus-visible:rounded-[var(--radius-xl)]!");
    expect(dragDef).toContain("data-[slack]:cursor-grab");
    const keys = slice("function onDragKeyDown", "function onZoomInput");
    // Escape, arrows and the zoom keys go through the one key rule, which
    // holds them all while Save runs (Cancel is disabled then too). Zoom keys
    // with Ctrl/Cmd/Alt stay the browser's page zoom.
    expect(keys).toMatch(
      /coverDragKeyAction\(\s*e\.key,\s*e\.shiftKey,\s*uploading,\s*e\.ctrlKey \|\| e\.metaKey \|\| e\.altKey,?\s*\)/,
    );
    expect(keys).not.toContain('e.key === "Escape"');
    expect(keys).toContain('action.type === "cancel"');
    expect(keys).toContain("cancelReposition()");
    expect(keys).toContain("e.preventDefault()");
    expect(src).toContain("surfaceRef.current?.focus({ preventScroll: true })");
    expect(src).toContain("editButtonRef.current?.focus({ preventScroll: true })");
  });

  it("outlines the phone-safe region from the one shared function, with lib copy", () => {
    const surface = slice("data-social-cover-drag", "{trail ? createPortal");
    expect(surface).toContain("data-social-cover-phone-outline");
    expect(surface).toContain("className={SOCIAL_PROFILE_COVER_PHONE_OUTLINE_CLASS}");
    // The whole box comes from coverRegionStyle: margins, not left/top, so
    // the outline stays unpositioned (the focus ring paints over it).
    expect(surface).toContain("style={PHONE_SAFE}");
    expect(surface).not.toMatch(/marginTop: PHONE_SAFE\.top|PHONE_SAFE\.left/);
    expect(surface).toContain("{SOCIAL.profile.coverPhoneView}");
    expect(src).toContain("const PHONE_SAFE = coverRegionStyle(coverPhoneSafeRegion());");
    expect(SOCIAL.profile.coverPhoneView).toBe("Phone view");
    // The outline comes after the preview so it paints on top of it.
    expect(surface.indexOf("SOCIAL_PROFILE_COVER_DRAG_IMAGE_CLASS")).toBeLessThan(
      surface.indexOf("data-social-cover-phone-outline"),
    );
  });

  it("puts the hint, Zoom, Cancel/Save and errors in the head trail, not over the image", () => {
    expect(src).toContain("createPortal(trailContent, trail)");
    expect(src).toContain("coverTrailTarget(rootRef.current)");
    const menu = readFileSync("src/lib/social-profile-cover-menu.ts", "utf8");
    expect(menu).toContain('"[data-social-profile-head-trail]"');
    const trail = slice("const trailContent", "return (");
    expect(trail).toContain("{hintText ? <p className={SOCIAL_PROFILE_COVER_TRAIL_TEXT_CLASS}>{hintText}</p> : null}");
    expect(src).toContain("const hint = isReposition ? coverEditorHint(focus, repositionSize) : null;");
    expect(src).toContain(
      'hint === "drag" ? SOCIAL.profile.coverDragHint : hint === "zoom" ? SOCIAL.profile.coverZoomHint : null;',
    );
    expect(src).not.toContain("coverPublicNote");
    // No public note in any form (founder, 2026-10-04): no "public" wording
    // in the editor, and the hint is the trail's only line of text.
    expect(src).not.toMatch(/public/i);
    expect((trail.match(/<p\b/g) ?? []).length).toBe(1);
    expect(trail).toContain("coverCancel");
    expect(trail).toContain("coverSaveChanges");
    expect(trail).toContain("uploadingPhoto");
    expect(trail).toContain("cancelReposition");
    expect(trail).toContain("onSaveReposition");
    // Errors show in any mode (a failed Remove too).
    expect(trail).toContain("{error ? (");
    expect(trail).not.toMatch(/isReposition && error|error && isReposition/);
    const surface = slice("data-social-cover-drag", "</div>");
    expect(surface).not.toContain("coverCancel");
    expect(src).not.toContain("bottom-12");
  });

  it("errors are visible (not sr-only)", () => {
    const from = src.lastIndexOf("aria-live");
    const errorBlock = src.slice(src.lastIndexOf("<div", from), src.indexOf("</div>", from));
    expect(errorBlock).toContain("InlineNotice");
    expect(errorBlock).toContain("SOCIAL_PROFILE_COVER_TRAIL_NOTICE_CLASS");
    expect(errorBlock).not.toContain("sr-only");
    const chrome = readFileSync("src/lib/social-chrome.ts", "utf8");
    const notice = chrome.slice(chrome.indexOf("SOCIAL_PROFILE_COVER_TRAIL_NOTICE_CLASS ="));
    expect(notice.slice(0, notice.indexOf(";"))).not.toContain("sr-only");
  });

  it("supports Remove action via clearSocialProfileCover", () => {
    expect(src).toContain("clearSocialProfileCover");
    expect(src).toContain("removeCover");
  });

  it("crops to 2400×1050 via presign → PUT → saveSocialProfileCover", () => {
    expect(src).toContain("cropRectFile");
    expect(src).toContain("presignSocialMediaUpload");
    expect(src).toContain("saveSocialProfileCover");
    expect(src).not.toContain("Mux");
    const save = readFileSync("src/lib/social-profile-cover-save.ts", "utf8");
    expect(save).toContain('body.set("lane", "posts")');
    expect(save).toContain('method: "PUT"');
  });

  it("downscales with high-quality smoothing", () => {
    const crop = readFileSync("src/lib/account-avatar-crop.ts", "utf8");
    const rect = crop.slice(crop.indexOf("export async function cropRectFile"));
    expect(rect).toContain("ctx.imageSmoothingEnabled = true");
    expect(rect).toContain('ctx.imageSmoothingQuality = "high"');
    expect(rect.indexOf('imageSmoothingQuality = "high"')).toBeLessThan(rect.indexOf("ctx.drawImage"));
  });

  it("supports drag-to-reposition with pointer events", () => {
    expect(src).toContain("onPointerDown");
    expect(src).toContain("onPointerMove");
    expect(src).toContain("onPointerUp");
    expect(src).toContain("setFocus(");
    const down = slice("function onPointerDown", "function onPointerMove");
    expect(down).toContain("!repositionSize");
    expect(down).toContain("anchorGesture(el, gestureFocus.current ?? focus)");
    const anchor = slice("const anchorGesture = useCallback", "const changeFocus");
    expect(anchor).toContain("getBoundingClientRect().width");
  });

  it("toggles the cover menu without the outside press eating the next open", () => {
    expect(src).toContain("nextCoverPillMode");
    expect(src).toContain("coverMenuClosesOnDocumentPress");
    expect(src).toContain("setTimeout");
    expect(src).toContain('addEventListener("mousedown"');
    expect(src).toContain('addEventListener("keydown"');
    expect(src).not.toContain('addEventListener("pointerdown"');
    expect(src).toContain("stopPropagation()");
    const upload = slice("function beginUpload", "function beginReposition");
    expect(upload).toContain("fileRef.current?.click()");
    expect(src).not.toContain("fileFromOwnCover");
    expect(src).not.toContain('redirect: "error"');
    expect(src).not.toContain("/api/social/media");
    expect(src).not.toContain("coverFileFromUrl");
    expect(src).toContain("coverFailureCopy");
    expect(src).toContain("coverNoticeText");
    const pick = slice("function onFilePick", "function rollbackPreview");
    const armed = pick.indexOf("setRepositionFile(picked)");
    expect(armed).toBeGreaterThan(-1);
    expect(pick.indexOf('setMode("reposition")', armed)).toBeGreaterThan(armed);
    expect(pick.indexOf('setMode("reposition")', armed)).toBeLessThan(
      pick.indexOf("readAccountAvatarCropPreview"),
    );
    expect(pick).toContain("coverFilePickOpensReposition");
    expect(src).toContain("dismissCoverEdit");
    expect(src).toContain("releasePointerCapture");
    expect(src).toContain("fileRef.current?.blur()");
    expect(src).toContain('attributeFilter: ["hidden"]');
    expect(src).not.toContain("setError(result.error)");
    expect(src).not.toContain("setError(signed.error");
  });

  it("clears file input on cancel", () => {
    expect(src).toContain("clearReposition");
    expect(src).toContain('fileRef.current.value = ""');
    expect(src).toContain("cancelReposition");
  });

  it("never lets a late save close, clear or error a newer editing session", () => {
    const save = slice("async function onSaveReposition", "function onPointerDown");
    expect(save).toContain("const gen = loadGen.current;");
    expect(save).toContain("const live = () => loadGen.current === gen;");
    expect(save).toContain("sourceUpload.current?.gen === gen");
    const settled = save.slice(save.indexOf("try {"));
    const count = (text: string, pattern: RegExp) => (text.match(pattern) ?? []).length;
    // Every error, the busy flag and the success close sit behind live().
    expect(count(settled, /setError\(/g)).toBe(3);
    expect(count(settled, /if \(live\(\)\) \{?\s*setError\(/g)).toBe(3);
    expect(count(settled, /setUploading\(false\)/g)).toBe(1);
    expect(settled).toContain("if (live()) setUploading(false)");
    const success = settled.indexOf("} else if (live()) {");
    expect(success).toBeGreaterThan(-1);
    for (const effect of ["clearReposition()", 'setMode("idle")', "restoreFocus.current = true"]) {
      expect(count(settled, new RegExp(effect.replace(/[().]/g, "\\$&"), "g"))).toBe(1);
      expect(settled.indexOf(effect)).toBeGreaterThan(success);
    }
  });

  it("revokes blob preview after a failed save", () => {
    const rollback = slice("function rollbackPreview", "async function onSaveReposition");
    expect(rollback).toContain("URL.revokeObjectURL(previewUrl)");
    expect(rollback).toContain("patchSocialProfileOptimistic({ coverUrl: null })");
    const save = slice("async function onSaveReposition", "function onPointerDown");
    expect((save.match(/rollbackPreview\(previewUrl\)/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });

  it("never lets a late failed save wipe a newer save's or Remove's band", () => {
    const rollback = slice("function rollbackPreview", "async function onSaveReposition");
    const guard = rollback.indexOf("if (bandPreview.current === previewUrl) {");
    expect(guard).toBeGreaterThan(-1);
    // Clearing the band sits inside the ownership guard; the revoke does not.
    for (const effect of ["onPreview?.(null)", "patchSocialProfileOptimistic({ coverUrl: null })"]) {
      expect(rollback.indexOf(effect)).toBeGreaterThan(guard);
      expect(rollback.indexOf(effect)).toBeLessThan(rollback.indexOf("URL.revokeObjectURL(previewUrl)"));
    }
    const revoke = rollback.indexOf("URL.revokeObjectURL(previewUrl)");
    expect(rollback.lastIndexOf("}", revoke)).toBeGreaterThan(guard);
    // Each band writer records its ownership before it paints.
    const save = slice("async function onSaveReposition", "function onPointerDown");
    expect(save.indexOf("bandPreview.current = previewUrl;")).toBeGreaterThan(-1);
    expect(save.indexOf("bandPreview.current = previewUrl;")).toBeLessThan(
      save.indexOf("patchSocialProfileOptimistic({ coverUrl: previewUrl })"),
    );
    const remove = slice("async function removeCover", "function onFilePick");
    expect(remove.indexOf("bandPreview.current = null;")).toBeGreaterThan(-1);
    expect(remove.indexOf("bandPreview.current = null;")).toBeLessThan(
      remove.indexOf("patchSocialProfileOptimistic({ coverUrl: null })"),
    );
  });
});

describe("cover editor zoom (LinkedIn-style)", () => {
  const src = readFileSync("src/components/social/social-profile-cover-upload.tsx", "utf8");
  const slice = (from: string, to: string) => src.slice(src.indexOf(from), src.indexOf(to, src.indexOf(from)));

  it("has a labelled range slider in the head trail, just above Cancel/Save", () => {
    const trail = slice("const trailContent", "return (");
    const zoom = trail.slice(trail.indexOf("<label data-social-cover-zoom"), trail.indexOf("</label>"));
    expect(zoom).toContain("className={SOCIAL_PROFILE_COVER_ZOOM_CLASS}");
    // A visible label from lib copy, wrapping the input (implicit association).
    expect(zoom).toContain("<span>{SOCIAL.profile.coverZoom}</span>");
    expect(zoom).toContain('type="range"');
    expect(zoom).toContain("min={COVER_ZOOM_MIN}");
    expect(zoom).toContain("max={maxZoom}");
    expect(zoom).toContain("step={COVER_ZOOM_STEP}");
    expect(zoom).toContain("value={focus.zoom}");
    expect(zoom).toContain("onChange={onZoomInput}");
    expect(zoom).toContain("className={SOCIAL_PROFILE_COVER_ZOOM_INPUT_CLASS}");
    // Held while Save runs (as Cancel is), before the original decodes, and for originals too small to zoom.
    expect(zoom).toContain("disabled={uploading || !ready || maxZoom <= COVER_ZOOM_MIN}");
    expect(src).toContain("const maxZoom = repositionSize ? coverMaxZoom(repositionSize) : COVER_ZOOM_MIN;");
    const at = (needle: string) => trail.indexOf(needle);
    expect(at("data-social-cover-zoom")).toBeLessThan(at("data-social-cover-actions"));
    const input = slice("function onZoomInput", "const isReposition");
    expect(input).toContain("if (uploading || !repositionSize) return;");
    expect(input).toContain("changeFocus((current) => coverZoomTo(current, zoom, size))");
  });

  it("zoom slider chrome: 44px tall, token accent, phone-first width", () => {
    const tokens = SOCIAL_PROFILE_COVER_ZOOM_INPUT_CLASS.split(/\s+/);
    expect(tokens).toEqual(expect.arrayContaining(["h-11", "accent-accent", "min-w-0", "flex-1", "disabled:opacity-60"]));
    expect(SOCIAL_PROFILE_COVER_ZOOM_CLASS.split(/\s+/)).toEqual(
      expect.arrayContaining(["pointer-events-auto", "flex", "justify-end", "items-center"]),
    );
    for (const cls of [SOCIAL_PROFILE_COVER_ZOOM_CLASS, SOCIAL_PROFILE_COVER_ZOOM_INPUT_CLASS]) {
      expect(cls).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    }
  });

  it("clips the zoomed preview to the 16:7 frame and lets the image box grow past it", () => {
    expect(SOCIAL_PROFILE_COVER_DRAG_CLASS.split(/\s+/)).toContain("overflow-hidden");
    expect(SOCIAL_PROFILE_COVER_DRAG_IMAGE_CLASS.split(/\s+/)).toContain("max-w-none");
    // The Stage surface is a one-cell grid. Tailwind's grid-cols-1 /
    // grid-rows-1 are minmax(0, 1fr) tracks, so a zoomed box wider than the
    // frame never grows the cell; the image's percentage box and margins
    // resolve against the cell (the frame), pinned to its top-left.
    expect(SOCIAL_PROFILE_COVER_DRAG_CLASS).toContain("grid grid-cols-1 grid-rows-1");
    expect(SOCIAL_PROFILE_COVER_DRAG_IMAGE_CLASS.split(/\s+/)).toEqual(
      expect.arrayContaining(["[grid-area:1/1]", "self-start", "justify-self-start"]),
    );
  });

  it("keeps the phone outline in frame space: one module constant, never tied to zoom or the preview box", () => {
    // PHONE_SAFE is computed once at module scope, before the component, so
    // no zoom, focus or preview value can reach it.
    const decl = src.indexOf("const PHONE_SAFE = coverRegionStyle(coverPhoneSafeRegion());");
    expect(decl).toBeGreaterThan(-1);
    expect(decl).toBeLessThan(src.indexOf("export function SocialProfileCoverUpload("));
    const outline = slice("data-social-cover-phone-outline", "</div>");
    expect(outline).toContain("style={PHONE_SAFE}");
    expect(outline).not.toMatch(/focus|preview|zoom/i);
    // The preview alone carries the zoomed box.
    const image = slice("<img\n              src={repositionPreview}", "/>");
    expect(image).toContain("style={preview ?? undefined}");
    expect(image).not.toContain("PHONE_SAFE");
  });

  it("zooms from the keyboard on the drag surface: + / = in, - out", () => {
    const keys = slice("function onDragKeyDown", "function onZoomInput");
    const zoom = keys.slice(keys.indexOf('if (action.type === "zoom") {'));
    expect(zoom).toContain("changeFocus((current) => coverZoomTo(current, current.zoom + step, size))");
    // Cancel is handled first, so Escape works before the original decodes.
    expect(keys.indexOf('action.type === "cancel"')).toBeLessThan(keys.indexOf("if (!repositionSize) return;"));
  });

  it("zooms with Ctrl/Cmd + wheel and trackpad pinch without scrolling or zooming the page", () => {
    const wheel = slice("// Ctrl/Cmd + wheel and a trackpad pinch", "const releaseOwnedPreview");
    expect(wheel).toContain('addEventListener("wheel", onWheel, { passive: false })');
    expect(wheel).toContain('removeEventListener("wheel", onWheel)');
    expect(wheel).toContain("if (!event.ctrlKey && !event.metaKey) return;");
    const prevent = wheel.indexOf("event.preventDefault()");
    expect(prevent).toBeGreaterThan(wheel.indexOf("if (!event.ctrlKey && !event.metaKey) return;"));
    expect(prevent).toBeLessThan(wheel.indexOf("if (uploading || !repositionSize) return;"));
    expect(wheel).toContain("coverZoomTo(current, coverWheelZoom(current.zoom, deltaY, deltaMode), size)");
    expect(wheel).toContain("[changeFocus, mode, repositionSize, uploading]");
    // React's onWheel is passive and cannot preventDefault.
    expect(src).not.toContain("onWheel={");
  });

  it("pinches with two pointers and hands back to a one-finger drag without a jump", () => {
    const down = slice("function onPointerDown", "function onPointerMove");
    expect(down).toContain("if (pointers.current.size >= 2) return;");
    expect(down).toContain("el.setPointerCapture(e.pointerId)");
    const anchor = slice("const anchorGesture = useCallback", "const changeFocus");
    expect(anchor).toContain('kind: "pinch", distance: coverPointerDistance(first, second), origin');
    expect(anchor).toContain('kind: "drag"');
    const move = slice("function onPointerMove", "function onPointerUp");
    expect(move).toContain("uploading) return;");
    expect(move).toContain(
      "coverPinchZoom(active.origin.zoom, active.distance, coverPointerDistance(first, second))",
    );
    expect(move).toContain("next = coverZoomTo(active.origin, zoom, repositionSize);");
    expect(move).toContain("gestureFocus.current = next;");
    const up = slice("function onPointerUp", "function onDragKeyDown");
    expect(up).toContain("pointers.current.delete(e.pointerId)");
    expect(up).toContain("releasePointerCapture(e.pointerId)");
    expect(up).toContain("anchorGesture(el, gestureFocus.current ?? focus)");
    // Up, cancel and a lost capture all retire the finger, so none goes stale.
    const surface = slice("data-social-cover-drag", "</div>");
    expect(surface).toContain("onPointerUp={onPointerUp}");
    expect(surface).toContain("onPointerCancel={onPointerUp}");
    expect(surface).toContain("onLostPointerCapture={onPointerUp}");
    const release = slice("const releasePointer = useCallback", "const clearReposition");
    expect(release).toContain("for (const id of ids)");
    expect(release).toContain("pointers.current.clear()");
    expect(release).toContain("gestureFocus.current = null");
  });

  it("keeps a zoom or nudge made while a pointer is held: the gesture re-anchors at it", () => {
    const change = slice("const changeFocus = useCallback", "// Ctrl/Cmd + wheel and a trackpad pinch");
    // No pointer held: a plain functional update.
    expect(change).toContain("const active = gesture.current;");
    expect(change).toContain("const el = captureEl.current;");
    const idle = change.indexOf("if (!active || !el) {");
    expect(idle).toBeGreaterThan(-1);
    expect(change.indexOf("setFocus(change);")).toBeGreaterThan(idle);
    // Held: apply the change to the focus the gesture last set, then anchor the
    // gesture there, so the next pointer move starts from it instead of
    // undoing it.
    const held = change.slice(change.indexOf("return;", idle));
    expect(held).toContain("const next = change(gestureFocus.current ?? active.origin);");
    expect(held).toContain("gestureFocus.current = next;");
    expect(held).toContain("anchorGesture(el, next);");
    expect(held).toContain("setFocus(next);");
    expect(held.indexOf("gestureFocus.current = next;")).toBeLessThan(held.indexOf("setFocus(next);"));
    expect(held.indexOf("anchorGesture(el, next);")).toBeLessThan(held.indexOf("setFocus(next);"));
    // Every zoom input and the arrow nudge go through it; none sets focus around it.
    const wheel = slice("// Ctrl/Cmd + wheel and a trackpad pinch", "const releaseOwnedPreview");
    const keys = slice("function onDragKeyDown", "function onZoomInput");
    const input = slice("function onZoomInput", "const isReposition");
    expect(wheel).toContain("changeFocus((current) =>");
    expect(keys).toContain("changeFocus((current) => coverZoomTo(current, current.zoom + step, size))");
    expect(keys).toContain("changeFocus((current) => moveCoverFocus(current, delta, size, width))");
    expect(input).toContain("changeFocus((current) => coverZoomTo(current, zoom, size))");
    for (const handler of [wheel, keys, input]) expect(handler).not.toContain("setFocus(");
    // Only the gesture itself, changeFocus and the open/close resets set focus directly.
    expect((src.match(/setFocus\(/g) ?? []).length).toBe(7);
    expect(slice("function onPointerMove", "function onPointerUp")).toContain("setFocus(next);");
  });

  it("drags whenever the current zoom leaves slack, and reopens at the stored zoom", () => {
    expect(src).toContain('const slack = hint === "drag";');
    expect(src).toContain('data-slack={slack ? "" : undefined}');
    expect(src).not.toContain("coverHasSlack(repositionSize)");
    const reposition = slice("function beginReposition", "function onRepositionClick");
    expect(reposition).toContain("setFocus(coverFocusFromCrop(crop, size))");
    // Save cuts the crop and the stored framing from the same focus (zoom included) the preview paints.
    const save = slice("async function onSaveReposition", "function onPointerDown");
    expect(save).toContain("coverCropFrame(focus, size)");
    expect(save).toContain("coverCropRect(focus, size)");
  });
});

describe("cover hero architecture", () => {
  it("mounts the owner controls on the stage, outside the hero's clip (the menu drops past a short hero)", () => {
    const ui = readFileSync("src/components/social/social-profile-identity.tsx", "utf8");
    const stage = ui.slice(ui.indexOf('data-social-profile-stage=""'), ui.indexOf("data-social-profile-head-trail"));
    const hero = stage.slice(stage.indexOf('data-social-profile-hero=""'));
    // {coverEdit} renders after the hero closes, as the stage's own child.
    expect(stage).toContain("{coverEdit}");
    expect(hero.lastIndexOf("</div>", hero.indexOf("{coverEdit}"))).toBeGreaterThan(hero.indexOf("data-social-profile-name-stack"));
    const chrome = readFileSync("src/lib/social-chrome.ts", "utf8");
    const stageDef = chrome.slice(chrome.indexOf("SOCIAL_PROFILE_STAGE_CLASS ="));
    expect(stageDef.slice(0, stageDef.indexOf(";"))).not.toMatch(/overflow-(?:hidden|clip)/);
    const banner = readFileSync("src/components/social/social-profile-banner.tsx", "utf8");
    expect(banner).toContain("export function SocialProfileCover(");
    expect(banner).not.toContain("SocialProfileCoverBlock");
  });
});

describe("cover chrome tokens", () => {
  it("has the cover editor chrome classes in social-chrome", () => {
    const chrome = readFileSync("src/lib/social-chrome.ts", "utf8");
    expect(chrome).toContain("SOCIAL_PROFILE_COVER_EDIT_CLASS");
    expect(chrome).toContain("SOCIAL_PROFILE_COVER_MENU_CLASS");
    expect(chrome).toContain("SOCIAL_PROFILE_COVER_MENU_ITEM_CLASS");
    expect(chrome).toContain("SOCIAL_PROFILE_COVER_DRAG_CLASS");
    expect(chrome).toContain("SOCIAL_PROFILE_COVER_TRAIL_TEXT_CLASS");
    expect(chrome).not.toContain("SOCIAL_PROFILE_COVER_PILL_CLASS");
    expect(chrome).not.toContain("SOCIAL_PROFILE_COVER_REPOSITION_BAR_CLASS");
    expect(chrome).not.toContain("SOCIAL_PROFILE_COVER_DRAG_HINT_CLASS");
  });

  it("menu drops below the pill (top, not bottom)", () => {
    const chrome = readFileSync("src/lib/social-chrome.ts", "utf8");
    const idx = chrome.indexOf("SOCIAL_PROFILE_COVER_MENU_CLASS =");
    const menuDef = chrome.slice(idx, chrome.indexOf(";", idx));
    expect(menuDef).toContain("top-[calc(100%+4px)]");
    expect(menuDef).not.toContain("bottom-[");
  });
});

describe("clearSocialProfileCover action", () => {
  it("exists in the actions file and clears the cover, the original and the framing", () => {
    const actions = readFileSync("src/app/(app)/social/actions.ts", "utf8");
    expect(actions).toContain("clearSocialProfileCover");
    expect(actions).toContain("cover_key: null, cover_source_key: null, cover_crop: null");
  });
});
