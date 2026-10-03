-- likes_test.sql
-- Phase 1B Pack 3 mapping C: likes FK to optional profiles.
-- Insert requires an active profile and an existing post. Comment
-- targets are rejected. Self-likes bump like_count with no point_event.
-- Unlike removes the matching point_event. Catalog membership revoke
-- must not delete a like, profile, or post. Dashboard org_status stays
-- unchanged. Social policies must not privilege-bridge via is_gc_staff.

begin;
select plan(50);

select set_config('t.org',      gen_random_uuid()::text, false);
select set_config('t.owner',    gen_random_uuid()::text, false);
select set_config('t.member',   gen_random_uuid()::text, false);
select set_config('t.author',   gen_random_uuid()::text, false);
select set_config('t.liker',    gen_random_uuid()::text, false);
select set_config('t.staff',    gen_random_uuid()::text, false);
select set_config('t.noprof',   gen_random_uuid()::text, false);
select set_config('t.ghost',    gen_random_uuid()::text, false);

insert into auth.users (id) values
  (current_setting('t.owner')::uuid),
  (current_setting('t.member')::uuid),
  (current_setting('t.author')::uuid),
  (current_setting('t.liker')::uuid),
  (current_setting('t.staff')::uuid),
  (current_setting('t.noprof')::uuid),
  (current_setting('t.ghost')::uuid);

-- ---- schema presence -------------------------------------------------------
select ok(to_regclass('public.likes') is not null, 'likes table exists');
select ok(
  exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'like_target'
  ),
  'like_target enum exists');
select is(
  (select array_agg(e.enumlabel::text order by e.enumsortorder)
     from pg_enum e
     join pg_type t on t.oid = e.enumtypid
     join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'like_target'),
  array['post','comment','story_item']::text[],
  'like_target labels are post|comment|story_item');

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
  to_regclass('public.blocks') is not null,
  'blocks table exists');
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
      and table_name = 'likes'
      and column_name = 'org_id'
  ),
  'likes has no org_id');
select ok(
  not exists (
    select 1 from pg_policy pol
    join pg_class c on c.oid = pol.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'likes'
      and pol.polcmd = 'w'
  ),
  'likes has no UPDATE policy');
select ok(
  has_table_privilege('authenticated', 'public.likes', 'SELECT')
    and has_table_privilege('authenticated', 'public.likes', 'INSERT')
    and has_table_privilege('authenticated', 'public.likes', 'DELETE'),
  'authenticated has select/insert/delete on likes');
select ok(
  not has_table_privilege('authenticated', 'public.likes', 'UPDATE'),
  'authenticated has no UPDATE grant on likes');
select ok(
  not exists (
    select 1
    from pg_policy pol
    join pg_class c on c.oid = pol.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'likes'
      and (
        coalesce(pg_get_expr(pol.polqual, pol.polrelid), '') ilike '%is_gc_staff%'
        or coalesce(pg_get_expr(pol.polwithcheck, pol.polrelid), '') ilike '%is_gc_staff%'
      )
  ),
  'likes policies do not call is_gc_staff');
select ok(
  not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'protect_profile_privileged_columns',
        'refresh_profile_points',
        'protect_post_privileged_columns',
        'refresh_like_engagement'
      )
      and (
        p.prosrc like '%set_config(''24frame.%'
        or p.prosrc like '%current_setting(''24frame.%'
      )
  ),
  'replaced functions use app.* GUCs, not 24frame.*');

-- ---- insert requires active profile + existing post ------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('t.noprof'), 'role', 'authenticated')::text,
  true);

select throws_ok(
  format($sql$
    insert into public.likes (user_id, target_type, target_id)
    values (%L, 'post', %L)
  $sql$, current_setting('t.noprof'), gen_random_uuid()),
  '42501',
  null,
  'user without a profile cannot insert a like');

-- ---- author profile + post; self-like --------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('t.author'), 'role', 'authenticated')::text,
  true);

select lives_ok(
  format($sql$
    insert into public.profiles (id, handle, display_name, birth_date)
    values (%L, 'authorone', 'Author One', (current_date - interval '22 years')::date)
  $sql$, current_setting('t.author')),
  'creating a profile does not require an org');
select lives_ok(
  format($sql$
    insert into public.posts (author_id, body)
    values (%L, 'like target')
  $sql$, current_setting('t.author')),
  'active profile can insert a feed post');

select set_config('t.post',
  (select id::text from public.posts where body = 'like target' limit 1), true);

select throws_ok(
  format($sql$
    insert into public.likes (user_id, target_type, target_id)
    values (%L, 'post', %L)
  $sql$, current_setting('t.author'), gen_random_uuid()),
  '42501',
  null,
  'like insert requires an existing post');
select throws_ok(
  format($sql$
    insert into public.likes (user_id, target_type, target_id)
    values (%L, 'comment', %L)
  $sql$, current_setting('t.author'), current_setting('t.post')),
  '42501',
  null,
  'authenticated comment like is rejected by RLS');

select lives_ok(
  format($sql$
    insert into public.likes (user_id, target_type, target_id)
    values (%L, 'post', %L)
  $sql$, current_setting('t.author'), current_setting('t.post')),
  'self-like of own post is allowed');
select is(
  (select like_count from public.posts
    where id = current_setting('t.post')::uuid)::int,
  1,
  'self-like increments like_count');
select is(
  (select count(*) from public.point_events
    where reason = 'post_liked'
      and source_id = current_setting('t.post')::uuid)::int,
  0,
  'self-like inserts no point_event');

-- ---- other-user like + unlike (gamification on) ----------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('t.liker'), 'role', 'authenticated')::text,
  true);

select lives_ok(
  format($sql$
    insert into public.profiles (id, handle, display_name, birth_date)
    values (%L, 'likerone', 'Liker One', (current_date - interval '24 years')::date)
  $sql$, current_setting('t.liker')),
  'liker profile does not require an org');
select lives_ok(
  format($sql$
    insert into public.likes (user_id, target_type, target_id)
    values (%L, 'post', %L)
  $sql$, current_setting('t.liker'), current_setting('t.post')),
  'other user with an active profile can like a visible post');
select is(
  (select like_count from public.posts
    where id = current_setting('t.post')::uuid)::int,
  2,
  'other-user like increments like_count');

reset role;
select is(
  (select count(*) from public.point_events
    where user_id = current_setting('t.author')::uuid
      and actor_id = current_setting('t.liker')::uuid
      and reason = 'post_liked'
      and source_type = 'post'
      and source_id = current_setting('t.post')::uuid
      and delta = 1)::int,
  1,
  'other-user like inserts post_liked point_event when gamification is on');

set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('t.author'), 'role', 'authenticated')::text,
  true);
select is(
  (select count(*) from public.likes
    where target_id = current_setting('t.post')::uuid)::int,
  2,
  'SELECT returns likes on a visible post');

select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('t.liker'), 'role', 'authenticated')::text,
  true);
select lives_ok(
  format($sql$
    delete from public.likes
     where user_id = %L
       and target_type = 'post'
       and target_id = %L
  $sql$, current_setting('t.liker'), current_setting('t.post')),
  'liker can unlike their own row');
select is(
  (select like_count from public.posts
    where id = current_setting('t.post')::uuid)::int,
  1,
  'unlike decrements like_count');

reset role;
select is(
  (select count(*) from public.point_events
    where reason = 'post_liked'
      and source_id = current_setting('t.post')::uuid
      and actor_id = current_setting('t.liker')::uuid)::int,
  0,
  'unlike deletes the matching point_event');

-- ---- gamification_enabled false: count still moves, no point_event ---------
set local role service_role;
select set_config('request.jwt.claims',
  json_build_object('role', 'service_role')::text, true);
update public.app_settings set gamification_enabled = false where id;
reset role;

set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('t.liker'), 'role', 'authenticated')::text,
  true);
select lives_ok(
  format($sql$
    insert into public.likes (user_id, target_type, target_id)
    values (%L, 'post', %L)
  $sql$, current_setting('t.liker'), current_setting('t.post')),
  'like still inserts when gamification is off');
select is(
  (select like_count from public.posts
    where id = current_setting('t.post')::uuid)::int,
  2,
  'gamification off still increments like_count');

reset role;
select is(
  (select count(*) from public.point_events
    where reason = 'post_liked'
      and source_id = current_setting('t.post')::uuid
      and actor_id = current_setting('t.liker')::uuid)::int,
  0,
  'gamification off inserts no point_event');

set local role service_role;
select set_config('request.jwt.claims',
  json_build_object('role', 'service_role')::text, true);
update public.app_settings set gamification_enabled = true where id;
reset role;

-- ---- comment likes rejected by trigger when RLS is bypassed ----------------
set local role service_role;
select set_config('request.jwt.claims',
  json_build_object('role', 'service_role')::text, true);
select throws_ok(
  format($sql$
    insert into public.likes (user_id, target_type, target_id)
    values (%L, 'comment', %L)
  $sql$, current_setting('t.author'), current_setting('t.post')),
  'P0001',
  'comment likes are not in this slice',
  'refresh_like_engagement rejects comment likes');
reset role;

-- ---- no client UPDATE path -------------------------------------------------
select set_config('app.refreshing_post_like_count', '', true);
select set_config('app.refreshing_profile_points', '', true);
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('t.author'), 'role', 'authenticated')::text,
  true);
select throws_ok(
  format($sql$
    update public.likes set created_at = now()
     where user_id = %L
       and target_id = %L
  $sql$, current_setting('t.author'), current_setting('t.post')),
  '42501',
  null,
  'client has no UPDATE path on likes');

-- ---- deactivated profile cannot like ---------------------------------------
reset role;
set local role service_role;
select set_config('request.jwt.claims',
  json_build_object('role', 'service_role')::text, true);
update public.profiles
   set status = 'deactivated',
       deactivated_at = now()
 where id = current_setting('t.liker')::uuid;
reset role;

set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('t.liker'), 'role', 'authenticated')::text,
  true);
select throws_ok(
  format($sql$
    insert into public.likes (user_id, target_type, target_id)
    values (%L, 'post', %L)
  $sql$, current_setting('t.liker'), current_setting('t.post')),
  '42501',
  null,
  'deactivated profile cannot insert a like');

reset role;
set local role service_role;
select set_config('request.jwt.claims',
  json_build_object('role', 'service_role')::text, true);
update public.profiles
   set status = 'active',
       deactivated_at = null
 where id = current_setting('t.liker')::uuid;
reset role;

-- ---- gc_staff without a profile cannot like --------------------------------
insert into public.gc_staff (user_id, role)
values (current_setting('t.staff')::uuid, 'gc_delivery_ops');

select ok(
  public.is_gc_staff(current_setting('t.staff')::uuid),
  'staff fixture is gc_staff');
select is(
  (select count(*) from public.profiles
    where id = current_setting('t.staff')::uuid)::int,
  0,
  'staff fixture has no profile');

set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('t.staff'), 'role', 'authenticated')::text,
  true);
select throws_ok(
  format($sql$
    insert into public.likes (user_id, target_type, target_id)
    values (%L, 'post', %L)
  $sql$, current_setting('t.staff'), current_setting('t.post')),
  '42501',
  null,
  'gc_staff without a profile cannot insert a like');

-- ---- catalog membership revoke does not cascade-delete likes ---------------
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

select set_config('t.member_post',
  (select id::text from public.posts where body = 'catalog post' limit 1), true);

select lives_ok(
  format($sql$
    insert into public.likes (user_id, target_type, target_id)
    values (%L, 'post', %L)
  $sql$, current_setting('t.member'), current_setting('t.member_post')),
  'catalog member with a profile can like');

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
select is(
  (select count(*) from public.likes
    where user_id = current_setting('t.member')::uuid)::int,
  1,
  'revoking membership does not delete the member likes');

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
select is(
  (select count(*) from public.likes
    where user_id = current_setting('t.member')::uuid)::int,
  1,
  'deleting a membership row does not cascade-delete the likes');

reset role;
select * from finish();
rollback;
