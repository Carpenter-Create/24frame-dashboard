import { readFileSync } from "node:fs";

import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  isWelcomeS3VideoKey,
  socialMediaObjectKey,
  socialMediaStagingKey,
  welcomeS3ApplyCountSql,
  welcomeS3PreApplyCountSql,
  welcomeS3PreApplyUnmatchedPrefixSql,
  welcomeS3UnmatchedPrefixSql,
  welcomeS3VideoKeySqlPattern,
} from "@/lib/social-media";
import { welcomeProfileReingestCandidate } from "@/lib/social-welcome-reingest";

const USER = "11111111-1111-4111-8111-111111111111";
const OBJECT = "22222222-2222-4222-8222-222222222222";
const NOTES = readFileSync("docs/infra/social-music-detect.md", "utf8");

function candidate(key: string) {
  return welcomeProfileReingestCandidate({
    id: USER,
    welcomeVideoKey: key,
    welcomeMuxAssetId: null,
    welcomeMuxPlaybackId: null,
    progressUploadId: null,
  });
}

describe("welcome s3 key shape", () => {
  it(
    "accepts camera and Media upload keys from the builders and matches the SQL pattern",
    async () => {
    const keys = [
      socialMediaObjectKey(USER, OBJECT, "video/webm"),
      socialMediaStagingKey(USER, OBJECT, "video/mp4"),
      socialMediaStagingKey(USER, OBJECT, "video/quicktime"),
    ];
    expect(keys).toEqual([
      `posts/${USER}/${OBJECT}.webm`,
      `posts/upload/${USER}/${OBJECT}.mp4`,
      `posts/upload/${USER}/${OBJECT}.mov`,
    ]);
    const db = new PGlite();
    const pattern = welcomeS3VideoKeySqlPattern();
    for (const key of keys) {
      expect(isWelcomeS3VideoKey(key), key).toBe(true);
      expect(candidate(key), key).toMatchObject({ surface: "welcome", key });
      const matched = await db.query<{ ok: boolean }>("select $1 ~ $2 as ok", [key, pattern]);
      expect(matched.rows[0]?.ok, key).toBe(true);
    }
    const published = [
      socialMediaObjectKey(USER, OBJECT, "video/mp4"),
      socialMediaObjectKey(USER, OBJECT, "video/quicktime"),
    ];
    for (const key of published) {
      expect(isWelcomeS3VideoKey(key), key).toBe(true);
      const matched = await db.query<{ ok: boolean }>("select $1 ~ $2 as ok", [key, pattern]);
      expect(matched.rows[0]?.ok, key).toBe(true);
    }
    const upperUser = USER.toUpperCase();
    const upperObject = OBJECT.toUpperCase();
    if (z.string().uuid().safeParse(upperUser).success) {
      const upper = socialMediaObjectKey(upperUser, upperObject, "video/webm");
      expect(isWelcomeS3VideoKey(upper)).toBe(true);
      const matched = await db.query<{ ok: boolean }>("select $1 ~ $2 as ok", [upper, pattern]);
      expect(matched.rows[0]?.ok).toBe(true);
    }
    for (const id of [
      "00000000-0000-0000-0000-000000000000",
      "ffffffff-ffff-ffff-ffff-ffffffffffff",
    ]) {
      if (!z.string().uuid().safeParse(id).success) continue;
      const key = socialMediaStagingKey(id, id, "video/webm");
      expect(isWelcomeS3VideoKey(key), key).toBe(true);
      const matched = await db.query<{ ok: boolean }>("select $1 ~ $2 as ok", [key, pattern]);
      expect(matched.rows[0]?.ok, key).toBe(true);
    }
    const rejected = [
      `posts/${USER}/welcome.mp4`,
      `uploads/${USER}/posts/${OBJECT}.webm`,
      `posts/upload/${USER}/${OBJECT}.jpg`,
      socialMediaObjectKey(USER, OBJECT, "video/webm", "stories"),
      `posts/${USER}/upload/${OBJECT}.webm`,
      `posts/${USER}/${OBJECT}.WEBM`,
    ];
    for (const key of rejected) {
      expect(isWelcomeS3VideoKey(key), key).toBe(false);
      expect(candidate(key), key).toBeNull();
      const matched = await db.query<{ ok: boolean }>("select $1 ~ $2 as ok", [key, pattern]);
      expect(matched.rows[0]?.ok, key).toBe(false);
    }
    expect(NOTES).toContain("Run before the migration.");
    expect(NOTES).toContain("Run after the migration, before re-ingest.");
    expect(NOTES).toContain(welcomeS3PreApplyCountSql());
    expect(NOTES).toContain(welcomeS3PreApplyUnmatchedPrefixSql());
    expect(welcomeS3PreApplyCountSql()).not.toContain("welcome_mux");
    expect(welcomeS3PreApplyUnmatchedPrefixSql()).not.toContain("welcome_mux");
    expect(NOTES).toContain(welcomeS3ApplyCountSql());
    expect(NOTES).toContain(welcomeS3UnmatchedPrefixSql());
    await db.exec(`
      create table public.profiles (
        welcome_video_key text,
        welcome_mux_asset_id text,
        welcome_mux_playback_id text,
        welcome_mux_upload_id text
      )
    `);
    const rows = [
      ...keys,
      `uploads/u1/posts/${OBJECT}.webm`,
      `welcome/member/clip.mp4`,
      `posts/upload/not-a-uuid/${OBJECT}.webm`,
      `${USER}/clip.webm`,
    ];
    for (const key of rows) {
      await db.query("insert into public.profiles (welcome_video_key) values ($1)", [key]);
    }
    await db.query(
      "insert into public.profiles (welcome_video_key, welcome_mux_asset_id) values ($1, $2)",
      [keys[0], "assetALREADY01"],
    );
    const counts = await db.query<{ welcome_s3_matching: number; welcome_s3_any: number }>(
      welcomeS3ApplyCountSql(),
    );
    expect(Number(counts.rows[0]?.welcome_s3_matching)).toBe(keys.length);
    expect(Number(counts.rows[0]?.welcome_s3_any)).toBe(rows.length);
    const prefixes = await db.query<{ key_prefix: string; n: number }>(welcomeS3UnmatchedPrefixSql());
    expect(prefixes.rows).toEqual([
      { key_prefix: "(id)", n: 1 },
      { key_prefix: "posts/upload", n: 1 },
      { key_prefix: "uploads", n: 1 },
      { key_prefix: "welcome", n: 1 },
    ]);
    const listed = prefixes.rows.map((row) => row.key_prefix).join("\n");
    expect(listed).not.toContain(USER);
    expect(listed).not.toContain("u1");
    expect(listed).not.toContain("member");
    expect(listed).not.toContain(OBJECT);
  },
    30_000,
  );

  it("runs the pre-apply counts on a table that has only welcome_video_key", async () => {
    const db = new PGlite();
    await db.exec("create table public.profiles (welcome_video_key text)");
    await db.query("insert into public.profiles (welcome_video_key) values ($1), ($2)", [
      socialMediaObjectKey(USER, OBJECT, "video/webm"),
      "welcome/clip.mp4",
    ]);
    const counts = await db.query<{ welcome_s3_matching: number; welcome_s3_any: number }>(
      welcomeS3PreApplyCountSql(),
    );
    expect(Number(counts.rows[0]?.welcome_s3_matching)).toBe(1);
    expect(Number(counts.rows[0]?.welcome_s3_any)).toBe(2);
    const prefixes = await db.query<{ key_prefix: string; n: number }>(welcomeS3PreApplyUnmatchedPrefixSql());
    expect(prefixes.rows).toEqual([{ key_prefix: "welcome", n: 1 }]);
    expect(prefixes.rows.map((row) => row.key_prefix).join("\n")).not.toContain(USER);
  }, 30_000);
});
