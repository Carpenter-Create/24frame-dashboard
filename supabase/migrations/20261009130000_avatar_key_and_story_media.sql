-- ============================================================================
-- 20261009130000_avatar_key_and_story_media.sql
--
-- INTENT: profiles.avatar_key is server-only. Story authors may still edit
-- a caption (body). They may not change media on an existing story. The
-- image recheck writes both through service_role.
--
-- profiles.avatar_key already exists (20260912033234_identity_spine.sql).
-- This file does not ADD COLUMN. ADD COLUMN IF NOT EXISTS still takes
-- ACCESS EXCLUSIVE. One CREATE OR REPLACE TRIGGER per table is the only
-- lock step here (SHARE ROW EXCLUSIVE). There is no DROP TRIGGER.
--
-- The trigger is the enforcement. Table UPDATE on profiles stays, so other
-- columns remain editable. A column REVOKE does not override a table GRANT,
-- so this file does not issue one and does not grant the column back.
--
-- service_role and the table owner (postgres) may set avatar_key and story
-- media, including from the SQL editor. authenticated and anon may not.
-- An INSERT by anyone else stores avatar_key null. Profile creation still
-- succeeds. An UPDATE by anyone else is 42501.
--
-- DESTRUCTIVE OPS (Adam applies on prod via the SQL Editor in the same sitting as the merge, cleared by CoS):
-- CREATE FUNCTION, CREATE OR REPLACE TRIGGER.
-- No DROP of tables. No DELETE of rows. No column REVOKE. Forward-only.
-- ROLLBACK:
--   drop trigger if exists profiles_protect_avatar_key on public.profiles;
--   drop trigger if exists stories_protect_author_media on public.stories;
--   drop function if exists public.protect_profile_avatar_key();
--   drop function if exists public.protect_story_author_media();
-- ============================================================================

set lock_timeout = '3s';

do $lock_timeout$
begin
  if current_setting('lock_timeout') is distinct from '3s' then
    raise exception 'lock_timeout must be 3s';
  end if;
end
$lock_timeout$;

create or replace function public.protect_profile_avatar_key()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if current_user in ('service_role', 'postgres') then
      return new;
    end if;
    new.avatar_key := null;
    return new;
  end if;
  if new.avatar_key is not distinct from old.avatar_key then
    return new;
  end if;
  if current_user in ('service_role', 'postgres') then
    return new;
  end if;
  raise exception 'avatar_key is server-only' using errcode = '42501';
end;
$$;

create or replace trigger profiles_protect_avatar_key
  before insert or update on public.profiles
  for each row execute function public.protect_profile_avatar_key();

revoke all on function public.protect_profile_avatar_key() from public, anon, authenticated, service_role;

create or replace function public.protect_story_author_media()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('service_role', 'postgres') then
    return new;
  end if;
  if new.media is distinct from old.media then
    raise exception 'story media is not client-writable' using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace trigger stories_protect_author_media
  before update on public.stories
  for each row execute function public.protect_story_author_media();

revoke all on function public.protect_story_author_media() from public, anon, authenticated, service_role;
