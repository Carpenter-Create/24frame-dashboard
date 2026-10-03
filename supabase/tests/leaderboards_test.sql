-- leaderboards_test.sql
-- Phase 1B #16 mapping C: materialized leaderboards. Clients SELECT only.
-- rebuild_leaderboards is service_role only. Kill switches hide SELECT.
-- org_status stays unchanged. No is_gc_staff backdoor. conversations /
-- ai_* stay. Person-scoped tables are not catalog-org scoped.

begin;
select plan(37);

select set_config('t.alpha',    gen_random_uuid()::text, false);
select set_config('t.bravo',    gen_random_uuid()::text, false);
select set_config('t.charlie',  gen_random_uuid()::text, false);
select set_config('t.delta',    gen_random_uuid()::text, false);
select set_config('t.ghost',    gen_random_uuid()::text, false);
select set_config('t.noprof',   gen_random_uuid()::text, false);

insert into auth.users (id) values
  (current_setting('t.alpha')::uuid),
  (current_setting('t.bravo')::uuid),
  (current_setting('t.charlie')::uuid),
  (current_setting('t.delta')::uuid),
  (current_setting('t.ghost')::uuid),
  (current_setting('t.noprof')::uuid);

-- ---- schema presence -------------------------------------------------------
select ok(
  to_regclass('public.leaderboard_entries') is not null,
  'leaderboard_entries table exists');
select ok(
  to_regclass('public.level_distribution') is not null,
  'level_distribution table exists');
select ok(
  exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and indexname = 'point_events_created_at_idx'
  ),
  'point_events_created_at_idx exists');
select ok(
  exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'rebuild_leaderboards'
      and p.prosecdef
  ),
  'rebuild_leaderboards exists and is SECURITY DEFINER');

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
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'org_status'
      and e.enumlabel = 'churned'
  ),
  'donor org_status value churned is absent');

select ok(
  to_regclass('public.conversations') is not null,
  'donor conversations (DMs) exist');
select ok(
  to_regclass('public.messages') is not null,
  'donor messages (DMs) exist');
select ok(
  to_regclass('public.ai_conversations') is not null,
  'ai_conversations still present (24Frame AI not renamed back)');
select ok(
  to_regclass('public.ai_conversation_messages') is not null,
  'ai_conversation_messages still present');

select ok(
  not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name in ('leaderboard_entries', 'level_distribution')
      and column_name = 'org_id'
  ),
  'leaderboard tables have no org_id');
select ok(
  not exists (
    select 1
    from pg_policy pol
    join pg_class c on c.oid = pol.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('leaderboard_entries', 'level_distribution')
      and (
        coalesce(pg_get_expr(pol.polqual, pol.polrelid), '') ilike '%is_gc_staff%'
        or coalesce(pg_get_expr(pol.polwithcheck, pol.polrelid), '') ilike '%is_gc_staff%'
      )
  ),
  'leaderboard policies do not call is_gc_staff');
select ok(
  not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'rebuild_leaderboards'
      and p.prosrc ilike '%is_gc_staff%'
  ),
  'rebuild_leaderboards does not call is_gc_staff');
select ok(
  not exists (
    select 1
    from pg_policy pol
    join pg_class c on c.oid = pol.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('leaderboard_entries', 'level_distribution')
      and pol.polcmd in ('a', 'w', 'd')
  ),
  'leaderboard tables have no client write policies');
select ok(
  has_table_privilege('authenticated', 'public.leaderboard_entries', 'SELECT')
    and has_table_privilege('authenticated', 'public.level_distribution', 'SELECT')
    and not has_table_privilege('authenticated', 'public.leaderboard_entries', 'INSERT')
    and not has_table_privilege('authenticated', 'public.leaderboard_entries', 'UPDATE')
    and not has_table_privilege('authenticated', 'public.leaderboard_entries', 'DELETE')
    and not has_table_privilege('authenticated', 'public.level_distribution', 'INSERT')
    and not has_table_privilege('authenticated', 'public.level_distribution', 'UPDATE')
    and not has_table_privilege('authenticated', 'public.level_distribution', 'DELETE'),
  'authenticated has select only on leaderboard tables');
select ok(
  not has_table_privilege('anon', 'public.leaderboard_entries', 'SELECT')
    and not has_table_privilege('anon', 'public.level_distribution', 'SELECT'),
  'anon has no leaderboard grants');
select ok(
  not has_function_privilege('authenticated', 'public.rebuild_leaderboards()', 'EXECUTE')
    and not has_function_privilege('anon', 'public.rebuild_leaderboards()', 'EXECUTE')
    and has_function_privilege('service_role', 'public.rebuild_leaderboards()', 'EXECUTE'),
  'rebuild_leaderboards execute is service_role only');

-- ---- windows constrained ---------------------------------------------------
insert into public.profiles (id, handle, display_name, birth_date)
values
  (current_setting('t.alpha')::uuid,   'alphaone',   'Alpha',   (current_date - interval '20 years')::date),
  (current_setting('t.bravo')::uuid,   'bravoone',   'Bravo',   (current_date - interval '21 years')::date),
  (current_setting('t.charlie')::uuid, 'charlieone', 'Charlie', (current_date - interval '22 years')::date),
  (current_setting('t.delta')::uuid,   'deltaone',   'Delta',   (current_date - interval '23 years')::date);

insert into public.profiles (id, handle, display_name, birth_date, status)
values (
  current_setting('t.ghost')::uuid,
  'ghostone',
  'Ghost',
  (current_date - interval '24 years')::date,
  'deactivated'
);

select throws_ok(
  format($sql$
    insert into public.leaderboard_entries ("window", user_id, rank, points, computed_at)
    values ('week', %L, 1, 0, now())
  $sql$, current_setting('t.alpha')),
  '23514',
  null,
  'window check rejects values outside 7d|30d|all');

-- ---- no client write / no client rebuild -----------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('t.alpha'), 'role', 'authenticated')::text,
  true);

select throws_ok(
  format($sql$
    insert into public.leaderboard_entries ("window", user_id, rank, points, computed_at)
    values ('7d', %L, 1, 0, now())
  $sql$, current_setting('t.alpha')),
  '42501',
  null,
  'authenticated cannot insert leaderboard_entries');
select throws_ok(
  $$ insert into public.level_distribution (level, member_count, pct, computed_at)
     values (1, 0, 0, now()) $$,
  '42501',
  null,
  'authenticated cannot insert level_distribution');
select throws_ok(
  $$ select public.rebuild_leaderboards() $$,
  '42501',
  null,
  'authenticated cannot execute rebuild_leaderboards');

-- ---- rebuild fills ranks (incl 0); ties share; inactive excluded -----------
reset role;

insert into public.point_events (user_id, delta, reason, source_type, source_id)
values
  (current_setting('t.alpha')::uuid,   10, 'manual', 'test', gen_random_uuid()),
  (current_setting('t.bravo')::uuid,   10, 'manual', 'test', gen_random_uuid()),
  (current_setting('t.charlie')::uuid,  5, 'manual', 'test', gen_random_uuid()),
  (current_setting('t.ghost')::uuid,  99, 'manual', 'test', gen_random_uuid());

insert into public.point_events (user_id, delta, reason, source_type, source_id, created_at)
values (
  current_setting('t.alpha')::uuid,
  3,
  'onboarding',
  'test',
  gen_random_uuid(),
  now() - interval '20 days'
);

select public.rebuild_leaderboards();

select is(
  (select count(*) from public.leaderboard_entries where "window" = '7d')::int,
  4,
  '7d has a row for every active profile');
select ok(
  not exists (
    select 1 from public.leaderboard_entries
    where user_id = current_setting('t.ghost')::uuid
  ),
  'inactive profiles are omitted');
select is(
  (select rank from public.leaderboard_entries
    where "window" = '7d' and user_id = current_setting('t.alpha')::uuid),
  (select rank from public.leaderboard_entries
    where "window" = '7d' and user_id = current_setting('t.bravo')::uuid),
  'tied 7d scores share rank()');
select is(
  (select rank from public.leaderboard_entries
    where "window" = '7d' and user_id = current_setting('t.charlie')::uuid),
  3,
  'rank() after a two-way tie is 3');
select is(
  (select points from public.leaderboard_entries
    where "window" = '7d' and user_id = current_setting('t.delta')::uuid),
  0,
  'active member with no events still has a 0-point row');
select is(
  (select points from public.leaderboard_entries
    where "window" = '7d' and user_id = current_setting('t.alpha')::uuid),
  10,
  '7d sums only events inside the window');
select is(
  (select points from public.leaderboard_entries
    where "window" = '30d' and user_id = current_setting('t.alpha')::uuid),
  13,
  '30d includes the older event');
select is(
  (select points from public.leaderboard_entries
    where "window" = 'all' and user_id = current_setting('t.alpha')::uuid),
  (select points_total from public.profiles
    where id = current_setting('t.alpha')::uuid),
  'all-time uses profiles.points_total');
select is(
  (select count(*) from public.level_distribution)::int,
  (select count(*) from public.levels)::int,
  'level_distribution has one row per levels.level');
select ok(
  (select member_count from public.level_distribution where level = 1) >= 0
    and (select pct from public.level_distribution where level = 1) between 0 and 100,
  'level_distribution counts and pct stay in range');

-- ---- SELECT hidden when either kill switch is off --------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('t.noprof'), 'role', 'authenticated')::text,
  true);

select isnt_empty(
  $$ select 1 from public.leaderboard_entries where "window" = '7d' $$,
  'no-profile user can SELECT when both kill switches are on');

reset role;
update public.app_settings set leaderboard_public = false where id = true;

set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('t.alpha'), 'role', 'authenticated')::text,
  true);

select is_empty(
  $$ select 1 from public.leaderboard_entries $$,
  'SELECT is hidden when leaderboard_public is off');
select is_empty(
  $$ select 1 from public.level_distribution $$,
  'level_distribution SELECT is hidden when leaderboard_public is off');

reset role;
update public.app_settings
   set leaderboard_public = true, gamification_enabled = false
 where id = true;

set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('t.alpha'), 'role', 'authenticated')::text,
  true);

select is_empty(
  $$ select 1 from public.leaderboard_entries $$,
  'SELECT is hidden when gamification_enabled is off');
select is_empty(
  $$ select 1 from public.level_distribution $$,
  'level_distribution SELECT is hidden when gamification_enabled is off');

reset role;
update public.app_settings
   set leaderboard_public = true, gamification_enabled = true
 where id = true;

set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('t.alpha'), 'role', 'authenticated')::text,
  true);

select isnt_empty(
  $$ select 1 from public.leaderboard_entries where "window" = '7d' $$,
  'SELECT returns rows when both kill switches are on');

reset role;
select * from finish();
rollback;
