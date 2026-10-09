import { readFileSync } from "node:fs";

import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";

import { socialVideoKeyDigest, type MusicWindowRecord } from "@/lib/social-music-scan";
import { runSocialMusicBatch, type MusicScanPatch, type PendingMusicScan } from "@/lib/social-music-run";
import {
  reingestSocialS3Videos,
  rememberWelcomeReingestAsset,
  retireS3MusicPlaceholder,
  socialReingestMediaWithMux,
  welcomeProfileReingestCandidate,
  welcomeReingestAssetId,
  type SocialReingestCandidate,
  type SocialReingestSettled,
} from "@/lib/social-welcome-reingest";

const MIGRATION = readFileSync("supabase/migrations/20261008180000_social_music_scans.sql", "utf8");
const PROFILES = readFileSync("supabase/migrations/20261008180100_profiles_welcome_mux.sql", "utf8");
const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

type Db = PGlite;

let db: Db;
let legacyS3 = "";
let malformedStory = "";
let expiredStory = "";

function vid(asset: string, play: string) {
  return JSON.stringify([
    {
      kind: "video",
      provider: "mux",
      key: "posts/x/y.mp4",
      assetId: asset,
      playbackId: play,
      uploadId: "upload000001",
    },
  ]);
}

async function asUser<T>(uid: string, fn: () => Promise<T>): Promise<T> {
  await db.exec(`set role authenticated; select set_config('request.uid', '${uid}', false);`);
  try {
    return await fn();
  } finally {
    await db.exec(`reset role; select set_config('request.uid', '', false);`);
  }
}

async function bind(asset: string, play: string, upload = "upload000001") {
  await db.query(
    `insert into public.social_mux_bindings (author_id, upload_id, asset_id, playback_id)
     values ($1, $2, $3, $4) on conflict do nothing`,
    [A, upload, asset, play],
  );
}

async function insertPost(media: string): Promise<string> {
  const id = await asUser(A, async () => {
    const result = await db.query<{ id: string }>(
      `insert into public.posts (author_id, media) values ($1, $2::jsonb) returning id`,
      [A, media],
    );
    return result.rows[0]!.id;
  });
  return id;
}

async function insertStory(media: string): Promise<string> {
  return asUser(A, async () => {
    const result = await db.query<{ id: string }>(
      `insert into public.stories (author_id, media) values ($1, $2::jsonb) returning id`,
      [A, media],
    );
    return result.rows[0]!.id;
  });
}

async function viewerSees(table: "posts" | "stories", id: string): Promise<boolean> {
  return asUser(B, async () => {
    const result = await db.query(`select 1 from public.${table} where id = $1`, [id]);
    return result.rows.length === 1;
  });
}

async function scansFor(id: string) {
  const result = await db.query<{ status: string; asset_id: string; playback_id: string; last_error: string | null }>(
    `select status::text as status, asset_id, playback_id, last_error
     from public.social_music_scans where post_id = $1 or story_id = $1`,
    [id],
  );
  return result.rows;
}

async function bindWelcome(profile: string, upload: string, asset: string, play: string) {
  await db.query(
    `insert into public.social_mux_bindings (author_id, upload_id, asset_id, playback_id)
     values ($1, $2, $3, $4)`,
    [profile, upload, asset, play],
  );
}

async function setWelcome(profile: string, asset: string | null, play: string | null, upload: string | null) {
  await db.query(
    `update public.profiles
     set welcome_mux_asset_id = $2,
         welcome_mux_playback_id = $3,
         welcome_mux_upload_id = $4
     where id = $1`,
    [profile, asset, play, upload],
  );
}

async function welcomeNotices(profile: string): Promise<string[]> {
  return asUser(profile, async () => {
    const result = await db.query<{ notice: string }>(
      `select notice from public.social_music_author_notices('{}'::uuid[], '{}'::uuid[])`,
    );
    return result.rows.map((row) => row.notice);
  });
}

/** Same rule as welcomeVideoVisible for someone who is not the owner. */
async function strangerSeesWelcome(profile: string, asset: string, play: string): Promise<boolean> {
  const result = await db.query<{ visible: boolean }>(
    `select (
       not exists (
         select 1 from public.social_music_scans
         where asset_id = $2 and playback_id = $3 and status = 'blocked'
       )
       and exists (
         select 1 from public.social_music_scans
         where surface = 'welcome'
           and profile_id = $1
           and asset_id = $2
           and playback_id = $3
           and status = 'allowed'
       )
     ) as visible`,
    [profile, asset, play],
  );
  return result.rows[0]?.visible === true;
}

const STORED_WINDOW: MusicWindowRecord[] = [
  { startSeconds: 0, endSeconds: 8, result: { kind: "no_match", code: 1001 } },
];

type WelcomeRowState =
  | "pending queued"
  | "pending mid-scan"
  | "pending backing off"
  | "allowed"
  | "blocked"
  | "reingest_failed"
  | "pending exhausted"
  | "superseded";

let welcomeTag = 0;

type SeededWelcome = {
  profile: string;
  asset: string;
  play: string;
  upload: string;
  siblingPlay: string;
  scanId: string;
};

async function seedWelcomeState(state: WelcomeRowState): Promise<SeededWelcome> {
  welcomeTag += 1;
  const tag = String(welcomeTag).padStart(4, "0");
  const profile = `55555555-5555-4555-8555-${tag.padStart(12, "0")}`;
  const asset = `assetST${tag}`;
  const play = `playST${tag}a`;
  const upload = `upldST${tag}a`;
  const siblingAsset = `assetSB${tag}`;
  const siblingPlay = `playSB${tag}a`;
  await db.query(`insert into public.profiles (id) values ($1)`, [profile]);
  await db.exec(`alter table public.profiles add column if not exists welcome_video_key text`);
  if (state === "reingest_failed") {
    const digest = profile.replace(/-/g, "").slice(0, 32);
    const remembered = `assetRM${tag}`;
    await db.query(
      `insert into public.social_music_scans (
         surface, profile_id, author_id, asset_id, playback_id, upload_id, status, next_attempt_at, last_error
       ) values ('welcome', $1, $1, $2, $2, $3, 'pending', null, 'reingest_failed')`,
      [profile, digest, remembered],
    );
    await db.query(`update public.profiles set welcome_video_key = $2 where id = $1`, [
      profile,
      `posts/${profile}/welcome.mp4`,
    ]);
    await db.query(
      `insert into public.social_music_scans (
         surface, profile_id, author_id, asset_id, playback_id, status, next_attempt_at, last_error, attempt_count
       ) values ('welcome', $1, $1, $2, $3, 'pending', null, 'superseded', 2)`,
      [profile, siblingAsset, siblingPlay],
    );
    const scan = await db.query<{ id: string }>(
      `select id::text as id from public.social_music_scans where profile_id = $1 and playback_id = $2`,
      [profile, digest],
    );
    return { profile, asset: digest, play: digest, upload: remembered, siblingPlay, scanId: scan.rows[0]!.id };
  }
  await bindWelcome(profile, upload, asset, play);
  await setWelcome(profile, asset, play, upload);
  if (state === "pending mid-scan" || state === "superseded") {
    await db.query(
      `update public.social_music_scans
       set attempt_count = 1, window_results = $3::jsonb
       where profile_id = $1 and playback_id = $2`,
      [profile, play, JSON.stringify(STORED_WINDOW)],
    );
  }
  if (state === "pending backing off") {
    await db.query(
      `update public.social_music_scans
       set attempt_count = 1, last_error = 'acr_rate_limit:1', next_attempt_at = now() + interval '30 minutes'
       where profile_id = $1 and playback_id = $2`,
      [profile, play],
    );
  }
  if (state === "allowed" || state === "blocked") {
    await db.query(
      `update public.social_music_scans
       set status = $3::public.social_music_scan_status,
           decided_at = now(),
           next_attempt_at = null,
           attempt_count = 3
       where profile_id = $1 and playback_id = $2`,
      [profile, play, state],
    );
  }
  if (state === "pending exhausted") {
    await db.query(
      `update public.social_music_scans
       set attempt_count = 8, next_attempt_at = null
       where profile_id = $1 and playback_id = $2`,
      [profile, play],
    );
  }
  await db.query(
    `insert into public.social_music_scans (
       surface, profile_id, author_id, asset_id, playback_id, status, next_attempt_at, last_error, attempt_count
     ) values ('welcome', $1, $1, $2, $3, 'pending', null, 'superseded', 2)`,
    [profile, siblingAsset, siblingPlay],
  );
  if (state === "superseded") await setWelcome(profile, null, null, null);
  const scan = await db.query<{ id: string }>(
    `select id::text as id from public.social_music_scans where profile_id = $1 and playback_id = $2`,
    [profile, play],
  );
  return { profile, asset, play, upload, siblingPlay, scanId: scan.rows[0]!.id };
}

async function clearWelcomeProfile(profile: string) {
  await db.query(
    `update public.profiles
     set welcome_video_key = null,
         welcome_mux_asset_id = null,
         welcome_mux_playback_id = null,
         welcome_mux_upload_id = null
     where id = $1`,
    [profile],
  );
}

async function welcomeScan(profile: string, play: string) {
  const result = await db.query<{
    id: string;
    asset_id: string;
    last_error: string | null;
    status: string;
    attempt_count: number;
    due: boolean;
    later: boolean;
    windows: number;
  }>(
    `select id::text as id, asset_id, last_error, status::text as status, attempt_count,
            (next_attempt_at is not null and next_attempt_at <= now()) as due,
            (next_attempt_at is not null and next_attempt_at > now()) as later,
            jsonb_array_length(window_results) as windows
     from public.social_music_scans
     where profile_id = $1 and playback_id = $2`,
    [profile, play],
  );
  return result.rows[0]!;
}

async function scanCount(profile: string) {
  const result = await db.query<{ n: number }>(
    `select count(*)::int as n from public.social_music_scans where profile_id = $1`,
    [profile],
  );
  return result.rows[0]!.n;
}

async function bindingCount(profile: string) {
  const result = await db.query<{ n: number }>(
    `select count(*)::int as n from public.social_mux_bindings where author_id = $1`,
    [profile],
  );
  return result.rows[0]!.n;
}

async function othersSeeCurrentWelcome(profile: string) {
  const current = await db.query<{ asset: string | null; play: string | null }>(
    `select welcome_mux_asset_id as asset, welcome_mux_playback_id as play from public.profiles where id = $1`,
    [profile],
  );
  const row = current.rows[0]!;
  if (!row.asset || !row.play) return false;
  return strangerSeesWelcome(profile, row.asset, row.play);
}

async function siblingStillOff(profile: string, siblingPlay: string) {
  const row = await welcomeScan(profile, siblingPlay);
  expect(row.last_error).toBe("superseded");
  expect(row.due).toBe(false);
  expect(row.later).toBe(false);
}

function parseWindows(value: unknown): MusicWindowRecord[] {
  const rows = typeof value === "string" ? (JSON.parse(value) as unknown) : value;
  if (!Array.isArray(rows)) return [];
  return rows.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const record = row as MusicWindowRecord;
    if (typeof record.startSeconds !== "number" || typeof record.endSeconds !== "number") return [];
    if (!record.result || typeof record.result !== "object" || !("kind" in record.result)) return [];
    return [record];
  });
}

async function saveWelcomePatch(id: string, patch: MusicScanPatch) {
  const sets: string[] = [];
  const params: unknown[] = [];
  const add = (column: string, value: unknown, cast = "") => {
    params.push(value);
    sets.push(`${column} = $${params.length}${cast}`);
  };
  if (patch.status !== undefined) add("status", patch.status, "::public.social_music_scan_status");
  if (patch.attemptCount !== undefined) add("attempt_count", patch.attemptCount);
  if (patch.nextAttemptAt !== undefined) add("next_attempt_at", patch.nextAttemptAt);
  if (patch.lastError !== undefined) add("last_error", patch.lastError);
  if (patch.vendor !== undefined) add("vendor", patch.vendor);
  if (patch.vendorStatusCode !== undefined) add("vendor_status_code", patch.vendorStatusCode);
  if (patch.vendorScore !== undefined) add("vendor_score", patch.vendorScore);
  if (patch.vendorTitle !== undefined) add("vendor_title", patch.vendorTitle);
  if (patch.vendorArtist !== undefined) add("vendor_artist", patch.vendorArtist);
  if (patch.vendorAlbum !== undefined) add("vendor_album", patch.vendorAlbum);
  if (patch.vendorAcrid !== undefined) add("vendor_acrid", patch.vendorAcrid);
  if (patch.vendorIsrc !== undefined) add("vendor_isrc", patch.vendorIsrc);
  if (patch.vendorLabel !== undefined) add("vendor_label", patch.vendorLabel);
  if (patch.muxReadyAt !== undefined) add("mux_ready_at", patch.muxReadyAt);
  if (patch.scanStartedAt !== undefined) add("scan_started_at", patch.scanStartedAt);
  if (patch.decidedAt !== undefined) add("decided_at", patch.decidedAt);
  if (patch.durationSeconds !== undefined) add("duration_seconds", patch.durationSeconds);
  if (patch.windowResults !== undefined) add("window_results", JSON.stringify(patch.windowResults), "::jsonb");
  if (sets.length === 0) return;
  params.push(id);
  await db.query(
    `update public.social_music_scans set ${sets.join(", ")} where id = $${params.length}::uuid and status = 'pending'`,
    params,
  );
}

async function dueWelcomeScans(profile: string, now: Date): Promise<PendingMusicScan[]> {
  const result = await db.query<{
    id: string;
    asset_id: string;
    playback_id: string;
    attempt_count: number;
    created_at: string;
    mux_ready_at: string | null;
    scan_started_at: string | null;
    window_results: unknown;
    last_error: string | null;
    welcome_asset: string | null;
    welcome_play: string | null;
  }>(
    `select s.id::text as id, s.asset_id, s.playback_id, s.attempt_count,
            s.created_at::text as created_at, s.mux_ready_at::text as mux_ready_at,
            s.scan_started_at::text as scan_started_at, s.window_results, s.last_error,
            p.welcome_mux_asset_id as welcome_asset, p.welcome_mux_playback_id as welcome_play
     from public.social_music_scans s
     join public.profiles p on p.id = s.profile_id
     where s.profile_id = $1
       and s.status = 'pending'
       and s.next_attempt_at is not null
       and s.next_attempt_at <= $2::timestamptz
     order by s.next_attempt_at`,
    [profile, now.toISOString()],
  );
  const current: PendingMusicScan[] = [];
  for (const row of result.rows) {
    const retired = await db.query<{ retired: boolean }>(
      `select public.retire_superseded_music_scan($1::uuid) as retired`,
      [row.id],
    );
    if (retired.rows[0]?.retired) continue;
    current.push({
      id: row.id,
      surface: "welcome",
      assetId: row.asset_id,
      playbackId: row.playback_id,
      attemptCount: row.attempt_count,
      createdAt: row.created_at,
      muxReadyAt: row.mux_ready_at,
      scanStartedAt: row.scan_started_at,
      lastError: row.last_error,
      windows: parseWindows(row.window_results),
    });
  }
  return current;
}

async function tickWelcome(profile: string, play: string) {
  let identified = 0;
  let sliced = 0;
  const now = new Date(Date.now() + 60_000);
  const summary = await runSocialMusicBatch({
    now,
    clock: () => now.getTime(),
    budgetMs: 60_000,
    listPending: () => dueWelcomeScans(profile, now),
    loadAsset: async () => ({
      status: "ready",
      duration: 8,
      playback_ids: [{ id: play, policy: "signed" }],
      static_renditions: { files: [{ resolution: "audio-only", status: "ready" }] },
    }),
    requestAudioRendition: async () => undefined,
    downloadAudio: async () => new Uint8Array([1, 2, 3]),
    measureAudioDuration: () => 8,
    sliceWindow: () => {
      sliced += 1;
      return new Uint8Array([4, 5, 6]);
    },
    identify: async () => {
      identified += 1;
      return { kind: "no_match", code: 1001 };
    },
    save: (id, patch) => saveWelcomePatch(id, patch),
  });
  return { summary, identified, sliced };
}

const WELCOME_STATES: WelcomeRowState[] = [
  "pending queued",
  "pending mid-scan",
  "pending backing off",
  "allowed",
  "blocked",
  "reingest_failed",
  "pending exhausted",
  "superseded",
];

async function setStatus(id: string, status: "pending" | "allowed" | "blocked") {
  await db.query(
    `update public.social_music_scans
     set status = $1::public.social_music_scan_status,
         decided_at = case when $1 = 'pending' then null else now() end,
         next_attempt_at = case when $1 = 'pending' then now() else null end
     where post_id = $2 or story_id = $2`,
    [status, id],
  );
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.uid', true), '')::uuid
    $$;
    grant usage on schema auth to authenticated, anon, service_role;
    grant execute on function auth.uid() to authenticated, anon, service_role;
    create table public.profiles (id uuid primary key);
    create table public.follows (follower_id uuid, followee_id uuid);
    create table public.posts (
      id uuid primary key default gen_random_uuid(),
      author_id uuid not null references public.profiles (id),
      status text not null default 'active',
      group_id uuid,
      media jsonb,
      like_count int default 0,
      comment_count int default 0,
      pinned boolean default false
    );
    create table public.stories (
      id uuid primary key default gen_random_uuid(),
      author_id uuid not null references public.profiles (id),
      status text not null default 'active',
      expires_at timestamptz not null default now() + interval '1 day',
      media jsonb
    );
    create function public.has_capability(uuid, text) returns boolean language sql stable as $$ select false $$;
    create function public.can_access_group_content(uuid, uuid) returns boolean language sql stable as $$ select true $$;
    create function public.is_active_profile(uuid) returns boolean language sql stable as $$ select true $$;
    alter table public.posts enable row level security;
    alter table public.stories enable row level security;
    create policy posts_insert_author on public.posts for insert to authenticated
      with check (author_id = auth.uid() and status = 'active');
    create policy stories_insert_author on public.stories for insert to authenticated
      with check (author_id = auth.uid() and status = 'active');
    create policy stories_update_author on public.stories for update to authenticated
      using (author_id = auth.uid()) with check (author_id = auth.uid());
    create policy posts_update_author on public.posts for update to authenticated
      using (author_id = auth.uid()) with check (author_id = auth.uid());
    grant select, insert, update on public.posts, public.stories to authenticated;
    grant select, update on public.profiles to authenticated;
    grant select on public.follows to authenticated;
    grant all on all tables in schema public to service_role;
    insert into public.profiles values ('${A}'), ('${B}');
    insert into public.follows values ('${B}', '${A}');
  `);
  const s3 = await db.query<{ id: string }>(
    `insert into public.posts (author_id, media) values ($1, $2::jsonb) returning id`,
    [A, JSON.stringify([{ kind: "video", key: `posts/${A}/welcome.mp4`, contentType: "video/mp4" }])],
  );
  legacyS3 = s3.rows[0]!.id;
  const bad = await db.query<{ id: string }>(
    `insert into public.stories (author_id, media) values ($1, $2::jsonb) returning id`,
    [A, JSON.stringify([{ kind: "video", provider: "mux", assetId: "no", playbackId: "playOK000001" }])],
  );
  malformedStory = bad.rows[0]!.id;
  const expired = await db.query<{ id: string }>(
    `insert into public.stories (author_id, expires_at, media) values ($1, now() - interval '1 hour', $2::jsonb) returning id`,
    [A, JSON.stringify([{ kind: "video", provider: "mux", assetId: "assetEXP00001", playbackId: "playEXP000001" }])],
  );
  expiredStory = expired.rows[0]!.id;
  await db.query(
    `insert into public.stories (author_id, expires_at, media) values ($1, now() - interval '1 hour', $2::jsonb)`,
    [A, JSON.stringify([{ kind: "video", key: `stories/${A}/expired.mp4`, contentType: "video/mp4" }])],
  );
  await db.exec(MIGRATION);
  await db.exec(PROFILES);
}, 120_000);

describe("social music scan migration", () => {
  it("hides a pending video and does not treat pending as released", async () => {
    await bind("assetPEND0001", "playPEND00001");
    const id = await insertPost(vid("assetPEND0001", "playPEND00001"));
    expect(await scansFor(id)).toMatchObject([{ status: "pending" }]);
    expect(await viewerSees("posts", id)).toBe(false);
  });

  it("copies a verdict only for the same asset and playback pair", async () => {
    await bind("assetPAIR0001", "playPAIR00001");
    await bind("assetPAIR0001", "playPAIR00002");
    const blocked = await insertPost(vid("assetPAIR0001", "playPAIR00001"));
    await setStatus(blocked, "blocked");
    const reused = await insertPost(vid("assetPAIR0001", "playPAIR00001"));
    expect(await scansFor(reused)).toMatchObject([{ status: "blocked", playback_id: "playPAIR00001" }]);
    expect(await viewerSees("posts", reused)).toBe(false);
    const otherPlay = await insertPost(vid("assetPAIR0001", "playPAIR00002"));
    expect(await scansFor(otherPlay)).toMatchObject([{ status: "pending", playback_id: "playPAIR00002" }]);
    expect(await viewerSees("posts", otherPlay)).toBe(false);
    await setStatus(otherPlay, "allowed");
    const allowedParent = await insertPost(vid("assetPAIR0001", "playPAIR00002"));
    expect(await scansFor(allowedParent)).toMatchObject([{ status: "allowed" }]);
    expect(await viewerSees("posts", allowedParent)).toBe(true);
  });

  it("prefers a blocked row over an allowed row for the same pair", async () => {
    await bind("assetORDER001", "playORDER0001");
    const allowed = await insertPost(vid("assetORDER001", "playORDER0001"));
    await setStatus(allowed, "allowed");
    const later = await insertPost(vid("assetORDER001", "playORDER0001"));
    await setStatus(later, "blocked");
    const next = await insertPost(vid("assetORDER001", "playORDER0001"));
    expect((await scansFor(next))[0]?.status).toBe("blocked");
    expect(await viewerSees("posts", next)).toBe(false);
  });

  it("rejects a forged asset and playback pair, including a story media update", async () => {
    await bind("assetCLEAN001", "playCLEAN0001");
    await bind("assetMUSIC001", "playMUSIC0001");
    await expect(insertPost(vid("assetCLEAN001", "playMUSIC0001"))).rejects.toThrow(/not bound/);
    const story = await insertStory(vid("assetCLEAN001", "playCLEAN0001"));
    await expect(
      asUser(A, () =>
        db.query(`update public.stories set media = $2::jsonb where id = $1`, [
          story,
          vid("assetCLEAN001", "playMUSIC0001"),
        ]),
      ),
    ).rejects.toThrow(/not bound/);
    expect(await viewerSees("stories", story)).toBe(false);
  });

  it("rejects a new S3 video and keeps a legacy S3 video hidden", async () => {
    await expect(
      insertPost(JSON.stringify([{ kind: "video", key: `posts/${A}/new.mp4` }])),
    ).rejects.toThrow(/must be a Mux video/);
    expect(await scansFor(legacyS3)).toMatchObject([
      { status: "pending", last_error: "s3_video_needs_mux" },
    ]);
    expect(await viewerSees("posts", legacyS3)).toBe(false);
  });

  it("hides a multi-video parent until every video is allowed", async () => {
    await bind("assetMULTI001", "playMULTI0001");
    await bind("assetMULTI002", "playMULTI0002");
    const media = JSON.stringify([
      { kind: "video", provider: "mux", key: "posts/x/a.mp4", assetId: "assetMULTI001", playbackId: "playMULTI0001", uploadId: "upload000001" },
      { kind: "video", provider: "mux", key: "posts/x/b.mp4", assetId: "assetMULTI002", playbackId: "playMULTI0002", uploadId: "upload000002" },
    ]);
    const id = await insertPost(media);
    await db.query(
      `update public.social_music_scans
       set status = 'allowed', decided_at = now(), next_attempt_at = null
       where post_id = $1 and playback_id = 'playMULTI0001'`,
      [id],
    );
    expect(await viewerSees("posts", id)).toBe(false);
    await db.query(
      `update public.social_music_scans
       set status = 'allowed', decided_at = now(), next_attempt_at = null
       where post_id = $1 and playback_id = 'playMULTI0002'`,
      [id],
    );
    expect(await viewerSees("posts", id)).toBe(true);
  });

  it("rejects a short asset id and hides a legacy row that has no scan", async () => {
    await expect(insertPost(vid("short", "playSHORT0001"))).rejects.toThrow(/asset id and playback id/);
    await db.exec(`alter table public.posts disable trigger posts_enqueue_social_music_scan`);
    const legacy = (
      await db.query<{ id: string }>(
        `insert into public.posts (author_id, media) values ($1, $2::jsonb) returning id`,
        [A, vid("assetLEGACY01", "playLEGACY001")],
      )
    ).rows[0]!.id;
    await db.exec(`alter table public.posts enable trigger posts_enqueue_social_music_scan`);
    expect(await scansFor(legacy)).toEqual([]);
    expect(await viewerSees("posts", legacy)).toBe(false);
  });

  it("leaves an image visible and queues malformed Mux ids without expired stories", async () => {
    const image = await insertPost(JSON.stringify([{ kind: "image", key: "posts/x/y.jpg" }]));
    expect(await viewerSees("posts", image)).toBe(true);
    expect(await scansFor(malformedStory)).toMatchObject([
      { status: "pending", last_error: "mux_id_malformed" },
    ]);
    const expiredScans = await db.query(`select 1 from public.social_music_scans where story_id = $1`, [
      expiredStory,
    ]);
    expect(expiredScans.rows).toEqual([]);
  });

  it("keeps the private function off anon and the binding table off the member", async () => {
    const anon = await db.query<{ v: boolean }>(
      `select has_function_privilege('anon', 'private.social_video_released(text, uuid)', 'execute') as v`,
    );
    expect(anon.rows[0]?.v).toBe(false);
    const publicFn = await db.query<{ v: boolean }>(
      `select to_regprocedure('public.social_video_released(text, uuid)') is not null as v`,
    );
    expect(publicFn.rows[0]?.v).toBe(false);
    await expect(
      asUser(A, () =>
        db.query(
          `insert into public.social_mux_bindings (author_id, upload_id, asset_id, playback_id)
           values ($1, 'upload000009', 'assetFORGE001', 'playFORGE0001')`,
          [A],
        ),
      ),
    ).rejects.toThrow();
  });

  it("stores a duration inside the tolerance and rejects 480.6", async () => {
    await bind("assetDUR000001", "playDUR000001");
    const id = await insertPost(vid("assetDUR000001", "playDUR000001"));
    await db.query(`update public.social_music_scans set duration_seconds = 480.021 where post_id = $1`, [id]);
    await expect(
      db.query(`update public.social_music_scans set duration_seconds = 480.6 where post_id = $1`, [id]),
    ).rejects.toThrow(/duration/);
  });

  it("rejects another member using a bound pair and cascades a profile delete", async () => {
    await db.query(
      `insert into public.social_mux_bindings (author_id, upload_id, asset_id, playback_id)
       values ($1, 'upload00000B', 'assetOWNER001', 'playOWNER0001')`,
      [A],
    );
    await expect(
      asUser(B, () =>
        db.query(`insert into public.posts (author_id, media) values ($1, $2::jsonb)`, [
          B,
          vid("assetOWNER001", "playOWNER0001"),
        ]),
      ),
    ).rejects.toThrow(/not bound/);
    const owner = "33333333-3333-4333-8333-333333333333";
    await db.query(`insert into public.profiles (id) values ($1)`, [owner]);
    await db.query(
      `insert into public.social_mux_bindings (author_id, upload_id, asset_id, playback_id)
       values ($1, 'upload00000C', 'assetCASC0001', 'playCASC00001')`,
      [owner],
    );
    await db.query(
      `insert into public.social_music_scans (surface, profile_id, author_id, asset_id, playback_id)
       values ('welcome', $1, $1, 'assetCASC0001', 'playCASC00001')`,
      [owner],
    );
    await db.query(`delete from public.profiles where id = $1`, [owner]);
    const left = await db.query(`select 1 from public.social_mux_bindings where author_id = $1`, [owner]);
    expect(left.rows).toEqual([]);
    const scans = await db.query(`select 1 from public.social_music_scans where author_id = $1`, [owner]);
    expect(scans.rows).toEqual([]);
  });

  it("enqueues a welcome scan only when the profile mux pair is bound", async () => {
    await expect(
      asUser(A, () =>
        db.query(
          `update public.profiles
           set welcome_mux_asset_id = 'assetWEL00001',
               welcome_mux_playback_id = 'playWEL000001',
               welcome_mux_upload_id = 'uploadWEL0001'
           where id = $1`,
          [A],
        ),
      ),
    ).rejects.toThrow(/not bound/);
    await db.query(
      `insert into public.social_mux_bindings (author_id, upload_id, asset_id, playback_id)
       values ($1, 'uploadWEL0001', 'assetWEL00001', 'playWEL000001')`,
      [A],
    );
    await asUser(A, () =>
      db.query(
        `update public.profiles
         set welcome_mux_asset_id = 'assetWEL00001',
             welcome_mux_playback_id = 'playWEL000001',
             welcome_mux_upload_id = 'uploadWEL0001'
         where id = $1`,
        [A],
      ),
    );
    const welcome = await db.query<{ status: string }>(
      `select status::text as status from public.social_music_scans where profile_id = $1`,
      [A],
    );
    expect(welcome.rows).toMatchObject([{ status: "pending" }]);
  });

  it("supersedes a replaced welcome pair so the old scan does not decide the new one", async () => {
    const profile = "88888888-8888-4888-8888-888888888888";
    await db.query(`insert into public.profiles (id) values ($1)`, [profile]);
    await db.query(
      `insert into public.social_mux_bindings (author_id, upload_id, asset_id, playback_id)
       values ($1, 'uploadOLD0001', 'assetOLD00001', 'playOLD000001')`,
      [profile],
    );
    await db.query(
      `update public.profiles
       set welcome_mux_asset_id = 'assetOLD00001',
           welcome_mux_playback_id = 'playOLD000001',
           welcome_mux_upload_id = 'uploadOLD0001'
       where id = $1`,
      [profile],
    );
    await db.query(
      `update public.social_music_scans
       set status = 'blocked', next_attempt_at = null, decided_at = now()
       where profile_id = $1 and playback_id = 'playOLD000001'`,
      [profile],
    );
    await db.query(
      `insert into public.social_mux_bindings (author_id, upload_id, asset_id, playback_id)
       values ($1, 'uploadNEW0001', 'assetNEW00001', 'playNEW000001')`,
      [profile],
    );
    await db.query(
      `update public.profiles
       set welcome_mux_asset_id = 'assetNEW00001',
           welcome_mux_playback_id = 'playNEW000001',
           welcome_mux_upload_id = 'uploadNEW0001'
       where id = $1`,
      [profile],
    );
    const old = await db.query<{ last_error: string; status: string }>(
      `select last_error, status::text as status
       from public.social_music_scans
       where profile_id = $1 and playback_id = 'playOLD000001'`,
      [profile],
    );
    expect(old.rows).toEqual([{ last_error: "superseded", status: "blocked" }]);
    const held = await asUser(profile, async () => {
      const result = await db.query<{ notice: string }>(
        `select notice from public.social_music_author_notices('{}'::uuid[], '{}'::uuid[])`,
      );
      return result.rows.map((row) => row.notice);
    });
    expect(held).toEqual(["welcomePending"]);
    await db.query(
      `update public.social_music_scans
       set status = 'allowed', next_attempt_at = null, decided_at = now()
       where profile_id = $1 and playback_id = 'playNEW000001'`,
      [profile],
    );
    const released = await asUser(profile, async () => {
      const result = await db.query(
        `select notice from public.social_music_author_notices('{}'::uuid[], '{}'::uuid[])`,
      );
      return result.rows;
    });
    expect(released).toEqual([]);
    const blockedNew = await db.query(
      `select 1 from public.social_music_scans
       where asset_id = 'assetNEW00001' and playback_id = 'playNEW000001' and status = 'blocked'`,
    );
    expect(blockedNew.rows).toEqual([]);
  });

  it("restores a blocked welcome notice when the same pair is saved again", async () => {
    const profile = "77777777-7777-4777-8777-777777777771";
    await db.query(`insert into public.profiles (id) values ($1)`, [profile]);
    await bindWelcome(profile, "uploadBLK0001", "assetBLK00001", "playBLK000001");
    await setWelcome(profile, "assetBLK00001", "playBLK000001", "uploadBLK0001");
    await db.query(
      `update public.social_music_scans
       set status = 'blocked',
           decided_at = now(),
           next_attempt_at = null,
           attempt_count = 2,
           vendor_score = 40,
           window_results = '[{"kind":"match"}]'::jsonb
       where profile_id = $1 and playback_id = 'playBLK000001'`,
      [profile],
    );
    const scansBefore = await db.query<{ n: string }>(
      `select count(*)::text as n from public.social_music_scans where profile_id = $1`,
      [profile],
    );
    const assetsBefore = await db.query<{ n: string }>(
      `select count(*)::text as n from public.social_mux_bindings where author_id = $1`,
      [profile],
    );
    await setWelcome(profile, null, null, null);
    await setWelcome(profile, "assetBLK00001", "playBLK000001", "uploadBLK0001");
    const row = await db.query<{
      last_error: string | null;
      status: string;
      attempt_count: number;
      vendor_score: string | null;
      windows: number;
      next_attempt_at: string | null;
    }>(
      `select last_error, status::text as status, attempt_count, vendor_score::text as vendor_score,
              jsonb_array_length(window_results) as windows, next_attempt_at::text as next_attempt_at
       from public.social_music_scans
       where profile_id = $1 and playback_id = 'playBLK000001'`,
      [profile],
    );
    expect(await welcomeNotices(profile)).toEqual(["blocked"]);
    expect(await strangerSeesWelcome(profile, "assetBLK00001", "playBLK000001")).toBe(false);
    expect(row.rows).toEqual([
      {
        last_error: null,
        status: "blocked",
        attempt_count: 2,
        vendor_score: "40.00",
        windows: 1,
        next_attempt_at: null,
      },
    ]);
    const scansAfter = await db.query<{ n: string }>(
      `select count(*)::text as n from public.social_music_scans where profile_id = $1`,
      [profile],
    );
    const assetsAfter = await db.query<{ n: string }>(
      `select count(*)::text as n from public.social_mux_bindings where author_id = $1`,
      [profile],
    );
    expect(scansAfter.rows[0]?.n).toBe(scansBefore.rows[0]?.n);
    expect(assetsAfter.rows[0]?.n).toBe(assetsBefore.rows[0]?.n);
  });

  it("shows an allowed welcome again when the same pair is saved again", async () => {
    const profile = "77777777-7777-4777-8777-777777777772";
    await db.query(`insert into public.profiles (id) values ($1)`, [profile]);
    await bindWelcome(profile, "uploadALW0001", "assetALW00001", "playALW000001");
    await setWelcome(profile, "assetALW00001", "playALW000001", "uploadALW0001");
    await db.query(
      `update public.social_music_scans
       set status = 'allowed', decided_at = now(), next_attempt_at = null
       where profile_id = $1 and playback_id = 'playALW000001'`,
      [profile],
    );
    await setWelcome(profile, null, null, null);
    await setWelcome(profile, "assetALW00001", "playALW000001", "uploadALW0001");
    const row = await db.query<{ last_error: string | null; status: string; next_attempt_at: string | null }>(
      `select last_error, status::text as status, next_attempt_at::text as next_attempt_at
       from public.social_music_scans
       where profile_id = $1 and playback_id = 'playALW000001'`,
      [profile],
    );
    expect(row.rows).toEqual([{ last_error: null, status: "allowed", next_attempt_at: null }]);
    expect(await welcomeNotices(profile)).toEqual([]);
    expect(await strangerSeesWelcome(profile, "assetALW00001", "playALW000001")).toBe(true);
  });

  it("leaves other superseded welcome rows superseded when one pair is saved again", async () => {
    const profile = "77777777-7777-4777-8777-777777777773";
    await db.query(`insert into public.profiles (id) values ($1)`, [profile]);
    await bindWelcome(profile, "uploadOTH0001", "assetOTH00001", "playOTH000001");
    await bindWelcome(profile, "uploadPND0001", "assetPND00001", "playPND000001");
    await bindWelcome(profile, "uploadAGN0001", "assetAGN00001", "playAGN000001");
    await setWelcome(profile, "assetOTH00001", "playOTH000001", "uploadOTH0001");
    await db.query(
      `update public.social_music_scans
       set status = 'blocked', decided_at = now(), next_attempt_at = null
       where profile_id = $1 and playback_id = 'playOTH000001'`,
      [profile],
    );
    await setWelcome(profile, "assetPND00001", "playPND000001", "uploadPND0001");
    await db.query(
      `update public.social_music_scans
       set attempt_count = 4
       where profile_id = $1 and playback_id = 'playPND000001'`,
      [profile],
    );
    await setWelcome(profile, "assetAGN00001", "playAGN000001", "uploadAGN0001");
    await db.query(
      `update public.social_music_scans
       set status = 'pending', next_attempt_at = null, attempt_count = 1
       where profile_id = $1 and playback_id = 'playAGN000001'`,
      [profile],
    );
    await setWelcome(profile, null, null, null);
    await setWelcome(profile, "assetAGN00001", "playAGN000001", "uploadAGN0001");
    const rows = await db.query<{
      playback_id: string;
      last_error: string | null;
      status: string;
      attempt_count: number;
      due: boolean;
    }>(
      `select playback_id, last_error, status::text as status, attempt_count,
              (next_attempt_at is not null) as due
       from public.social_music_scans
       where profile_id = $1
       order by playback_id`,
      [profile],
    );
    expect(rows.rows).toEqual([
      { playback_id: "playAGN000001", last_error: null, status: "pending", attempt_count: 0, due: true },
      { playback_id: "playOTH000001", last_error: "superseded", status: "blocked", attempt_count: 0, due: false },
      { playback_id: "playPND000001", last_error: "superseded", status: "pending", attempt_count: 4, due: false },
    ]);
    expect(await welcomeNotices(profile)).toEqual(["welcomePending"]);
  });

  it("does not backfill an expired story on either video path", async () => {
    const expired = await db.query(
      `select last_error from public.social_music_scans where story_id = $1`,
      [expiredStory],
    );
    expect(expired.rows).toEqual([]);
    const s3 = await db.query(
      `select 1 from public.social_music_scans where last_error = 's3_video_needs_mux' and story_id in (
         select id from public.stories where expires_at <= now()
       )`,
    );
    expect(s3.rows).toEqual([]);
    const retry = await db.query<{ next_attempt_at: string | null }>(
      `select next_attempt_at from public.social_music_scans where last_error = 's3_video_needs_mux' and post_id = $1`,
      [legacyS3],
    );
    expect(retry.rows[0]?.next_attempt_at).toBeNull();
  });

  it("cascades a post delete and a story delete", async () => {
    await bind("assetPOSTCASC1", "playPOSTCASC1");
    const postId = await insertPost(vid("assetPOSTCASC1", "playPOSTCASC1"));
    expect((await scansFor(postId)).length).toBeGreaterThan(0);
    await db.query(`delete from public.posts where id = $1`, [postId]);
    expect((await scansFor(postId)).length).toBe(0);

    await bind("assetSTRYCASC1", "playSTRYCASC1", "uploadSTRYCASC");
    const storyId = await insertStory(vid("assetSTRYCASC1", "playSTRYCASC1"));
    expect((await scansFor(storyId)).length).toBeGreaterThan(0);
    await db.query(`delete from public.stories where id = $1`, [storyId]);
    expect((await scansFor(storyId)).length).toBe(0);
  });

  it("refuses an allow once that playback is blocked, including two writers", async () => {
    await bind("assetRACE00001", "playRACE00001");
    const first = await insertPost(vid("assetRACE00001", "playRACE00001"));
    const second = await insertPost(vid("assetRACE00001", "playRACE00001"));
    await setStatus(first, "blocked");
    await expect(setStatus(second, "allowed")).rejects.toThrow(/blocked/);
    const released = await db.query<{ released: boolean }>(
      `select private.social_video_released('post', $1) as released`,
      [first],
    );
    expect(released.rows[0]?.released).toBe(false);
    await db.query(`alter table public.social_music_scans disable trigger social_music_scans_block_wins`);
    await setStatus(second, "allowed");
    const slipped = await db.query<{ released: boolean }>(
      `select private.social_video_released('post', $1) as released`,
      [second],
    );
    expect(slipped.rows[0]?.released).toBe(false);
    await db.query(`alter table public.social_music_scans enable trigger social_music_scans_block_wins`);

    await bind("assetRACE00002", "playRACE00002", "uploadRACE0002");
    const left = await insertPost(vid("assetRACE00002", "playRACE00002"));
    const right = await insertPost(vid("assetRACE00002", "playRACE00002"));
    const raced = await Promise.allSettled([
      db.query(
        `update public.social_music_scans set status = 'blocked', next_attempt_at = null, decided_at = now() where post_id = $1`,
        [left],
      ),
      db.query(
        `update public.social_music_scans set status = 'allowed', next_attempt_at = null, decided_at = now() where post_id = $1`,
        [right],
      ),
    ]);
    expect(raced.some((row) => row.status === "fulfilled")).toBe(true);
    const visible = await db.query<{ released: boolean }>(
      `select private.social_video_released('post', id) as released
       from public.posts where id = $1 or id = $2`,
      [left, right],
    );
    expect(visible.rows.every((row) => row.released === false)).toBe(true);
  });

  it("enqueues a welcome scan on insert and validates the profile constraint", async () => {
    const fresh = "44444444-4444-4444-8444-444444444444";
    await expect(
      db.query(
        `insert into public.profiles (id, welcome_mux_asset_id, welcome_mux_playback_id, welcome_mux_upload_id)
         values ($1, 'assetINS00001', 'playINS000001', 'uploadINS0001')`,
        [fresh],
      ),
    ).rejects.toThrow(/not bound/);
    const validated = await db.query<{ convalidated: boolean }>(
      `select convalidated from pg_constraint where conname = 'profiles_welcome_mux_ids'`,
    );
    expect(validated.rows[0]?.convalidated).toBe(true);
    expect(PROFILES.toLowerCase()).toMatch(/\)\s*not valid\s*;/);
    expect(PROFILES.toLowerCase()).toContain("validate constraint");
    const lock = await db.query<{ v: string }>(`select current_setting('lock_timeout') as v`);
    expect(lock.rows[0]?.v).toBe("3s");
    expect(PROFILES).toContain("after insert or update");
    expect(PROFILES).toContain("ACCESS EXCLUSIVE");
  });

  it("reuses one welcome asset and retires the s3 placeholder", async () => {
    const profile = "66666666-6666-4666-8666-666666666666";
    await db.query(`insert into public.profiles (id) values ($1)`, [profile]);
    const digest = profile.replace(/-/g, "").slice(0, 32);
    await db.query(
      `insert into public.social_music_scans (
         surface, profile_id, author_id, asset_id, playback_id, status, next_attempt_at, last_error
       ) values ('welcome', $1, $1, $2, $2, 'pending', null, 's3_video_needs_mux')`,
      [profile, digest],
    );
    const sql = {
      query: <T extends Record<string, unknown>>(text: string, params?: readonly unknown[]) =>
        db.query<T>(text, params ? [...params] : []),
    };
    await rememberWelcomeReingestAsset(sql, { profileId: profile, authorId: profile, assetId: "assetREINGEST1" });
    await rememberWelcomeReingestAsset(sql, { profileId: profile, authorId: profile, assetId: "assetREINGEST1" });
    expect(await welcomeReingestAssetId(sql, profile)).toBe("assetREINGEST1");
    const count = await db.query<{ n: number }>(
      `select count(*)::int as n from public.social_music_scans where profile_id = $1`,
      [profile],
    );
    expect(count.rows[0]?.n).toBe(1);
    await retireS3MusicPlaceholder(sql, { surface: "welcome", parentId: profile });
    const unfinished = await db.query(
      `select 1 from public.social_music_scans
       where profile_id = $1 and status = 'pending' and next_attempt_at is null and last_error is distinct from 'superseded'`,
      [profile],
    );
    expect(unfinished.rows).toEqual([]);
  });

  it("lets the authenticated author read a notice and refuses last_error", async () => {
    await bind("assetNOTE0001", "playNOTE00001", "uploadNOTE0001");
    await bind("assetNOTE0002", "playNOTE00002", "uploadNOTE0002");
    await bind("assetNOTE0003", "playNOTE00003", "uploadNOTE0003");
    await bind("assetNOTE0004", "playNOTE00004", "uploadNOTE0004");
    await bind("assetNOTE0005", "playNOTE00005", "uploadNOTE0005");
    const pending = await insertPost(vid("assetNOTE0001", "playNOTE00001"));
    const blocked = await insertPost(vid("assetNOTE0002", "playNOTE00002"));
    await setStatus(blocked, "blocked");
    const malformed = await insertPost(vid("assetNOTE0003", "playNOTE00003"));
    await db.query(
      `update public.social_music_scans
       set attempt_count = 8, next_attempt_at = null
       where post_id = $1`,
      [malformed],
    );
    const retrying = await insertPost(vid("assetNOTE0004", "playNOTE00004"));
    await db.query(
      `update public.social_music_scans
       set attempt_count = 2, next_attempt_at = now()
       where post_id = $1`,
      [retrying],
    );
    const replaced = await insertPost(vid("assetNOTE0005", "playNOTE00005"));
    await db.query(
      `update public.social_music_scans
       set last_error = 'superseded', next_attempt_at = null, attempt_count = 0
       where post_id = $1`,
      [replaced],
    );

    const rows = await asUser(A, async () => {
      const result = await db.query<{ post_id: string; notice: string }>(
        `select post_id::text as post_id, notice
         from public.social_music_author_notices($1::uuid[], '{}'::uuid[])`,
        [[pending, blocked, malformed, retrying, replaced]],
      );
      return result.rows;
    });
    const byId = new Map(rows.map((row) => [row.post_id, row.notice]));
    expect(byId.get(pending)).toBe("pending");
    expect(byId.get(blocked)).toBe("blocked");
    expect(byId.get(malformed)).toBe("malformed");
    expect(byId.get(retrying)).toBe("pending");
    expect(byId.has(replaced)).toBe(false);

    await expect(
      asUser(A, () => db.query(`select last_error from public.social_music_scans where author_id = $1`, [A])),
    ).rejects.toThrow(/permission denied/);

    const stranger = await asUser(B, async () => {
      const result = await db.query(
        `select post_id from public.social_music_author_notices($1::uuid[], '{}'::uuid[])`,
        [[pending]],
      );
      return result.rows;
    });
    expect(stranger).toEqual([]);

    const source = readFileSync("src/lib/social-music-scan.ts", "utf8");
    const body = source.slice(source.indexOf("export async function loadOwnMusicNotices"));
    const selects = [...body.matchAll(/\.select\(\s*"([^"]+)"\s*\)/g)].map((match) => match[1]);
    for (const columns of selects) {
      await asUser(A, () =>
        db.query(`select ${columns} from public.social_music_scans where author_id = $1 limit 1`, [A]),
      );
    }
  });

  it("keeps a fresh pending row pending when the attempt cap check is present", async () => {
    await bind("assetHOLD0001", "playHOLD00001", "uploadHOLD0001");
    const held = await insertPost(vid("assetHOLD0001", "playHOLD00001"));
    await db.query(
      `update public.social_music_scans
       set attempt_count = 0, next_attempt_at = null, last_error = null
       where post_id = $1`,
      [held],
    );
    const legacy = await asUser(A, async () => {
      const result = await db.query<{ post_id: string | null; notice: string }>(
        `select post_id::text as post_id, notice
         from public.social_music_author_notices($1::uuid[], '{}'::uuid[])`,
        [[held, legacyS3]],
      );
      return result.rows;
    });
    const byId = new Map(legacy.map((row) => [row.post_id, row.notice]));
    expect(byId.get(held)).toBe("pending");
    expect(byId.get(legacyS3)).toBe("legacyHeld");

    const anon = await db.query<{ ok: boolean }>(
      `select has_function_privilege('anon', 'public.social_music_author_notices(uuid[], uuid[])', 'execute') as ok`,
    );
    const auth = await db.query<{ ok: boolean }>(
      `select has_function_privilege('authenticated', 'public.social_music_author_notices(uuid[], uuid[])', 'execute') as ok`,
    );
    expect(anon.rows[0]?.ok).toBe(false);
    expect(auth.rows[0]?.ok).toBe(true);
    const path = await db.query<{ cfg: string }>(
      `select cfg
       from pg_proc p
       join pg_namespace n on n.oid = p.pronamespace
       cross join lateral unnest(p.proconfig) as cfg
       where n.nspname = 'public' and p.proname = 'social_music_author_notices'`,
    );
    expect(path.rows.some((row) => row.cfg.startsWith("search_path=") && !row.cfg.includes("public"))).toBe(true);
    await db.exec(`set role anon`);
    await expect(
      db.query(`select public.social_music_author_notices('{}'::uuid[], '{}'::uuid[])`),
    ).rejects.toThrow(/permission denied/);
    await db.exec(`reset role`);

    const tooMany = Array.from({ length: 501 }, () => crypto.randomUUID());
    await expect(
      asUser(A, () => db.query(`select notice from public.social_music_author_notices($1::uuid[], '{}'::uuid[])`, [tooMany])),
    ).rejects.toThrow(/500/);
    await asUser(A, () => db.query(`select notice from public.social_music_author_notices('{}'::uuid[], '{}'::uuid[])`));
  });

  it("takes no advisory lock for a pending insert and still locks allow and block", async () => {
    const parent = await db.query<{ id: string }>(
      `insert into public.posts (author_id, media) values ($1, '[]'::jsonb) returning id`,
      [A],
    );
    const postId = parent.rows[0]!.id;
    async function locksFor(status: "pending" | "allowed" | "blocked", asset: string): Promise<number> {
      const decided = status === "pending" ? "null" : "now()";
      const results = await db.exec(`
        begin;
        insert into public.social_music_scans (surface, post_id, author_id, asset_id, playback_id, status, decided_at)
        values ('post', '${postId}', '${A}', '${asset}', '${asset}', '${status}', ${decided});
        select count(*)::int as n from pg_locks where locktype = 'advisory';
        rollback;
      `);
      const count = results.find((result) => result.rows.some((row) => "n" in row));
      return Number(count?.rows[0]?.n ?? -1);
    }
    expect(await locksFor("pending", "assetLOCKP01")).toBe(0);
    expect(await locksFor("allowed", "assetLOCKA01")).toBeGreaterThan(0);
    expect(await locksFor("blocked", "assetLOCKB01")).toBeGreaterThan(0);
  });

  it("resets a superseded pending row when the same playback is attached again", async () => {
    await bind("assetSUPR00001", "playSUPR00001", "uploadSUPR0001");
    const id = await insertPost(vid("assetSUPR00001", "playSUPR00001"));
    await db.query(
      `update public.social_music_scans
       set last_error = 'superseded', next_attempt_at = null, attempt_count = 3
       where post_id = $1`,
      [id],
    );
    await db.query(`update public.posts set media = '[]'::jsonb where id = $1`, [id]);
    await db.query(`update public.posts set media = $2::jsonb where id = $1`, [id, vid("assetSUPR00001", "playSUPR00001")]);
    const row = await db.query<{ last_error: string | null; next_attempt_at: string | null; attempt_count: number }>(
      `select last_error, next_attempt_at::text as next_attempt_at, attempt_count
       from public.social_music_scans where post_id = $1`,
      [id],
    );
    expect(row.rows[0]?.last_error).toBeNull();
    expect(row.rows[0]?.next_attempt_at).not.toBeNull();
    expect(row.rows[0]?.attempt_count).toBe(0);
  });

  it("moves both S3 videos in one update, then a welcome, and a second pass does nothing", async () => {
    const keyA = `posts/${A}/one.mp4`;
    const keyB = `posts/${A}/two.mp4`;
    const digestA = socialVideoKeyDigest(keyA);
    const digestB = socialVideoKeyDigest(keyB);
    await db.exec(`alter table public.posts disable trigger posts_enqueue_social_music_scan`);
    const inserted = await db.query<{ id: string }>(
      `insert into public.posts (author_id, media) values ($1, $2::jsonb) returning id`,
      [
        A,
        JSON.stringify([
          { kind: "video", key: keyA, contentType: "video/mp4" },
          { kind: "video", key: keyB, contentType: "video/mp4" },
        ]),
      ],
    );
    const postId = inserted.rows[0]!.id;
    await db.query(
      `insert into public.social_music_scans (
         surface, post_id, author_id, asset_id, playback_id, status, next_attempt_at, last_error
       ) values
         ('post', $1, $2, $3, $3, 'pending', null, 's3_video_needs_mux'),
         ('post', $1, $2, $4, $4, 'pending', null, 's3_video_needs_mux')`,
      [postId, A, digestA, digestB],
    );
    await db.exec(`alter table public.posts enable trigger posts_enqueue_social_music_scan`);
    const media = [
      { kind: "video", key: keyA, contentType: "video/mp4" },
      { kind: "video", key: keyB, contentType: "video/mp4" },
    ];
    const half = socialReingestMediaWithMux(media, [
      {
        candidate: {
          surface: "post",
          parentId: postId,
          authorId: A,
          key: keyA,
          expired: false,
          assetId: null,
          playbackId: null,
        },
        assetId: "assetHALF0001",
        playbackId: "playHALF00001",
        uploadId: "assetHALF0001",
      },
    ]);
    await db.query(
      `insert into public.social_mux_bindings (author_id, upload_id, asset_id, playback_id)
       values ($1, 'assetHALF0001', 'assetHALF0001', 'playHALF00001') on conflict do nothing`,
      [A],
    );
    await expect(
      db.query(`update public.posts set media = $1::jsonb where id = $2`, [JSON.stringify(half), postId]),
    ).rejects.toThrow(/must be a Mux video/);

    const profile = "77777777-7777-4777-8777-777777777777";
    await db.query(`insert into public.profiles (id) values ($1)`, [profile]);
    await db.exec(`alter table public.profiles add column if not exists welcome_video_key text`);
    const welcomeKey = `posts/${profile}/welcome.mp4`;
    await db.query(`update public.profiles set welcome_video_key = $2 where id = $1`, [profile, welcomeKey]);

    let creates = 0;
    const playbackFor = new Map<string, string>();
    const sql = {
      query: <T extends Record<string, unknown>>(text: string, params?: readonly unknown[]) =>
        db.query<T>(text, params ? [...params] : []),
    };
    const candidates: SocialReingestCandidate[] = [
      { surface: "post", parentId: postId, authorId: A, key: keyA, expired: false, assetId: null, playbackId: null },
      { surface: "post", parentId: postId, authorId: A, key: keyB, expired: false, assetId: null, playbackId: null },
      {
        surface: "welcome",
        parentId: profile,
        authorId: profile,
        key: welcomeKey,
        expired: false,
        assetId: null,
        playbackId: null,
      },
    ];
    const deps = {
      head: async () => true,
      presign: async () => "https://example.test/clip",
      createAsset: async () => {
        creates += 1;
        const assetId = `assetRE${String(creates).padStart(6, "0")}`;
        playbackFor.set(assetId, `playRE${String(creates).padStart(6, "0")}`);
        return { assetId };
      },
      loadAsset: async (assetId: string) => ({
        playbackId: playbackFor.get(assetId) ?? null,
        duration: 12,
        status: "ready",
      }),
      deleteAsset: async () => {},
      bind: async (input: { authorId: string; uploadId: string; assetId: string; playbackId: string }) => {
        await db.query(
          `insert into public.social_mux_bindings (author_id, upload_id, asset_id, playback_id)
           values ($1, $2, $3, $4) on conflict do nothing`,
          [input.authorId, input.uploadId, input.assetId, input.playbackId],
        );
      },
      saveInProgress: async (candidate: SocialReingestCandidate, assetId: string) => {
        if (candidate.surface === "welcome") return;
        const digest = socialVideoKeyDigest(candidate.key);
        await db.query(
          `update public.social_music_scans set upload_id = $3
           where post_id = $1 and asset_id = $2 and playback_id = $2 and last_error = 's3_video_needs_mux'`,
          [candidate.parentId, digest, assetId],
        );
      },
      saveParent: async (
        parent: { surface: SocialReingestCandidate["surface"]; parentId: string },
        settled: readonly SocialReingestSettled[],
      ) => {
        if (parent.surface === "welcome") {
          const ids = settled[0];
          if (!ids) return;
          await db.query(
            `update public.profiles
             set welcome_mux_asset_id = $2, welcome_mux_playback_id = $3, welcome_mux_upload_id = $4
             where id = $1`,
            [parent.parentId, ids.assetId, ids.playbackId, ids.uploadId],
          );
          return;
        }
        const loaded = await db.query<{ media: unknown }>(`select media from public.posts where id = $1`, [
          parent.parentId,
        ]);
        const next = socialReingestMediaWithMux(
          Array.isArray(loaded.rows[0]?.media) ? loaded.rows[0].media : [],
          settled,
        );
        await db.query(`update public.posts set media = $2::jsonb where id = $1`, [parent.parentId, JSON.stringify(next)]);
      },
      retirePlaceholder: (candidate: SocialReingestCandidate) =>
        retireS3MusicPlaceholder(sql, { surface: candidate.surface, parentId: candidate.parentId }),
      markUnfinished: async () => {},
      alreadyUnfinished: async () => false,
    };
    const first = await reingestSocialS3Videos({ execute: true, candidates, deps });
    expect(first.bound).toBe(3);
    expect(creates).toBe(3);
    const left = await db.query<{ n: number }>(
      `select count(*)::int as n from public.social_music_scans
       where post_id = $1 and last_error = 's3_video_needs_mux'`,
      [postId],
    );
    expect(left.rows[0]?.n).toBe(0);
    const stored = await db.query<{ media: { provider?: string }[] }>(`select media from public.posts where id = $1`, [
      postId,
    ]);
    expect(stored.rows[0]?.media.every((item) => item.provider === "mux")).toBe(true);
    const welcome = await db.query<{ playback: string | null }>(
      `select welcome_mux_playback_id as playback from public.profiles where id = $1`,
      [profile],
    );
    expect(welcome.rows[0]?.playback).toBeTruthy();
    const again = await reingestSocialS3Videos({
      execute: true,
      candidates: [
        {
          ...candidates[2]!,
          playbackId: welcome.rows[0]?.playback ?? null,
          assetId: "assetRE000003",
        },
      ],
      deps,
    });
    expect(again.bound).toBe(0);
    expect(creates).toBe(3);
  });

  it("finishes a cleared pending welcome when the same pair is saved again", async () => {
    const seeded = await seedWelcomeState("pending mid-scan");
    const scansBefore = await scanCount(seeded.profile);
    const bindingsBefore = await bindingCount(seeded.profile);
    await clearWelcomeProfile(seeded.profile);
    await setWelcome(seeded.profile, seeded.asset, seeded.play, seeded.upload);
    const tick = await tickWelcome(seeded.profile, seeded.play);
    const row = await welcomeScan(seeded.profile, seeded.play);
    expect(row.status).toBe("allowed");
    expect(row.id).toBe(seeded.scanId);
    expect(row.asset_id).toBe(seeded.asset);
    expect(row.windows).toBe(1);
    expect(row.last_error).toBeNull();
    expect(row.due).toBe(false);
    expect(row.later).toBe(false);
    expect(tick.identified).toBe(0);
    expect(tick.sliced).toBe(0);
    expect(tick.summary.allowed).toBe(1);
    expect(await scanCount(seeded.profile)).toBe(scansBefore);
    expect(await bindingCount(seeded.profile)).toBe(bindingsBefore);
    expect(await welcomeNotices(seeded.profile)).toEqual([]);
    expect(await othersSeeCurrentWelcome(seeded.profile)).toBe(true);
    await siblingStillOff(seeded.profile, seeded.siblingPlay);
  });

  it("welcome state: save a new pair", async () => {
    for (const state of WELCOME_STATES) {
      const seeded = await seedWelcomeState(state);
      const scansBefore = await scanCount(seeded.profile);
      const suffix = seeded.profile.slice(-4);
      const nextAsset = `assetNX${suffix}`;
      const nextPlay = `playNX${suffix}a`;
      const nextUpload = `upldNX${suffix}a`;
      await bindWelcome(seeded.profile, nextUpload, nextAsset, nextPlay);
      await db.query(
        `update public.profiles
         set welcome_mux_asset_id = $2,
             welcome_mux_playback_id = $3,
             welcome_mux_upload_id = $4,
             welcome_video_key = null
         where id = $1`,
        [seeded.profile, nextAsset, nextPlay, nextUpload],
      );
      const old = await welcomeScan(seeded.profile, seeded.play);
      const created = await welcomeScan(seeded.profile, nextPlay);
      expect(old.id).toBe(seeded.scanId);
      expect(old.asset_id).toBe(seeded.asset);
      expect(old.last_error).toBe("superseded");
      expect(old.due).toBe(false);
      expect(old.later).toBe(false);
      expect(created.status).toBe("pending");
      expect(created.last_error).toBeNull();
      expect(created.due).toBe(true);
      expect(await welcomeNotices(seeded.profile)).toEqual(["welcomePending"]);
      expect(await othersSeeCurrentWelcome(seeded.profile)).toBe(false);
      expect(await scanCount(seeded.profile)).toBe(scansBefore + 1);
      expect(await bindingCount(seeded.profile)).toBe(state === "reingest_failed" ? 1 : 2);
      await siblingStillOff(seeded.profile, seeded.siblingPlay);
    }
  });

  it("welcome state: clear", async () => {
    for (const state of WELCOME_STATES) {
      const seeded = await seedWelcomeState(state);
      const scansBefore = await scanCount(seeded.profile);
      const bindingsBefore = await bindingCount(seeded.profile);
      await clearWelcomeProfile(seeded.profile);
      const row = await welcomeScan(seeded.profile, seeded.play);
      expect(row.id).toBe(seeded.scanId);
      expect(row.last_error).toBe("superseded");
      expect(row.due).toBe(false);
      expect(row.later).toBe(false);
      expect(await welcomeNotices(seeded.profile)).toEqual([]);
      expect(await othersSeeCurrentWelcome(seeded.profile)).toBe(false);
      expect(await scanCount(seeded.profile)).toBe(scansBefore);
      expect(await bindingCount(seeded.profile)).toBe(bindingsBefore);
      await siblingStillOff(seeded.profile, seeded.siblingPlay);
    }
  });

  it("welcome state: re-save the same pair", async () => {
    for (const state of WELCOME_STATES) {
      const seeded = await seedWelcomeState(state);
      const scansBefore = await scanCount(seeded.profile);
      const bindingsBefore = await bindingCount(seeded.profile);
      if (state === "reingest_failed") {
        const row = await welcomeScan(seeded.profile, seeded.play);
        expect(row.last_error).toBe("reingest_failed");
        expect(row.due).toBe(false);
        expect(row.later).toBe(false);
        expect(await scanCount(seeded.profile)).toBe(scansBefore);
        expect(await bindingCount(seeded.profile)).toBe(bindingsBefore);
        await siblingStillOff(seeded.profile, seeded.siblingPlay);
        continue;
      }
      await clearWelcomeProfile(seeded.profile);
      await setWelcome(seeded.profile, seeded.asset, seeded.play, seeded.upload);
      const row = await welcomeScan(seeded.profile, seeded.play);
      expect(row.id).toBe(seeded.scanId);
      expect(row.asset_id).toBe(seeded.asset);
      expect(row.last_error).toBeNull();
      expect(await scanCount(seeded.profile)).toBe(scansBefore);
      expect(await bindingCount(seeded.profile)).toBe(bindingsBefore);
      await siblingStillOff(seeded.profile, seeded.siblingPlay);
      if (state === "allowed") {
        expect(row.status).toBe("allowed");
        expect(row.due).toBe(false);
        expect(row.later).toBe(false);
        expect(await welcomeNotices(seeded.profile)).toEqual([]);
        expect(await othersSeeCurrentWelcome(seeded.profile)).toBe(true);
      } else if (state === "blocked") {
        expect(row.status).toBe("blocked");
        expect(row.due).toBe(false);
        expect(row.later).toBe(false);
        expect(await welcomeNotices(seeded.profile)).toEqual(["blocked"]);
        expect(await othersSeeCurrentWelcome(seeded.profile)).toBe(false);
      } else {
        expect(row.status).toBe("pending");
        expect(row.due).toBe(true);
        expect(row.later).toBe(false);
        expect(row.attempt_count).toBe(0);
        expect(row.windows).toBe(state === "pending mid-scan" || state === "superseded" ? 1 : 0);
        expect(await welcomeNotices(seeded.profile)).toEqual(["welcomePending"]);
        expect(await othersSeeCurrentWelcome(seeded.profile)).toBe(false);
      }
      if (state === "allowed" || state === "blocked") {
        expect(row.attempt_count).toBe(3);
      }
    }
  });

  it("welcome state: worker tick", async () => {
    for (const state of WELCOME_STATES) {
      const seeded = await seedWelcomeState(state);
      const scansBefore = await scanCount(seeded.profile);
      const tick = await tickWelcome(seeded.profile, seeded.play);
      const row = await welcomeScan(seeded.profile, seeded.play);
      expect(row.id).toBe(seeded.scanId);
      expect(await scanCount(seeded.profile)).toBe(scansBefore);
      await siblingStillOff(seeded.profile, seeded.siblingPlay);
      if (state === "pending queued") {
        expect(row.status).toBe("allowed");
        expect(tick.identified).toBe(1);
        expect(row.due).toBe(false);
        expect(await welcomeNotices(seeded.profile)).toEqual([]);
        expect(await othersSeeCurrentWelcome(seeded.profile)).toBe(true);
      } else if (state === "pending mid-scan") {
        expect(row.status).toBe("allowed");
        expect(tick.identified).toBe(0);
        expect(tick.sliced).toBe(0);
        expect(row.windows).toBe(1);
        expect(await welcomeNotices(seeded.profile)).toEqual([]);
        expect(await othersSeeCurrentWelcome(seeded.profile)).toBe(true);
      } else if (state === "pending backing off") {
        expect(row.status).toBe("pending");
        expect(row.later).toBe(true);
        expect(row.last_error).toBe("acr_rate_limit:1");
        expect(tick.identified).toBe(0);
        expect(await welcomeNotices(seeded.profile)).toEqual(["welcomePending"]);
        expect(await othersSeeCurrentWelcome(seeded.profile)).toBe(false);
      } else if (state === "allowed") {
        expect(row.status).toBe("allowed");
        expect(tick.identified).toBe(0);
        expect(await welcomeNotices(seeded.profile)).toEqual([]);
        expect(await othersSeeCurrentWelcome(seeded.profile)).toBe(true);
      } else if (state === "blocked") {
        expect(row.status).toBe("blocked");
        expect(tick.identified).toBe(0);
        expect(await welcomeNotices(seeded.profile)).toEqual(["blocked"]);
        expect(await othersSeeCurrentWelcome(seeded.profile)).toBe(false);
      } else if (state === "reingest_failed") {
        expect(row.last_error).toBe("reingest_failed");
        expect(row.due).toBe(false);
        expect(row.later).toBe(false);
        expect(tick.identified).toBe(0);
        expect(await welcomeNotices(seeded.profile)).toEqual(["welcomePending"]);
        expect(await othersSeeCurrentWelcome(seeded.profile)).toBe(false);
      } else if (state === "pending exhausted") {
        expect(row.status).toBe("pending");
        expect(row.attempt_count).toBe(8);
        expect(row.due).toBe(false);
        expect(row.later).toBe(false);
        expect(tick.identified).toBe(0);
        expect(await welcomeNotices(seeded.profile)).toEqual(["malformed"]);
        expect(await othersSeeCurrentWelcome(seeded.profile)).toBe(false);
      } else {
        expect(row.last_error).toBe("superseded");
        expect(row.due).toBe(false);
        expect(row.later).toBe(false);
        expect(tick.identified).toBe(0);
        expect(await welcomeNotices(seeded.profile)).toEqual([]);
        expect(await othersSeeCurrentWelcome(seeded.profile)).toBe(false);
      }
    }
  });

  it("welcome state: re-ingest rerun", async () => {
    for (const state of WELCOME_STATES) {
      const seeded = await seedWelcomeState(state);
      const key = await db.query<{ key: string | null }>(
        `select welcome_video_key as key from public.profiles where id = $1`,
        [seeded.profile],
      );
      const remembered = await welcomeReingestAssetId(
        { query: (text, params) => db.query(text, params ? [...params] : []) },
        seeded.profile,
      );
      const candidate = welcomeProfileReingestCandidate({
        id: seeded.profile,
        welcomeVideoKey: key.rows[0]?.key ?? null,
        welcomeMuxAssetId: state === "reingest_failed" ? null : seeded.asset,
        welcomeMuxPlaybackId: state === "reingest_failed" ? null : seeded.play,
        progressUploadId: remembered,
      });
      if (state !== "reingest_failed") {
        expect(candidate).toBeNull();
        const before = await welcomeScan(seeded.profile, seeded.play);
        expect(before.id).toBe(seeded.scanId);
        const resting = welcomeResting(state);
        expect(await welcomeNotices(seeded.profile)).toEqual(resting.notices);
        expect(await othersSeeCurrentWelcome(seeded.profile)).toBe(resting.visible);
        expect(before.due).toBe(resting.due);
        expect(before.later).toBe(resting.later);
        await siblingStillOff(seeded.profile, seeded.siblingPlay);
        continue;
      }
      expect(remembered).toBe(seeded.upload);
      expect(candidate?.assetId).toBe(seeded.upload);
      expect(candidate?.playbackId).toBeNull();
      const playback = `playRM${seeded.profile.slice(-4)}a`;
      let creates = 0;
      const sql = {
        query: <T extends Record<string, unknown>>(text: string, params?: readonly unknown[]) =>
          db.query<T>(text, params ? [...params] : []),
      };
      const report = await reingestSocialS3Videos({
        execute: true,
        candidates: [candidate!],
        deps: {
          head: async () => true,
          presign: async () => "https://example.test/welcome",
          createAsset: async () => {
            creates += 1;
            return { assetId: "assetSHOULDNO" };
          },
          loadAsset: async () => ({ playbackId: playback, duration: 8, status: "ready" }),
          deleteAsset: async () => undefined,
          bind: async (input) => {
            await db.query(
              `insert into public.social_mux_bindings (author_id, upload_id, asset_id, playback_id)
               values ($1, $2, $3, $4)`,
              [input.authorId, input.uploadId, input.assetId, input.playbackId],
            );
          },
          saveInProgress: async () => undefined,
          saveParent: async (parent, settled) => {
            const ids = settled[0];
            if (!ids) return;
            await db.query(
              `update public.profiles
               set welcome_mux_asset_id = $2,
                   welcome_mux_playback_id = $3,
                   welcome_mux_upload_id = $4,
                   welcome_video_key = null
               where id = $1`,
              [parent.parentId, ids.assetId, ids.playbackId, ids.uploadId],
            );
          },
          retirePlaceholder: (row) => retireS3MusicPlaceholder(sql, { surface: row.surface, parentId: row.parentId }),
          markUnfinished: async () => undefined,
          alreadyUnfinished: async () => false,
        },
      });
      expect(creates).toBe(0);
      expect(report.bound).toBe(1);
      const digest = await welcomeScan(seeded.profile, seeded.play);
      expect(digest.id).toBe(seeded.scanId);
      expect(digest.last_error).toBe("superseded");
      expect(digest.due).toBe(false);
      const created = await welcomeScan(seeded.profile, playback);
      expect(created.asset_id).toBe(seeded.upload);
      expect(created.status).toBe("pending");
      expect(created.due).toBe(true);
      expect(await welcomeNotices(seeded.profile)).toEqual(["welcomePending"]);
      expect(await othersSeeCurrentWelcome(seeded.profile)).toBe(false);
      await siblingStillOff(seeded.profile, seeded.siblingPlay);
    }
  });

  it("leaves a welcome queued when the pair is restored before retire, and retires it when the pair is still gone", async () => {
    const kept = await seedWelcomeState("pending queued");
    await clearWelcomeProfile(kept.profile);
    await setWelcome(kept.profile, kept.asset, kept.play, kept.upload);
    const keptCall = await db.query<{ retired: boolean }>(
      `select public.retire_superseded_music_scan($1::uuid) as retired`,
      [kept.scanId],
    );
    expect(keptCall.rows[0]?.retired).toBe(false);
    const keptRow = await welcomeScan(kept.profile, kept.play);
    expect(keptRow.id).toBe(kept.scanId);
    expect(keptRow.status).toBe("pending");
    expect(keptRow.last_error).toBeNull();
    expect(keptRow.due).toBe(true);

    const dropped = await seedWelcomeState("pending queued");
    await clearWelcomeProfile(dropped.profile);
    const droppedCall = await db.query<{ retired: boolean }>(
      `select public.retire_superseded_music_scan($1::uuid) as retired`,
      [dropped.scanId],
    );
    expect(droppedCall.rows[0]?.retired).toBe(true);
    const droppedRow = await welcomeScan(dropped.profile, dropped.play);
    expect(droppedRow.last_error).toBe("superseded");
    expect(droppedRow.due).toBe(false);
    expect(droppedRow.later).toBe(false);

    const postProfile = `55555555-5555-4555-8555-${String(welcomeTag + 1).padStart(12, "0")}`;
    await db.query(`insert into public.profiles (id) values ($1)`, [postProfile]);
    const postAsset = "assetRT000001";
    const postPlay = "playRT000001a";
    await bindWelcome(postProfile, "upldRT000001a", postAsset, postPlay);
    const postId = (
      await db.query<{ id: string }>(
        `insert into public.posts (author_id, media) values ($1, $2::jsonb) returning id`,
        [postProfile, JSON.stringify([{ kind: "video", provider: "mux", assetId: postAsset, playbackId: postPlay, key: `posts/${postProfile}/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.mp4`, contentType: "video/mp4" }])],
      )
    ).rows[0]!.id;
    const postScan = await db.query<{ id: string }>(
      `select id::text as id from public.social_music_scans where post_id = $1`,
      [postId],
    );
    await db.query(`update public.posts set media = '[]'::jsonb where id = $1`, [postId]);
    await db.query(
      `update public.posts set media = $2::jsonb where id = $1`,
      [postId, JSON.stringify([{ kind: "video", provider: "mux", assetId: postAsset, playbackId: postPlay, key: `posts/${postProfile}/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.mp4`, contentType: "video/mp4" }])],
    );
    const postKept = await db.query<{ retired: boolean }>(
      `select public.retire_superseded_music_scan($1::uuid) as retired`,
      [postScan.rows[0]!.id],
    );
    expect(postKept.rows[0]?.retired).toBe(false);
    await db.query(`update public.posts set media = '[]'::jsonb where id = $1`, [postId]);
    const postDropped = await db.query<{ retired: boolean }>(
      `select public.retire_superseded_music_scan($1::uuid) as retired`,
      [postScan.rows[0]!.id],
    );
    expect(postDropped.rows[0]?.retired).toBe(true);

    await expect(
      asUser(kept.profile, () =>
        db.query(`select public.retire_superseded_music_scan($1::uuid)`, [kept.scanId]),
      ),
    ).rejects.toThrow(/permission denied/);
  });
});

function welcomeResting(state: WelcomeRowState): { notices: string[]; visible: boolean; due: boolean; later: boolean } {
  if (state === "pending queued" || state === "pending mid-scan") {
    return { notices: ["welcomePending"], visible: false, due: true, later: false };
  }
  if (state === "pending backing off") {
    return { notices: ["welcomePending"], visible: false, due: false, later: true };
  }
  if (state === "allowed") return { notices: [], visible: true, due: false, later: false };
  if (state === "blocked") return { notices: ["blocked"], visible: false, due: false, later: false };
  if (state === "pending exhausted") return { notices: ["malformed"], visible: false, due: false, later: false };
  return { notices: [], visible: false, due: false, later: false };
}
