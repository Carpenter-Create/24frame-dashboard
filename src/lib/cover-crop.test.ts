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

  it("uses FB-style pill with camera icon + label on cover", () => {
    expect(src).toContain("SOCIAL_PROFILE_COVER_PILL_CLASS");
    expect(src).toContain('name="camera"');
    expect(src).toContain("editCover");
    expect(src).toContain("addCover");
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

  it("has reposition mode with Cancel + Save changes bar", () => {
    expect(src).toContain("SOCIAL_PROFILE_COVER_REPOSITION_BAR_CLASS");
    expect(src).toContain("coverCancel");
    expect(src).toContain("coverSaveChanges");
    expect(src).toContain("cancelReposition");
    expect(src).toContain("onSaveReposition");
  });

  it("shows FB drag hint text centered on dimmed cover", () => {
    expect(src).toContain("SOCIAL_PROFILE_COVER_DRAG_HINT_CLASS");
    expect(src).toContain("coverDragHint");
    expect(src).toContain("opacity-70");
    expect(src).toContain("cursor-grab");
  });

  it("shows public note in reposition bar", () => {
    expect(src).toContain("coverPublicNote");
  });

  it("errors are visible (not sr-only)", () => {
    const errorBlock = src.slice(src.lastIndexOf("aria-live"));
    expect(errorBlock).not.toContain("sr-only");
  });

  it("supports Remove action via clearSocialProfileCover", () => {
    expect(src).toContain("clearSocialProfileCover");
    expect(src).toContain("removeCover");
  });

  it("crops to 1784×446 via presign → PUT → saveSocialProfileCover", () => {
    expect(src).toContain("cropRectFile");
    expect(src).toContain("presignSocialMediaUpload");
    expect(src).toContain('body.set("lane", "posts")');
    expect(src).toContain("saveSocialProfileCover");
    expect(src).not.toContain("Mux");
  });

  it("supports drag-to-reposition with pointer events", () => {
    expect(src).toContain("onPointerDown");
    expect(src).toContain("onPointerMove");
    expect(src).toContain("onPointerUp");
    expect(src).toContain("panOffset");
    expect(src).toContain("touch-none");
  });

  it("toggles the cover menu without the outside press eating the next open", () => {
    expect(src).toContain("nextCoverPillMode");
    expect(src).toContain("coverMenuClosesOnDocumentPress");
    expect(src).toContain("setTimeout");
    expect(src).toContain('addEventListener("mousedown"');
    expect(src).toContain('addEventListener("keydown"');
    expect(src).not.toContain('addEventListener("pointerdown"');
    expect(src).toContain("stopPropagation()");
    const upload = src.slice(
      src.indexOf("function beginUpload"),
      src.indexOf("function beginReposition"),
    );
    const reposition = src.slice(
      src.indexOf("function beginReposition"),
      src.indexOf("async function removeCover"),
    );
    expect(upload).toContain("fileRef.current?.click()");
    expect(reposition).not.toContain("fileRef");
    expect(reposition).not.toContain("fetch(");
    expect(reposition).toContain("loadOwnCoverFile");
    expect(reposition).toContain("rememberPreview");
    expect(reposition).toContain('setMode("reposition")');
    expect(src).not.toContain("fileFromOwnCover");
    expect(src).not.toContain('redirect: "error"');
    expect(src).not.toContain("/api/social/media");
    expect(src).not.toContain("coverFileFromUrl");
    expect(src).toContain("coverFailureCopy");
    expect(src).toContain("coverNoticeText");
    const pick = src.slice(src.indexOf("function onFilePick"), src.indexOf("function computeCropFrame"));
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
    const repositionUi = src.slice(src.indexOf("{isReposition ? ("), src.indexOf("{!isReposition ? ("));
    expect(repositionUi).toContain("coverCancel");
    expect(repositionUi).toContain("coverSaveChanges");
    expect(repositionUi.indexOf("data-social-cover-reposition-bar")).toBeGreaterThan(
      repositionUi.indexOf("z-0"),
    );
    expect(src).not.toContain("setError(result.error)");
    expect(src).not.toContain("setError(signed.error");
  });

  it("clears file input on cancel", () => {
    expect(src).toContain("clearReposition");
    expect(src).toContain('fileRef.current.value = ""');
    expect(src).toContain("cancelReposition");
  });

  it("revokes blob preview after server save", () => {
    expect(src).toContain("URL.revokeObjectURL(previewUrl)");
    const revokeCount = (
      src.match(/URL\.revokeObjectURL\(previewUrl\)/g) ?? []
    ).length;
    expect(revokeCount).toBeGreaterThanOrEqual(3);
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
  it("has the FB-style chrome classes in social-chrome", () => {
    const chrome = readFileSync("src/lib/social-chrome.ts", "utf8");
    expect(chrome).toContain("SOCIAL_PROFILE_COVER_PILL_CLASS");
    expect(chrome).toContain("SOCIAL_PROFILE_COVER_MENU_CLASS");
    expect(chrome).toContain("SOCIAL_PROFILE_COVER_MENU_ITEM_CLASS");
    expect(chrome).toContain("SOCIAL_PROFILE_COVER_REPOSITION_BAR_CLASS");
    expect(chrome).toContain("SOCIAL_PROFILE_COVER_DRAG_HINT_CLASS");
    expect(chrome).toContain("pointer-events-none absolute inset-0 z-10");
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
  it("exists in the actions file and sets cover_key to null", () => {
    const actions = readFileSync("src/app/(app)/social/actions.ts", "utf8");
    expect(actions).toContain("clearSocialProfileCover");
    expect(actions).toContain("cover_key: null");
  });
});
