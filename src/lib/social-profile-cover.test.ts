import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  SOCIAL_PROFILE_AVATAR_EDIT_CLASS,
  SOCIAL_PROFILE_AVATAR_ON_COVER_CLASS,
  SOCIAL_PROFILE_COVER_CLASS,
  SOCIAL_PROFILE_COVER_DRAG_CLASS,
  SOCIAL_PROFILE_COVER_EDIT_CLASS,
  SOCIAL_PROFILE_COVER_PHONE_OUTLINE_CLASS,
  SOCIAL_PROFILE_FACE_CLASS,
  SOCIAL_PROFILE_HANDLE_CLASS,
  SOCIAL_PROFILE_HEAD_CLASS,
  SOCIAL_PROFILE_HEAD_TRAIL_CLASS,
  SOCIAL_PROFILE_HERO_CLASS,
  SOCIAL_PROFILE_IDENTITY_CLASS,
  SOCIAL_PROFILE_NAME_CLASS,
  SOCIAL_PROFILE_NAME_STACK_CLASS,
  SOCIAL_PROFILE_AVATAR_ROW_CLASS,
  SOCIAL_PROFILE_STAGE_CLASS,
} from "@/lib/social-chrome";
import { SOCIAL_PROFILE_COVER_IMAGE_SIZES, SOCIAL_POST_IMAGE_SIZES } from "@/lib/social-media-display";
import { SOCIAL_IMAGE_MAX_BYTES } from "@/lib/social-media";
import {
  COVER_CROP_MAX_BYTES,
  COVER_CROP_OUTPUT_HEIGHT,
  COVER_CROP_OUTPUT_WIDTH,
  SOCIAL_PROFILE_COVER_STAGE,
  SOCIAL_PROFILE_STAGE_HERO,
  socialProfileCoverPhoto,
  socialProfileHeroOverlayPx,
} from "@/lib/social-profile-cover";

const STAGE_CONSTANTS = [
  SOCIAL_PROFILE_STAGE_CLASS,
  SOCIAL_PROFILE_HERO_CLASS,
  SOCIAL_PROFILE_COVER_CLASS,
  SOCIAL_PROFILE_HEAD_CLASS,
  SOCIAL_PROFILE_AVATAR_ROW_CLASS,
  SOCIAL_PROFILE_AVATAR_ON_COVER_CLASS,
  SOCIAL_PROFILE_AVATAR_EDIT_CLASS,
  SOCIAL_PROFILE_NAME_STACK_CLASS,
  SOCIAL_PROFILE_NAME_CLASS,
  SOCIAL_PROFILE_HANDLE_CLASS,
  SOCIAL_PROFILE_COVER_EDIT_CLASS,
  SOCIAL_PROFILE_COVER_DRAG_CLASS,
  SOCIAL_PROFILE_COVER_PHONE_OUTLINE_CLASS,
  SOCIAL_PROFILE_HEAD_TRAIL_CLASS,
  SOCIAL_PROFILE_IDENTITY_CLASS,
  SOCIAL_PROFILE_FACE_CLASS,
];

const tokens = (value: string) => value.split(/\s+/);

describe("Profile Stage lock — numbers (docs/design-locks/social-profile-stage-lock-v1.md)", () => {
  it("frames once at 16:7 and saves a 2400×1050 crop", () => {
    expect(SOCIAL_PROFILE_COVER_STAGE).toEqual({
      aspectWidth: 16,
      aspectHeight: 7,
      phoneAspectWidth: 61,
      phoneAspectHeight: 55,
      phoneCardBelowRem: 30,
      outputWidth: 2400,
      outputHeight: 1050,
      radiusPx: 24,
      phoneInsetPx: 12,
    });
    expect(COVER_CROP_OUTPUT_WIDTH / COVER_CROP_OUTPUT_HEIGHT).toBe(16 / 7);
    expect(SOCIAL_PROFILE_STAGE_HERO).toEqual({
      heroTightMaxRem: 28,
      heroLargeMinRem: 40,
      desktopMinHeroPx: 388,
      topGapPx: 12,
      avatarRingPx: 3,
      steps: {
        tight: { avatarPx: 48, padPx: 16, avatarNameGapPx: 8, nameLinePx: 30.8, nameHandleGapPx: 4, handleLinePx: 17.875 },
        compact: { avatarPx: 64, padPx: 20, avatarNameGapPx: 12, nameLinePx: 30.8, nameHandleGapPx: 4, handleLinePx: 17.875 },
        large: { avatarPx: 80, padPx: 28, avatarNameGapPx: 16, nameLinePx: 56, nameHandleGapPx: 8, handleLinePx: 20.625 },
      },
    });
    // The crop uploads through the posts stills lane; its cap is the lane cap,
    // far above a worst-case 2400×1050 JPEG (about 3 bytes a pixel).
    expect(COVER_CROP_MAX_BYTES).toBe(SOCIAL_IMAGE_MAX_BYTES);
    expect(COVER_CROP_MAX_BYTES).toBeGreaterThan(2400 * 1050 * 3);
    expect(SOCIAL_PROFILE_COVER_IMAGE_SIZES).toBe(SOCIAL_POST_IMAGE_SIZES);
  });

  it("keeps the literal hero, phone and overlay classes in step with the numbers", () => {
    const { aspectWidth, aspectHeight, phoneAspectWidth, phoneAspectHeight, phoneCardBelowRem, radiusPx } =
      SOCIAL_PROFILE_COVER_STAGE;
    const { heroTightMaxRem, heroLargeMinRem, topGapPx, steps } = SOCIAL_PROFILE_STAGE_HERO;
    const step = `@min-[${heroLargeMinRem}rem]/hero:`;
    const tight = `md:@max-[${heroTightMaxRem}rem]/hero:`;
    // Tailwind spacing is 4px a step.
    const sp = (px: number) => String(px / 4);
    const frame = [
      `aspect-[${phoneAspectWidth}/${phoneAspectHeight}]`,
      // Landscape phones and small tablets get the 16:7 frame, never a card
      // taller than a landscape screen.
      `min-[${phoneCardBelowRem}rem]:aspect-[${aspectWidth}/${aspectHeight}]`,
      // The editor turns the phone card into the 16:7 frame too.
      `group-has-[[data-social-cover-drag]]/hero:aspect-[${aspectWidth}/${aspectHeight}]`,
    ];
    const hero = tokens(SOCIAL_PROFILE_HERO_CLASS);
    expect(hero).toEqual(expect.arrayContaining(frame));
    expect(hero.filter((token) => token.includes("aspect-"))).toHaveLength(frame.length);
    expect(hero).toContain("rounded-[var(--radius-xl)]");
    expect(hero).toContain("bg-band");
    // Not a scroll container: a name too long for the frame grows the card, never cut.
    expect(hero).toContain("overflow-clip");
    expect(hero).not.toContain("overflow-hidden");
    expect(SOCIAL_PROFILE_HERO_CLASS).not.toMatch(/(?:^|\s)h-\[|aspect-\[4\/1\]/);

    // The cover layer is its own frame box at the top of the card, never the
    // card's content height, so a taller card never re-crops the framed photo.
    const cover = tokens(SOCIAL_PROFILE_COVER_CLASS);
    expect(cover).toEqual(expect.arrayContaining(["absolute", "inset-x-0", "top-0", "overflow-hidden", ...frame]));
    expect(cover.filter((token) => token.includes("aspect-"))).toHaveLength(frame.length);
    expect(cover).not.toContain("inset-0");
    expect(cover).not.toContain("bottom-0");
    const tokensCss = readFileSync("src/app/tokens.css", "utf8");
    expect(tokensCss).toContain(`--radius-xl: ${radiusPx}px;`);

    // Phone card: 12 from the screen edges (frame gutter 16, pulled 4).
    const stage = tokens(SOCIAL_PROFILE_STAGE_CLASS);
    expect(stage).toEqual(expect.arrayContaining(["@container/hero", "group/hero", "relative", "max-md:-mx-1", "max-md:-mt-1"]));
    expect(stage).not.toContain("w-full");
    expect(stage).not.toContain("overflow-hidden");

    // Overlay steps: avatar 48 (tight) / 64 / 80 with a 3px band-ink ring,
    // title 28 → hero 56 at the large step.
    const avatar = tokens(SOCIAL_PROFILE_AVATAR_ON_COVER_CLASS);
    expect(avatar).toEqual(
      expect.arrayContaining([
        `size-${sp(steps.compact.avatarPx)}`,
        `${tight}size-${sp(steps.tight.avatarPx)}`,
        `${step}size-${sp(steps.large.avatarPx)}`,
        "border-[3px]",
        "border-band-ink",
      ]),
    );
    const name = tokens(SOCIAL_PROFILE_NAME_CLASS);
    expect(name).toEqual(
      expect.arrayContaining(["t-title", "text-band-ink", `${step}text-[length:var(--text-hero)]`, `${step}leading-none`, `${step}tracking-display`]),
    );
    // The tight step keeps the house title size: only the avatar and padding shrink.
    expect(SOCIAL_PROFILE_NAME_CLASS).not.toContain(tight);
    const handle = tokens(SOCIAL_PROFILE_HANDLE_CLASS);
    expect(handle).toEqual(expect.arrayContaining(["text-[length:var(--text-xs)]", `${step}text-[length:var(--text-sm)]`, "text-band-ink/84"]));
    expect(tokens(SOCIAL_PROFILE_NAME_STACK_CLASS)).toEqual(
      expect.arrayContaining([
        `px-${sp(steps.compact.padPx)}`,
        `pb-${sp(steps.compact.padPx)}`,
        `pt-${sp(steps.compact.avatarNameGapPx)}`,
        `gap-${sp(steps.compact.nameHandleGapPx)}`,
        `${tight}px-${sp(steps.tight.padPx)}`,
        `${tight}pb-${sp(steps.tight.padPx)}`,
        `${tight}pt-${sp(steps.tight.avatarNameGapPx)}`,
        `${step}px-${sp(steps.large.padPx)}`,
        `${step}pb-${sp(steps.large.padPx)}`,
        `${step}pt-${sp(steps.large.avatarNameGapPx)}`,
        `${step}gap-${sp(steps.large.nameHandleGapPx)}`,
      ]),
    );
    // The least photo above the avatar, and the row's side padding per step.
    expect(tokens(SOCIAL_PROFILE_AVATAR_ROW_CLASS)).toEqual(
      expect.arrayContaining([
        `pt-${sp(topGapPx)}`,
        `px-${sp(steps.compact.padPx)}`,
        `${tight}px-${sp(steps.tight.padPx)}`,
        `${step}px-${sp(steps.large.padPx)}`,
      ]),
    );
    // No hero class still uses an old step.
    for (const value of STAGE_CONSTANTS) expect(value).not.toMatch(/@min-\[35rem\]\/hero:/);
  });

  it("keeps a two-line name inside 16:7, with photo above the avatar, at the narrowest hero of every step", () => {
    const { heroTightMaxRem, heroLargeMinRem, desktopMinHeroPx, steps } = SOCIAL_PROFILE_STAGE_HERO;
    const { aspectWidth, aspectHeight, phoneAspectWidth, phoneAspectHeight, phoneCardBelowRem, phoneInsetPx } =
      SOCIAL_PROFILE_COVER_STAGE;
    const frameHeight = (width: number) => (width * aspectHeight) / aspectWidth;
    const fits = (step: (typeof steps)[keyof typeof steps], width: number, height: number, lines = 2) =>
      socialProfileHeroOverlayPx(step, lines) <= height;
    // Desktop: tight from the 388 column at 1024 beside For You; compact from
    // 28rem; large from 40rem. Each is checked at the narrowest width it serves.
    expect(fits(steps.tight, desktopMinHeroPx, frameHeight(desktopMinHeroPx))).toBe(true);
    expect(fits(steps.compact, heroTightMaxRem * 16, frameHeight(heroTightMaxRem * 16))).toBe(true);
    expect(fits(steps.large, heroLargeMinRem * 16, frameHeight(heroLargeMinRem * 16))).toBe(true);
    // Phones: the 61:55 card at 320, and the 16:7 card from 30rem of viewport.
    const phone320 = 320 - 2 * phoneInsetPx;
    expect(fits(steps.compact, phone320, (phone320 * phoneAspectHeight) / phoneAspectWidth)).toBe(true);
    const wide = phoneCardBelowRem * 16 - 2 * phoneInsetPx;
    expect(fits(steps.compact, wide, frameHeight(wide))).toBe(true);
    // Why the steps sit where they do: the compact step overflows the 388
    // column, and the large step overflows below 40rem (the old 35rem step).
    expect(fits(steps.compact, desktopMinHeroPx, frameHeight(desktopMinHeroPx))).toBe(false);
    expect(fits(steps.large, 35 * 16, frameHeight(35 * 16))).toBe(false);
    // Three lines at the large step grow the card even at 720 (the lock's
    // documented "grows" case); the cover keeps its own frame box then.
    expect(fits(steps.large, 720, frameHeight(720), 3)).toBe(false);
    // The model is the CSS: a 1-line large overlay is 12 + 80 + 16 + 56 + 8 + 20.625 + 28.
    expect(socialProfileHeroOverlayPx(steps.large, 1)).toBeCloseTo(220.625, 6);
  });

  it("builds the scrim from the --band token, solid under the text", () => {
    // The avatar row eases from band/75 at its foot to clear at its top on a
    // smoothstep curve (flat at both ends), so there is no edge where it meets
    // the solid band/75 under the name: not a straight ramp.
    const row = tokens(SOCIAL_PROFILE_AVATAR_ROW_CLASS);
    const gradient = row.find((token) => token.startsWith("bg-[linear-gradient(")) ?? "";
    expect(gradient).toBe(
      "bg-[linear-gradient(to_top,color-mix(in_oklab,var(--band)_75%,transparent),color-mix(in_oklab,var(--band)_67%,transparent)_20%,color-mix(in_oklab,var(--band)_49%,transparent)_40%,color-mix(in_oklab,var(--band)_26%,transparent)_60%,color-mix(in_oklab,var(--band)_8%,transparent)_80%,transparent)]",
    );
    const stops = [...gradient.matchAll(/var\(--band\)_(\d+)%,transparent\)(?:_(\d+)%)?/g)].map((m) => ({
      alpha: Number(m[1]) / 100,
      at: m[2] ? Number(m[2]) / 100 : 0,
    }));
    for (const { alpha, at } of stops) {
      expect(alpha).toBeCloseTo(0.75 * (1 - (3 * at ** 2 - 2 * at ** 3)), 2);
    }
    expect(row).not.toContain("from-band/75");
    expect(tokens(SOCIAL_PROFILE_NAME_STACK_CLASS)).toContain("bg-band/75");
    // While the editor is open the identity steps aside: the photo shows alone.
    expect(tokens(SOCIAL_PROFILE_HEAD_CLASS)).toContain("group-has-[[data-social-cover-drag]]/hero:hidden");
  });

  it("uses tokens only and never truncates", () => {
    for (const value of STAGE_CONSTANTS) {
      expect(value).not.toMatch(/#[0-9a-f]{3,8}\b/i);
      expect(value).not.toMatch(/\btruncate\b|text-ellipsis|line-clamp/);
      expect(value).not.toMatch(/\bshadow-/);
    }
  });

  it("puts the owner controls on glass with a focus ring that shows on any photo", () => {
    const edit = tokens(SOCIAL_PROFILE_COVER_EDIT_CLASS);
    expect(edit).toEqual(
      expect.arrayContaining([
        "size-9",
        "rounded-full",
        "border-hairline",
        "bg-surface/86",
        "backdrop-blur-[16px]",
        "after:-inset-1",
        "focus-visible:ring-2",
        "focus-visible:ring-band-ink",
        "focus-visible:rounded-full!",
        "md:w-auto",
      ]),
    );
    const avatarEdit = tokens(SOCIAL_PROFILE_AVATAR_EDIT_CLASS);
    expect(avatarEdit).toEqual(expect.arrayContaining(["size-7", "after:-inset-2", "focus-visible:ring-band-ink"]));
  });

  it("drops the visitor-band and LinkedIn-era constants", () => {
    const src = readFileSync("src/lib/social-profile-cover.ts", "utf8");
    expect(src).not.toContain("masterWidth");
    expect(src).not.toContain("SOCIAL_PROFILE_COVER_LOCK_A");
    expect(src).not.toContain("socialProfileRendersCoverBand");
    expect(src).toContain("social-profile-stage-lock-v1");
    // The save module describes the Stage crop, not the 4:1 one.
    const save = readFileSync("src/lib/social-profile-cover-save.ts", "utf8");
    expect(save).not.toMatch(/1784|446\b/);
    expect(save).toContain("2400×1050");
    expect(save).toContain("docs/design-locks/social-profile-stage-lock-v1.md");
    const chrome = readFileSync("src/lib/social-chrome.ts", "utf8");
    for (const gone of [
      "SOCIAL_PROFILE_HEAD_OVERLAP_CLASS",
      "SOCIAL_PROFILE_HEAD_NO_COVER_CLASS",
      "SOCIAL_PROFILE_COVER_EMPTY_CLASS",
      "SOCIAL_PROFILE_COVER_STACK_CLASS",
      "SOCIAL_PROFILE_ROLES_RAIL_ROWS",
      "SOCIAL_PROFILE_PANEL_INSET_CLASS",
      "SOCIAL_SHARE_CLASS",
      "aspect-[4/1]",
      "--social-profile-avatar",
    ]) {
      expect(chrome).not.toContain(gone);
    }
  });
});

describe("socialProfileCoverPhoto", () => {
  it("treats blank as no cover (the hero shows its band)", () => {
    expect(socialProfileCoverPhoto(null)).toBeNull();
    expect(socialProfileCoverPhoto(undefined)).toBeNull();
    expect(socialProfileCoverPhoto("")).toBeNull();
    expect(socialProfileCoverPhoto("   ")).toBeNull();
    expect(socialProfileCoverPhoto("  https://cf.example/cover.jpg  ")).toBe("https://cf.example/cover.jpg");
  });
});

describe("cover upload wiring", () => {
  it("keeps crop numbers in crop math and out of the profile UI copy", () => {
    const social = readFileSync("src/lib/social.ts", "utf8");
    expect(social).not.toContain("coverDims");
    expect(social).not.toContain("2400");
    expect(social).not.toContain("1050");
    const upload = readFileSync("src/components/social/social-profile-cover-upload.tsx", "utf8");
    expect(upload).not.toContain("data-social-profile-cover-dims");
    expect(upload).toContain("COVER_CROP_OUTPUT_WIDTH");
    expect(upload).toContain("COVER_CROP_OUTPUT_HEIGHT");
    expect(upload).toContain("SOCIAL_PROFILE_COVER_PILL_ANCHOR_CLASS");
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
