-- social_home_stories_test.sql
-- Social Home miss list v1 P0. Follows + 24h stories on Mapping C
-- profiles. No org_id. No is_gc_staff privilege bridge. posts.category
-- accepts locked labels only. Dashboard org_status stays unchanged.

begin;
select plan(22);

select set_config('t.author', gen_random_uuid()::text, false);
select set_config('t.follower', gen_random_uuid()::text, false);
select set_config('t.stranger', gen_random_uuid()::text, false);

insert into auth.users (id) values
  (current_setting('t.author')::uuid),
  (current_setting('t.follower')::uuid),
  (current_setting('t.stranger')::uuid);

select ok(to_regclass('public.follows') is not null, 'follows table exists');
select ok(to_regclass('public.stories') is not null, 'stories table exists');
select ok(to_regclass('public.story_views') is not null, 'story_views table exists');
select ok(
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'posts' and column_name = 'category'
  ),
  'posts.category exists');

select ok(
  not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name in ('follows', 'stories', 'story_views')
      and column_name = 'org_id'
  ),
  'follows/stories have no org_id');

select is(
  (select array_agg(e.enumlabel::text order by e.enumsortorder)
     from pg_enum e
     join pg_type t on t.oid = e.enumtypid
     join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'org_status'),
  array['registered','awaiting_payment','active','payment_lapsed','closed']::text[],
  'org_status enum values unchanged');

select ok(
  not exists (
    select 1
    from pg_policy pol
    join pg_class c on c.oid = pol.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('follows', 'stories', 'story_views')
      and (
        pg_get_expr(pol.polqual, pol.polrelid) ilike '%is_gc_staff%'
        or pg_get_expr(pol.polwithcheck, pol.polrelid) ilike '%is_gc_staff%'
      )
  ),
  'social home policies do not call is_gc_staff');

insert into public.profiles (id, handle, display_name, birth_date)
values
  (current_setting('t.author')::uuid, 'storyauthor', 'Story Author', (current_date - interval '22 years')::date),
  (current_setting('t.follower')::uuid, 'storyfan', 'Story Fan', (current_date - interval '24 years')::date),
  (current_setting('t.stranger')::uuid, 'strangerone', 'Stranger One', (current_date - interval '26 years')::date);

set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('t.author'), 'role', 'authenticated')::text,
  true);

select lives_ok(
  format($sql$
    insert into public.stories (author_id, body)
    values (%L, 'hello story')
  $sql$, current_setting('t.author')),
  'active profile can insert a story');

select set_config('t.story',
  (select id::text from public.stories where body = 'hello story' limit 1), true);

select ok(
  (select expires_at > now() + interval '23 hours'
     from public.stories where id = current_setting('t.story')::uuid),
  'story default expiry is 24h');

-- Topics are written by the background tagger with the service role (no
-- author picks one; post_category_provenance_test covers the refusal).
-- The locked-label check is exercised from that role.
reset role;
set local role service_role;
select set_config('request.jwt.claims',
  json_build_object('role', 'service_role')::text, true);

select lives_ok(
  format($sql$
    insert into public.posts (author_id, body, category)
    values (%L, 'lens post', 'Cinematography')
  $sql$, current_setting('t.author')),
  'locked category Cinematography is accepted');

select throws_ok(
  format($sql$
    insert into public.posts (author_id, body, category)
    values (%L, 'bad lens', 'Cinematographers')
  $sql$, current_setting('t.author')),
  '23514',
  null,
  'retired Cinematographers label is rejected');

select throws_ok(
  format($sql$
    insert into public.posts (author_id, body, category)
    values (%L, 'bad music', 'Composers')
  $sql$, current_setting('t.author')),
  '23514',
  null,
  'retired Composers label is rejected');

select lives_ok(
  format($sql$
    insert into public.posts (author_id, body, category)
    values (%L, 'music post', 'Music')
  $sql$, current_setting('t.author')),
  'locked category Music is accepted');

reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('t.author'), 'role', 'authenticated')::text,
  true);

select throws_ok(
  format($sql$
    insert into public.follows (follower_id, followee_id)
    values (%L, %L)
  $sql$, current_setting('t.author'), current_setting('t.author')),
  '42501',
  null,
  'self-follow is rejected');

select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('t.follower'), 'role', 'authenticated')::text,
  true);

select is(
  (select count(*) from public.stories
    where id = current_setting('t.story')::uuid)::int,
  0,
  'non-follower cannot see a live story');

select lives_ok(
  format($sql$
    insert into public.follows (follower_id, followee_id)
    values (%L, %L)
  $sql$, current_setting('t.follower'), current_setting('t.author')),
  'active profile can follow another profile');

select is(
  (select count(*) from public.stories
    where id = current_setting('t.story')::uuid)::int,
  1,
  'follower can see a live story');

select lives_ok(
  format($sql$
    insert into public.story_views (story_id, viewer_id)
    values (%L, %L)
  $sql$, current_setting('t.story'), current_setting('t.follower')),
  'follower can mark a live story viewed');

select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('t.stranger'), 'role', 'authenticated')::text,
  true);

select is(
  (select count(*) from public.stories
    where id = current_setting('t.story')::uuid)::int,
  0,
  'stranger still cannot see a followed-only story');

select throws_ok(
  format($sql$
    insert into public.follows (follower_id, followee_id)
    values (%L, %L)
  $sql$, current_setting('t.author'), current_setting('t.stranger')),
  '42501',
  null,
  'cannot insert a follow as someone else');

reset role;

select is(
  (select count(*) from public.profiles
    where id = current_setting('t.author')::uuid)::int,
  1,
  'follow/story writes do not delete profiles');

select ok(
  not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public'
      and table_name in ('follows', 'stories', 'story_views')
      and constraint_type = 'FOREIGN KEY'
      and constraint_name ilike '%organization%'
  ),
  'social home tables have no organizations FK');

select * from finish();
rollback;
