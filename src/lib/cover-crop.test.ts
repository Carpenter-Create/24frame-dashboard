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
  SOCIAL_PROFILE_COVER_LOCK_A,
} from "./social-profile-cover";
import { SOCIAL } from "./social";
import { SOCIAL_PROFILE_COVER_DRAG_IMAGE_CLASS } from "./social-chrome";

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

describe("cover crop constants", () => {
  it("output dimensions match Lock A master", () => {
    expect(COVER_CROP_OUTPUT_WIDTH).toBe(SOCIAL_PROFILE_COVER_LOCK_A.masterWidth);
    expect(COVER_CROP_OUTPUT_HEIGHT).toBe(SOCIAL_PROFILE_COVER_LOCK_A.masterHeight);
    expect(COVER_CROP_OUTPUT_WIDTH / COVER_CROP_OUTPUT_HEIGHT).toBe(4);
  });

  it("view aspect matches 4:1", () => {
    expect(COVER_CROP_VIEW_WIDTH / COVER_CROP_VIEW_HEIGHT).toBe(4);
  });

  it("output file is named cover.jpg", () => {
    expect(COVER_CROP_OUTPUT_NAME).toBe("cover.jpg");
  });

  it("max bytes allows up to 10 MB", () => {
    expect(COVER_CROP_MAX_BYTES).toBe(10 * 1024 * 1024);
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
    expect(SOCIAL.profile.coverPublicNote).toBe("Your cover photo is public.");
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

  it("uses the pencil circle with the label as accessible name and title", () => {
    expect(src).toContain("SOCIAL_PROFILE_COVER_EDIT_CLASS");
    expect(src).not.toContain("SOCIAL_PROFILE_COVER_PILL_CLASS");
    expect(src).toContain('name="pencil-simple"');
    expect(src).not.toContain('name="camera"');
    expect(src).toContain("editCover");
    expect(src).toContain("addCover");
    const button = slice("data-social-profile-cover-edit", "</button>");
    expect(button).toContain("aria-label={coverLabel}");
    expect(button).toContain("title={coverLabel}");
    // No visible label span on the circle.
    expect(button).not.toContain("<span");
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
    expect(src).toContain("coverObjectPosition(focus)");
    expect(src).toContain("moveCoverFocus");
  });

  it("drags and nudges on a focusable surface over the --band token", () => {
    const surface = slice("data-social-cover-drag", "</div>");
    expect(surface).toContain("tabIndex={0}");
    expect(surface).toContain('role="group"');
    expect(surface).toContain("aria-label={SOCIAL.profile.coverDragHint}");
    expect(surface).toContain("className={SOCIAL_PROFILE_COVER_DRAG_CLASS}");
    expect(surface).toContain("onKeyDown={onDragKeyDown}");
    expect(surface).toContain("onPointerDown={onPointerDown}");
    // The preview sits in flow inside the surface. A positioned image paints
    // after the surface's own outline and hides the inset focus ring.
    expect(surface).toContain("className={SOCIAL_PROFILE_COVER_DRAG_IMAGE_CLASS}");
    expect(surface).not.toContain("SOCIAL_PROFILE_COVER_IMAGE_CLASS");
    const imageTokens = SOCIAL_PROFILE_COVER_DRAG_IMAGE_CLASS.split(/\s+/);
    expect(imageTokens).toEqual(expect.arrayContaining(["block", "size-full", "object-cover"]));
    for (const token of imageTokens) {
      expect(token).not.toMatch(/^(?:[\w-]+:)*(?:absolute|relative|fixed|sticky|-?inset-|-?z-|-?top-|-?left-)/);
    }
    const drag = chrome.slice(chrome.indexOf("SOCIAL_PROFILE_COVER_DRAG_CLASS ="));
    const dragDef = drag.slice(0, drag.indexOf(";"));
    expect(dragDef).toContain("bg-band");
    expect(dragDef).toContain("touch-none");
    expect(dragDef).toContain("focus-visible:outline-offset-[-2px]!");
    expect(dragDef).toContain("focus-visible:rounded-none!");
    expect(dragDef).toContain("data-[slack]:cursor-grab");
    const keys = slice("function onDragKeyDown", "const isReposition");
    // Escape and arrows go through the one key rule, which holds both while
    // Save runs (Cancel is disabled then too).
    expect(keys).toContain("coverDragKeyAction(e.key, e.shiftKey, uploading)");
    expect(keys).not.toContain('e.key === "Escape"');
    expect(keys).toContain('action.type === "cancel"');
    expect(keys).toContain("cancelReposition()");
    expect(keys).toContain("e.preventDefault()");
    expect(src).toContain("surfaceRef.current?.focus({ preventScroll: true })");
    expect(src).toContain("editButtonRef.current?.focus({ preventScroll: true })");
  });

  it("puts the hint, note, Cancel/Save and errors in the head trail, not over the image", () => {
    expect(src).toContain("createPortal(trailContent, trail)");
    expect(src).toContain("coverTrailTarget(rootRef.current)");
    const menu = readFileSync("src/lib/social-profile-cover-menu.ts", "utf8");
    expect(menu).toContain('"[data-social-profile-head-trail]"');
    const trail = slice("const trailContent", "return (");
    expect(trail).toContain("coverDragHint");
    expect(trail).toContain("coverPublicNote");
    expect(trail).toContain("coverCancel");
    expect(trail).toContain("coverSaveChanges");
    expect(trail).toContain("uploadingPhoto");
    expect(trail).toContain("cancelReposition");
    expect(trail).toContain("onSaveReposition");
    // Errors show in any mode (a failed Remove too).
    expect(trail).toContain("{error ? (");
    expect(trail).not.toMatch(/isReposition && error|error && isReposition/);
    const surface = slice("data-social-cover-drag", "</div>");
    expect(surface).not.toContain("coverPublicNote");
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

  it("crops to 1784×446 via presign → PUT → saveSocialProfileCover", () => {
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
    expect(down).toContain("getBoundingClientRect().width");
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
});

describe("cover banner architecture", () => {
  it("uses SocialProfileCoverBlock for own-profile (menu escapes overflow)", () => {
    const ui = readFileSync("src/components/social/social-profile-identity.tsx", "utf8");
    expect(ui).toContain("SocialProfileCoverBlock");
    const banner = readFileSync(
      "src/components/social/social-profile-banner.tsx",
      "utf8",
    );
    expect(banner).toContain("SocialProfileCoverBlock");
    expect(banner).toContain("data-social-profile-cover-block");
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
