import { describe, expect, it, vi } from "vitest";

import { SOCIAL } from "@/lib/social";
import type { SocialMediaItem } from "@/lib/social-media";

import { saveSocialWelcomeClip } from "./social-go-live-welcome";

// The welcome video from the camera (social-profile-edit-window-lock-v1 §4).
// Every failure comes back as a result, so the camera always gets its
// controls back (review fix: a rejected save used to lock it up).

const file = new File([new Uint8Array(8)], "clip.mp4", { type: "video/mp4" });
const item = { kind: "video", key: "posts/u/clip.mp4", contentType: "video/mp4" } as unknown as SocialMediaItem;

describe("saveSocialWelcomeClip", () => {
  it("uploads, then saves the clip as the welcome video", async () => {
    const upload = vi.fn(async () => ({ item }));
    const save = vi.fn(async (form: FormData) => {
      expect(JSON.parse(String(form.get("media")))).toEqual([item]);
      return {};
    });
    const percents: number[] = [];
    const out = await saveSocialWelcomeClip({ file, upload, save, onProgress: (p) => percents.push(p) });
    expect(out).toEqual({ ok: true });
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("passes the upload's progress through, and its cancel signal", async () => {
    const controller = new AbortController();
    const upload = vi.fn(async (_f: File, options: { signal?: AbortSignal; onProgress?: (p: { percent: number | null }) => void }) => {
      expect(options.signal).toBe(controller.signal);
      options.onProgress?.({ percent: 40 });
      options.onProgress?.({ percent: null });
      return { item };
    });
    const percents: number[] = [];
    await saveSocialWelcomeClip({
      file,
      upload: upload as never,
      save: async () => ({}),
      signal: controller.signal,
      onProgress: (p) => percents.push(p),
    });
    expect(percents).toEqual([40]);
  });

  it("never saves when the upload fails, throws, or was cancelled", async () => {
    const save = vi.fn(async () => ({}));
    expect(await saveSocialWelcomeClip({ file, upload: async () => ({ error: "Too big." }), save })).toEqual({
      ok: false,
      error: "Too big.",
    });
    expect(
      await saveSocialWelcomeClip({
        file,
        upload: async () => {
          throw new Error("network");
        },
        save,
      }),
    ).toEqual({ ok: false, error: SOCIAL.home.uploadFailed });
    expect(await saveSocialWelcomeClip({ file, upload: async () => ({ aborted: true }), save })).toEqual({
      ok: false,
      error: SOCIAL.home.uploadFailed,
      aborted: true,
    });
    expect(await saveSocialWelcomeClip({ file, upload: async () => ({}), save })).toEqual({
      ok: false,
      error: SOCIAL.home.uploadFailed,
    });
    expect(save).not.toHaveBeenCalled();
  });

  it("returns a failure when the save is refused or the action itself rejects", async () => {
    const upload = async () => ({ item });
    expect(await saveSocialWelcomeClip({ file, upload, save: async () => ({ error: "Not allowed." }) })).toEqual({
      ok: false,
      error: "Not allowed.",
    });
    // A dropped connection, a 5xx, or an action from before a deploy.
    await expect(
      saveSocialWelcomeClip({
        file,
        upload,
        save: async () => {
          throw new Error("Failed to find Server Action");
        },
      }),
    ).resolves.toEqual({ ok: false, error: SOCIAL.home.uploadFailed });
  });
});
