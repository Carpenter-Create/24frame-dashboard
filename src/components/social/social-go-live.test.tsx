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
  SOCIAL_GO_LIVE_CAMERA_MENU_CLASS,
  SOCIAL_GO_LIVE_FRAME_SWITCH_CLASS,
  SOCIAL_GO_LIVE_FULL_VIDEO_CLASS,
  SOCIAL_GO_LIVE_STAGE_FULL_CLASS,
  SOCIAL_GO_LIVE_STAGE_REEL_CLASS,
} from "@/lib/social-chrome";

const src = readFileSync("src/components/social/social-go-live.tsx", "utf8");
const page = readFileSync("src/app/(app)/social/live/page.tsx", "utf8");
const loading = readFileSync("src/app/(app)/social/live/loading.tsx", "utf8");
const fan = readFileSync("src/components/social/social-create-fan.tsx", "utf8");
const sheet = readFileSync("src/components/social/social-create-compose.tsx", "utf8");

describe("Social Go live recorder", () => {
  it("records in-app then posts on the normal video path with an 8:00 cap", () => {
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
    const clock = src.slice(src.indexOf("function startClock()"), src.indexOf("function beginRecording"));
    expect(clock).toContain("goLiveReachedCap");
    expect(clock).toContain("stopRecording()");
    const dataAt = src.indexOf("recorder.ondataavailable = (event)");
    const chunks = src.slice(dataAt, src.indexOf("recorder.onstop", dataAt));
    expect(chunks).toContain("goLiveReachedCap");
    expect(chunks).toContain("stopRecording()");
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
  it("opens on 16:9 with a 16:9 | 9:16 switch above record, desktop only", () => {
    const html = renderToStaticMarkup(createElement(SocialGoLive));
    expect(html).toContain('data-social-go-live-frame-stage="full"');
    expect(html).toContain(`class="${SOCIAL_GO_LIVE_STAGE_FULL_CLASS}"`);
    expect(html).toContain(`class="${SOCIAL_GO_LIVE_FULL_VIDEO_CLASS}`);
    const group = html.slice(html.indexOf('role="radiogroup"') - 200, html.indexOf("data-social-go-live-record"));
    expect(group).toContain(`aria-label="${SOCIAL.create.liveFrame}"`);
    expect(group).toContain(`class="${SOCIAL_GO_LIVE_FRAME_SWITCH_CLASS}"`);
    expect(SOCIAL_GO_LIVE_FRAME_SWITCH_CLASS).toContain("hidden");
    expect(SOCIAL_GO_LIVE_FRAME_SWITCH_CLASS).toContain("md:inline-flex");
    expect(group).toMatch(/role="radio" aria-checked="true" data-social-go-live-frame-option="full"[^>]*>16:9</);
    expect(group).toMatch(/role="radio" aria-checked="false" data-social-go-live-frame-option="reel"[^>]*>9:16</);
    expect(html.indexOf("data-social-go-live-frame=")).toBeLessThan(html.indexOf("data-social-go-live-record"));
    // Adam 2026-10-08: "shouldn't full camera on computer be full screen
    // like zoom", then "the camera should be that, look like that". Each
    // frame is its exact shape on a computer: 16:9 as large as the window
    // allows (no edge or radius), 9:16 at the studio height with its width
    // following. The video covers each; the phone keeps the full screen.
    expect(SOCIAL_GO_LIVE_STAGE_FULL_CLASS).toContain("h-full w-full");
    expect(SOCIAL_GO_LIVE_STAGE_FULL_CLASS).toContain("md:aspect-video md:h-auto md:w-[min(100vw,calc(100dvh*16/9))]");
    expect(SOCIAL_GO_LIVE_STAGE_FULL_CLASS).not.toMatch(/rounded|border/);
    expect(SOCIAL_GO_LIVE_STAGE_REEL_CLASS).toContain("md:aspect-[9/16] md:h-[min(746px,90dvh)] md:w-auto");
    expect(src).toContain('className={frame === "reel" ? SOCIAL_GO_LIVE_STAGE_REEL_CLASS : SOCIAL_GO_LIVE_STAGE_FULL_CLASS}');
    expect(SOCIAL_GO_LIVE_FULL_VIDEO_CLASS).toBe("absolute inset-0 size-full object-cover");
    expect(src).not.toContain("--go-live-aspect");
    // The phone always records its own frame; the switch is desktop only.
    expect(src).toContain('const frame: GoLiveFrame = desktop ? frameChoice : "full";');
    // Only before recording.
    expect(src).toMatch(/\{phase === "preview" \? \(\s*<div\s+role="radiogroup"/);
  });

  it("records the switch's shape on a computer (16:9 or 9:16), the phone's own frame on a phone", () => {
    expect(src).toMatch(
      /cutRef\.current = desktop\s*\?\s*frameRecording\(source, videoRef\.current, frame\)\s*:\s*null;/,
    );
    expect(src).toContain("const stream = cutRef.current?.stream ?? source;");
    expect(src).toContain("goLiveFrameCut(video.videoWidth, video.videoHeight, shape)");
    // The camera is asked for 16:9 HD on a computer, read at call time.
    expect(src).toContain("const desktopNow = isHouseDesktop();");
    expect(src).toContain("openCamera(goLiveVideoConstraints(nextFacing, desktopNow, deviceId, frameRef.current))");
    // Drawn at the standard size when the camera has the detail (down, never up).
    expect(src).toContain("canvas.width = crop.dw;");
    expect(src).toContain("canvas.height = crop.dh;");
    expect(src).toContain("context.drawImage(video, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, crop.dw, crop.dh)");
    expect(src).toContain('context.imageSmoothingQuality = "high";');
    expect(src).toContain("canvas.captureStream(30)");
    expect(src).toContain("for (const track of source.getAudioTracks()) stream.addTrack(track);");
    const onstop = src.slice(src.indexOf("recorder.onstop = () => {"), src.indexOf("recorder.start(1000)"));
    expect(onstop.indexOf("stopCut();")).toBeGreaterThan(-1);
    const release = src.slice(src.indexOf("function releasePreview()"), src.indexOf("function releaseClip()"));
    expect(release).toContain("stopCut();");
    // The camera's audio is not stopped by the cut.
    const reel = src.slice(src.indexOf("function frameRecording("), src.indexOf("async function uploadLiveVideo("));
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

  // §Camera picker (Adam 2026-10-08: "yes, build the camera picker").
  it("on a computer, the top-right control picks the camera; the phone keeps flip", () => {
    const chrome = src.slice(src.indexOf("{desktop ? ("), src.indexOf("{phase === \"recording\" ? ("));
    const picker = chrome.slice(0, chrome.indexOf(") : ("));
    const phone = chrome.slice(chrome.indexOf(") : ("));
    expect(picker).toContain("<DropdownMenu>");
    // The Feed composer's shipped word "Camera", no new copy.
    expect(picker).toContain("aria-label={SOCIAL.home.composerCamera}");
    expect(picker).toContain('name="video-camera"');
    expect(picker).toContain('disabled={phase !== "preview" || opening || cameras.length === 0}');
    expect(picker).toContain("<MenuSurfaceContent align=\"end\" className={SOCIAL_GO_LIVE_CAMERA_MENU_CLASS}>");
    expect(picker).toContain("<DropdownMenuRadioGroup value={activeCamera} onValueChange={(id) => void chooseCamera(id)}>");
    expect(picker).toContain("<MenuSurfaceRadioItem");
    expect(picker).toContain('name="check"');
    expect(picker).not.toContain("flipCamera");
    expect(phone).toContain("aria-label={SOCIAL.stories.flipCamera}");
    expect(phone).toContain("onClick={() => void flipCamera()}");
    // The first render (server, and the phone) shows flip, not the picker.
    const html = renderToStaticMarkup(createElement(SocialGoLive));
    expect(html).toContain(`aria-label="${SOCIAL.stories.flipCamera}"`);
    expect(html).not.toContain("data-social-go-live-camera=");
    // Names wrap, never truncate.
    expect(SOCIAL_GO_LIVE_CAMERA_MENU_CLASS).not.toMatch(/truncate|ellipsis/);
    expect(SOCIAL.home.composerCamera).toBe("Camera");
    expect(SOCIAL.create).not.toHaveProperty("liveCamera");
  });

  it("opens the remembered camera, falls back to the default when it is gone, and lists what streams", () => {
    // Read before the first open, and found by id or by name among the cameras here now.
    const mount = src.slice(src.indexOf("mimeRef.current = probed.mimeType;"));
    const pick = "cameraIdRef.current = (findGoLiveCamera(remembered, await listCameras()) ?? remembered).id;";
    expect(mount).toContain("const remembered = readGoLiveCamera();");
    expect(mount.indexOf(pick)).toBeGreaterThan(-1);
    expect(mount.indexOf(pick)).toBeLessThan(mount.indexOf("await ensurePreview(facing);"));
    // A chosen camera that cannot open (an iPhone out of reach) gives way to the default.
    const acquire = src.slice(src.indexOf("async function acquireStream("), src.indexOf("async function openCamera("));
    expect(acquire).toMatch(
      /catch \(failure\) \{\s*if \(!desktopNow \|\| !deviceId \|\| !orDefault\) throw failure;(\s*\/\/[^\n]*\n)+\s*return openCamera\(goLiveVideoConstraints\(nextFacing, desktopNow, null, frameRef\.current\)\);/,
    );
    // The check marks the camera actually streaming, not the one asked for.
    expect(src).toContain('setActiveCamera(track?.getSettings().deviceId ?? "");');
    expect(src).toContain("return goLiveCameras(devices, SOCIAL.home.composerCamera);");
    const attach = src.slice(src.indexOf("async function attachPreview("), src.indexOf("function ensurePreview("));
    expect(attach).toContain("void refreshCameras();");
    // A pick is remembered only once it opens; a failed pick restores the last
    // camera, not the default (Codex #791: the default fallback is for the
    // remembered camera only).
    const choose = src.slice(src.indexOf("async function chooseCamera("), src.indexOf("function startClock()"));
    expect(choose).toContain(
      'if (phase !== "preview" || recordingRef.current || attachPromiseRef.current || id === activeCamera) return;',
    );
    expect(choose).toContain("const opened = await attachPreview(facing, live, id, false);");
    expect(choose).toContain("if (opened && camera) rememberGoLiveCamera(camera);");
    expect(choose).toContain("cameraIdRef.current = previous;");
    expect(choose).toContain("return await attachPreview(facing, live, previous);");
    expect(acquire).toContain("if (!desktopNow || !deviceId || !orDefault) throw failure;");
    // New cameras (an iPhone in reach, a webcam plugged in) join the list.
    expect(src).toContain('media.addEventListener("devicechange", onChange);');
    expect(src).toContain('return () => media.removeEventListener("devicechange", onChange);');
  });

  // Codex and Bugbot #791: a pick followed at once by Record (or a second
  // pick, or a pick while the camera reopens after Record again) must not
  // open two cameras, leave a superseded one running, or fail a waiting Record.
  it("one camera open at a time: every open is tracked, the controls wait, a late open is stopped", () => {
    const attach = src.slice(src.indexOf("async function attachPreview("), src.indexOf("function trackOpen("));
    expect(attach).toContain("const attach = ++attachSeqRef.current;");
    expect(attach).toMatch(
      /if \(attach !== attachSeqRef\.current \|\| !storyStudioIsLive\(liveRef\.current, live\)\) \{\s*stopStream\(stream\);\s*return false;/,
    );
    // The one tracker: the pending open, and the opening state.
    const track = src.slice(src.indexOf("function trackOpen("), src.indexOf("function ensurePreview("));
    expect(track).toContain("attachPromiseRef.current = pending;");
    expect(track).toContain("setOpening(true);");
    expect(track).toMatch(/if \(attachPromiseRef\.current !== pending\) return;\s*attachPromiseRef\.current = null;\s*if \(aliveRef\.current\) setOpening\(false\);/);
    expect(track).toContain("void pending.then(settle, settle);");
    // Every open goes through it: the first open and reopen, a pick, a flip.
    const ensure = src.slice(src.indexOf("function ensurePreview("), src.indexOf("useEffect(", src.indexOf("function ensurePreview(")));
    expect(ensure).toContain("if (attachPromiseRef.current) return attachPromiseRef.current;");
    expect(ensure).toContain("return trackOpen(");
    const choose = src.slice(src.indexOf("async function chooseCamera("), src.indexOf("function startClock()"));
    expect(choose).toContain("await trackOpen(");
    const flip = src.slice(src.indexOf("async function flipCamera("), src.indexOf("// An iPhone coming in reach"));
    expect(flip).toContain('if (phase !== "preview" || recordingRef.current || attachPromiseRef.current) return;');
    expect(flip).toContain("await trackOpen(");
    // The controls wait while any open is in flight.
    const record = src.slice(src.indexOf('data-social-go-live-record=""'), src.indexOf('data-social-go-live-record=""') + 400);
    expect(record).toContain("disabled={opening}");
    expect(src).toContain('disabled={phase !== "preview" || opening}\n              onClick={() => void flipCamera()}');
    expect(src).not.toContain("switching");
  });

  // Adam 2026-10-08: "build the upgrade". 9:16 asks the camera for up to 4K
  // (16:9 for HD), so switching frames reopens the camera, through the one
  // tracked open, with the switch held while it opens.
  it("a frame switch asks the camera again for that frame's size, through the tracked open", () => {
    const choose = src.slice(src.indexOf("async function chooseFrame("), src.indexOf("function startClock()"));
    expect(choose).toContain(
      'if (next === frameChoice || phase !== "preview" || recordingRef.current || attachPromiseRef.current) return;',
    );
    expect(choose.indexOf("frameRef.current = next;")).toBeLessThan(choose.indexOf("await trackOpen("));
    expect(choose).toContain("if (!streamRef.current) return;");
    // Bugbot #792: a reopen that fails restores the last frame and its ask,
    // and reopens with it; the viewfinder is never left dark.
    expect(choose).toMatch(
      /catch \{(\s*\/\/[^\n]*\n)+\s*setFrameChoice\(previous\);\s*frameRef\.current = previous;\s*if \(!storyStudioIsLive\(liveRef\.current, live\)\) return false;\s*try \{\s*return await attachPreview\(facing, live\);/,
    );
    expect(choose).toContain("const previous = frameChoice;");
    const options = src.slice(src.indexOf("data-social-go-live-frame-option={option}"), src.indexOf("data-social-go-live-record"));
    expect(options).toContain("disabled={opening}");
    expect(options).toContain("onClick={() => void chooseFrame(option)}");
    expect(src).not.toContain("onClick={() => setFrameChoice(option)}");
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
