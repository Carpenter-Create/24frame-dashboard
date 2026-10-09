-- ============================================================================
-- 20261009120000_avatar_key_and_story_media.sql
--
-- INTENT: profiles.avatar_key is server-only. An authenticated PATCH of
-- that column is 42501. Story authors may still edit a caption (body).
-- They may not change media on an existing story. The image recheck
-- writes both through service_role.
--
-- Table-level UPDATE on profiles stays, so other profile columns remain
-- editable. PostgreSQL does not let a column REVOKE override a table
-- GRANT, so the trigger is what returns 42501. The column REVOKE is
-- recorded beside it.
--
-- DESTRUCTIVE OPS (draft only; do NOT apply to production from this PR):
-- CREATE FUNCTION, CREATE TRIGGER, REVOKE UPDATE (avatar_key).
-- No DROP of tables. No DELETE of rows. Forward-only.
-- ROLLBACK:
--   drop trigger if exists profiles_protect_avatar_key on public.profiles;
--   drop trigger if exists stories_protect_author_media on public.stories;
--   drop function if exists public.protect_profile_avatar_key();
--   drop function if exists public.protect_story_author_media();
--   grant update (avatar_key) on table public.profiles to authenticated;
-- ============================================================================

alter table public.profiles
  add column if not exists avatar_key text;

revoke update (avatar_key) on table public.profiles from anon, authenticated;

create or replace function public.protect_profile_avatar_key()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.avatar_key is not distinct from old.avatar_key then
    return new;
  end if;
  if current_user = 'service_role' then
    return new;
  end if;
  raise exception 'avatar_key is server-only' using errcode = '42501';
end;
$$;

drop trigger if exists profiles_protect_avatar_key on public.profiles;
create trigger profiles_protect_avatar_key
  before update on public.profiles
  for each row execute function public.protect_profile_avatar_key();

revoke all on function public.protect_profile_avatar_key() from public, anon, authenticated, service_role;

create or replace function public.protect_story_author_media()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'service_role' then
    return new;
  end if;
  if new.media is distinct from old.media then
    raise exception 'story media is not client-writable' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists stories_protect_author_media on public.stories;
create trigger stories_protect_author_media
  before update on public.stories
  for each row execute function public.protect_story_author_media();

revoke all on function public.protect_story_author_media() from public, anon, authenticated, service_role;
