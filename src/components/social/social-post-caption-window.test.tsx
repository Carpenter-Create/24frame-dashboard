import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const host = vi.hoisted(() => ({ desktop: false }));

vi.mock("@/components/chrome/house-overlay", async (importActual) => ({
  ...(await importActual<typeof import("@/components/chrome/house-overlay")>()),
  useHouseDesktop: () => host.desktop,
}));

import { HOUSE_DIALOG_WINDOW_CLASS } from "@/lib/house-overlay";
import { type SocialPostMediaItem } from "@/lib/social-author-post-card";
import {
  SOCIAL_WRITE_COMPOSE_DIALOG_FIELD_CLASS,
  SOCIAL_WRITE_COMPOSE_DIALOG_PREVIEW_CLASS,
} from "@/lib/social-write-compose-sheet";
import { SocialPostCaptionWindow } from "./social-post-caption-window";

// Edit caption: the house window over the post
// (docs/design-locks/social-post-caption-window-lock-v1.md).

const windowSrc = readFileSync("src/components/social/social-post-caption-window.tsx", "utf8");

const PHOTO: SocialPostMediaItem = { kind: "image", url: "/api/social/media?key=posts/u1/a.jpg" };
const VIDEO: SocialPostMediaItem = {
  kind: "video",
  url: "",
  playbackId: "abc12345xx",
  playbackPolicy: "public",
};

function render({
  desktop = true,
  media = [] as SocialPostMediaItem[],
  initialError = "",
}: { desktop?: boolean; media?: SocialPostMediaItem[]; initialError?: string } = {}) {
  host.desktop = desktop;
  return renderToStaticMarkup(
    <SocialPostCaptionWindow
      authorName="Ada Lovelace"
      authorPhotoUrl={null}
      media={media}
      hasMedia={media.length > 0}
      baseline="hello from the set"
      initialDraft="hello from the set"
      initialError={initialError}
      waiting={false}
      requestRef={{ current: null }}
      onSave={() => undefined}
      onClose={() => undefined}
    />,
  );
}

function textarea(html: string): string {
  return html.match(/<textarea[^>]*>[^<]*<\/textarea>/)?.[0] ?? "";
}

describe("Edit caption window (social-post-caption-window-lock-v1)", () => {
  it("is the house 600 window on a computer: ✕ · Edit caption · Done", () => {
    const html = render();
    expect(html).toContain('data-house-overlay-host="house-dialog"');
    for (const token of HOUSE_DIALOG_WINDOW_CLASS.split(" ")) expect(html).toContain(token);
    expect(html).toContain("data-social-caption-edit-window");
    expect(html).toMatch(/<button[^>]*data-social-caption-edit-close=""[^>]*aria-label="Close"/);
    expect(html).toMatch(/<h2[^>]*>Edit caption<\/h2>/);
    expect(html).toMatch(/<button[^>]*data-social-caption-edit-done=""[^>]*>Done<\/button>/);
    expect(html).not.toContain('data-house-overlay-host="app-sheet"');
    // One face: never a Back in the header.
    expect(html).not.toContain("data-social-caption-edit-back");
  });

  it("holds the avatar beside the caption in the composer's type, with no Save or Cancel", () => {
    const html = render();
    expect(html).not.toContain(">Save<");
    expect(html).not.toContain(">Cancel<");
    expect(html.indexOf("data-social-avatar")).toBeGreaterThan(-1);
    expect(html.indexOf("data-social-avatar")).toBeLessThan(html.indexOf("<textarea"));
    const field = textarea(html);
    expect(field).toContain("data-social-caption-edit-field");
    expect(field).toContain(">hello from the set</textarea>");
    expect(field).toMatch(/maxlength="2000"/i);
    expect(field).toContain('placeholder="Add a caption…"');
    for (const token of SOCIAL_WRITE_COMPOSE_DIALOG_FIELD_CLASS.split(" ")) expect(field).toContain(token);
    const id = field.match(/ id="([^"]+)"/)?.[1];
    expect(id).toBeTruthy();
    expect(html).toContain(`<label class="sr-only" for="${id}">Edit caption</label>`);
    // No error until Done finds one.
    expect(field).not.toContain("aria-invalid");
    expect(field).not.toContain("aria-describedby");
    // Every rendered id is unique.
    const ids = [...html.matchAll(/ id="([^"]+)"/g)].map((match) => match[1]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("is the same window as the full AppSheet on a phone", () => {
    const html = render({ desktop: false });
    expect(html).toContain('data-house-overlay-host="app-sheet"');
    expect(html).toContain('data-app-sheet-span="full"');
    expect(html).not.toContain('data-house-overlay-host="house-dialog"');
    expect(html).toContain("pt-[env(safe-area-inset-top)]");
    expect(html).toMatch(/<h2[^>]*>Edit caption<\/h2>/);
    expect(html).toMatch(/<button[^>]*data-social-caption-edit-close=""[^>]*aria-label="Close"/);
    expect(html).toMatch(/<button[^>]*data-social-caption-edit-done=""[^>]*>Done<\/button>/);
    expect(textarea(html)).toContain(">hello from the set</textarea>");
  });

  it("shows the post's media under the caption, read-only", () => {
    const html = render({ media: [PHOTO, VIDEO] });
    const list = html.slice(html.indexOf("data-social-caption-edit-media"));
    expect(html.indexOf("<textarea")).toBeLessThan(html.indexOf("data-social-caption-edit-media"));
    expect(list.match(new RegExp(`class="${SOCIAL_WRITE_COMPOSE_DIALOG_PREVIEW_CLASS.replace(/[[\]()]/g, "\\$&")}"`, "g"))?.length).toBe(2);
    expect(list).toMatch(/<img[^>]*alt="Photo"/);
    expect(list).toMatch(/role="img" aria-label="Video"/);
    // The video's poster and the play disc; nothing plays or opens.
    expect(list).toContain("https://image.mux.com/abc12345xx/thumbnail.webp");
    expect(list).not.toContain("<button");
    expect(list).not.toContain("data-social-feed-media-open");
    expect(list).not.toContain("<video");
    expect(list).not.toContain("<mux-player");
    // A text post draws no media list.
    expect(render()).not.toContain("data-social-caption-edit-media");
  });

  it("ties the error line to the field", () => {
    const html = render({ initialError: "Could not save that caption." });
    const notice = html.match(/<p[^>]*data-social-caption-edit-error=""[^>]*>Could not save that caption\.<\/p>/)?.[0];
    expect(notice).toBeTruthy();
    const errorId = notice?.match(/ id="([^"]+)"/)?.[1];
    expect(errorId).toBeTruthy();
    const field = textarea(html);
    expect(field).toContain('aria-invalid="true"');
    expect(field).toContain(`aria-describedby="${errorId}"`);
  });

  it("draws the one house window shell, with the phone sheet and no new copy", () => {
    expect(windowSrc).toContain('} from "@/components/chrome/house-window";');
    for (const name of ["useHouseWindow", "HouseWindowFrame", "HouseWindowAsk"]) expect(windowSrc).toContain(name);
    expect(windowSrc).toContain('phone: "sheet"');
    // The ask is the title and the buttons only (no new line).
    expect(windowSrc).toContain("lines={[]}");
    expect(windowSrc).toContain('variant={desktop ? "strip" : "sheet"}');
    expect(windowSrc).not.toContain("@/components/ui/dialog");
    expect(windowSrc).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    // Done checks first; only a changed caption is handed to the save.
    const done = windowSrc.slice(windowSrc.indexOf("function done()"), windowSrc.indexOf("const [win, winRefs]"));
    expect(done).toContain("socialPostCaptionDone(draft, baseline, hasMedia)");
    expect(done.indexOf('next.kind === "invalid"')).toBeLessThan(done.indexOf("onSave("));
    expect(done.indexOf('next.kind === "unchanged"')).toBeLessThan(done.indexOf("onSave("));
  });
});
