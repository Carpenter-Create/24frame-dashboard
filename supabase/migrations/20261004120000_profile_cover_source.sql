-- ============================================================================
-- 20261004120000_profile_cover_source.sql
--
-- INTENT: Keep the original of the profile cover so Reposition works later
-- (founder decision, 2026-10-04: "Keep the original"). A new cover stores the
-- cropped 1784x446 still in cover_key, plus the uncropped original in
-- cover_source_key and its framing in cover_crop ({x, y, w, h} as fractions
-- 0..1 of the original's natural size). Reposition reopens the original at
-- the saved framing and writes a new cover_key + cover_crop; the server reads
-- cover_source_key itself and keeps it. Both keys are immutable published
-- copies in the member's own posts lane; nothing is deleted. Visitors are
-- never signed cover_source_key: the media grant signs only cover_key, and the
-- original streams only through the owner-only /api/social/cover?source=1.
-- Covers saved before this change keep null source and framing; Reposition
-- opens the file picker for them. Founder approved the SQL block below
-- verbatim. Design lock:
-- docs/design-locks/social-profile-header-linkedin-lock-v1.md
--
-- Founder applies; do not run from the PR.
--
-- DEPLOY ORDER (merge gate): 1. the founder applies this migration; 2. verify
--   on the PR preview; 3. merge. Applying first is safe with the app now in
--   production: it writes only cover_key, so the new columns stay null, all
--   three CHECKs pass, and authenticated keeps EXECUTE for the CHECK. The new
--   app has no fallback: deployed first, every cover save and Remove fails on
--   the missing columns (after the save has already published its copies).
--
-- CHANGE:
--   create function public.profile_cover_crop_valid(jsonb) (immutable shape
--     check for cover_crop; null is valid)
--   add nullable columns profiles.cover_source_key text, profiles.cover_crop
--     jsonb (no default, so no row rewrite)
--   add CHECK profiles_cover_source_key_owned: the original sits in this
--     profile's own posts lane (posts/<id>/<uuid>.<jpg|png|webp|gif>); an
--     upload-lane, stories, foreign or non-image key is refused
--   add CHECK profiles_cover_crop_shape: profile_cover_crop_valid(cover_crop)
--   add CHECK profiles_cover_source_pair: source and framing are set or null
--     together, and an original needs a current cover
--   column comments
--   Existing rows have null in both new columns, so all three CHECKs validate.
--   Existing profiles_update_self RLS stays the write gate. No DELETE.
--
-- EXECUTE (house rule, 20260726000400; appended after the approved block,
--   founder approved these two statements separately on 2026-10-04):
--   revoke from public, anon; grant to authenticated, service_role. Same
--   treatment as gc_check_digit. A CHECK evaluates its function with the
--   writing role's privileges, so authenticated (profile updates through
--   RLS) and service_role must keep EXECUTE.
--
-- REVIEW NOTE (not changed here; the SQL is founder-approved verbatim): a
--   cover_crop object missing one of x, y, w, h makes the helper return NULL,
--   and a CHECK accepts NULL. The app never writes such a value: the server
--   action's zod schema (src/lib/social-profile-cover-frame.ts parseCoverCrop)
--   requires all four numbers. Closing it in SQL needs a founder-approved
--   change (for example `is distinct from 'number'`).
--
-- DESTRUCTIVE OPS: none. CREATE FUNCTION, ADD COLUMN x2 (nullable), ADD
--   CONSTRAINT x3, COMMENT x2, REVOKE/GRANT EXECUTE. No UPDATE, DELETE or DROP.
--
-- ROLLBACK (founder; order matters. Drops the stored originals' pointers and
-- framing; the S3 objects stay in the member media bucket):
--   1. Before or with the app revert, drop only the pair rule. The reverted
--      Remove writes cover_key = null alone, which this rule refuses for a
--      member with a kept original. Both app versions work without it:
--        alter table public.profiles drop constraint profiles_cover_source_pair;
--   2. Revert the app.
--   3. Then drop the rest. Never before step 2: the new app writes these
--      columns, so every cover save and Remove would fail.
--        alter table public.profiles
--          drop constraint profiles_cover_crop_shape,
--          drop constraint profiles_cover_source_key_owned;
--        alter table public.profiles drop column cover_crop, drop column cover_source_key;
--        drop function public.profile_cover_crop_valid(jsonb);
--   Do not redeploy the new app between steps 2 and 3: covers the reverted
--   app saved keep a stale original and framing. Finish step 3, then apply
--   this migration again first.
-- ============================================================================

create or replace function public.profile_cover_crop_valid(p_crop jsonb)
returns boolean
language sql
immutable
parallel safe
set search_path to 'public'
as $$
  select case
    when p_crop is null then true
    when jsonb_typeof(p_crop) <> 'object' then false
    when jsonb_typeof(p_crop->'x') <> 'number' or jsonb_typeof(p_crop->'y') <> 'number'
      or jsonb_typeof(p_crop->'w') <> 'number' or jsonb_typeof(p_crop->'h') <> 'number' then false
    else (p_crop->>'x')::numeric >= 0 and (p_crop->>'y')::numeric >= 0
     and (p_crop->>'w')::numeric > 0 and (p_crop->>'h')::numeric > 0
     and (p_crop->>'x')::numeric + (p_crop->>'w')::numeric <= 1
     and (p_crop->>'y')::numeric + (p_crop->>'h')::numeric <= 1
  end;
$$;

alter table public.profiles
  add column if not exists cover_source_key text,
  add column if not exists cover_crop jsonb;

alter table public.profiles
  add constraint profiles_cover_source_key_owned check (
    cover_source_key is null
    or cover_source_key ~ ('^posts/' || id::text
      || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp|gif)$')
  ),
  add constraint profiles_cover_crop_shape check (public.profile_cover_crop_valid(cover_crop)),
  add constraint profiles_cover_source_pair check (
    (cover_source_key is null) = (cover_crop is null)
    and (cover_source_key is null or cover_key is not null)
  );

comment on column public.profiles.cover_source_key is
  'Uncropped original of the current cover (owner-only; never signed for visitors).';
comment on column public.profiles.cover_crop is
  'Framing of the current cover inside cover_source_key: {x, y, w, h} as fractions 0..1.';

-- House EXECUTE rule (see header). Not part of the approved block above;
-- founder approved these two statements separately (2026-10-04).
revoke execute on function public.profile_cover_crop_valid(jsonb) from public, anon;
grant execute on function public.profile_cover_crop_valid(jsonb) to authenticated, service_role;
