-- direct_messages_test.sql
-- Phase 1B Pack 4 mapping C: DMs/blocks FK to optional profiles.
-- open_or_get_direct_conversation is the write path. Client cannot INSERT
-- conversations or participants. Messages insert requires self + participant
-- + not blocked. Catalog membership revoke must not delete a profile, DM, or
-- block. Dashboard org_status stays unchanged. Social/DM policies must not
-- privilege-bridge via is_gc_staff. 24Frame AI ai_* tables stay.

begin;
select plan(75);

select set_config('t.org',      gen_random_uuid()::text, false);
select set_config('t.owner',    gen_random_uuid()::text, false);
select set_config('t.member',   gen_random_uuid()::text, false);
select set_config('t.alice',    gen_random_uuid()::text, false);
select set_config('t.bob',      gen_random_uuid()::text, false);
select set_config('t.carol',    gen_random_uuid()::text, false);
select set_config('t.staff',    gen_random_uuid()::text, false);
select set_config('t.noprof',   gen_random_uuid()::text, false);

insert into auth.users (id) values
  (current_setting('t.owner')::uuid),
  (current_setting('t.member')::uuid),
  (current_setting('t.alice')::uuid),
  (current_setting('t.bob')::uuid),
  (current_setting('t.carol')::uuid),
  (current_setting('t.staff')::uuid),
  (current_setting('t.noprof')::uuid);

-- ---- schema presence -------------------------------------------------------
select ok(to_regclass('public.blocks') is not null, 'blocks table exists');
select ok(to_regclass('public.conversations') is not null, 'conversations table exists');
select ok(
  to_regclass('public.conversation_participants') is not null,
  'conversation_participants table exists');
select ok(to_regclass('public.messages') is not null, 'messages table exists');
select ok(to_regclass('public.likes') is not null, 'likes table still present (Pack 3)');
select ok(
  to_regclass('public.ai_conversations') is not null,
  'ai_conversations still present (24Frame AI not renamed back)');
select ok(
  to_regclass('public.ai_conversation_messages') is not null,
  'ai_conversation_messages still present');

select ok(
  exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'conversation_kind'
  ),
  'conversation_kind enum exists');
select is(
  (select array_agg(e.enumlabel::text order by e.enumsortorder)
     from pg_enum e
     join pg_type t on t.oid = e.enumtypid
     join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'conversation_kind'),
  array['direct','group']::text[],
  'conversation_kind labels are direct|group');

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
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'conversation_participants'
      and column_name = 'left_at'
  ),
  'conversation_participants has left_at');
select ok(
  not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name in (
        'blocks', 'conversations', 'conversation_participants', 'messages'
      )
      and column_name = 'org_id'
  ),
  'DM tables have no org_id');
select ok(
  not exists (
    select 1
    from pg_policy pol
    join pg_class c on c.oid = pol.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and (
        c.relname in (
          'blocks', 'conversations', 'conversation_participants', 'messages'
        )
        or pol.polname = 'profiles_select_conversation_peer'
      )
      and (
        coalesce(pg_get_expr(pol.polqual, pol.polrelid), '') ilike '%is_gc_staff%'
        or coalesce(pg_get_expr(pol.polwithcheck, pol.polrelid), '') ilike '%is_gc_staff%'
      )
  ),
  'social/DM policies do not call is_gc_staff');
select ok(
  not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'direct_dm_key',
        'caller_may_inspect',
        'is_blocked_either_way',
        'is_active_conversation_participant',
        'conversation_has_block',
        'can_access_conversation',
        'shares_direct_conversation',
        'open_or_get_direct_conversation',
        'get_dm_inbox',
        'mark_direct_conversation_read',
        'protect_conversation_privileged_columns',
        'protect_participant_privileged_columns',
        'refresh_conversation_on_message'
      )
      and (
        p.prosrc ilike '%is_gc_staff%'
        or p.prosrc like '%set_config(''24frame.%'
        or p.prosrc like '%current_setting(''24frame.%'
      )
  ),
  'DM helpers do not call is_gc_staff and use app.* GUCs');
select ok(
  not has_table_privilege('authenticated', 'public.conversations', 'INSERT')
    and not has_table_privilege(
      'authenticated', 'public.conversation_participants', 'INSERT'),
  'authenticated has no INSERT grant on conversations/participants');
select ok(
  not has_table_privilege('authenticated', 'public.messages', 'UPDATE')
    and not has_table_privilege('authenticated', 'public.messages', 'DELETE'),
  'authenticated has no UPDATE/DELETE grant on messages');
select ok(
  exists (
    select 1 from pg_policy pol
    join pg_class c on c.oid = pol.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'profiles'
      and pol.polname = 'profiles_select_conversation_peer'
  ),
  'profiles_select_conversation_peer exists');

-- ---- no-profile / self / client INSERT ------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('t.noprof'), 'role', 'authenticated')::text,
  true);

select throws_ok(
  format($sql$
    select public.open_or_get_direct_conversation(%L)
  $sql$, current_setting('t.alice')),
  '42501',
  'inactive profile',
  'user without a profile cannot open a DM');
select throws_ok(
  format($sql$
    insert into public.blocks (blocker_id, blocked_id)
    values (%L, %L)
  $sql$, current_setting('t.noprof'), current_setting('t.alice')),
  '42501',
  null,
  'user without a profile cannot insert a block');

-- ---- two active profiles: open is idempotent via dm_key --------------------
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('t.alice'), 'role', 'authenticated')::text,
  true);

select lives_ok(
  format($sql$
    insert into public.profiles (id, handle, display_name, birth_date)
    values (%L, 'aliceone', 'Alice One', (current_date - interval '22 years')::date)
  $sql$, current_setting('t.alice')),
  'alice profile does not require an org');

select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('t.bob'), 'role', 'authenticated')::text,
  true);
select lives_ok(
  format($sql$
    insert into public.profiles (id, handle, display_name, birth_date)
    values (%L, 'bobone', 'Bob One', (current_date - interval '24 years')::date)
  $sql$, current_setting('t.bob')),
  'bob profile does not require an org');

select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('t.carol'), 'role', 'authenticated')::text,
  true);
select lives_ok(
  format($sql$
    insert into public.profiles (id, handle, display_name, birth_date)
    values (%L, 'carolone', 'Carol One', (current_date - interval '26 years')::date)
  $sql$, current_setting('t.carol')),
  'carol profile does not require an org');

select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('t.alice'), 'role', 'authenticated')::text,
  true);

select lives_ok(
  format($sql$
    select set_config('t.self', public.open_or_get_direct_conversation(%L)::text, true)
  $sql$, current_setting('t.alice')),
  'self is a valid direct recipient');

select is(
  public.open_or_get_direct_conversation(current_setting('t.alice')::uuid)::text,
  current_setting('t.self'),
  'self-DM is idempotent via dm_key');

select throws_ok(
  format($sql$
    insert into public.conversations (kind, dm_key, created_by)
    values ('direct', 'client-insert', %L)
  $sql$, current_setting('t.alice')),
  '42501',
  null,
  'client cannot INSERT conversations directly');

select lives_ok(
  format($sql$
    select set_config('t.conv', public.open_or_get_direct_conversation(%L)::text, true)
  $sql$, current_setting('t.bob')),
  'two active profiles can open a DM');

select is(
  public.open_or_get_direct_conversation(current_setting('t.bob')::uuid)::text,
  current_setting('t.conv'),
  'open_or_get is idempotent via dm_key');

select is(
  public.direct_dm_key(
    current_setting('t.alice')::uuid,
    current_setting('t.bob')::uuid
  ),
  (select dm_key from public.conversations
    where id = current_setting('t.conv')::uuid),
  'stored dm_key matches canonical pair key');

select is(
  (select count(*) from public.conversation_participants
    where conversation_id = current_setting('t.conv')::uuid)::int,
  2,
  'open creates exactly two participants');

select throws_ok(
  format($sql$
    insert into public.conversation_participants (conversation_id, user_id)
    values (%L, %L)
  $sql$, current_setting('t.conv'), current_setting('t.carol')),
  '42501',
  null,
  'client cannot INSERT conversation_participants directly');

-- ---- message insert: self + participant + body; created_at stamped --------
select lives_ok(
  format($sql$
    insert into public.messages (conversation_id, sender_id, body, created_at)
    values (%L, %L, 'hello bob', '2000-01-01T00:00:00Z')
  $sql$, current_setting('t.conv'), current_setting('t.alice')),
  'participant can insert an active body message');

select set_config('t.msg',
  (select id::text from public.messages
    where conversation_id = current_setting('t.conv')::uuid
      and body = 'hello bob'
    limit 1),
  true);

select ok(
  (select created_at from public.messages
    where id = current_setting('t.msg')::uuid)
    > timestamptz '2000-01-01 00:00:00+00',
  'messages.created_at is server-stamped (not the client value)');

select ok(
  (select last_message_at from public.conversations
    where id = current_setting('t.conv')::uuid) is not null,
  'last_message_at is trigger-maintained on insert');
select is(
  (select unread_count from public.conversation_participants
    where conversation_id = current_setting('t.conv')::uuid
      and user_id = current_setting('t.bob')::uuid)::int,
  1,
  'peer unread_count increments on message');
select is(
  (select unread_count from public.conversation_participants
    where conversation_id = current_setting('t.conv')::uuid
      and user_id = current_setting('t.alice')::uuid)::int,
  0,
  'sender unread_count stays 0');

-- ---- privileged columns are not client-writable ---------------------------
reset role;
select set_config('app.refreshing_last_message_at', '', true);
select set_config('app.refreshing_unread', '', true);
select set_config('request.jwt.claims',
  json_build_object('role', 'authenticated')::text, true);

select throws_ok(
  format($sql$
    update public.conversations set last_message_at = now()
     where id = %L
  $sql$, current_setting('t.conv')),
  'P0001',
  'privileged conversation columns are not client-writable',
  'client cannot write last_message_at');
select throws_ok(
  format($sql$
    update public.conversation_participants set unread_count = 99
     where conversation_id = %L
       and user_id = %L
  $sql$, current_setting('t.conv'), current_setting('t.bob')),
  'P0001',
  'privileged participant columns are not client-writable',
  'client cannot write unread_count');

-- ---- inbox + mark-read -----------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('t.bob'), 'role', 'authenticated')::text,
  true);

select is(
  (select unread_count from public.get_dm_inbox(10)
    where conversation_id = current_setting('t.conv')::uuid)::int,
  1,
  'get_dm_inbox reports peer unread_count');
select is(
  (select peer_id from public.get_dm_inbox(10)
    where conversation_id = current_setting('t.conv')::uuid),
  current_setting('t.alice')::uuid,
  'get_dm_inbox returns the other participant as peer_id');

select lives_ok(
  format($sql$
    select public.mark_direct_conversation_read(
      %L, timestamptz '2000-01-01 00:00:00+00')
  $sql$, current_setting('t.conv')),
  'mark_direct_conversation_read with a stale seen_at does not error');
select is(
  (select unread_count from public.conversation_participants
    where conversation_id = current_setting('t.conv')::uuid
      and user_id = current_setting('t.bob')::uuid)::int,
  1,
  'stale mark-read does not zero unread (seen_at before last_message_at)');

select lives_ok(
  format($sql$
    select public.mark_direct_conversation_read(%L, clock_timestamp())
  $sql$, current_setting('t.conv')),
  'mark_direct_conversation_read with a current seen_at succeeds');
select is(
  (select unread_count from public.conversation_participants
    where conversation_id = current_setting('t.conv')::uuid
      and user_id = current_setting('t.bob')::uuid)::int,
  0,
  'mark-read zeros unread_count');

-- ---- non-participant cannot see or send -----------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('t.carol'), 'role', 'authenticated')::text,
  true);

select is(
  (select count(*) from public.messages
    where conversation_id = current_setting('t.conv')::uuid)::int,
  0,
  'non-participant cannot SELECT messages');
select is(
  (select count(*) from public.conversations
    where id = current_setting('t.conv')::uuid)::int,
  0,
  'non-participant cannot SELECT the conversation');
select throws_ok(
  format($sql$
    insert into public.messages (conversation_id, sender_id, body)
    values (%L, %L, 'intrude')
  $sql$, current_setting('t.conv'), current_setting('t.carol')),
  '42501',
  null,
  'non-participant cannot insert a message');

-- ---- no client UPDATE/DELETE on messages ----------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('t.alice'), 'role', 'authenticated')::text,
  true);
select throws_ok(
  format($sql$
    update public.messages set body = 'hacked' where id = %L
  $sql$, current_setting('t.msg')),
  '42501',
  null,
  'client has no UPDATE path on messages');
select throws_ok(
  format($sql$
    delete from public.messages where id = %L
  $sql$, current_setting('t.msg')),
  '42501',
  null,
  'client has no DELETE path on messages');

-- ---- self-block rejected; blocked either way cannot open or send ----------
select throws_ok(
  format($sql$
    insert into public.blocks (blocker_id, blocked_id)
    values (%L, %L)
  $sql$, current_setting('t.alice'), current_setting('t.alice')),
  '42501',
  null,
  'self-block is rejected by RLS');

reset role;
select throws_ok(
  format($sql$
    insert into public.blocks (blocker_id, blocked_id)
    values (%L, %L)
  $sql$, current_setting('t.alice'), current_setting('t.alice')),
  '23514',
  null,
  'self-block is rejected by check');
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('t.alice'), 'role', 'authenticated')::text,
  true);

select lives_ok(
  format($sql$
    insert into public.blocks (blocker_id, blocked_id)
    values (%L, %L)
  $sql$, current_setting('t.alice'), current_setting('t.bob')),
  'active profile can block a peer');

select throws_ok(
  format($sql$
    select public.open_or_get_direct_conversation(%L)
  $sql$, current_setting('t.bob')),
  '42501',
  'blocked',
  'blocker cannot open a DM with the blocked peer');
select throws_ok(
  format($sql$
    insert into public.messages (conversation_id, sender_id, body)
    values (%L, %L, 'after block')
  $sql$, current_setting('t.conv'), current_setting('t.alice')),
  '42501',
  null,
  'blocker cannot send after a block (conversation_has_block)');

select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('t.bob'), 'role', 'authenticated')::text,
  true);
select throws_ok(
  format($sql$
    select public.open_or_get_direct_conversation(%L)
  $sql$, current_setting('t.alice')),
  '42501',
  'blocked',
  'blocked peer cannot open a DM either way');
select throws_ok(
  format($sql$
    insert into public.messages (conversation_id, sender_id, body)
    values (%L, %L, 'after being blocked')
  $sql$, current_setting('t.conv'), current_setting('t.bob')),
  '42501',
  null,
  'blocked peer cannot send either way');
select is(
  (select count(*) from public.get_dm_inbox(10)
    where conversation_id = current_setting('t.conv')::uuid)::int,
  0,
  'blocked conversation is omitted from get_dm_inbox');
select throws_ok(
  format($sql$
    select public.mark_direct_conversation_read(%L, clock_timestamp())
  $sql$, current_setting('t.conv')),
  '42501',
  'blocked',
  'mark_direct_conversation_read rejects a blocked conversation');

-- Unblock so later catalog-revoke fixtures can still DM if needed.
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('t.alice'), 'role', 'authenticated')::text,
  true);
select lives_ok(
  format($sql$
    delete from public.blocks
     where blocker_id = %L and blocked_id = %L
  $sql$, current_setting('t.alice'), current_setting('t.bob')),
  'blocker can delete their own block');

select lives_ok(
  format($sql$
    insert into public.messages (conversation_id, sender_id, body)
    values (%L, %L, 'after unblock')
  $sql$, current_setting('t.conv'), current_setting('t.alice')),
  'send works again after unblock');

-- ---- gc_staff without a profile cannot open a DM --------------------------
reset role;
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
    select public.open_or_get_direct_conversation(%L)
  $sql$, current_setting('t.alice')),
  '42501',
  'inactive profile',
  'gc_staff without a profile cannot open a DM');

-- ---- catalog membership revoke does not cascade-delete DMs ----------------
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
    select set_config(
      't.member_conv',
      public.open_or_get_direct_conversation(%L)::text,
      true)
  $sql$, current_setting('t.alice')),
  'catalog member with a profile can open a DM');
select lives_ok(
  format($sql$
    insert into public.messages (conversation_id, sender_id, body)
    values (%L, %L, 'catalog hello')
  $sql$, current_setting('t.member_conv'), current_setting('t.member')),
  'catalog member with a profile can send a DM');
select lives_ok(
  format($sql$
    insert into public.blocks (blocker_id, blocked_id)
    values (%L, %L)
  $sql$, current_setting('t.member'), current_setting('t.carol')),
  'catalog member with a profile can insert a block');

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
  (select count(*) from public.conversations
    where id = current_setting('t.member_conv')::uuid)::int,
  1,
  'revoking membership does not delete the conversation');
select is(
  (select count(*) from public.messages
    where conversation_id = current_setting('t.member_conv')::uuid)::int,
  1,
  'revoking membership does not delete the messages');
select is(
  (select count(*) from public.blocks
    where blocker_id = current_setting('t.member')::uuid)::int,
  1,
  'revoking membership does not delete the blocks');

delete from public.memberships
 where org_id = current_setting('t.org')::uuid
   and user_id = current_setting('t.member')::uuid;

select is(
  (select count(*) from public.profiles
    where id = current_setting('t.member')::uuid)::int,
  1,
  'deleting a membership row does not cascade-delete the profile');
select is(
  (select count(*) from public.conversations
    where id = current_setting('t.member_conv')::uuid)::int,
  1,
  'deleting a membership row does not cascade-delete conversations');
select is(
  (select count(*) from public.messages
    where conversation_id = current_setting('t.member_conv')::uuid)::int,
  1,
  'deleting a membership row does not cascade-delete messages');
select is(
  (select count(*) from public.blocks
    where blocker_id = current_setting('t.member')::uuid)::int,
  1,
  'deleting a membership row does not cascade-delete blocks');

reset role;
select * from finish();
rollback;
