-- ============================================================================
-- 20261008180100_profiles_welcome_mux.sql
--
-- INTENT: Welcome Mux ids on profiles, in their own transaction so the
-- ACCESS EXCLUSIVE lock is not held through the video backfill in
-- 20261008180000_social_music_scans.sql. Apply that file first.
-- Adam applies this. Do not apply from CI. The migration is unapplied.
--
-- LOCKS (lock_timeout 3s is the wait to acquire, not the hold):
--   public.profiles: ACCESS EXCLUSIVE for ADD COLUMN (three nullable
--     columns, no rewrite) and ADD CONSTRAINT ... NOT VALID.
--   VALIDATE CONSTRAINT runs in this same transaction, so it runs while
--   that ACCESS EXCLUSIVE lock is still held. It is not a separate
--   SHARE UPDATE EXCLUSIVE window. Expected hold: the ADD plus one pass
--   over profiles. Not the video backfill.
--   public.profiles: SHARE ROW EXCLUSIVE for CREATE TRIGGER is also held
--   with the ACCESS EXCLUSIVE lock until commit. Milliseconds once acquired.
--
-- ROLLBACK: drop the trigger and function, drop the constraint, drop the
-- three columns. Do this with the scans rollback. Restoring the old
-- policies re-exposes blocked videos. Revert the app in the same window.
-- ============================================================================

set lock_timeout = '0';
set lock_timeout = '3s';

do $lock_timeout$
begin
  if current_setting('lock_timeout') is distinct from '3s' then
    raise exception 'lock_timeout must be 3s';
  end if;
end
$lock_timeout$;

alter table public.profiles
  add column if not exists welcome_mux_asset_id text,
  add column if not exists welcome_mux_playback_id text,
  add column if not exists welcome_mux_upload_id text;

alter table public.profiles drop constraint if exists profiles_welcome_mux_ids;
alter table public.profiles
  add constraint profiles_welcome_mux_ids check (
    (
      welcome_mux_asset_id is null
      and welcome_mux_playback_id is null
      and welcome_mux_upload_id is null
    )
    or (
      welcome_mux_asset_id ~ '^[A-Za-z0-9_-]{8,120}$'
      and welcome_mux_playback_id ~ '^[A-Za-z0-9_-]{8,120}$'
      and welcome_mux_upload_id ~ '^[A-Za-z0-9_-]{8,120}$'
    )
  ) not valid;

alter table public.profiles validate constraint profiles_welcome_mux_ids;

create or replace function public.enqueue_welcome_music_scan()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_upload text;
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
  if tg_op = 'UPDATE'
     and new.welcome_mux_asset_id is not distinct from old.welcome_mux_asset_id
     and new.welcome_mux_playback_id is not distinct from old.welcome_mux_playback_id
     and new.welcome_mux_upload_id is not distinct from old.welcome_mux_upload_id then
    return new;
  end if;
  -- The previous pair no longer decides visibility or the author notice.
  update public.social_music_scans
  set last_error = 'superseded',
      next_attempt_at = null
  where profile_id = new.id
    and surface = 'welcome'
    and last_error is distinct from 'superseded'
    and (
      asset_id is distinct from new.welcome_mux_asset_id
      or playback_id is distinct from new.welcome_mux_playback_id
    );
  if new.welcome_mux_asset_id is null
     and new.welcome_mux_playback_id is null
     and new.welcome_mux_upload_id is null then
    return new;
  end if;
  if not exists (
    select 1
    from public.social_mux_bindings b
    where b.author_id = new.id
      and b.asset_id = new.welcome_mux_asset_id
      and b.playback_id = new.welcome_mux_playback_id
  ) then
    raise exception 'social mux video is not bound to this member';
  end if;
  v_upload := new.welcome_mux_upload_id;
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
  select s.status, s.decided_at, s.vendor, s.vendor_status_code, s.vendor_score,
         s.vendor_title, s.vendor_artist, s.vendor_album, s.vendor_acrid,
         s.vendor_isrc, s.vendor_label
    into v_status, v_decided, v_vendor, v_vendor_code, v_score,
         v_title, v_artist, v_album, v_acrid, v_isrc, v_label
  from public.social_music_scans s
  where s.asset_id = new.welcome_mux_asset_id
    and s.playback_id = new.welcome_mux_playback_id
    and s.status in ('blocked', 'allowed')
  order by case when s.status = 'blocked' then 0 else 1 end, s.decided_at desc nulls last
  limit 1;
  if not found then
    v_status := 'pending';
    v_decided := null;
  elsif v_decided is null then
    v_decided := now();
  end if;
  -- Re-saving this exact pair clears superseded and leaves the scan as it was.
  -- Blocked stays blocked, allowed stays allowed, pending stays pending.
  -- No new scan, and no other row is touched.
  update public.social_music_scans as s
  set last_error = null
  where s.profile_id = new.id
    and s.surface = 'welcome'
    and s.playback_id = new.welcome_mux_playback_id
    and s.asset_id = new.welcome_mux_asset_id
    and s.last_error = 'superseded';
  insert into public.social_music_scans (
    surface, post_id, story_id, profile_id, author_id,
    asset_id, playback_id, upload_id, status, decided_at, next_attempt_at,
    vendor, vendor_status_code, vendor_score, vendor_title, vendor_artist,
    vendor_album, vendor_acrid, vendor_isrc, vendor_label
  ) values (
    'welcome',
    null,
    null,
    new.id,
    new.id,
    new.welcome_mux_asset_id,
    new.welcome_mux_playback_id,
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
  return new;
end;
$$;

revoke all on function public.enqueue_welcome_music_scan() from public, anon, authenticated, service_role;

drop trigger if exists profiles_enqueue_welcome_music_scan on public.profiles;
create trigger profiles_enqueue_welcome_music_scan
  after insert or update of welcome_mux_asset_id, welcome_mux_playback_id, welcome_mux_upload_id
  on public.profiles
  for each row execute function public.enqueue_welcome_music_scan();

do $$
begin
  if has_function_privilege('anon', 'public.enqueue_welcome_music_scan()', 'execute')
     or has_function_privilege('authenticated', 'public.enqueue_welcome_music_scan()', 'execute') then
    raise exception 'enqueue_welcome_music_scan must not be executable by anon or authenticated';
  end if;
end $$;
