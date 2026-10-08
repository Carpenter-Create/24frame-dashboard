import { createElement } from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
}));

import { SocialCreateCompose } from "./social-create-compose";
import {
  fitSocialWriteComposeField,
  SOCIAL_STORY_STAGE_IN_CLASS,
  SOCIAL_WRITE_COMPOSE_HOST_CLASS,
} from "@/lib/social-chrome";
import { SOCIAL_WRITE_COMPOSE_DIALOG_FIELD_CLASS } from "@/lib/social-write-compose-sheet";
import { SEGMENTED_TRACK_PERSIST } from "@/lib/segmented-track";
import { SOCIAL } from "@/lib/social";
import { SOCIAL_CREATE_MEDIA_ACCEPT } from "@/lib/social-create-media";
import { SOCIAL_MEDIA_ACCEPT } from "@/lib/social-media";
import { stashSocialHomeComposerMedia } from "@/lib/social-home-composer";

const src = readFileSync("src/components/social/social-create-compose.tsx", "utf8");
const chrome = readFileSync("src/lib/social-chrome.ts", "utf8");

describe("Social create kinds", () => {
  it("enters the chosen mode directly — no second chooser on the compose form", () => {
    const write = renderToStaticMarkup(
      createElement(SocialCreateCompose, {
        authorName: "Ada Lovelace",
        authorHandle: "acarpcreate",
      }),
    );
    expect(write).toContain("data-social-create-form");
    expect(write).toContain('data-social-create-kind="text"');
    expect(write).toContain("data-social-create-author");
    expect(write).not.toContain("data-social-create-kinds");
    expect(write).not.toContain("data-social-create-well");
    expect(write).toContain("data-social-create-dismiss");
    expect(write).toContain(`aria-label="${SOCIAL.create.close}"`);
    expect(write).toContain('data-social-create-attach="library"');
    expect(write).toContain(`accept="${SOCIAL_MEDIA_ACCEPT}"`);
    expect(write).toContain("data-social-create-attach-input");
    expect(write).toContain(`aria-label="${SOCIAL.home.attach}"`);
    expect(write).not.toContain('data-social-create-attach="photo"');
    expect(write).not.toContain('data-social-create-attach="video"');
    expect(write).not.toContain(`>${SOCIAL.home.attach}<`);
    expect(write).toContain(`placeholder="${SOCIAL.home.composerPrompt}"`);
    expect(write).not.toContain(SOCIAL.create.caption);
    expect(write).not.toContain("data-house-voice-mic");
    expect(write).not.toContain(SOCIAL.home.audienceFollowing);
    expect(write).not.toContain("@acarpcreate");
    expect(write).toContain(SOCIAL.home.submit);
    expect(write).not.toContain("autofocus");
    expect(src).toContain("fitSocialWriteComposeField");
    expect(src).toContain("fileRef.current?.click()");

    // Adam 2026-10-08, "Match the fan": the page (the + fan's Write) and the
    // phone sheet take the desktop window's layout. Close, then the avatar
    // beside the field, the media under it, and the tool row (Media, Record,
    // Post) at the bottom, above the keyboard. The page fills the viewport.
    expect(write).toContain('data-social-write-compose-presentation="page"');
    expect(write).toContain(SOCIAL_WRITE_COMPOSE_HOST_CLASS);
    expect(SOCIAL_WRITE_COMPOSE_HOST_CLASS).toContain("h-dvh max-h-dvh");
    expect(write).toContain(SOCIAL_STORY_STAGE_IN_CLASS);
    expect(write).toContain(SOCIAL_WRITE_COMPOSE_DIALOG_FIELD_CLASS);
    // 17px: iOS Safari zooms the page on a field under 16px.
    expect(SOCIAL_WRITE_COMPOSE_DIALOG_FIELD_CLASS).toContain("text-[length:var(--text-base)]");
    expect(SOCIAL_WRITE_COMPOSE_DIALOG_FIELD_CLASS).not.toMatch(/truncate|ellipsis|line-clamp/);
    const close = write.indexOf("data-social-create-dismiss");
    const author = write.indexOf("data-social-create-author");
    const field = write.indexOf("data-social-write-compose-field");
    const tools = write.indexOf("data-social-write-compose-tools");
    expect(close).toBeLessThan(author);
    expect(author).toBeLessThan(field);
    expect(field).toBeLessThan(tools);
    const row = write.slice(tools);
    expect(row.indexOf('data-social-create-attach="library"')).toBeLessThan(row.indexOf("data-social-create-live"));
    expect(row.indexOf("data-social-create-live")).toBeLessThan(row.indexOf(`>${SOCIAL.home.submit}<`));
    expect(row).toContain(`aria-label="${SOCIAL.create.goLive}"`);
    expect(row).toContain('data-social-icon="image"');
    expect(row).toContain('data-social-icon="broadcast"');
    // The old phone layout is gone: no top Post bar, no bottom caption row.
    expect(write).not.toContain("data-social-write-compose-row");
    expect(write).not.toContain("data-social-write-stage");
    expect(write).not.toContain('data-social-icon="camera"');
    expect(src).not.toContain("SOCIAL_WRITE_COMPOSE_ROW_CLASS");
    expect(src).not.toContain("SOCIAL_WRITE_COMPOSE_SHEET_ROW_CLASS");
    expect(src).not.toContain('presentation="footer"');
    expect(src).not.toContain('presentation="hero"');
    expect(src).not.toContain("data-social-write-voice-stage");
    expect(src).not.toContain("data-social-write-footer");
    expect(src).toContain("unoptimized");
    expect(chrome).toContain(
      "relative h-[50vh] max-h-[50vh] w-full overflow-hidden rounded-[16px] bg-surface-muted",
    );
    const css = readFileSync("src/app/globals.css", "utf8");
    expect(css).toContain("body:has([data-social-write-compose])");
    expect(css).toContain("#vercel-toolbar");
    // The page's close leaves to Home; the sheet's and the window's close
    // only close them (onDismiss).
    const dismiss = src.slice(src.indexOf("data-social-create-dismiss"), src.indexOf("data-social-create-author"));
    expect(dismiss).toMatch(/if \(onDismiss\) \{\s*onDismiss\(\);\s*return;\s*\}/);
    expect(dismiss).toContain("leaveSocialWriteCompose");
    expect(dismiss).toContain("navigateOwned(SOCIAL_ROUTES.home)");
    expect(dismiss).toContain("router.push(SOCIAL_ROUTES.home)");
    expect(dismiss).not.toContain("router.back()");

    const pick = renderToStaticMarkup(
      createElement(SocialCreateCompose, {
        authorName: "Ada Lovelace",
        initialKind: "media",
      }),
    );
    expect(pick).toContain('data-social-create-kind="media"');
    expect(pick).toContain('data-social-create-media-step="pick"');
    expect(pick).toContain(`accept="${SOCIAL_CREATE_MEDIA_ACCEPT}"`);
    expect(pick).toContain("data-social-create-media-input");
    expect(pick).not.toContain("data-social-create-well");
    expect(pick).not.toContain(SOCIAL.create.dropEmpty);
    expect(pick).not.toContain(SOCIAL.create.caption);
    expect(pick).not.toContain(SOCIAL.home.submit);
    expect(pick).not.toContain("data-social-create-kinds");

    stashSocialHomeComposerMedia([
      new File(["still"], "still.jpg", { type: "image/jpeg" }),
    ]);
    const review = renderToStaticMarkup(
      createElement(SocialCreateCompose, {
        authorName: "Ada Lovelace",
        initialKind: "media",
      }),
    );
    expect(review).toContain('data-social-create-media-step="caption"');
    expect(review).toContain("data-social-create-preview");
    expect(review).not.toContain("data-social-create-media-next");
    expect(review).not.toContain(">Next<");
    expect(review).toContain(SOCIAL.create.caption);
    expect(review).toContain(SOCIAL.home.submit);
    expect(review).not.toContain("data-social-create-original-quality");
    expect(review).not.toContain(SOCIAL.create.dropEmpty);
    expect(review).not.toContain("data-social-create-well");

    stashSocialHomeComposerMedia([
      new File(["clip"], "clip.mp4", { type: "video/mp4" }),
    ]);
    const caption = renderToStaticMarkup(
      createElement(SocialCreateCompose, {
        authorName: "Ada Lovelace",
        initialKind: "media",
        initialStep: "caption",
      }),
    );
    expect(caption).toContain('data-social-create-kind="media"');
    expect(caption).toContain('data-social-create-media-step="caption"');
    // No visible heading: the field carries the placeholder, and the label
    // stays for screen readers only.
    expect(caption).toContain(
      `<label class="sr-only" for="social-create-body">${SOCIAL.create.caption}</label>`,
    );
    expect(caption).toContain(SOCIAL.home.submit);
    expect(caption).toContain('placeholder="Add a caption…"');
    expect(caption).not.toContain("required");
    expect(caption).not.toContain(SOCIAL.create.dropEmpty);
    expect(caption).not.toContain("data-social-create-well");
    expect(caption).not.toContain("data-social-create-media-next");
    expect(caption).toContain("data-social-create-preview");
    expect(caption).not.toContain("data-social-create-original-quality");
    expect(caption).not.toContain("data-social-create-media-next");
    expect(caption).not.toContain("data-social-create-attach");
    expect(caption).not.toContain("autofocus");
    expect(caption).not.toContain(SOCIAL.home.audienceFollowing);

    expect(src).not.toContain("SegmentedTrack");
    expect(src).not.toContain("data-social-create-kinds");
    expect(src).not.toContain("SOCIAL_CREATE_KINDS.map");
    expect(src).not.toContain("setKind");
    expect("socialCreateKind" in SEGMENTED_TRACK_PERSIST).toBe(false);
  });

  it("grows the caption to its text and scrolls the caret once the field hits 40vh", () => {
    const field = {
      ownerDocument: { documentElement: { clientHeight: 800 } },
      scrollHeight: 500,
      style: { height: "" },
      scrollTop: 0,
    } as unknown as HTMLTextAreaElement;
    fitSocialWriteComposeField(field);
    expect(field.style.height).toBe("320px");
    expect(field.scrollTop).toBe(500);

    const short = {
      ownerDocument: { documentElement: { clientHeight: 800 } },
      scrollHeight: 72,
      style: { height: "" },
      scrollTop: 0,
    } as unknown as HTMLTextAreaElement;
    fitSocialWriteComposeField(short);
    expect(short.style.height).toBe("72px");
    expect(short.scrollTop).toBe(72);
  });
});
