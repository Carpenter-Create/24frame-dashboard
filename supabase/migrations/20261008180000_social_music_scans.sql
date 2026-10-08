-- ============================================================================
-- 20261008180000_social_music_scans.sql
--
-- INTENT: Phase 0 commercial-music detect-and-block for Social Mux video
-- (Stories, posts, Create). CoS CLEAR 2026-10-08: ACRCloud identify is the
-- primary vendor. Decision is allow or block. No mute.
--
-- A new Mux video on posts.media or stories.media gets its own
-- social_music_scans row in the same transaction as the insert or media
-- update. The row is keyed to that post or story. A later parent that
-- reuses the asset gets its own row. A prior blocked decision is copied
-- onto the new row, and a prior allowed decision is copied too, so the
-- new parent does not start a second fingerprint. A prior pending scan
-- does not copy: the new row stays pending. Other people cannot see a
-- Mux video until that parent has an allowed scan for the asset and
-- playback id. No scan row is not a release. Stills and text with no Mux
-- item stay visible. The author still sees their own post or story.
-- Existing Mux videos are backfilled as pending in this migration, so
-- they leave the feed until a scan allows them.
--
-- Vendor title, artist, and the other match fields are staff-review columns.
-- authenticated may select status columns on their own rows only. The
-- Lambda (service_role) writes the decision. Nothing is deleted.
--
-- Vendor error or timeout does not allow the video. The worker retries with
-- backoff and leaves status pending. After the attempt cap, next_attempt_at
-- is null and the video stays hidden (fail closed).
--
-- Phase 0 has no allowlist table. A future allowlist could slot in before
-- the block write. This migration does not read a custom bucket. The worker
-- ignores ACRCloud custom_files and does not upload audio to any bucket.
-- A music score at or above the app block threshold (default 25) is blocked
-- immediately. The staff queue lists those rows; it does not release them.
--
-- DESTRUCTIVE OPS (draft only; do NOT apply to production from this PR):
-- CREATE TYPE, CREATE TABLE, CREATE INDEX, CREATE FUNCTION, CREATE TRIGGER,
-- ENABLE RLS, CREATE POLICY, DROP POLICY + CREATE POLICY on posts_select and
-- stories_select (same grants; adds the music visibility predicate), GRANT,
-- REVOKE. No UPDATE, DELETE, or DROP of existing rows.
-- Adam applies this SQL on prod. Do not apply from CI.
--
-- ROLLBACK:
--   drop trigger if exists posts_enqueue_social_music_scan on public.posts;
--   drop trigger if exists stories_enqueue_social_music_scan on public.stories;
--   drop trigger if exists social_music_scans_touch on public.social_music_scans;
--   drop function if exists public.enqueue_social_music_scan();
--   drop function if exists public.touch_social_music_scan();
--   drop function if exists private.social_video_released(text, uuid);
--   drop function if exists public.social_video_released(text, uuid);
--   drop table if exists public.social_music_scans;
--   drop type if exists public.social_music_scan_status;
--   drop type if exists public.social_music_scan_surface;
--   then restore posts_select and stories_select from
--   20260912120000_groups_posts.sql and 20260914120000_social_home_stories.sql.
-- ============================================================================

do $$ begin
  create type public.social_music_scan_surface as enum ('post', 'story');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.social_music_scan_status as enum ('pending', 'allowed', 'blocked');
exception when duplicate_object then null; end $$;

create table if not exists public.social_music_scans (
  id uuid primary key default gen_random_uuid(),
  surface public.social_music_scan_surface not null,
  post_id uuid references public.posts (id),
  story_id uuid references public.stories (id),
  author_id uuid not null references public.profiles (id),
  asset_id text not null,
  playback_id text not null,
  upload_id text,
  status public.social_music_scan_status not null default 'pending',
  attempt_count integer not null default 0,
  next_attempt_at timestamptz default now(),
  last_error text,
  vendor text,
  vendor_status_code integer,
  vendor_score numeric(5, 2),
  vendor_title text,
  vendor_artist text,
  vendor_album text,
  vendor_acrid text,
  vendor_isrc text,
  vendor_label text,
  mux_ready_at timestamptz,
  scan_started_at timestamptz,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint social_music_scans_parent check (
    (surface = 'post' and post_id is not null and story_id is null)
    or (surface = 'story' and story_id is not null and post_id is null)
  ),
  constraint social_music_scans_attempt_nonneg check (attempt_count >= 0),
  constraint social_music_scans_score check (
    vendor_score is null or (vendor_score >= 0 and vendor_score <= 100)
  ),
  constraint social_music_scans_last_error_len check (
    last_error is null or char_length(last_error) <= 80
  ),
  constraint social_music_scans_vendor_len check (
    vendor is null or char_length(vendor) <= 32
  ),
  constraint social_music_scans_ids check (
    asset_id ~ '^[A-Za-z0-9_-]{8,120}$'
    and playback_id ~ '^[A-Za-z0-9_-]{8,120}$'
    and (upload_id is null or upload_id ~ '^[A-Za-z0-9_-]{8,120}$')
  ),
  constraint social_music_scans_decision check (
    (status = 'pending' and decided_at is null)
    or (status in ('allowed', 'blocked') and decided_at is not null)
  )
);

comment on table public.social_music_scans is
  'Phase 0 commercial-music scan for one Social Mux video. Pending and blocked stay hidden from other users. Vendor title and artist are staff-review fields only.';

comment on column public.social_music_scans.vendor_title is
  'Staff review only. Never return this to an end user.';

comment on column public.social_music_scans.vendor_artist is
  'Staff review only. Never return this to an end user.';

comment on column public.social_music_scans.mux_ready_at is
  'When the worker first observed the Mux asset status ready.';

comment on column public.social_music_scans.scan_started_at is
  'When the worker started the fingerprint request for this attempt cycle.';

comment on column public.social_music_scans.decided_at is
  'When the worker wrote allow or block.';

create index if not exists social_music_scans_pending_idx
  on public.social_music_scans (next_attempt_at)
  where status = 'pending' and next_attempt_at is not null;

create index if not exists social_music_scans_blocked_idx
  on public.social_music_scans (created_at desc)
  where status = 'blocked';

create index if not exists social_music_scans_post_idx
  on public.social_music_scans (post_id)
  where post_id is not null;

create index if not exists social_music_scans_story_idx
  on public.social_music_scans (story_id)
  where story_id is not null;

create index if not exists social_music_scans_playback_idx
  on public.social_music_scans (playback_id);

-- One scan row per parent and playback id. A reused asset may have many rows.
create unique index if not exists social_music_scans_post_playback_key
  on public.social_music_scans (post_id, playback_id)
  where post_id is not null;

create unique index if not exists social_music_scans_story_playback_key
  on public.social_music_scans (story_id, playback_id)
  where story_id is not null;

-- Not in the Data API schema list (public, graphql_public). RLS can call it.
-- authenticated keeps execute so the policy runs. anon does not.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

drop function if exists public.social_video_released(text, uuid);

-- A Mux video is released only when this parent has an allowed scan for
-- that asset id and playback id. No row is not a release. A still or a
-- text post has no Mux item, so it stays visible.
create or replace function private.social_video_released(p_surface text, p_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select not exists (
    select 1
    from (
      select item
      from public.posts p
      cross join lateral jsonb_array_elements(
        case when jsonb_typeof(p.media) = 'array' then p.media else '[]'::jsonb end
      ) as item
      where p_surface = 'post'
        and p.id = p_id
      union all
      select item
      from public.stories st
      cross join lateral jsonb_array_elements(
        case when jsonb_typeof(st.media) = 'array' then st.media else '[]'::jsonb end
      ) as item
      where p_surface = 'story'
        and st.id = p_id
    ) mux
    where coalesce(mux.item->>'kind', '') = 'video'
      and coalesce(mux.item->>'provider', '') = 'mux'
      and not exists (
        select 1
        from public.social_music_scans s
        where s.status = 'allowed'
          and s.asset_id = mux.item->>'assetId'
          and s.playback_id = mux.item->>'playbackId'
          and (
            (p_surface = 'post' and s.post_id = p_id)
            or (p_surface = 'story' and s.story_id = p_id)
          )
      )
  );
$$;

revoke all on function private.social_video_released(text, uuid) from public, anon;
grant execute on function private.social_video_released(text, uuid) to authenticated, service_role;

create or replace function public.touch_social_music_scan()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.enqueue_social_music_scan()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  item jsonb;
  v_upload text;
  v_asset text;
  v_playback text;
  v_status public.social_music_scan_status;
  v_decided timestamptz;
  v_vendor text;
  v_vendor_code integer;
  v_score numeric(5, 2);
  v_title text;
  v_artist text;
  v_album text;
  v_acrid text;
  v_isrc text;
  v_label text;
begin
  if tg_op = 'UPDATE' and new.media is not distinct from old.media then
    return new;
  end if;
  if jsonb_typeof(new.media) is distinct from 'array' then
    return new;
  end if;
  for item in select value from jsonb_array_elements(new.media)
  loop
    if coalesce(item->>'kind', '') is distinct from 'video'
       or coalesce(item->>'provider', '') is distinct from 'mux' then
      continue;
    end if;
    v_asset := coalesce(item->>'assetId', '');
    v_playback := coalesce(item->>'playbackId', '');
    -- A Mux video that cannot be scanned must not be stored.
    if v_asset !~ '^[A-Za-z0-9_-]{8,120}$' or v_playback !~ '^[A-Za-z0-9_-]{8,120}$' then
      raise exception 'social music scan requires a Mux asset id and playback id';
    end if;
    v_upload := item->>'uploadId';
    if v_upload is null or v_upload !~ '^[A-Za-z0-9_-]{8,120}$' then
      v_upload := null;
    end if;
    v_status := 'pending';
    v_decided := null;
    v_vendor := null;
    v_vendor_code := null;
    v_score := null;
    v_title := null;
    v_artist := null;
    v_album := null;
    v_acrid := null;
    v_isrc := null;
    v_label := null;
    -- Carry a prior block before a prior allow. Do not copy a pending row.
    select s.status, s.decided_at, s.vendor, s.vendor_status_code, s.vendor_score,
           s.vendor_title, s.vendor_artist, s.vendor_album, s.vendor_acrid,
           s.vendor_isrc, s.vendor_label
      into v_status, v_decided, v_vendor, v_vendor_code, v_score,
           v_title, v_artist, v_album, v_acrid, v_isrc, v_label
    from public.social_music_scans s
    where s.asset_id = v_asset
      and s.status in ('blocked', 'allowed')
    order by case when s.status = 'blocked' then 0 else 1 end, s.decided_at desc nulls last
    limit 1;
    if not found then
      v_status := 'pending';
      v_decided := null;
    elsif v_decided is null then
      v_decided := now();
    end if;
    insert into public.social_music_scans (
      surface,
      post_id,
      story_id,
      author_id,
      asset_id,
      playback_id,
      upload_id,
      status,
      decided_at,
      next_attempt_at,
      vendor,
      vendor_status_code,
      vendor_score,
      vendor_title,
      vendor_artist,
      vendor_album,
      vendor_acrid,
      vendor_isrc,
      vendor_label
    ) values (
      (case when tg_table_name = 'posts' then 'post' else 'story' end)::public.social_music_scan_surface,
      case when tg_table_name = 'posts' then new.id else null end,
      case when tg_table_name = 'stories' then new.id else null end,
      new.author_id,
      v_asset,
      v_playback,
      v_upload,
      v_status,
      case when v_status = 'pending' then null else v_decided end,
      case when v_status = 'pending' then now() else null end,
      case when v_status = 'pending' then null else v_vendor end,
      case when v_status = 'pending' then null else v_vendor_code end,
      case when v_status = 'pending' then null else v_score end,
      case when v_status = 'pending' then null else v_title end,
      case when v_status = 'pending' then null else v_artist end,
      case when v_status = 'pending' then null else v_album end,
      case when v_status = 'pending' then null else v_acrid end,
      case when v_status = 'pending' then null else v_isrc end,
      case when v_status = 'pending' then null else v_label end
    )
    on conflict do nothing;
  end loop;
  return new;
end;
$$;

revoke all on function public.touch_social_music_scan() from public;
revoke all on function public.enqueue_social_music_scan() from public;

drop trigger if exists social_music_scans_touch on public.social_music_scans;
create trigger social_music_scans_touch
  before update on public.social_music_scans
  for each row execute function public.touch_social_music_scan();

drop trigger if exists posts_enqueue_social_music_scan on public.posts;
create trigger posts_enqueue_social_music_scan
  after insert or update of media on public.posts
  for each row execute function public.enqueue_social_music_scan();

drop trigger if exists stories_enqueue_social_music_scan on public.stories;
create trigger stories_enqueue_social_music_scan
  after insert or update of media on public.stories
  for each row execute function public.enqueue_social_music_scan();

alter table public.social_music_scans enable row level security;

drop policy if exists social_music_scans_select_author on public.social_music_scans;
create policy social_music_scans_select_author on public.social_music_scans
  for select to authenticated
  using (author_id = (select auth.uid()));

-- No insert, update, or delete policy. The trigger (security definer) inserts.
-- The Lambda writes with service_role, which bypasses RLS. Do not wire
-- is_gc_staff into this policy. Staff review reads through the service-role
-- client after the app's gc_staff check.

revoke all on public.social_music_scans from anon, authenticated;
grant select (
  id,
  surface,
  post_id,
  story_id,
  author_id,
  asset_id,
  playback_id,
  status,
  attempt_count,
  mux_ready_at,
  scan_started_at,
  decided_at,
  created_at
) on public.social_music_scans to authenticated;

grant select, insert, update on public.social_music_scans to service_role;

-- Other users do not see a post until every still-attached scan is allowed.
-- The author does. create_group still sees non-active rows, but not an
-- unreleased video that is not theirs.
drop policy if exists posts_select on public.posts;
create policy posts_select on public.posts
  for select to authenticated
  using (
    (
      public.has_capability((select auth.uid()), 'create_group')
      or (
        status = 'active'
        and (
          group_id is null
          or public.can_access_group_content(group_id, (select auth.uid()))
        )
      )
    )
    and (
      author_id = (select auth.uid())
      or private.social_video_released('post', id)
    )
  );

drop policy if exists stories_select on public.stories;
create policy stories_select on public.stories
  for select to authenticated
  using (
    status = 'active'
    and expires_at > now()
    and public.is_active_profile(author_id)
    and (
      author_id = (select auth.uid())
      or (
        private.social_video_released('story', id)
        and exists (
          select 1
          from public.follows f
          where f.follower_id = (select auth.uid())
            and f.followee_id = author_id
        )
      )
    )
  );

-- Existing Mux videos become pending scans. They stay hidden from other
-- people until a worker allows them. Ids that cannot be scanned are not
-- inserted; the release function still hides those items.
insert into public.social_music_scans (
  surface, post_id, story_id, author_id, asset_id, playback_id, upload_id
)
select
  'post'::public.social_music_scan_surface,
  p.id,
  null,
  p.author_id,
  item->>'assetId',
  item->>'playbackId',
  case
    when coalesce(item->>'uploadId', '') ~ '^[A-Za-z0-9_-]{8,120}$' then item->>'uploadId'
    else null
  end
from public.posts p
cross join lateral jsonb_array_elements(
  case when jsonb_typeof(p.media) = 'array' then p.media else '[]'::jsonb end
) as item
where coalesce(item->>'kind', '') = 'video'
  and coalesce(item->>'provider', '') = 'mux'
  and coalesce(item->>'assetId', '') ~ '^[A-Za-z0-9_-]{8,120}$'
  and coalesce(item->>'playbackId', '') ~ '^[A-Za-z0-9_-]{8,120}$'
on conflict do nothing;

insert into public.social_music_scans (
  surface, post_id, story_id, author_id, asset_id, playback_id, upload_id
)
select
  'story'::public.social_music_scan_surface,
  null,
  st.id,
  st.author_id,
  item->>'assetId',
  item->>'playbackId',
  case
    when coalesce(item->>'uploadId', '') ~ '^[A-Za-z0-9_-]{8,120}$' then item->>'uploadId'
    else null
  end
from public.stories st
cross join lateral jsonb_array_elements(
  case when jsonb_typeof(st.media) = 'array' then st.media else '[]'::jsonb end
) as item
where coalesce(item->>'kind', '') = 'video'
  and coalesce(item->>'provider', '') = 'mux'
  and coalesce(item->>'assetId', '') ~ '^[A-Za-z0-9_-]{8,120}$'
  and coalesce(item->>'playbackId', '') ~ '^[A-Za-z0-9_-]{8,120}$'
on conflict do nothing;

do $$
begin
  if to_regclass('public.social_music_scans') is null then
    raise exception 'social_music_scans missing after create';
  end if;
  if to_regprocedure('private.social_video_released(text, uuid)') is null then
    raise exception 'social_video_released missing';
  end if;
  if to_regprocedure('public.social_video_released(text, uuid)') is not null then
    raise exception 'social_video_released must not be in public';
  end if;
  if has_function_privilege('anon', 'private.social_video_released(text, uuid)', 'execute') then
    raise exception 'anon must not execute social_video_released';
  end if;
  if to_regprocedure('public.enqueue_social_music_scan()') is null then
    raise exception 'enqueue_social_music_scan missing';
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'posts' and policyname = 'posts_select'
      and qual like '%social_video_released%'
  ) then
    raise exception 'posts_select must call social_video_released';
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'stories' and policyname = 'stories_select'
      and qual like '%social_video_released%'
  ) then
    raise exception 'stories_select must call social_video_released';
  end if;
end $$;
