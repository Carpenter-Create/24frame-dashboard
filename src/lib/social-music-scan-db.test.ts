import { readFileSync } from "node:fs";

import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";

const MIGRATION = readFileSync("supabase/migrations/20261008180000_social_music_scans.sql", "utf8");
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
    grant select on public.follows, public.profiles to authenticated;
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
    [A, JSON.stringify([{ kind: "video", provider: "mux", assetId: "x", playbackId: "y" }])],
  );
  expiredStory = expired.rows[0]!.id;
  await db.exec(MIGRATION);
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
});
