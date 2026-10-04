import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  SOCIAL_AVATAR_PROFILE_CLASS,
  SOCIAL_DESKTOP_MEASURE,
  SOCIAL_MOBILE_BLEED_CLASS,
  SOCIAL_PROFILE_AVATAR_ON_COVER_CLASS,
  SOCIAL_PROFILE_AVATAR_ROW_CLASS,
  SOCIAL_PROFILE_AVATAR_SLOT_CLASS,
  SOCIAL_PROFILE_COVER_CLASS,
  SOCIAL_PROFILE_COVER_DRAG_CLASS,
  SOCIAL_PROFILE_COVER_EDIT_CLASS,
  SOCIAL_PROFILE_FACE_CLASS,
  SOCIAL_PROFILE_HEAD_NO_COVER_CLASS,
  SOCIAL_PROFILE_HEAD_OVERLAP_CLASS,
  SOCIAL_PROFILE_HEAD_TRAIL_CLASS,
  SOCIAL_PROFILE_IDENTITY_CLASS,
  SOCIAL_PROFILE_NAME_STACK_CLASS,
} from "@/lib/social-chrome";
import { SOCIAL_PROFILE_COVER_IMAGE_SIZES, SOCIAL_POST_IMAGE_SIZES } from "@/lib/social-media-display";
import {
  SOCIAL_PROFILE_COVER_LOCK_A,
  SOCIAL_PROFILE_HEADER_LOCK,
  socialProfileCoverPhoto,
  socialProfileRendersCoverBand,
} from "@/lib/social-profile-cover";

const PROFILE_HEADER_CONSTANTS = [
  SOCIAL_PROFILE_IDENTITY_CLASS,
  SOCIAL_PROFILE_COVER_CLASS,
  SOCIAL_PROFILE_COVER_EDIT_CLASS,
  SOCIAL_PROFILE_COVER_DRAG_CLASS,
  SOCIAL_PROFILE_HEAD_OVERLAP_CLASS,
  SOCIAL_PROFILE_HEAD_NO_COVER_CLASS,
  SOCIAL_PROFILE_AVATAR_ROW_CLASS,
  SOCIAL_PROFILE_AVATAR_SLOT_CLASS,
  SOCIAL_PROFILE_HEAD_TRAIL_CLASS,
  SOCIAL_PROFILE_AVATAR_ON_COVER_CLASS,
  SOCIAL_PROFILE_NAME_STACK_CLASS,
  SOCIAL_PROFILE_FACE_CLASS,
];

describe("SOCIAL_PROFILE_COVER_LOCK_A", () => {
  it("keeps column width and the 1784×446 master; display sizes moved to the header lock", () => {
    expect(SOCIAL_PROFILE_COVER_LOCK_A.columnWidth).toBe(SOCIAL_DESKTOP_MEASURE.center);
    expect(SOCIAL_PROFILE_COVER_LOCK_A.columnWidth).toBe(720);
    expect(SOCIAL_POST_IMAGE_SIZES).toBe(`(max-width: 1023px) 100vw, ${SOCIAL_DESKTOP_MEASURE.center}px`);
    expect(SOCIAL_PROFILE_COVER_IMAGE_SIZES).toBe(SOCIAL_POST_IMAGE_SIZES);
    expect(SOCIAL_POST_IMAGE_SIZES).not.toContain("892");
    expect(SOCIAL_PROFILE_COVER_LOCK_A.masterWidth).toBe(1784);
    expect(SOCIAL_PROFILE_COVER_LOCK_A.masterHeight).toBe(446);
    expect(SOCIAL_PROFILE_COVER_LOCK_A.masterWidth / SOCIAL_PROFILE_COVER_LOCK_A.masterHeight).toBe(4);
    expect(SOCIAL_PROFILE_COVER_LOCK_A.aspectWidth / SOCIAL_PROFILE_COVER_LOCK_A.aspectHeight).toBe(4);
    expect(SOCIAL_PROFILE_COVER_LOCK_A.coverFitWidth).toBe(1584);
    expect(SOCIAL_PROFILE_COVER_LOCK_A.coverFitHeight).toBe(396);
    expect(SOCIAL_PROFILE_COVER_LOCK_A).not.toHaveProperty("heightMobile");
    expect(SOCIAL_PROFILE_COVER_LOCK_A).not.toHaveProperty("heightDesktop");
    expect(SOCIAL_PROFILE_COVER_LOCK_A).not.toHaveProperty("avatarSize");
    expect(SOCIAL_PROFILE_HEADER_LOCK).toEqual({
      avatarPhone: { min: 88, cqw: 25, max: 112 },
      avatarDesktop: { min: 96, cqw: 19, max: 152 },
      ringPx: 4,
      lipRatio: 0.5,
    });
  });

  it("keeps chrome tokens aligned with the profile header lock", () => {
    const chrome = readFileSync("src/lib/social-chrome.ts", "utf8");
    const { avatarPhone, avatarDesktop, ringPx } = SOCIAL_PROFILE_HEADER_LOCK;
    const phoneClamp = `clamp(${avatarPhone.min}px,${avatarPhone.cqw}cqw,${avatarPhone.max}px)`;
    const desktopClamp = `clamp(${avatarDesktop.min}px,${avatarDesktop.cqw}cqw,${avatarDesktop.max}px)`;
    expect(phoneClamp).toBe("clamp(88px,25cqw,112px)");
    expect(desktopClamp).toBe("clamp(96px,19cqw,152px)");
    expect(chrome).toContain("aspect-[4/1]");
    expect(chrome).toContain(phoneClamp);
    expect(chrome).toContain(desktopClamp);
    expect(chrome).toContain(`border-${ringPx} border-bg md:border-surface`);
    expect(chrome).toContain("md:ring-offset-[var(--surface)]");
    expect(chrome).toContain("-mt-[calc(var(--social-profile-avatar)/2)]");
    expect(chrome).not.toContain("h-[112px]");
    expect(chrome).not.toContain("md:h-[224px]");
    expect(chrome).toContain("bg-accent-wash");
    // Phone Topics pull is max-md:-mt-. That is not a desktop avatar lip.
    expect(chrome).not.toMatch(/md:-mt-\[\d+px\]/);
    expect(chrome).not.toContain("-mt-[40px]");

    expect(SOCIAL_PROFILE_COVER_CLASS).toBe("relative w-full aspect-[4/1] shrink-0 overflow-hidden");
    expect(SOCIAL_PROFILE_COVER_CLASS).not.toMatch(/\bh-\[/);

    expect(SOCIAL_PROFILE_IDENTITY_CLASS).toContain("@container");
    expect(SOCIAL_PROFILE_IDENTITY_CLASS).toContain(`[--social-profile-avatar:${phoneClamp}]`);
    expect(SOCIAL_PROFILE_IDENTITY_CLASS).toContain(`md:[--social-profile-avatar:${desktopClamp}]`);
    expect(SOCIAL_PROFILE_IDENTITY_CLASS).toContain("md:rounded-[var(--radius-lg)]");
    expect(SOCIAL_PROFILE_IDENTITY_CLASS).toMatch(/(?:^|\s)md:border(?:\s|$)/);
    expect(SOCIAL_PROFILE_IDENTITY_CLASS).toContain("md:border-hairline");
    expect(SOCIAL_PROFILE_IDENTITY_CLASS).toContain("md:overflow-hidden");
    expect(SOCIAL_PROFILE_IDENTITY_CLASS).toContain("md:bg-surface");
    expect(SOCIAL_PROFILE_IDENTITY_CLASS).toContain(SOCIAL_MOBILE_BLEED_CLASS);
    // Decision 2 (a): flush under the top bar on phone.
    expect(SOCIAL_PROFILE_IDENTITY_CLASS).toContain("max-md:-mt-[var(--space-4)]");
    expect(SOCIAL_PROFILE_IDENTITY_CLASS).not.toContain("shadow-");
    // Phone root has no fill: text sits on the page.
    expect(SOCIAL_PROFILE_IDENTITY_CLASS).not.toMatch(/(?:^|\s)bg-surface(?:\s|$)/);

    const lip = `/${1 / SOCIAL_PROFILE_HEADER_LOCK.lipRatio})`;
    expect(SOCIAL_PROFILE_HEAD_OVERLAP_CLASS).toBe(
      `pointer-events-none relative z-10 -mt-[calc(var(--social-profile-avatar)${lip}]`,
    );
    expect(SOCIAL_PROFILE_HEAD_TRAIL_CLASS).toContain("mt-[calc(");
    expect(SOCIAL_PROFILE_HEAD_TRAIL_CLASS).not.toContain("pt-[calc(");
    expect(SOCIAL_PROFILE_HEAD_TRAIL_CLASS).toContain("pointer-events-auto");
    expect(SOCIAL_PROFILE_HEAD_TRAIL_CLASS).toContain("empty:hidden");
    expect(SOCIAL_PROFILE_AVATAR_SLOT_CLASS).toContain("pointer-events-auto");
    expect(SOCIAL_PROFILE_NAME_STACK_CLASS).toContain("pointer-events-auto");
    expect(SOCIAL_PROFILE_AVATAR_ON_COVER_CLASS).toBe(
      "size-[var(--social-profile-avatar)] border-4 border-bg md:border-surface text-[length:var(--text-title)] md:ring-offset-[var(--surface)]",
    );
    expect(SOCIAL_PROFILE_HEAD_NO_COVER_CLASS).toBe("pt-[var(--space-4)] md:pt-[var(--space-6)]");
    expect(SOCIAL_PROFILE_FACE_CLASS).toContain("pb-[var(--space-2)] md:pb-[var(--space-6)]");
    expect(SOCIAL_PROFILE_COVER_EDIT_CLASS).toContain("size-9");
    expect(SOCIAL_PROFILE_COVER_EDIT_CLASS).toContain("after:-inset-1");
    for (const value of PROFILE_HEADER_CONSTANTS) {
      expect(value).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    }

    // The 88px Edit-profile sheet avatar is untouched.
    expect(SOCIAL_AVATAR_PROFILE_CLASS).toContain("size-20");
    expect(SOCIAL_AVATAR_PROFILE_CLASS).not.toContain("size-[72px]");
    expect(SOCIAL_AVATAR_PROFILE_CLASS).not.toContain("md:size-[88px]");
    expect(chrome).toContain("SOCIAL_PROFILE_COVER_EDIT_CLASS");
    expect(chrome).toContain("social-profile-header-linkedin-lock-v1");
    expect(chrome).toContain("Phone and desktop share this stack");
    expect(chrome).toContain("Name is house t-heading");
    expect(chrome).toContain("mt-[var(--space-3)]");
    expect(chrome).toContain("gap-[var(--space-2)]");
    expect(chrome).not.toContain("SOCIAL_PROFILE_HEAD_ON_COVER_CLASS");
    expect(chrome).not.toContain("SOCIAL_PROFILE_NAME_STACK_ON_COVER_CLASS");
    expect(chrome).not.toContain("SOCIAL_PROFILE_COVER_PILL_CLASS");
    expect(chrome).not.toContain("SOCIAL_PROFILE_COVER_REPOSITION_BAR_CLASS");
    expect(chrome).not.toContain("SOCIAL_PROFILE_COVER_REPOSITION_CLASS");
    expect(chrome).not.toContain("SOCIAL_PROFILE_COVER_DRAG_HINT_CLASS");
    expect(chrome).toContain(
      "export const SOCIAL_PROFILE_NAME_CLASS = `${HOUSE_PHONE_WRAP_CLASS} t-heading text-ink`;",
    );
    expect(chrome).not.toMatch(
      /export const SOCIAL_PROFILE_NAME_CLASS = "[^"]*t-title/,
    );
    const ui = readFileSync("src/components/social/social-profile-identity.tsx", "utf8");
    const identity = ui.slice(ui.indexOf("export function SocialProfileIdentity"));
    expect(identity).not.toContain("data-social-profile-avatar-hang");
    const headHost = identity.slice(
      identity.indexOf('data-social-profile-head=""'),
      identity.indexOf("data-social-profile-name"),
    );
    expect(headHost).toContain("SOCIAL_PROFILE_HEAD_OVERLAP_CLASS");
    expect(headHost).toContain("SOCIAL_PROFILE_HEAD_NO_COVER_CLASS");
    expect(headHost).toContain("SOCIAL_PROFILE_HEAD_CLASS");
    expect(headHost).toContain("SOCIAL_PROFILE_AVATAR_ROW_CLASS");
    expect(headHost).toContain("SOCIAL_PROFILE_AVATAR_SLOT_CLASS");
    expect(headHost).toContain("SOCIAL_PROFILE_HEAD_TRAIL_CLASS");
  });

  it("omits the visitor band unless a real cover photo exists", () => {
    expect(socialProfileCoverPhoto(null)).toBeNull();
    expect(socialProfileCoverPhoto(undefined)).toBeNull();
    expect(socialProfileCoverPhoto("")).toBeNull();
    expect(socialProfileCoverPhoto("   ")).toBeNull();
    expect(socialProfileCoverPhoto("  https://cf.example/cover.jpg  ")).toBe(
      "https://cf.example/cover.jpg",
    );
    expect(socialProfileRendersCoverBand({ coverUrl: null, owner: false })).toBe(false);
    expect(socialProfileRendersCoverBand({ coverUrl: "   ", owner: false })).toBe(false);
    expect(
      socialProfileRendersCoverBand({
        coverUrl: "https://cf.example/cover.jpg",
        owner: false,
      }),
    ).toBe(true);
    expect(socialProfileRendersCoverBand({ coverUrl: null, owner: true })).toBe(true);
    expect(
      socialProfileRendersCoverBand({
        coverUrl: "https://cf.example/cover.jpg",
        owner: true,
      }),
    ).toBe(true);

    const banner = readFileSync("src/components/social/social-profile-banner.tsx", "utf8");
    const visitor = banner.slice(
      banner.indexOf("export function SocialProfileBanner"),
      banner.indexOf("export function SocialProfileCoverBlock"),
    );
    expect(visitor).toContain("if (!photo) return null");
    expect(visitor).not.toContain("SOCIAL_PROFILE_COVER_EMPTY_CLASS");
    expect(visitor).not.toContain("data-social-profile-cover-empty");
    const owner = banner.slice(banner.indexOf("export function SocialProfileCoverBlock"));
    expect(owner).toContain("SOCIAL_PROFILE_COVER_EMPTY_CLASS");
    expect(owner).toContain("data-social-profile-cover-empty");
  });

  it("labels master as LinkedIn header SoT", () => {
    const src = readFileSync("src/lib/social-profile-cover.ts", "utf8");
    expect(src).toContain("LinkedIn header SoT");
    expect(src).toContain("1784");
    expect(src).toContain("446");
  });

  it("keeps master dims in crop math and out of the profile UI", () => {
    const social = readFileSync("src/lib/social.ts", "utf8");
    expect(social).not.toContain("coverDims");
    expect(social).not.toContain("1784");
    expect(social).not.toContain("446 px");
    const upload = readFileSync("src/components/social/social-profile-cover-upload.tsx", "utf8");
    expect(upload).not.toContain("data-social-profile-cover-dims");
    expect(upload).not.toContain("masterWidth");
    expect(upload).not.toContain("masterHeight");
    expect(upload).toContain("COVER_CROP_OUTPUT_WIDTH");
    expect(upload).toContain("COVER_CROP_OUTPUT_HEIGHT");
    expect(upload).toContain("SOCIAL_PROFILE_COVER_PILL_ANCHOR_CLASS");
    expect(upload).not.toContain("bottom-3 right-3");
  });

  it("routes cover saves through the posts stills lane", () => {
    const media = readFileSync("src/lib/social-media.ts", "utf8");
    expect(media).toContain("profileCoverItemFromMedia");
    const save = readFileSync("src/lib/social-profile-cover-save.ts", "utf8");
    expect(save).toContain("profileCoverItemFromMedia");
    expect(save).toContain('body.set("lane", "posts")');
    const actions = readFileSync("src/app/(app)/social/actions.ts", "utf8");
    expect(actions).toContain("saveSocialProfileCover");
    expect(actions).toContain("parseSocialProfileCoverSave");
    expect(actions).toContain("cover_key");
    const upload = readFileSync("src/components/social/social-profile-cover-upload.tsx", "utf8");
    expect(upload).toContain("presignSocialMediaUpload");
    expect(upload).toContain("uploadCoverFile");
    expect(upload).not.toContain("Mux");
  });
});
