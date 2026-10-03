-- groups_posts_test.sql
-- Phase 1B Pack 2 mapping C: groups/posts FK to optional profiles.
-- Create group/post requires an active profile. Catalog membership
-- revoke must not delete a profile or its posts. Dashboard org_status
-- stays unchanged. Social tables must not privilege-bridge via is_gc_staff.
-- Invariant 13: deleting (or attempting to delete) a group must not
-- destroy independently owned member posts. Close/hide instead.

begin;
select plan(67);

select set_config('t.org',      gen_random_uuid()::text, false);
select set_config('t.owner',    gen_random_uuid()::text, false);
select set_config('t.member',   gen_random_uuid()::text, false);
select set_config('t.creator',  gen_random_uuid()::text, false);
select set_config('t.admin',    gen_random_uuid()::text, false);
select set_config('t.staff',    gen_random_uuid()::text, false);
select set_config('t.noprof',   gen_random_uuid()::text, false);
select set_config('t.catalog',  gen_random_uuid()::text, false);

insert into auth.users (id) values
  (current_setting('t.owner')::uuid),
  (current_setting('t.member')::uuid),
  (current_setting('t.creator')::uuid),
  (current_setting('t.admin')::uuid),
  (current_setting('t.staff')::uuid),
  (current_setting('t.noprof')::uuid),
  (current_setting('t.catalog')::uuid);

-- ---- schema presence -------------------------------------------------------
select ok(to_regclass('public.groups') is not null, 'groups table exists');
select ok(to_regclass('public.group_members') is not null, 'group_members table exists');
select ok(to_regclass('public.posts') is not null, 'posts table exists');
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

select is(
  (select array_agg(e.enumlabel::text order by e.enumsortorder)
     from pg_enum e
     join pg_type t on t.oid = e.enumtypid
     join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'group_visibility'),
  array['public','private','secret']::text[],
  'group_visibility uses exact donor labels');
select is(
  (select array_agg(e.enumlabel::text order by e.enumsortorder)
     from pg_enum e
     join pg_type t on t.oid = e.enumtypid
     join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'user_role_in_group'),
  array['owner','admin','member']::text[],
  'user_role_in_group uses exact donor labels');
select is(
  (select array_agg(e.enumlabel::text order by e.enumsortorder)
     from pg_enum e
     join pg_type t on t.oid = e.enumtypid
     join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'post_status'),
  array['active','hidden','removed']::text[],
  'post_status uses exact donor labels');

select ok(
  not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name in ('groups', 'group_members', 'posts')
      and column_name = 'org_id'
  ),
  'social tables have no org_id');
select is(
  (select array_agg(e.enumlabel::text order by e.enumsortorder)
     from pg_enum e
     join pg_type t on t.oid = e.enumtypid
     join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'group_status'),
  array['active','hidden','closed']::text[],
  'group_status uses close/hide lifecycle labels');
select ok(
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'groups'
      and column_name = 'status'
  ),
  'groups.status exists for close/hide');
select is(
  (select c.confdeltype
     from pg_constraint c
     join pg_class rel on rel.oid = c.conrelid
     join pg_namespace n on n.oid = rel.relnamespace
    where n.nspname = 'public'
      and rel.relname = 'posts'
      and c.conname = 'posts_group_id_fkey'),
  'r',
  'posts.group_id is ON DELETE RESTRICT');
select ok(
  not exists (
    select 1
    from pg_policy pol
    join pg_class c on c.oid = pol.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'groups'
      and pol.polname = 'groups_delete_staff'
  ),
  'groups_delete_staff hard-delete policy is removed');
select ok(
  not has_table_privilege('authenticated', 'public.groups', 'DELETE'),
  'authenticated cannot DELETE groups');
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
    select 1 from pg_policy pol
    join pg_class c on c.oid = pol.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'profiles'
      and pol.polname = 'profiles_select_shared_group'
  ),
  'profiles_select_shared_group exists');
select ok(
  not exists (
    select 1
    from pg_policy pol
    join pg_class c on c.oid = pol.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and (
        c.relname in ('groups','group_members','posts')
        or pol.polname = 'profiles_select_shared_group'
      )
      and (
        coalesce(pg_get_expr(pol.polqual, pol.polrelid), '') ilike '%is_gc_staff%'
        or coalesce(pg_get_expr(pol.polwithcheck, pol.polrelid), '') ilike '%is_gc_staff%'
      )
  ),
  'Pack 2 policies do not call is_gc_staff');

-- ---- no-profile user cannot create a group or post -------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('t.noprof'), 'role', 'authenticated')::text,
  true);

select throws_ok(
  format($sql$
    insert into public.posts (author_id, body)
    values (%L, 'no profile')
  $sql$, current_setting('t.noprof')),
  '42501',
  null,
  'user without a profile cannot insert a post');
select throws_ok(
  format($sql$
    insert into public.groups (slug, name, created_by)
    values ('nonesuch', 'Nope', %L)
  $sql$, current_setting('t.noprof')),
  '42501',
  null,
  'user without a profile cannot insert a group');

-- ---- active profile, no org: can post; cannot create a group ---------------
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
select lives_ok(
  format($sql$
    insert into public.posts (author_id, body)
    values (%L, 'hello feed')
  $sql$, current_setting('t.creator')),
  'active profile can insert a feed post');
select throws_ok(
  format($sql$
    insert into public.groups (slug, name, created_by)
    values ('member-group', 'Member Group', %L)
  $sql$, current_setting('t.creator')),
  '42501',
  null,
  'member app_role cannot create a group (create_group is staff_only)');

-- deactivated profile cannot post
reset role;
set local role service_role;
select set_config('request.jwt.claims',
  json_build_object('role', 'service_role')::text, true);
update public.profiles
   set status = 'deactivated',
       deactivated_at = now()
 where id = current_setting('t.creator')::uuid;
reset role;

set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('t.creator'), 'role', 'authenticated')::text,
  true);

select throws_ok(
  format($sql$
    insert into public.posts (author_id, body)
    values (%L, 'after deactivate')
  $sql$, current_setting('t.creator')),
  '42501',
  null,
  'deactivated profile cannot insert a post');

reset role;
set local role service_role;
select set_config('request.jwt.claims',
  json_build_object('role', 'service_role')::text, true);
update public.profiles
   set status = 'active',
       deactivated_at = null
 where id = current_setting('t.creator')::uuid;
reset role;

-- ---- social admin (profiles.app_role, not gc_staff) can create groups ------
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('t.admin'), 'role', 'authenticated')::text,
  true);

select lives_ok(
  format($sql$
    insert into public.profiles (id, handle, display_name, birth_date)
    values (%L, 'adminone', 'Admin One', (current_date - interval '30 years')::date)
  $sql$, current_setting('t.admin')),
  'admin profile insert starts as member');

reset role;
set local role service_role;
select set_config('request.jwt.claims',
  json_build_object('role', 'service_role')::text, true);
update public.profiles
   set app_role = 'admin'
 where id = current_setting('t.admin')::uuid;
reset role;

select ok(
  public.has_capability(current_setting('t.admin')::uuid, 'create_group'),
  'admin app_role has create_group');

set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('t.admin'), 'role', 'authenticated')::text,
  true);

select lives_ok(
  format($sql$
    insert into public.groups (slug, name, visibility, created_by)
    values ('public-circle', 'Public Circle', 'public', %L)
  $sql$, current_setting('t.admin')),
  'active admin profile can create a public group');
select lives_ok(
  format($sql$
    insert into public.groups (slug, name, visibility, created_by)
    values ('secret-circle', 'Secret Circle', 'secret', %L)
  $sql$, current_setting('t.admin')),
  'active admin profile can create a secret group');

select set_config('t.public_gid',
  (select id::text from public.groups where slug = 'public-circle'), true);
select set_config('t.secret_gid',
  (select id::text from public.groups where slug = 'secret-circle'), true);

-- staff can add themselves as members so they can post into the group
select lives_ok(
  format($sql$
    insert into public.group_members (group_id, user_id, role)
    values (%L, %L, 'owner')
  $sql$, current_setting('t.public_gid'), current_setting('t.admin')),
  'create_group holder can insert an owner membership');
select lives_ok(
  format($sql$
    insert into public.group_members (group_id, user_id, role)
    values (%L, %L, 'owner')
  $sql$, current_setting('t.secret_gid'), current_setting('t.admin')),
  'create_group holder can insert a secret-group owner membership');

select is(
  (select member_count from public.groups
    where id = current_setting('t.public_gid')::uuid)::int,
  1,
  'refresh_group_member_count updates public group');

select lives_ok(
  format($sql$
    insert into public.posts (author_id, group_id, body)
    values (%L, %L, 'secret only')
  $sql$, current_setting('t.admin'), current_setting('t.secret_gid')),
  'group member can post into a secret group');

select set_config('t.secret_post',
  (select id::text from public.posts where body = 'secret only' limit 1), true);

-- ---- creator (no org) can self-join a public group -------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('t.creator'), 'role', 'authenticated')::text,
  true);

select lives_ok(
  format($sql$
    insert into public.group_members (group_id, user_id, role)
    values (%L, %L, 'member')
  $sql$, current_setting('t.public_gid'), current_setting('t.creator')),
  'active profile can self-join a public group without an org');
select throws_ok(
  format($sql$
    insert into public.group_members (group_id, user_id, role)
    values (%L, %L, 'member')
  $sql$, current_setting('t.secret_gid'), current_setting('t.creator')),
  '42501',
  null,
  'member cannot self-join a secret group');

-- ---- gc_staff is not a social admin backdoor -------------------------------
reset role;
insert into public.gc_staff (user_id, role)
values (current_setting('t.staff')::uuid, 'gc_delivery_ops');

set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('t.staff'), 'role', 'authenticated')::text,
  true);

select lives_ok(
  format($sql$
    insert into public.profiles (id, handle, display_name, birth_date)
    values (%L, 'staffone', 'Staff One', (current_date - interval '28 years')::date)
  $sql$, current_setting('t.staff')),
  'gc_staff user may still have a member profile');

reset role;
select ok(
  public.is_gc_staff(current_setting('t.staff')::uuid),
  'staff fixture is gc_staff');
select ok(
  not public.has_capability(current_setting('t.staff')::uuid, 'create_group'),
  'gc_staff member profile does not have create_group');

set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('t.staff'), 'role', 'authenticated')::text,
  true);

select is(
  (select count(*) from public.groups
    where id = current_setting('t.secret_gid')::uuid)::int,
  0,
  'gc_staff cannot see a secret group they do not belong to');
select is(
  (select count(*) from public.posts
    where id = current_setting('t.secret_post')::uuid)::int,
  0,
  'gc_staff cannot see a secret-group post they cannot access');
select is(
  (select count(*) from public.group_members
    where group_id = current_setting('t.secret_gid')::uuid)::int,
  0,
  'gc_staff cannot list secret-group members');
select throws_ok(
  format($sql$
    insert into public.groups (slug, name, created_by)
    values ('staff-group', 'Staff Group', %L)
  $sql$, current_setting('t.staff')),
  '42501',
  null,
  'gc_staff cannot create a group without create_group');

-- privileged columns stay locked when auth.role() is not service_role.
-- Clear the transaction-local refresh GUC that member inserts left on
-- (one HTTP request = one transaction; this file is a single transaction).
reset role;
select set_config('app.refreshing_group_member_count', '', true);
select set_config('request.jwt.claims',
  json_build_object('role', 'authenticated')::text, true);

select throws_ok(
  format($sql$
    update public.groups set member_count = 99
     where id = %L
  $sql$, current_setting('t.public_gid')),
  'P0001',
  'privileged group columns are not client-writable',
  'client cannot write privileged group columns');

select throws_ok(
  format($sql$
    update public.posts set like_count = 99
     where author_id = %L
  $sql$, current_setting('t.creator')),
  'P0001',
  'privileged post columns are not client-writable',
  'client cannot write privileged post columns');

-- ---- catalog membership revoke does not delete profile or posts ------------
reset role;

insert into public.organizations (id, name, status) values
  (current_setting('t.org')::uuid, 'Revoke Org', 'active');
insert into public.memberships (org_id, user_id, role, status) values
  (current_setting('t.org')::uuid, current_setting('t.owner')::uuid,  'account_owner', 'active'),
  (current_setting('t.org')::uuid, current_setting('t.member')::uuid, 'viewer',        'active');

set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('t.member'), 'role', 'authenticated')::text,
  true);

select lives_ok(
  format($sql$
    insert into public.profiles (id, handle, display_name, birth_date)
    values (%L, 'memberone', 'Member One', (current_date - interval '25 years')::date)
  $sql$, current_setting('t.member')),
  'catalog member can also have a profile');
select lives_ok(
  format($sql$
    insert into public.posts (author_id, body)
    values (%L, 'catalog post')
  $sql$, current_setting('t.member')),
  'catalog member with a profile can post');

reset role;
update public.memberships
   set status = 'removed'
 where org_id = current_setting('t.org')::uuid
   and user_id = current_setting('t.member')::uuid;

select is(
  (select count(*) from public.profiles
    where id = current_setting('t.member')::uuid)::int,
  1,
  'revoking membership (status=removed) does not delete the profile');
select is(
  (select count(*) from public.posts
    where author_id = current_setting('t.member')::uuid)::int,
  1,
  'revoking membership does not delete the member posts');

delete from public.memberships
 where org_id = current_setting('t.org')::uuid
   and user_id = current_setting('t.member')::uuid;

select is(
  (select count(*) from public.profiles
    where id = current_setting('t.member')::uuid)::int,
  1,
  'deleting a membership row does not cascade-delete the profile');
select is(
  (select count(*) from public.posts
    where author_id = current_setting('t.member')::uuid)::int,
  1,
  'deleting a membership row does not cascade-delete the posts');

-- ---- invariant 13: group delete must not destroy another member's posts ----
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('t.creator'), 'role', 'authenticated')::text,
  true);

select lives_ok(
  format($sql$
    insert into public.posts (author_id, group_id, body)
    values (%L, %L, 'member owned group post')
  $sql$, current_setting('t.creator'), current_setting('t.public_gid')),
  'group member can post into the public group');

select set_config('t.member_group_post',
  (select id::text from public.posts
    where body = 'member owned group post' limit 1), true);
select set_config('t.member_feed_post',
  (select id::text from public.posts
    where author_id = current_setting('t.creator')::uuid
      and group_id is null
    limit 1), true);

set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('t.admin'), 'role', 'authenticated')::text,
  true);

select throws_ok(
  format($sql$
    delete from public.groups where id = %L
  $sql$, current_setting('t.public_gid')),
  '42501',
  null,
  'staff cannot hard-delete a group (close/hide only)');

reset role;
select is(
  (select count(*) from public.posts
    where id = current_setting('t.member_group_post')::uuid)::int,
  1,
  'staff delete attempt does not destroy another member group post');
select is(
  (select count(*) from public.posts
    where id = current_setting('t.member_feed_post')::uuid)::int,
  1,
  'staff delete attempt does not destroy that member personal Social post');

set local role service_role;
select set_config('request.jwt.claims',
  json_build_object('role', 'service_role')::text, true);

select throws_ok(
  format($sql$
    delete from public.groups where id = %L
  $sql$, current_setting('t.public_gid')),
  '23503',
  null,
  'service_role delete is restricted while member posts exist');

reset role;
select is(
  (select count(*) from public.posts
    where id = current_setting('t.member_group_post')::uuid)::int,
  1,
  'RESTRICT delete leaves independently owned member posts');

set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('t.admin'), 'role', 'authenticated')::text,
  true);

select lives_ok(
  format($sql$
    update public.groups set status = 'closed'
     where id = %L
  $sql$, current_setting('t.public_gid')),
  'staff close a group instead of deleting it');

reset role;
select is(
  (select count(*) from public.posts
    where id = current_setting('t.member_group_post')::uuid)::int,
  1,
  'closing a group does not destroy member posts');

set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('t.member'), 'role', 'authenticated')::text,
  true);

select throws_ok(
  format($sql$
    insert into public.group_members (group_id, user_id, role)
    values (%L, %L, 'member')
  $sql$, current_setting('t.public_gid'), current_setting('t.member')),
  '42501',
  null,
  'closed group cannot be newly joined');

reset role;
delete from public.group_members
 where group_id = current_setting('t.public_gid')::uuid
   and user_id = current_setting('t.creator')::uuid;

select is(
  (select count(*) from public.posts
    where author_id = current_setting('t.creator')::uuid)::int,
  2,
  'revoking group membership does not wipe personal Social posts');

-- ---- catalog user without a profile still works (Pack 1 regression) --------
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
  'create_org_and_membership still does not auto-create a profile');
select ok(
  public.member_can(
    current_setting('t.catalog')::uuid,
    current_setting('t.catalog_org')::uuid,
    'view'),
  'membership user without a profile still has member_can view');

reset role;
select * from finish();
rollback;
