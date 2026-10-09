import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { APP_SHEET_HOST_CLASS, APP_SHEET_SCRIM_CLASS } from "@/lib/house-sheet";
import { SOCIAL } from "@/lib/social";
import { SOCIAL_PROFILE_AVATAR_MENU_INLINE_CLASS } from "@/lib/social-chrome";
import { SocialProfileAvatarSheet } from "./social-profile-avatar-sheet";

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, "social-profile-avatar-sheet.tsx"), "utf8");
const editSrc = readFileSync(join(here, "social-profile-edit.tsx"), "utf8");

describe("SocialProfileAvatarSheet", () => {
  it("opens as a house app-sheet from the bottom, not a floating popover", () => {
    const html = renderToStaticMarkup(
      <SocialProfileAvatarSheet
        open
        hasPhoto={false}
        onClose={() => undefined}
        onPick={() => undefined}
        onRemove={() => undefined}
      />,
    );
    expect(html).toContain("data-social-profile-avatar-sheet");
    expect(html).toContain(APP_SHEET_HOST_CLASS);
    expect(html).toContain(APP_SHEET_SCRIM_CLASS);
    expect(html).toContain("data-social-profile-avatar-sheet-handle");
    expect(html).toContain("data-social-profile-avatar-library");
    expect(html).toContain("data-social-profile-avatar-camera");
    expect(html).toContain(SOCIAL.profile.chooseFromLibrary);
    expect(html).toContain(SOCIAL.profile.takePhoto);
    expect(html).not.toContain("Photo Library");
    expect(html).not.toContain("Take Photo");
    expect(html).not.toContain("Choose File");
    expect(html).not.toContain("WhatsApp");
    expect(html).not.toContain("Facebook");
    expect(html).not.toContain("data-social-profile-avatar-remove");
    expect(html).not.toContain(SOCIAL.profile.removePicture);
    expect(src).toContain("createPortal");
    expect(src).toContain("Escape");
    expect(src).toContain("AppSheetSurface");
    expect(src).toContain('capture="user"');
    expect(src).toContain("DISMISS_DRAG_PX");
    expect(src).not.toContain("MenuSurface");
    expect(src).not.toContain("absolute left-1/2");
    expect(src).not.toContain("popover");
    // The anchored menu is the desktop Edit window's only (placement inline).
    expect(html).not.toContain(SOCIAL_PROFILE_AVATAR_MENU_INLINE_CLASS);
    expect(src).toContain('const inline = placement === "inline";');
  });

  it("shows Remove current picture only when a photo exists", () => {
    const html = renderToStaticMarkup(
      <SocialProfileAvatarSheet
        open
        hasPhoto
        onClose={() => undefined}
        onPick={() => undefined}
        onRemove={() => undefined}
      />,
    );
    expect(html).toContain("data-social-profile-avatar-remove");
    expect(html).toContain(SOCIAL.profile.removePicture);
    expect(html).toContain("text-[#c4564a]");
    expect(html).toContain('data-social-icon="trash"');
  });

  it("renders nothing when closed", () => {
    expect(
      renderToStaticMarkup(
        <SocialProfileAvatarSheet
          open={false}
          hasPhoto
          onClose={() => undefined}
          onPick={() => undefined}
          onRemove={() => undefined}
        />,
      ),
    ).toBe("");
  });

  it("is the Edit Profile avatar action — not a file-input popover", () => {
    expect(editSrc).toContain("setAvatarSheet(true)");
    expect(editSrc).toContain("SocialProfileAvatarSheet");
    expect(editSrc).toContain("removeAccountPhoto");
    expect(editSrc).not.toContain("fileRef.current?.click()");
    expect(editSrc).not.toContain("Photo Library");
    expect(editSrc).not.toContain("Choose File");
  });
});
