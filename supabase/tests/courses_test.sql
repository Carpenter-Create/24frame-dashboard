-- courses_test.sql
-- Slice 5 mapping C: lean course placeholders. Clients SELECT only.
-- has_course_access is flagship OR member_tier_rank >= 1. ADAM LOCK:
-- authenticated INSERT/UPDATE/DELETE denied. No is_gc_staff backdoor.
-- No entitlements table. No media_assets. No lesson_progress.
-- org_status stays unchanged. Person-scoped tables are not catalog-org.

begin;
select plan(39);

select set_config('t.alpha',   gen_random_uuid()::text, false);
select set_config('t.bravo',   gen_random_uuid()::text, false);
select set_config('t.staff',   gen_random_uuid()::text, false);
select set_config('t.catalog', gen_random_uuid()::text, false);

insert into auth.users (id) values
  (current_setting('t.alpha')::uuid),
  (current_setting('t.bravo')::uuid),
  (current_setting('t.staff')::uuid),
  (current_setting('t.catalog')::uuid);

-- ---- schema presence -------------------------------------------------------
select ok(to_regclass('public.courses') is not null, 'courses table exists');
select ok(to_regclass('public.modules') is not null, 'modules table exists');
select ok(to_regclass('public.lessons') is not null, 'lessons table exists');
select ok(
  exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'has_course_access'
      and p.prosecdef
      and pg_get_function_identity_arguments(p.oid) = 'p_user uuid, p_course uuid'
  ),
  'has_course_access exists, is SECURITY DEFINER, and takes (p_user, p_course)');
select ok(
  to_regclass('public.lesson_progress') is null,
  'lesson_progress is omitted');
select ok(
  to_regclass('public.media_assets') is null,
  'media_assets is omitted');
select ok(
  to_regprocedure('public.has_entitlement(uuid, text)') is null,
  'has_entitlement is omitted');
select ok(
  not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'lessons'
      and column_name = 'media_asset_id'
  ),
  'lessons has no media_asset_id');
select ok(
  not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'courses'
      and column_name = 'embedding'
  ),
  'courses has no embedding');
select ok(
  not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name in ('courses', 'modules', 'lessons')
      and column_name = 'org_id'
  ),
  'course tables have no org_id');
select ok(
  not exists (
    select 1 from public.capabilities
    where key in ('create_course', 'publish_course')
  ),
  'no create/publish course capability');

select is(
  (select array_agg(e.enumlabel::text order by e.enumsortorder)
     from pg_enum e
     join pg_type t on t.oid = e.enumtypid
     join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'org_status'),
  array['registered','awaiting_payment','active','payment_lapsed','closed']::text[],
  'org_status enum values unchanged');

select ok(
  to_regclass('public.conversations') is not null,
  'donor conversations (DMs) exist');
select ok(
  to_regclass('public.ai_conversations') is not null,
  'ai_conversations still present (24Frame AI not renamed back)');

select ok(
  not exists (
    select 1
    from pg_policy pol
    join pg_class c on c.oid = pol.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('courses', 'modules', 'lessons')
      and (
        coalesce(pg_get_expr(pol.polqual, pol.polrelid), '') ilike '%is_gc_staff%'
        or coalesce(pg_get_expr(pol.polwithcheck, pol.polrelid), '') ilike '%is_gc_staff%'
      )
  ),
  'course policies do not call is_gc_staff');
select ok(
  not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'has_course_access'
      and (
        p.prosrc ilike '%is_gc_staff%'
        or p.prosrc ilike '%has_entitlement%'
        or p.prosrc ilike '%24frame.%'
      )
  ),
  'has_course_access does not call is_gc_staff, has_entitlement, or 24frame.* GUCs');
select ok(
  not exists (
    select 1
    from pg_policy pol
    join pg_class c on c.oid = pol.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('courses', 'modules', 'lessons')
      and pol.polcmd in ('a', 'w', 'd')
  ),
  'course tables have no client write policies');
select ok(
  has_table_privilege('authenticated', 'public.courses', 'SELECT')
    and has_table_privilege('authenticated', 'public.modules', 'SELECT')
    and has_table_privilege('authenticated', 'public.lessons', 'SELECT')
    and not has_table_privilege('authenticated', 'public.courses', 'INSERT')
    and not has_table_privilege('authenticated', 'public.courses', 'UPDATE')
    and not has_table_privilege('authenticated', 'public.courses', 'DELETE')
    and not has_table_privilege('authenticated', 'public.modules', 'INSERT')
    and not has_table_privilege('authenticated', 'public.modules', 'UPDATE')
    and not has_table_privilege('authenticated', 'public.modules', 'DELETE')
    and not has_table_privilege('authenticated', 'public.lessons', 'INSERT')
    and not has_table_privilege('authenticated', 'public.lessons', 'UPDATE')
    and not has_table_privilege('authenticated', 'public.lessons', 'DELETE'),
  'authenticated has select only on course tables');
select ok(
  not has_table_privilege('anon', 'public.courses', 'SELECT')
    and not has_table_privilege('anon', 'public.modules', 'SELECT')
    and not has_table_privilege('anon', 'public.lessons', 'SELECT'),
  'anon has no course grants');
select ok(
  has_function_privilege('authenticated', 'public.has_course_access(uuid, uuid)', 'EXECUTE')
    and not has_function_privilege('anon', 'public.has_course_access(uuid, uuid)', 'EXECUTE'),
  'has_course_access execute is authenticated, not anon');

-- ---- access rule: flagship true; paid false while tier rank stub is 0 ------
reset role;
insert into public.courses (slug, title, is_flagship_free, price_cents, status)
values
  ('pgtap-flagship', 'Flagship fixture', true, null, 'published'),
  ('pgtap-paid', 'Paid fixture', false, null, 'published');

select ok(
  public.has_course_access(
    current_setting('t.alpha')::uuid,
    (select id from public.courses where slug = 'pgtap-flagship')
  ),
  'has_course_access is true for flagship_free');
select ok(
  not public.has_course_access(
    current_setting('t.alpha')::uuid,
    (select id from public.courses where slug = 'pgtap-paid')
  ),
  'has_course_access is false for non-flagship when member_tier_rank is 0');
select is(
  public.member_tier_rank(current_setting('t.alpha')::uuid),
  0,
  'member_tier_rank stub is still 0');

insert into public.modules (course_id, title, position)
values
  ((select id from public.courses where slug = 'pgtap-flagship'), 'Flagship module', 1),
  ((select id from public.courses where slug = 'pgtap-paid'), 'Paid module', 1);

insert into public.lessons (module_id, title, position, free_preview)
values
  (
    (select m.id from public.modules m
      join public.courses c on c.id = m.course_id
     where c.slug = 'pgtap-flagship'),
    'Flagship lesson',
    1,
    false
  ),
  (
    (select m.id from public.modules m
      join public.courses c on c.id = m.course_id
     where c.slug = 'pgtap-paid'),
    'Paid preview',
    1,
    true
  ),
  (
    (select m.id from public.modules m
      join public.courses c on c.id = m.course_id
     where c.slug = 'pgtap-paid'),
    'Paid body',
    2,
    false
  );

-- ---- isolation: two members discover courses; lessons stay gated -----------
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('t.alpha'), 'role', 'authenticated')::text,
  true);

select isnt_empty(
  $$ select 1 from public.courses where slug = 'welcome-to-24frame' $$,
  'member can discover a seeded flagship course');
select isnt_empty(
  $$ select 1 from public.courses where slug = 'pgtap-paid' $$,
  'member can discover a non-flagship course');
select isnt_empty(
  $$ select 1 from public.lessons
     where title = 'Flagship lesson' $$,
  'member can read flagship lessons');
select isnt_empty(
  $$ select 1 from public.lessons
     where title = 'Paid preview' $$,
  'member can read a free_preview lesson without course access');
select is_empty(
  $$ select 1 from public.lessons
     where title = 'Paid body' $$,
  'member cannot read a non-preview lesson without course access');

select throws_ok(
  $$ insert into public.courses (slug, title, is_flagship_free)
     values ('member-write', 'Nope', true) $$,
  '42501',
  null,
  'authenticated cannot insert courses');
select throws_ok(
  $$ update public.courses set title = 'Hijack'
     where slug = 'pgtap-flagship' $$,
  '42501',
  null,
  'authenticated cannot update courses');
select throws_ok(
  $$ delete from public.courses where slug = 'pgtap-flagship' $$,
  '42501',
  null,
  'authenticated cannot delete courses');
select throws_ok(
  $$ insert into public.modules (course_id, title, position)
     values (
       (select id from public.courses where slug = 'pgtap-flagship'),
       'Member module',
       9
     ) $$,
  '42501',
  null,
  'authenticated cannot insert modules');
select throws_ok(
  $$ insert into public.lessons (module_id, title, position, free_preview)
     values (
       (select m.id from public.modules m
         join public.courses c on c.id = m.course_id
        where c.slug = 'pgtap-flagship' limit 1),
       'Member lesson',
       9,
       true
     ) $$,
  '42501',
  null,
  'authenticated cannot insert lessons');

-- second member sees the same discoverable rows, still cannot write
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('t.bravo'), 'role', 'authenticated')::text,
  true);

select isnt_empty(
  $$ select 1 from public.courses where slug = 'pgtap-paid' $$,
  'second member can also discover the paid course');
select is_empty(
  $$ select 1 from public.lessons where title = 'Paid body' $$,
  'second member is also denied the paid body lesson');

-- catalog membership does not grant paid course access
reset role;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('t.catalog'), 'role', 'authenticated')::text,
  true);
set local role authenticated;
select set_config('t.catalog_org',
  (select public.create_org_and_membership('Catalog Films'))::text, true);

select ok(
  not public.has_course_access(
    current_setting('t.catalog')::uuid,
    (select id from public.courses where slug = 'pgtap-paid')
  ),
  'catalog membership does not grant has_course_access on a paid course');

-- gc_staff does not unlock writes (no privilege bridge)
reset role;
insert into public.gc_staff (user_id, role)
values (current_setting('t.staff')::uuid, 'gc_delivery_ops');
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('t.staff'), 'role', 'authenticated')::text,
  true);

select ok(
  public.is_gc_staff(current_setting('t.staff')::uuid),
  'staff fixture is gc_staff');
select throws_ok(
  $$ insert into public.courses (slug, title, is_flagship_free)
     values ('staff-write', 'Nope', true) $$,
  '42501',
  null,
  'gc_staff authenticated still cannot insert courses');
select is_empty(
  $$ select 1 from public.lessons where title = 'Paid body' $$,
  'gc_staff does not privilege-bridge paid lesson reads');

select * from finish();
rollback;
