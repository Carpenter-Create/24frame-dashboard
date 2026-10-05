import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SocialStoryCompose, SocialStoryPostedConfirm } from "./social-story-studio";
import { housePhoneForbidsTruncate } from "@/lib/house-phone-stack";
import { SOCIAL, SOCIAL_ROUTES } from "@/lib/social";
import {
  SOCIAL_FIGMA_STORY_PICKER,
  SOCIAL_FIGMA_STORY_STUDIO,
  SOCIAL_STORY_CREATE_RAIL_CLASS,
  SOCIAL_STORY_PHOTO_CARD_CLASS,
  SOCIAL_STORY_POSTED_CTA_CLASS,
  SOCIAL_STORY_POSTED_SCRIM_CLASS,
  SOCIAL_STORY_STUDIO_CLASS,
  SOCIAL_STORY_STUDIO_PREVIEW_CLASS,
  SOCIAL_STORY_STUDIO_PREVIEW_MIRROR_CLASS,
  SOCIAL_STORY_STUDIO_REVIEW_CLASS,
  SOCIAL_STORY_VIDEO_CARD_CLASS,
  socialStoryStudioPreviewClass,
} from "@/lib/social-chrome";

// --accent read from tokens.css, so this guard follows the pending GC accent checkpoint.
const ACCENT = readFileSync("src/app/tokens.css", "utf8").match(/--accent:\s*(#[0-9a-fA-F]{6});/)?.[1];

describe("SocialStoryCompose create stage", () => {
  it("opens on two media cards and keeps Record and Upload off the first face", () => {
    const html = renderToStaticMarkup(<SocialStoryCompose displayName="Ada Lovelace" />);
    expect(html).toContain("data-social-story-rail");
    expect(html).toContain("data-social-story-stage");
    expect(html).toContain('data-social-story-face="stage"');
    expect(html).toContain("data-social-story-photo");
    expect(html).toContain("data-social-story-video");
    expect(html).toContain(SOCIAL.stories.yourStory);
    expect(html).toContain(SOCIAL.stories.photoCard);
    expect(html).toContain(SOCIAL.stories.videoCard);
    expect(html).toContain("Ada Lovelace");
    expect(html).toContain(`href="${SOCIAL_ROUTES.home}"`);
    expect(html).toContain(SOCIAL_STORY_CREATE_RAIL_CLASS);
    expect(html).toContain(SOCIAL_STORY_PHOTO_CARD_CLASS);
    expect(html).toContain(SOCIAL_STORY_VIDEO_CARD_CLASS);
    expect(html).toContain("md:w-[320px]");
    expect(html).toContain("md:h-[420px]");
    expect(html).toContain("min-h-[200px]");
    expect(html).toContain("from-accent");
    expect(html).toContain("from-ink");
    expect(html).not.toContain("shadow");
    expect(html).not.toContain("data-social-story-picker");
    expect(html).not.toContain("data-social-story-record");
    expect(html).not.toContain("data-social-story-upload");
    expect(html).not.toContain("data-social-story-photo-library");
    expect(html).not.toContain("Video only");
    expect(html).not.toContain("No photo story");
    expect(html).not.toContain("No text story");
    expect(html).not.toContain("Create a text story");
    expect(html).not.toContain("data-social-story-studio");
    expect(html).not.toContain("HouseDialog");
    expect(html).not.toContain("#1877F2");
    expect(ACCENT).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(html.toLowerCase()).not.toContain(String(ACCENT).toLowerCase());
    expect(housePhoneForbidsTruncate(html)).toBe(true);
    expect((html.match(/data-social-story-photo=/g) ?? []).length).toBe(1);
    expect((html.match(/data-social-story-video=/g) ?? []).length).toBe(1);
  });

  it("keeps MediaRecorder as the Record path and never uses OS capture", () => {
    const src = readFileSync("src/components/social/social-story-studio.tsx", "utf8");
    expect(src).toContain("navigator.mediaDevices.getUserMedia");
    expect(src).toContain("new MediaRecorder");
    expect(src).toContain("probeStoryRecorderMimeType");
    expect(src).toContain('lane", "stories"');
    expect(src).toContain("createSocialStory");
    expect(src).toContain("captureStoryStillFrame");
    expect(src).toContain("openPhotoCamera");
    expect(src).toContain("data-social-story-still-shutter");
    expect(src).not.toContain('capture="environment"');
    expect(src).not.toContain('capture="user"');
    expect(src).not.toMatch(/\scapture\s*=/);
    expect(src).toContain("data-social-story-photo-library");
    expect(src).toContain("data-social-story-photo-capture");
    const photoFace = src.slice(src.indexOf('phase === "photo"'), src.indexOf('phase === "video"'));
    expect(photoFace.indexOf("data-social-story-photo-capture")).toBeLessThan(
      photoFace.indexOf("data-social-story-photo-library"),
    );
    const photoCamera = src.slice(src.indexOf("async function openPhotoCamera"), src.indexOf("async function takeStill"));
    expect(photoCamera).toContain("SOCIAL.stories.photoUnavailable");
    expect(photoCamera).toContain("SOCIAL.stories.photoPermission");
    expect(photoCamera).not.toContain("SOCIAL.stories.unavailable");
    expect(photoCamera).not.toContain("SOCIAL.stories.permission");
    expect(src).not.toContain("data-social-story-picker");
    expect(src).not.toContain("pickerHint");
    expect(src).not.toContain("footnote");
    expect(src).not.toContain("15");
    expect(src).toContain('data-social-story-studio={phase}');
    expect(src).toContain("storyStudioIsLive");
    expect(src).toContain("storyStudioMirrorsPreview");
    expect(src).toContain("storyRecorderVideoConstraints");
    expect(src).toContain("socialStoryStudioPreviewClass");
    expect(src).toContain("new MediaRecorder(stream");
    expect(src).not.toContain("width: { ideal: 720 }");
    expect(src).not.toContain("height: { ideal: 1280 }");
    expect(src).not.toContain("captureStream");
    expect(src).not.toContain("getContext");
    expect(socialStoryStudioPreviewClass(true)).toBe(
      `${SOCIAL_STORY_STUDIO_PREVIEW_CLASS} ${SOCIAL_STORY_STUDIO_PREVIEW_MIRROR_CLASS}`,
    );
    expect(socialStoryStudioPreviewClass(false)).toBe(SOCIAL_STORY_STUDIO_PREVIEW_CLASS);
    expect(SOCIAL_STORY_STUDIO_PREVIEW_CLASS).toContain("absolute inset-0");
    expect(SOCIAL_STORY_STUDIO_PREVIEW_CLASS).toContain("object-cover");
    expect(SOCIAL_STORY_STUDIO_PREVIEW_CLASS).not.toContain("object-contain");
    expect(src).not.toContain("SOCIAL_STORY_STUDIO_RING_CLASS");
    expect(src).toContain('phase === "recording" ? clock');
    expect(src).toContain("data-social-story-camera-close");
    expect(src).toContain("data-social-story-flash");
    expect(src).toContain("data-social-story-gallery");
    expect(src).toContain("data-social-story-flip");
    expect(src).toContain("data-social-story-mode");
    expect(src).toContain("openRoll");
    expect(src).toContain('setPhase(photo ? "photo" : "video")');
    expect(src).toContain("storyCameraSupportsTorch");
    expect(src).not.toContain("Boomerang");
    expect(src).not.toContain("REELS");
    expect(src).not.toContain("data-social-story-tools");
    const chrome = readFileSync("src/lib/social-chrome.ts", "utf8");
    expect(chrome).toContain("size-[72px]");
    expect(chrome).toContain("border-4");
    expect(chrome).toContain("size-14");
    expect(chrome).toContain("size-12");
    expect(chrome).not.toContain("SOCIAL_STORY_STUDIO_RING_CLASS");
    expect(chrome).not.toContain("size-[280px]");
    expect(SOCIAL_STORY_STUDIO_PREVIEW_MIRROR_CLASS).toBe("-scale-x-100");
    expect(SOCIAL_STORY_STUDIO_REVIEW_CLASS).toContain("object-cover");
    expect(SOCIAL_STORY_STUDIO_REVIEW_CLASS).not.toContain("scale-x");
    expect(SOCIAL_FIGMA_STORY_STUDIO).toEqual([
      "146:230",
      "146:1050",
      "146:1072",
      "146:1099",
      "146:1125",
      "146:1147",
      "146:1173",
      "147:251",
    ]);
    expect(SOCIAL_FIGMA_STORY_PICKER).toEqual(["144:1218", "144:1444"]);
  });

  it("keeps the just-posted clip and hides the create rail on one studio host", () => {
    const src = readFileSync("src/components/social/social-story-studio.tsx", "utf8");
    const post = src.slice(src.indexOf("async function postClip"));
    expect(post).toContain('setPhase("posted")');
    expect(post).toContain("releasePreview()");
    expect(post).not.toContain("releaseClip(");
    expect(src).not.toContain("SOCIAL_STORY_POSTED_CLASS");
    expect(src).not.toContain("check-circle");
    expect(src).toContain("const postedStudio = phase === \"posted\" && clip != null");
    expect(src).toContain("const immersive = videoStudio || postedStudio");
    expect(src).toContain("{immersive ? null : (");
    expect(src).toContain("<SocialStoryPostedConfirm");
    const css = readFileSync("src/app/globals.css", "utf8");
    expect(css).toContain('html:has([data-social-story-studio="posted"]) [data-house-lead-stack]');
    expect(css).toContain('html:has([data-social-story-studio="posted"]) [data-house-phone-bottom-nav]');
    expect(css).toContain("display: none");
  });
});

describe("SocialStoryPostedConfirm", () => {
  it("paints a library video on the immersive studio without the thin check card", () => {
    const html = renderToStaticMarkup(
      <SocialStoryPostedConfirm url="blob:library-video" kind="video" />,
    );
    expect(html).toContain('data-social-story-studio="posted"');
    expect(html).toContain('data-social-story-posted-media=""');
    expect(html).toContain('src="blob:library-video"');
    expect(html).toContain("<video");
    expect(html).toContain("muted");
    expect(html).toContain("loop");
    expect(html).toContain(SOCIAL_STORY_STUDIO_CLASS);
    expect(html).toContain(SOCIAL_STORY_STUDIO_REVIEW_CLASS);
    expect(html).toContain("object-cover");
    expect(html).toContain(SOCIAL_STORY_POSTED_SCRIM_CLASS);
    expect(html).toContain(SOCIAL_STORY_POSTED_CTA_CLASS);
    expect(html).toContain("h-[var(--space-12)]");
    expect(html).toContain("bg-accent");
    expect(html).not.toContain("shadow");
    expect(html).toContain("size-10");
    expect(html).not.toContain("max-w-[326px]");
    expect(html).not.toContain("check-circle");
    expect(html).not.toContain("data-social-story-rail");
    expect(html).not.toContain(SOCIAL.stories.yourStory);
    expect(html).not.toContain(SOCIAL.stories.postedHint);
    expect(html).toContain(SOCIAL.stories.posted);
    expect(html).toContain(SOCIAL.stories.viewStories);
    expect((html.match(/Story posted/g) ?? []).length).toBe(1);
    expect((html.match(/href="\/social"/g) ?? []).length).toBe(2);
    expect(html).toContain(`href="${SOCIAL_ROUTES.home}"`);
    expect(housePhoneForbidsTruncate(html)).toBe(true);
  });

  it("paints a still on the same confirm host", () => {
    const html = renderToStaticMarkup(
      <SocialStoryPostedConfirm url="blob:still" kind="image" />,
    );
    expect(html).toContain("<img");
    expect(html).not.toContain("<video");
    expect(html).toContain('src="blob:still"');
    expect(html).toContain('data-social-story-studio="posted"');
    expect(html).toContain('data-social-story-posted-media=""');
    expect(html).toContain(SOCIAL_STORY_STUDIO_REVIEW_CLASS);
    expect(html).toContain(SOCIAL.stories.viewStories);
    expect(html).not.toContain("max-w-[326px]");
    expect(html).not.toContain("data-social-story-rail");
    expect(html).not.toContain(SOCIAL.stories.postedHint);
  });
});
