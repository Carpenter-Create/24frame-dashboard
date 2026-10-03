-- identity_spine_test.sql
-- Phase 1B Pack 1 mapping C: profiles is optional and org-independent.
-- Catalog membership must keep working without a profile; creating a
-- profile must not require an org; revoke/delete membership must not
-- cascade-delete a profile; dashboard org_status stays unchanged.

begin;
select plan(31);

select set_config('t.org',      gen_random_uuid()::text, false);
select set_config('t.owner',    gen_random_uuid()::text, false);
select set_config('t.member',   gen_random_uuid()::text, false);
select set_config('t.creator',  gen_random_uuid()::text, false);
select set_config('t.catalog',  gen_random_uuid()::text, false);

insert into auth.users (id) values
  (current_setting('t.owner')::uuid),
  (current_setting('t.member')::uuid),
  (current_setting('t.creator')::uuid),
  (current_setting('t.catalog')::uuid);

-- ---- schema presence -------------------------------------------------------
select ok(
  to_regclass('public.profiles') is not null,
  'profiles table exists');
select is(
  (select count(*) from public.levels)::int,
  9,
  'levels seeded 1–9');
select isnt_empty(
  $$ select 1 from public.app_settings where id = true $$,
  'app_settings seeded');
select is(
  (select count(*) from public.capabilities)::int,
  4,
  'capabilities seeded');

-- ---- org_status unchanged (donor active|churned omitted) -------------------
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

-- ---- Pack 3 likes + Pack 4 DMs present; 24Frame AI tables stay ai_* --------
select ok(to_regclass('public.likes') is not null, 'likes table exists');
select ok(
  to_regclass('public.conversations') is not null,
  'donor conversations (DMs) exist');
select ok(
  to_regclass('public.messages') is not null,
  'donor messages (DMs) exist');
select ok(to_regclass('public.blocks') is not null, 'blocks table exists');
select ok(
  to_regclass('public.ai_conversations') is not null,
  'ai_conversations still present (24Frame AI not renamed back)');
select ok(
  to_regclass('public.ai_conversation_messages') is not null,
  'ai_conversation_messages still present');
select ok(
  to_regclass('public.leaderboard_entries') is not null,
  'leaderboard_entries exist');
select ok(
  to_regclass('public.level_distribution') is not null,
  'level_distribution exists');

-- ---- catalog auth functions survive; has_capability is additive ------------
select ok(
  exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'member_can'
      and pg_get_function_identity_arguments(p.oid)
        = 'p_uid uuid, p_org uuid, p_capability text'
  ),
  'member_can signature unchanged');
select ok(
  exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'has_capability'
      and pg_get_function_identity_arguments(p.oid) = 'p_user uuid, p_cap text'
  ),
  'has_capability exists and does not overwrite member_can');
select is(
  public.member_tier_rank(current_setting('t.creator')::uuid),
  0,
  'member_tier_rank stub returns 0');

select is(
  (select count(*) from pg_constraint c
     join pg_class t on t.oid = c.conrelid
     join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public' and t.relname = 'memberships' and c.contype = 'f'
      and pg_get_constraintdef(c.oid) ilike '%profiles%')::int,
  0,
  'memberships has no FK to profiles');
select ok(
  not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles'
      and column_name = 'org_id'
  ),
  'profiles has no org_id');
select ok(
  not exists (
    select 1
    from pg_policy pol
    join pg_class c on c.oid = pol.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('profiles','levels','point_events','app_settings','capabilities')
      and (
        coalesce(pg_get_expr(pol.polqual, pol.polrelid), '') ilike '%is_gc_staff%'
        or coalesce(pg_get_expr(pol.polwithcheck, pol.polrelid), '') ilike '%is_gc_staff%'
      )
  ),
  'identity spine policies do not call is_gc_staff');

-- ---- (1) membership user without a profile still works ---------------------
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('t.catalog'), 'role', 'authenticated')::text,
  true);

select set_config('t.catalog_org',
  (select public.create_org_and_membership('Catalog Films'))::text, true);

select is(
  (select count(*) from public.profiles
    where id = current_setting('t.catalog')::uuid)::int,
  0,
  'create_org_and_membership does not auto-create a profile');
select ok(
  public.member_can(
    current_setting('t.catalog')::uuid,
    current_setting('t.catalog_org')::uuid,
    'view'),
  'membership user without a profile still has member_can view');
select isnt_empty(
  $$ select 1 from public.organizations
     where id = current_setting('t.catalog_org')::uuid $$,
  'membership user without a profile can still read their org');

-- ---- (2) creating a profile does not require an org ------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('t.creator'), 'role', 'authenticated')::text,
  true);

select lives_ok(
  format($sql$
    insert into public.profiles (id, handle, display_name, birth_date)
    values (%L, 'creatorone', 'Creator One', (current_date - interval '20 years')::date)
  $sql$, current_setting('t.creator')),
  'creating a profile does not require an org');
select is(
  (select count(*) from public.memberships
    where user_id = current_setting('t.creator')::uuid)::int,
  0,
  'creator profile has no catalog membership');
select ok(
  not public.has_capability(current_setting('t.creator')::uuid, 'coproduction_apply'),
  'has_capability coproduction_apply is false while member_tier_rank is 0');

-- privileged columns stay locked for the client
select throws_ok(
  format($sql$
    update public.profiles set points_total = 99 where id = %L
  $sql$, current_setting('t.creator')),
  'P0001',
  'privileged profile columns are not client-writable',
  'client cannot write privileged profile columns');

-- Fresh auth user so WITH CHECK (not PK) rejects app_role = admin.
reset role;
select set_config('t.escalator', gen_random_uuid()::text, false);
insert into auth.users (id) values (current_setting('t.escalator')::uuid);

set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('t.escalator'), 'role', 'authenticated')::text,
  true);

select throws_ok(
  format($sql$
    insert into public.profiles (id, handle, display_name, birth_date, app_role)
    values (%L, 'adminevil', 'Nope', (current_date - interval '20 years')::date, 'admin')
  $sql$, current_setting('t.escalator')),
  '42501',
  null,
  'insert cannot self-assign app_role admin');

-- ---- (3) revoke / delete membership does not cascade-delete profile --------
reset role;

insert into public.organizations (id, name, status) values
  (current_setting('t.org')::uuid, 'Revoke Org', 'active');
insert into public.memberships (org_id, user_id, role, status) values
  (current_setting('t.org')::uuid, current_setting('t.owner')::uuid,  'account_owner', 'active'),
  (current_setting('t.org')::uuid, current_setting('t.member')::uuid, 'viewer',        'active');
insert into public.profiles (id, handle, display_name, birth_date)
values (
  current_setting('t.member')::uuid,
  'memberone',
  'Member One',
  (current_date - interval '25 years')::date
);

update public.memberships
   set status = 'removed'
 where org_id = current_setting('t.org')::uuid
   and user_id = current_setting('t.member')::uuid;

select is(
  (select count(*) from public.profiles
    where id = current_setting('t.member')::uuid)::int,
  1,
  'revoking membership (status=removed) does not delete the profile');

delete from public.memberships
 where org_id = current_setting('t.org')::uuid
   and user_id = current_setting('t.member')::uuid;

select is(
  (select count(*) from public.profiles
    where id = current_setting('t.member')::uuid)::int,
  1,
  'deleting a membership row does not cascade-delete the profile');
select is(
  (select count(*) from public.memberships
    where user_id = current_setting('t.member')::uuid)::int,
  0,
  'membership row is gone after delete');

reset role;
select * from finish();
rollback;
