-- profile_cover_source_test.sql
-- profiles.cover_source_key / profiles.cover_crop (keep the original of the
-- profile cover so Reposition works later). Each CHECK on its own:
--   profiles_cover_source_key_owned  the original is in this profile's own
--                                    posts lane, an image, never an upload,
--                                    stories or foreign key
--   profiles_cover_crop_shape        {x, y, w, h} numbers, 0..1, w and h > 0,
--                                    x + w <= 1, y + h <= 1
--   profiles_cover_source_pair       original and framing together, and an
--                                    original only with a current cover
-- CHECKs fire in name order, so each failing case breaks only the one named.

begin;
select plan(33);

select set_config('t.self', gen_random_uuid()::text, false);
select set_config('t.other', gen_random_uuid()::text, false);
select set_config('t.cover',
  'posts/' || current_setting('t.self') || '/' || gen_random_uuid()::text || '.jpg', false);
select set_config('t.source',
  'posts/' || current_setting('t.self') || '/' || gen_random_uuid()::text || '.png', false);
select set_config('t.crop', '{"x": 0.1, "y": 0, "w": 0.5, "h": 0.25}', false);

insert into auth.users (id) values
  (current_setting('t.self')::uuid),
  (current_setting('t.other')::uuid);

select has_column('public', 'profiles', 'cover_source_key', 'profiles.cover_source_key exists');
select has_column('public', 'profiles', 'cover_crop', 'profiles.cover_crop exists');
select col_type_is('public', 'profiles', 'cover_crop', 'jsonb', 'profiles.cover_crop is jsonb');
select has_function('public', 'profile_cover_crop_valid', array['jsonb'],
  'profile_cover_crop_valid(jsonb) exists');
select ok(
  not has_function_privilege('anon', 'public.profile_cover_crop_valid(jsonb)', 'EXECUTE'),
  'anon cannot execute the crop shape check');
select ok(
  has_function_privilege('authenticated', 'public.profile_cover_crop_valid(jsonb)', 'EXECUTE'),
  'authenticated keeps EXECUTE so its profile writes can evaluate the CHECK');
select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass and contype = 'c'
      and conname = 'profiles_cover_source_key_owned'),
  'profiles_cover_source_key_owned exists');
select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass and contype = 'c'
      and conname = 'profiles_cover_crop_shape'),
  'profiles_cover_crop_shape exists');
select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass and contype = 'c'
      and conname = 'profiles_cover_source_pair'),
  'profiles_cover_source_pair exists');

set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('t.self'), 'role', 'authenticated')::text,
  true);

select lives_ok(
  format($sql$
    insert into public.profiles (id, handle, display_name, birth_date)
    values (%L, 'coversource', 'Cover Source', (current_date - interval '30 years')::date)
  $sql$, current_setting('t.self')),
  'owner profile insert with no cover, original or framing');

-- Valid rows.
select lives_ok(
  format($sql$
    update public.profiles
    set cover_key = %L, cover_source_key = %L, cover_crop = %L::jsonb
    where id = %L
  $sql$, current_setting('t.cover'), current_setting('t.source'), current_setting('t.crop'),
    current_setting('t.self')),
  'a cover with its own original and a valid framing saves');
select is(
  (select cover_crop from public.profiles where id = current_setting('t.self')::uuid),
  current_setting('t.crop')::jsonb,
  'the framing reads back as stored');
select lives_ok(
  format($sql$
    update public.profiles
    set cover_crop = '{"x": 0.5, "y": 0.75, "w": 0.5, "h": 0.25}'::jsonb
    where id = %L
  $sql$, current_setting('t.self')),
  'a framing touching the right and bottom edges (x + w = 1, y + h = 1) saves');

-- profiles_cover_source_key_owned
select throws_ok(
  format($sql$
    update public.profiles set cover_source_key = %L where id = %L
  $sql$, 'posts/' || current_setting('t.other') || '/' || gen_random_uuid()::text || '.jpg',
    current_setting('t.self')),
  '23514',
  'new row for relation "profiles" violates check constraint "profiles_cover_source_key_owned"',
  'another member''s original is refused');
select throws_ok(
  format($sql$
    update public.profiles set cover_source_key = %L where id = %L
  $sql$, 'posts/upload/' || current_setting('t.self') || '/' || gen_random_uuid()::text || '.jpg',
    current_setting('t.self')),
  '23514',
  'new row for relation "profiles" violates check constraint "profiles_cover_source_key_owned"',
  'an upload-lane key is refused (only published copies are stored)');
select throws_ok(
  format($sql$
    update public.profiles set cover_source_key = %L where id = %L
  $sql$, 'stories/' || current_setting('t.self') || '/' || gen_random_uuid()::text || '.jpg',
    current_setting('t.self')),
  '23514',
  'new row for relation "profiles" violates check constraint "profiles_cover_source_key_owned"',
  'a stories-lane key is refused');
select throws_ok(
  format($sql$
    update public.profiles set cover_source_key = %L where id = %L
  $sql$, 'posts/' || current_setting('t.self') || '/' || gen_random_uuid()::text || '.mp4',
    current_setting('t.self')),
  '23514',
  'new row for relation "profiles" violates check constraint "profiles_cover_source_key_owned"',
  'a video key is refused');
select throws_ok(
  format($sql$
    update public.profiles set cover_source_key = %L where id = %L
  $sql$, 'posts/' || current_setting('t.self') || '/' || gen_random_uuid()::text || '.jpeg',
    current_setting('t.self')),
  '23514',
  'new row for relation "profiles" violates check constraint "profiles_cover_source_key_owned"',
  'a .jpeg spelling is refused (one extension per type)');

-- profiles_cover_crop_shape
select throws_ok(
  format($sql$
    update public.profiles
    set cover_crop = '{"x": 0.6, "y": 0, "w": 0.5, "h": 0.25}'::jsonb where id = %L
  $sql$, current_setting('t.self')),
  '23514',
  'new row for relation "profiles" violates check constraint "profiles_cover_crop_shape"',
  'x + w > 1 is refused');
select throws_ok(
  format($sql$
    update public.profiles
    set cover_crop = '{"x": 0, "y": 0.8, "w": 0.5, "h": 0.25}'::jsonb where id = %L
  $sql$, current_setting('t.self')),
  '23514',
  'new row for relation "profiles" violates check constraint "profiles_cover_crop_shape"',
  'y + h > 1 is refused');
select throws_ok(
  format($sql$
    update public.profiles
    set cover_crop = '{"x": "0.1", "y": 0, "w": 0.5, "h": 0.25}'::jsonb where id = %L
  $sql$, current_setting('t.self')),
  '23514',
  'new row for relation "profiles" violates check constraint "profiles_cover_crop_shape"',
  'a string number is refused');
select throws_ok(
  format($sql$
    update public.profiles
    set cover_crop = '{"x": 0, "y": 0, "w": 0.5, "h": null}'::jsonb where id = %L
  $sql$, current_setting('t.self')),
  '23514',
  'new row for relation "profiles" violates check constraint "profiles_cover_crop_shape"',
  'a JSON null value is refused');
select throws_ok(
  format($sql$
    update public.profiles
    set cover_crop = '{"x": -0.1, "y": 0, "w": 0.5, "h": 0.25}'::jsonb where id = %L
  $sql$, current_setting('t.self')),
  '23514',
  'new row for relation "profiles" violates check constraint "profiles_cover_crop_shape"',
  'a negative x is refused');
select throws_ok(
  format($sql$
    update public.profiles
    set cover_crop = '{"x": 0, "y": 0, "w": 0, "h": 0.25}'::jsonb where id = %L
  $sql$, current_setting('t.self')),
  '23514',
  'new row for relation "profiles" violates check constraint "profiles_cover_crop_shape"',
  'a zero width is refused');
select throws_ok(
  format($sql$
    update public.profiles set cover_crop = '[0, 0, 1, 0.25]'::jsonb where id = %L
  $sql$, current_setting('t.self')),
  '23514',
  'new row for relation "profiles" violates check constraint "profiles_cover_crop_shape"',
  'an array is refused');
select throws_ok(
  format($sql$
    update public.profiles set cover_crop = 'null'::jsonb where id = %L
  $sql$, current_setting('t.self')),
  '23514',
  'new row for relation "profiles" violates check constraint "profiles_cover_crop_shape"',
  'a JSON null framing is refused (SQL null is the only empty)');

-- Known gap in the approved SQL: a missing key makes the helper return NULL,
-- which a CHECK accepts. The app's zod schema requires all four keys.
select todo('approved SQL accepts a framing with a missing key (helper returns NULL)', 1);
select throws_ok(
  format($sql$
    update public.profiles
    set cover_crop = '{"x": 0, "y": 0, "w": 0.5}'::jsonb where id = %L
  $sql$, current_setting('t.self')),
  '23514',
  'new row for relation "profiles" violates check constraint "profiles_cover_crop_shape"',
  'a framing missing h is refused');

-- profiles_cover_source_pair
select throws_ok(
  format($sql$
    update public.profiles set cover_crop = null where id = %L
  $sql$, current_setting('t.self')),
  '23514',
  'new row for relation "profiles" violates check constraint "profiles_cover_source_pair"',
  'an original without framing is refused');
select throws_ok(
  format($sql$
    update public.profiles set cover_source_key = null where id = %L
  $sql$, current_setting('t.self')),
  '23514',
  'new row for relation "profiles" violates check constraint "profiles_cover_source_pair"',
  'framing without an original is refused');
select throws_ok(
  format($sql$
    update public.profiles set cover_key = null where id = %L
  $sql$, current_setting('t.self')),
  '23514',
  'new row for relation "profiles" violates check constraint "profiles_cover_source_pair"',
  'an original without a current cover is refused (Remove clears all three)');

-- Remove clears all three; a cover with no original stays valid.
select lives_ok(
  format($sql$
    update public.profiles
    set cover_key = null, cover_source_key = null, cover_crop = null
    where id = %L
  $sql$, current_setting('t.self')),
  'clearing the cover, the original and the framing together saves');
select lives_ok(
  format($sql$
    update public.profiles
    set cover_key = %L, cover_source_key = null, cover_crop = null
    where id = %L
  $sql$, current_setting('t.cover'), current_setting('t.self')),
  'a cover with no original (saved before originals were kept) stays valid');
select is(
  (select row(cover_source_key, cover_crop)::text
     from public.profiles where id = current_setting('t.self')::uuid),
  row(null::text, null::jsonb)::text,
  'that cover has no original and no framing');

reset role;
select * from finish();
rollback;
