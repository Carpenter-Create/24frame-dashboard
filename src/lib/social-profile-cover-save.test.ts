import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

import { SOCIAL_IMAGE_MAX_BYTES } from "@/lib/social-media";
import { SOCIAL_PROFILE_COLUMNS } from "@/lib/social-profile";
import { loadOwnSocialProfileCoverFraming } from "@/lib/social-profile-cover-source";

import {
  coverSourceUploadable,
  parseSocialProfileCoverSave,
  socialProfileCoverSaveForm,
  uploadCoverFile,
} from "./social-profile-cover-save";

const USER = "11111111-1111-4111-8111-111111111111";
const OTHER = "33333333-3333-4333-8333-333333333333";
const cropped = {
  kind: "image",
  key: `posts/upload/${USER}/22222222-2222-4222-8222-222222222222.jpg`,
  contentType: "image/jpeg",
};
const original = {
  kind: "image",
  key: `posts/upload/${USER}/44444444-4444-4444-8444-444444444444.png`,
  contentType: "image/png",
};
const crop = { x: 0.125, y: 0, w: 0.75, h: 1 };
// The published cover the editor opened (the reposition compare-and-swap token).
const opened = `posts/${USER}/55555555-5555-4555-8555-555555555555.jpg`;

describe("profile cover save form (keep the original)", () => {
  it("round-trips the three save shapes the client builds", () => {
    const framed = parseSocialProfileCoverSave(
      socialProfileCoverSaveForm({ item: cropped, source: original, crop }),
      USER,
    );
    expect(framed?.mode).toBe("framed");
    if (framed?.mode !== "framed") return;
    expect(framed.item.key).toBe(cropped.key);
    expect(framed.source.key).toBe(original.key);
    expect(framed.crop).toEqual(crop);

    const reframe = parseSocialProfileCoverSave(socialProfileCoverSaveForm({ item: cropped, crop, opened }), USER);
    expect(reframe).toEqual({ mode: "reframe", item: expect.objectContaining({ key: cropped.key }), crop, opened });

    const plain = parseSocialProfileCoverSave(socialProfileCoverSaveForm({ item: cropped }), USER);
    expect(plain).toEqual({ mode: "plain", item: expect.objectContaining({ key: cropped.key }) });

    const form = socialProfileCoverSaveForm({ item: cropped, crop, opened });
    expect(form.has("source")).toBe(false);
    expect(form.get("opened")).toBe(opened);
    // A new photo carries its own original: no opened token rides along.
    expect(socialProfileCoverSaveForm({ item: cropped, source: original, crop, opened }).has("opened")).toBe(false);
    expect(socialProfileCoverSaveForm({ item: cropped, crop, opened: null }).has("opened")).toBe(false);
    expect(socialProfileCoverSaveForm({ item: cropped, source: null, crop: null }).has("crop")).toBe(false);
  });

  it("refuses a bad framing, a foreign or stored original, or the crop reused as the original", () => {
    const bad = (input: { source?: unknown; crop?: unknown; media?: unknown; opened?: string }) => {
      const form = new FormData();
      form.set("media", JSON.stringify(input.media ?? [cropped]));
      if (input.source !== undefined) form.set("source", JSON.stringify(input.source));
      if (input.crop !== undefined) form.set("crop", typeof input.crop === "string" ? input.crop : JSON.stringify(input.crop));
      if (input.opened !== undefined) form.set("opened", input.opened);
      return parseSocialProfileCoverSave(form, USER);
    };
    expect(bad({ source: [original], crop: { ...crop, x: 0.5 } })).toBeNull();
    expect(bad({ source: [original] })).toBeNull();
    expect(bad({ source: [{ ...original, key: original.key.replace(USER, OTHER) }], crop })).toBeNull();
    expect(bad({ source: [{ ...original, key: `posts/${USER}/44444444-4444-4444-8444-444444444444.png` }], crop })).toBeNull();
    expect(bad({ source: [cropped], crop })).toBeNull();
    expect(bad({ source: [original, original], crop })).toBeNull();
    expect(bad({ crop: "{", opened })).toBeNull();
    expect(bad({ crop: { x: 0, y: 0, w: 1 }, opened })).toBeNull();
    expect(bad({ media: [{ ...cropped, key: cropped.key.replace(USER, OTHER) }] })).toBeNull();
  });

  it("refuses a reposition that does not name the published cover it opened", () => {
    const reframe = (value?: string) => {
      const form = new FormData();
      form.set("media", JSON.stringify([cropped]));
      form.set("crop", JSON.stringify(crop));
      if (value !== undefined) form.set("opened", value);
      return parseSocialProfileCoverSave(form, USER);
    };
    expect(reframe(opened)?.mode).toBe("reframe");
    expect(reframe()).toBeNull();
    expect(reframe("")).toBeNull();
    expect(reframe(opened.replace(USER, OTHER))).toBeNull();
    expect(reframe(cropped.key)).toBeNull();
    expect(reframe(`stories/${USER}/55555555-5555-4555-8555-555555555555.jpg`)).toBeNull();
    expect(reframe(`posts/${USER}/../55555555-5555-4555-8555-555555555555.jpg`)).toBeNull();
  });

  it("keeps the original only as a posts-lane still under the image cap", () => {
    expect(coverSourceUploadable({ type: "image/jpeg", size: 1024 })).toBe(true);
    expect(coverSourceUploadable({ type: "image/png", size: SOCIAL_IMAGE_MAX_BYTES })).toBe(true);
    expect(coverSourceUploadable({ type: "image/jpeg", size: SOCIAL_IMAGE_MAX_BYTES + 1 })).toBe(false);
    expect(coverSourceUploadable({ type: "image/heic", size: 1024 })).toBe(false);
    expect(coverSourceUploadable({ type: "video/mp4", size: 1024 })).toBe(false);
    expect(coverSourceUploadable({ type: "image/jpeg", size: 0 })).toBe(false);
  });

  it("uploads a file through presign then PUT, and reports either failure", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "cover.jpg", { type: "image/jpeg" });
    const presign = vi.fn(async (body: FormData) => {
      expect(body.get("lane")).toBe("posts");
      expect(body.get("content_type")).toBe("image/jpeg");
      expect(body.get("byte_length")).toBe("3");
      return { key: cropped.key, url: "https://s3.example/put", kind: "image", contentType: "image/jpeg" };
    });
    const put = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.method).toBe("PUT");
      expect(init?.body).toBe(file);
      return new Response(null, { status: 200 });
    });
    expect(await uploadCoverFile(file, presign, put as typeof fetch)).toEqual({ ok: true, item: cropped });

    const refused = vi.fn(async () => ({ error: "Too large." }));
    expect(await uploadCoverFile(file, refused, put as typeof fetch)).toEqual({ ok: false, error: "Too large." });

    const failedPut = vi.fn(async () => new Response(null, { status: 403 }));
    expect(await uploadCoverFile(file, presign, failedPut as typeof fetch)).toEqual({ ok: false, error: null });
  });
});

describe("owner cover framing read", () => {
  function client(row: unknown, error: unknown = null) {
    const calls: Array<[string, unknown]> = [];
    const from = vi.fn(() => ({
      select: (columns: string) => {
        calls.push(["select", columns]);
        return {
          eq: (column: string, value: unknown) => {
            calls.push([column, value]);
            return { maybeSingle: async () => ({ data: row, error }) };
          },
        };
      },
    }));
    return { supabase: { from } as never, calls };
  }

  it("reads the framing with the cover it produced, in one owner row, and parses it", async () => {
    const own = client({ cover_key: opened, cover_crop: crop });
    expect(await loadOwnSocialProfileCoverFraming(own.supabase, USER)).toEqual({ crop, coverKey: opened });
    expect(own.calls).toEqual([
      ["select", "cover_key, cover_crop"],
      ["id", USER],
    ]);
    const load = (row: unknown, error: unknown = null) =>
      loadOwnSocialProfileCoverFraming(client(row, error).supabase, USER);
    expect(await load({ cover_key: opened, cover_crop: null })).toBeNull();
    expect(await load({ cover_key: null, cover_crop: crop })).toBeNull();
    expect(await load(null)).toBeNull();
    expect(await load({ cover_key: opened, cover_crop: { x: 0, y: 0, w: 1 } })).toBeNull();
    expect(await load(null, { message: "column does not exist" })).toBeNull();
  });

  it("never selects the original or its framing on shared or visitor reads", () => {
    expect(SOCIAL_PROFILE_COLUMNS).not.toContain("cover_source_key");
    expect(SOCIAL_PROFILE_COLUMNS).not.toContain("cover_crop");
    const page = readFileSync("src/app/(app)/social/profile/page.tsx", "utf8");
    expect(page).toContain("loadOwnSocialProfileCoverFraming(supabase, ctx.user.id)");
    expect(page).toContain("coverFraming={coverFraming}");
    const visitor = readFileSync("src/app/(app)/social/u/[handle]/page.tsx", "utf8");
    expect(visitor).not.toContain("cover_source_key");
    expect(visitor).not.toContain("cover_crop");
    expect(visitor).not.toContain("coverCrop");
    expect(visitor).not.toContain("coverFraming");
    const access = readFileSync("src/lib/social-media-access.ts", "utf8");
    expect(access).not.toContain("cover_source_key");
  });
});

describe("profile cover source migration: deploy and rollback order", () => {
  const sql = readFileSync("supabase/migrations/20261004120000_profile_cover_source.sql", "utf8");
  const header = sql.slice(0, sql.indexOf("create or replace function"));

  it("makes applying the migration a merge gate, since the app has no fallback", () => {
    expect(header).toContain("Founder applies; do not run from the PR.");
    expect(header).toMatch(
      /DEPLOY ORDER \(merge gate\): 1\. the founder applies this migration; 2\. verify\s*\n--\s+on the PR preview; 3\. merge\./,
    );
  });

  it("drops the pair CHECK before the app revert and the columns only after it", () => {
    const rollback = header.slice(header.indexOf("-- ROLLBACK"));
    const pairOnly = rollback.indexOf(
      "--        alter table public.profiles drop constraint profiles_cover_source_pair;\n",
    );
    const revert = rollback.indexOf("--   2. Revert the app.");
    const rest = rollback.indexOf("drop column cover_crop, drop column cover_source_key;");
    expect(pairOnly).toBeGreaterThan(-1);
    expect(revert).toBeGreaterThan(pairOnly);
    expect(rest).toBeGreaterThan(revert);
    // Step 3 never re-drops the pair rule, and the function goes last.
    const step3 = rollback.slice(revert);
    expect(step3).not.toContain("profiles_cover_source_pair");
    expect(step3.indexOf("drop function public.profile_cover_crop_valid(jsonb);")).toBeGreaterThan(
      step3.indexOf("drop column cover_crop"),
    );
  });
});
