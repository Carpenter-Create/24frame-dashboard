import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  usePathname: () => "/social/live",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next/link", async () => {
  const React = await import("react");
  function MockLink({ href, children, ...props }: { href: string; children?: React.ReactNode }) {
    return React.createElement("a", { href, ...props }, children);
  }
  return { __esModule: true, default: MockLink };
});

import { SocialGoLive } from "./social-go-live";
import { SocialPostMedia } from "./social-post-media";
import { SOCIAL } from "@/lib/social";
import {
  SOCIAL_GO_LIVE_FRAME_SWITCH_CLASS,
  SOCIAL_GO_LIVE_FULL_VIDEO_CLASS,
  SOCIAL_GO_LIVE_STAGE_FULL_CLASS,
  SOCIAL_STORY_STUDIO_STAGE_CLASS,
} from "@/lib/social-chrome";

const src = readFileSync("src/components/social/social-go-live.tsx", "utf8");
const page = readFileSync("src/app/(app)/social/live/page.tsx", "utf8");
const loading = readFileSync("src/app/(app)/social/live/loading.tsx", "utf8");
const fan = readFileSync("src/components/social/social-create-fan.tsx", "utf8");
const sheet = readFileSync("src/components/social/social-create-compose.tsx", "utf8");

describe("Social Go live recorder", () => {
  it("records in-app then posts on the normal video path with a 10:00 cap", () => {
    expect(page).toContain("SocialGoLive");
    expect(page).toContain("data-social-go-live-page");
    expect(src).toContain("data-social-go-live");
    expect(src).toContain("data-social-go-live-timer");
    expect(src).toContain("MediaRecorder");
    expect(src).toContain("persistSocialPost");
    expect(src).toContain("runSocialOptimisticMutation");
    expect(src).toContain("uploadSocialPostMedia");
    expect(src).toContain('intent: "live"');
    expect(src).toContain("goLiveReachedCap");
    expect(src).toContain("goLiveFitsByteCap(used + event.data.size");
    expect(src).toContain("new MediaRecorder(stream, { mimeType: probed.raw })");
    expect(src).toContain("aliveRef");
    expect(src).toContain("attachPromiseRef");
    expect(src).toContain("ensurePreview");
    expect((src.match(/liveRef\.current = nextStoryStudioLive/g) ?? []).length).toBe(1);
    expect(src).toContain("releaseCamera");
    expect(src).not.toContain("await createSocialPost");
    expect(src).not.toMatch(/persistSocialPost\(started.form\);[\s\S]{0,120}catch/);
    expect(src).toContain("SOCIAL_GO_LIVE_MAX_MS");
    expect(src).toContain("HouseVoiceMic");
    expect(src).toContain('surface="dictate"');
    expect(src).not.toContain("LiveStream");
    expect(src).not.toContain("IVS");
    expect(src).not.toContain("WebRTC");
    expect(src).not.toContain("liveHint");
    expect(src).not.toContain("Record up to 10 minutes");
    expect("liveHint" in SOCIAL.create).toBe(false);
    expect(src).toContain("SOCIAL.create.goLive");
    expect(src).toContain("SOCIAL.stories.flipCamera");
    expect(src).toContain("data-social-go-live-record");
    expect(src).toContain("data-social-go-live-close");
    expect(src).toContain("takeSocialGoLiveExitHref()");
    expect(src).toContain("router.replace(takeSocialGoLiveExitHref())");
    expect(src).toContain("clearSocialGoLiveOpener()");
    expect(src).not.toContain("href={SOCIAL_ROUTES.create}");
    expect(src).not.toContain('href="/social/create"');
    expect(loading).toContain("data-house-rsc-fallback");
    expect(loading).toContain("data-social-go-live-page");
    expect(loading).not.toContain("SocialCreateSkeleton");
    expect(loading).not.toContain("Share something");
    expect(fan).toContain("rememberSocialGoLiveOpener");
    expect(sheet).toContain("rememberSocialGoLiveOpener");
    const fanMedia = fan.slice(fan.indexOf('tile.id === "media"'), fan.indexOf('tile.id === "live"'));
    expect(fanMedia).toContain("openPicker()");
    expect(fanMedia).not.toContain("rememberSocialGoLiveOpener");
    const fanLive = fan.slice(fan.indexOf('if (tile.id === "live")'));
    expect(fanLive.indexOf("rememberSocialGoLiveOpener")).toBeGreaterThan(-1);
    expect(fanLive.indexOf("rememberSocialGoLiveOpener")).toBeLessThan(fanLive.indexOf("closeFan()"));
  });

  // docs/design-locks/social-go-live-camera-chrome-lock-v1.md §Desktop frame
  // (Adam 2026-10-08): "default to the normal view that opens on the device
  // (full width on computer) but provide a simple option/switch to do reel
  // sized camera (on computer)".
  it("opens on the full frame with a Full | Reel switch above record, desktop only", () => {
    const html = renderToStaticMarkup(createElement(SocialGoLive));
    expect(html).toContain('data-social-go-live-frame-stage="full"');
    expect(html).toContain(`class="${SOCIAL_GO_LIVE_STAGE_FULL_CLASS}"`);
    expect(html).toContain(`class="${SOCIAL_GO_LIVE_FULL_VIDEO_CLASS}`);
    const group = html.slice(html.indexOf('role="radiogroup"') - 200, html.indexOf("data-social-go-live-record"));
    expect(group).toContain(`aria-label="${SOCIAL.create.liveFrame}"`);
    expect(group).toContain(`class="${SOCIAL_GO_LIVE_FRAME_SWITCH_CLASS}"`);
    expect(SOCIAL_GO_LIVE_FRAME_SWITCH_CLASS).toContain("hidden");
    expect(SOCIAL_GO_LIVE_FRAME_SWITCH_CLASS).toContain("md:inline-flex");
    expect(group).toMatch(/role="radio" aria-checked="true" data-social-go-live-frame-option="full"[^>]*>Full</);
    expect(group).toMatch(/role="radio" aria-checked="false" data-social-go-live-frame-option="reel"[^>]*>Reel</);
    expect(html.indexOf("data-social-go-live-frame=")).toBeLessThan(html.indexOf("data-social-go-live-record"));
    // Full keeps the camera's shape; Reel is the 9:16 studio stage.
    expect(SOCIAL_GO_LIVE_STAGE_FULL_CLASS).toContain("md:aspect-[var(--go-live-aspect)]");
    expect(SOCIAL_GO_LIVE_FULL_VIDEO_CLASS).toContain("md:object-contain");
    expect(SOCIAL_STORY_STUDIO_STAGE_CLASS).toContain("md:w-[420px]");
    // The phone always records its own frame; the switch is desktop only.
    expect(src).toContain('const frame: GoLiveFrame = desktop ? frameChoice : "full";');
    // Only before recording.
    expect(src).toMatch(/\{phase === "preview" \? \(\s*<div\s+role="radiogroup"/);
  });

  it("records the reel as the 9:16 cut it shows, and stops the cut with the recorder", () => {
    expect(src).toContain('reelRef.current = frame === "reel" ? reelRecording(source, videoRef.current) : null;');
    expect(src).toContain("const stream = reelRef.current?.stream ?? source;");
    expect(src).toContain("goLiveReelCrop(video.videoWidth, video.videoHeight)");
    expect(src).toContain("context.drawImage(video, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, crop.sw, crop.sh)");
    expect(src).toContain("canvas.captureStream(30)");
    expect(src).toContain("for (const track of source.getAudioTracks()) stream.addTrack(track);");
    const onstop = src.slice(src.indexOf("recorder.onstop = () => {"), src.indexOf("recorder.start(1000)"));
    expect(onstop.indexOf("stopReel();")).toBeGreaterThan(-1);
    const release = src.slice(src.indexOf("function releasePreview()"), src.indexOf("function releaseClip()"));
    expect(release).toContain("stopReel();");
    // The camera's audio is not stopped by the cut.
    const reel = src.slice(src.indexOf("function reelRecording("), src.indexOf("async function uploadLiveVideo("));
    expect(reel).toContain("for (const track of stream.getVideoTracks()) track.stop();");
    expect(reel).not.toContain("getAudioTracks()) track.stop");
  });

  // Adam 2026-10-08: "I'd like the caption box to be more of a clear
  // experience like IG, record again and post video both to use an icon,
  // and "posting" to show a blue progress bar."
  it("reviews with the caption on the clip, icon actions, and a blue upload bar", () => {
    const review = src.slice(src.indexOf('{phase === "review" ? ('), src.indexOf("{error ? ("));
    expect(review).toContain("className={SOCIAL_GO_LIVE_REVIEW_CLASS}");
    expect(review).toContain("className={SOCIAL_GO_LIVE_CAPTION_FIELD_CLASS}");
    expect(review).not.toContain("HOUSE_VOICE_FIELD_HOST_CLASS");
    expect(review).toContain('name="arrow-counter-clockwise"');
    expect(review).toContain("aria-label={SOCIAL.create.liveRetake}");
    expect(review).toContain('name="arrow-up"');
    expect(review).toContain("aria-label={posting ? SOCIAL.stories.posting : SOCIAL.create.livePost}");
    // No words on the buttons: the glyphs, and the bar while posting.
    expect(review).not.toMatch(/>\s*\{SOCIAL\.create\.liveRetake\}\s*</);
    expect(review).not.toMatch(/>\s*\{posting \? SOCIAL\.stories\.posting : SOCIAL\.create\.livePost\}\s*</);
    expect(review).toContain('role="progressbar"');
    expect(review).toContain("aria-valuenow={postPercent}");
    expect(review).toContain("className={SOCIAL_GO_LIVE_PROGRESS_FILL_CLASS} style={{ width: `${postPercent}%` }}");
    expect(src).toContain("if (progress.percent != null) onPercent(progress.percent);");
    // The clip loops under the caption with no native control bar; a tap
    // pauses or plays; sound where the browser allows, muted where not.
    const clipTag = src.slice(src.indexOf("data-social-go-live-review-clip"), src.indexOf("/>", src.indexOf("data-social-go-live-review-clip")));
    expect(clipTag).toContain("autoPlay");
    expect(clipTag).toContain("loop");
    expect(clipTag).not.toContain("controls");
    expect(src).toContain("node.muted = true;");
    expect(src).toContain("if (aliveRef.current) setUploadPercent(percent);");
  });

  // Lock §Review: "Both buttons and the caption are inert while posting."
  it("keeps the caption inert while posting: no dictation, and Post's words are what publish", () => {
    const review = src.slice(src.indexOf('{phase === "review" ? ('), src.indexOf("{error ? ("));
    expect(review).toMatch(/\{posting \? null : \(\s*<HouseVoiceMic/);
    const post = src.slice(src.indexOf("async function postClip()"), src.indexOf("runSocialOptimisticMutation({", src.indexOf("async function postClip()")));
    expect(post.indexOf("const caption = body;")).toBeGreaterThan(-1);
    expect(post.indexOf("const caption = body;")).toBeLessThan(post.indexOf("await uploadLiveVideo("));
    expect(post).toContain("text: caption,");
    expect(post).toContain("body: caption,");
    // Nothing after the snapshot reads the live field.
    expect(post.replace("const caption = body;", "").replace("body: caption,", "")).not.toMatch(/\bbody\b/);
  });

  it("posts as the one author every Social path uses (the shell's), not \"You\"", () => {
    expect(src).toContain("const author = useSocialCompose()?.author;");
    expect(src).toContain("authorName: author?.name ?? SOCIAL.home.you,");
    expect(src).toContain("authorPhotoUrl: author?.photoUrl ?? null,");
  });

  // Adam 2026-10-08: "when the video posts, the video does not show until
  // the page is refreshed." Mux is still preparing the asset; the card plays
  // the poster's own clip from the device until the next load.
  it("plays a just-posted clip from the device in its card, not through Mux", () => {
    const local = renderToStaticMarkup(
      createElement(SocialPostMedia, {
        items: [{ kind: "video", url: "blob:https://app.24frame.co/clip", playbackId: "a".repeat(40), playbackPolicy: "signed" }],
        onOpen: () => undefined,
      }),
    );
    expect(local).toContain("data-social-feed-video-local");
    expect(local).toContain('src="blob:https://app.24frame.co/clip"');
    expect(local).toContain("controls");
    expect(local).not.toContain("data-social-post-play-disc");
    const server = renderToStaticMarkup(
      createElement(SocialPostMedia, {
        items: [{ kind: "video", url: "", playbackId: "a".repeat(40), playbackPolicy: "public" }],
        onOpen: () => undefined,
      }),
    );
    expect(server).not.toContain("data-social-feed-video-local");
    expect(server).toContain("data-social-post-play-disc");
  });
});
