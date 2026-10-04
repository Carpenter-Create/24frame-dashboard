import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

import { SOCIAL_COVER_BYTES_ROUTE } from "@/lib/social-edge";

import {
  COVER_BYTES_FETCH,
  coverFailureCopy,
  coverFilePickOpensReposition,
  coverLoadNotice,
  coverNoticeText,
  coverPreviewIsLocal,
  loadLocalCoverFile,
  loadOwnCoverFile,
  loadOwnCoverSourceFile,
  socialCoverBytesHref,
} from "./social-profile-cover-load";

describe("cover original load (keep the original)", () => {
  it("reads the kept original from ?source=1 with the same no-redirect fetch", async () => {
    expect(socialCoverBytesHref()).toBe("/api/social/cover");
    expect(socialCoverBytesHref("source")).toBe("/api/social/cover?source=1");
    const fallback = "Could not crop cover photo.";
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe("/api/social/cover?source=1");
      expect(init).toEqual(COVER_BYTES_FETCH);
      return new Response(new Uint8Array([1, 2]), { headers: { "Content-Type": "image/png" } });
    });
    const loaded = await loadOwnCoverSourceFile(fallback, fetchImpl);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(loaded.file?.type).toBe("image/png");
    const missing = vi.fn(async () => new Response(null, { status: 404 }));
    expect(await loadOwnCoverSourceFile(fallback, missing)).toEqual({ file: null, notice: fallback });
  });
});

describe("cover reposition load", () => {
  it("opens reposition chrome for any picked file before decode", () => {
    const file = new File([new Uint8Array([1])], "cover.jpg", { type: "image/jpeg" });
    expect(coverFilePickOpensReposition(file, false)).toBe(true);
    expect(coverFilePickOpensReposition(file, true)).toBe(false);
    expect(coverFilePickOpensReposition(undefined, false)).toBe(false);
  });

  it("treats only blob and data URLs as locally readable", () => {
    expect(coverPreviewIsLocal("blob:http://local/abc")).toBe(true);
    expect(coverPreviewIsLocal("data:image/jpeg;base64,aaa")).toBe(true);
    expect(coverPreviewIsLocal("/api/social/media?key=posts%2Fu%2Fa.jpg")).toBe(false);
    expect(coverPreviewIsLocal("https://cdn.example/signed")).toBe(false);
    expect(SOCIAL_COVER_BYTES_ROUTE).toBe("/api/social/cover");
  });

  it("never surfaces Failed to fetch", () => {
    const fallback = "Could not crop cover photo.";
    expect(coverFailureCopy(new TypeError("Failed to fetch"), fallback)).toBe(fallback);
    expect(coverFailureCopy(new Error("Failed to fetch"), fallback)).toBe(fallback);
    expect(coverFailureCopy(new Error("fetch failed"), fallback)).toBe(fallback);
    expect(coverFailureCopy(new Error("Photo must be 10 MB or smaller."), fallback)).toBe(
      "Photo must be 10 MB or smaller.",
    );
    expect(coverFailureCopy(new TypeError("Failed to fetch"), "Failed to fetch")).not.toMatch(
      /failed to fetch|fetch failed/i,
    );
    expect(coverNoticeText("Failed to fetch", fallback)).toBe(fallback);
    expect(coverNoticeText("fetch failed", fallback)).toBe(fallback);
    expect(coverNoticeText(fallback, "Failed to fetch")).toBe(fallback);
  });

  it("maps status and redirect failures to friendly copy", () => {
    const fallback = "Could not crop cover photo.";
    const notices = [
      coverLoadNotice({ thrown: new TypeError("Failed to fetch") }, fallback),
      coverLoadNotice({ thrown: new Error("fetch failed") }, fallback),
      coverLoadNotice({ status: 401 }, fallback),
      coverLoadNotice({ status: 404 }, fallback),
      coverLoadNotice({ status: 500 }, fallback),
      coverLoadNotice({ status: 302, redirected: true }, fallback),
      coverLoadNotice({ status: 0, type: "opaqueredirect" }, fallback),
    ];
    for (const notice of notices) {
      expect(notice).toBe(fallback);
      expect(notice).not.toMatch(/failed to fetch|fetch failed/i);
    }
    expect(coverLoadNotice({ status: 200 }, fallback)).toBeNull();
  });

  it("reads owner cover status and does not follow a CDN redirect", async () => {
    const fallback = "Could not crop cover photo.";
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe(SOCIAL_COVER_BYTES_ROUTE);
      expect(init).toEqual(COVER_BYTES_FETCH);
      return new Response(null, {
        status: 302,
        headers: { Location: "https://cdn.example/cover.jpg" },
      });
    });
    const redirected = await loadOwnCoverFile(fallback, fetchImpl);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(redirected).toEqual({ file: null, notice: fallback });

    for (const status of [401, 404, 500]) {
      const once = vi.fn(async () => new Response(null, { status }));
      const loaded = await loadOwnCoverFile(fallback, once);
      expect(once).toHaveBeenCalledTimes(1);
      expect(loaded).toEqual({ file: null, notice: fallback });
    }

    const thrown = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    expect(await loadOwnCoverFile(fallback, thrown)).toEqual({ file: null, notice: fallback });

    const ok = vi.fn(
      async () => new Response(new Uint8Array([9, 8, 7]), { headers: { "Content-Type": "image/jpeg" } }),
    );
    const bytes = await loadOwnCoverFile(fallback, ok);
    expect(bytes.notice).toBeNull();
    expect(bytes.file?.type).toBe("image/jpeg");
    expect(bytes.file?.size).toBe(3);
  });

  it("does not fetch a CDN or media-proxy URL for local bytes", async () => {
    const fallback = "Could not crop cover photo.";
    const spy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));
    try {
      const remote = await loadLocalCoverFile("https://cdn.example/cover.jpg", fallback);
      const proxy = await loadLocalCoverFile("/api/social/media?key=posts%2Fa%2Fb.jpg", fallback);
      expect(spy).not.toHaveBeenCalled();
      expect(remote).toEqual({ file: null, notice: fallback });
      expect(proxy).toEqual({ file: null, notice: fallback });
    } finally {
      spy.mockRestore();
    }
  });

  it("keeps the byte fetch on manual redirect in the load module", () => {
    const src = readFileSync("src/lib/social-profile-cover-load.ts", "utf8");
    expect(src).toContain('redirect: "manual"');
    expect(src).toContain('credentials: "include"');
    expect(src).not.toContain('redirect: "error"');
    expect(COVER_BYTES_FETCH.redirect).toBe("manual");
  });
});
