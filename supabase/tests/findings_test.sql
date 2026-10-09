-- findings_test.sql
-- reconcile_title_findings (operate/GC-gated; derived from stored metadata, the
-- caller's payload ignored; upsert + auto-resolve; validator-only) + my_findings +
-- RLS (own-org only) for the findings store (§19).

begin;
select plan(16);

select set_config('t.orgA',   gen_random_uuid()::text, false);
select set_config('t.orgB',   gen_random_uuid()::text, false);
select set_config('t.ownerA', gen_random_uuid()::text, false);
select set_config('t.viewerA',gen_random_uuid()::text, false);
select set_config('t.ownerB', gen_random_uuid()::text, false);
select set_config('t.gc',     gen_random_uuid()::text, false);
select set_config('t.title',  gen_random_uuid()::text, false);

insert into auth.users (id) values
  (current_setting('t.ownerA')::uuid), (current_setting('t.viewerA')::uuid),
  (current_setting('t.ownerB')::uuid), (current_setting('t.gc')::uuid);
insert into public.organizations (id, name, status) values
  (current_setting('t.orgA')::uuid, 'Org A', 'active'),
  (current_setting('t.orgB')::uuid, 'Org B', 'active');
insert into public.memberships (user_id, org_id, role) values
  (current_setting('t.ownerA')::uuid,  current_setting('t.orgA')::uuid, 'account_owner'),
  (current_setting('t.viewerA')::uuid, current_setting('t.orgA')::uuid, 'viewer'),
  (current_setting('t.ownerB')::uuid,  current_setting('t.orgB')::uuid, 'account_owner');
insert into public.gc_staff (user_id, role) values (current_setting('t.gc')::uuid, 'gc_delivery_ops');
insert into public.titles (id, org_id, title, status) values
  (current_setting('t.title')::uuid, current_setting('t.orgA')::uuid, 'Film', 'draft');

-- two-finding payload, and a one-finding subset (drops synopsis)
select set_config('t.two', '[{"code":"metadata.missing.synopsis","severity":"high","message":"Synopsis is required.","field":"synopsis","tier":"required"},{"code":"metadata.missing.genre","severity":"high","message":"Genre is required.","field":"genre","tier":"required"}]', false);
select set_config('t.one', '[{"code":"metadata.missing.genre","severity":"high","message":"Genre is required.","field":"genre","tier":"required"}]', false);

-- ---- reconcile: operate-gated ---------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', current_setting('t.viewerA'),'role','authenticated')::text, true);
select throws_ok(
  format($$ select public.reconcile_title_findings(%L,%L,%L::jsonb,'metadata-v1') $$,
         current_setting('t.orgA'), current_setting('t.title'), current_setting('t.two')),
  'P0001', 'Not authorized', 'viewer cannot reconcile findings');

-- Findings come from the stored metadata, never from the caller's payload
-- (20261009120000). No metadata yet: all 6 required + 4 recommended missing.
select set_config('request.jwt.claims', json_build_object('sub', current_setting('t.ownerA'),'role','authenticated')::text, true);
select lives_ok(
  format($$ select public.reconcile_title_findings(%L,%L,%L::jsonb,'metadata-v1') $$,
         current_setting('t.orgA'), current_setting('t.title'), current_setting('t.two')),
  'owner reconciles (the two-finding payload is ignored)');
select is((select count(*) from public.findings where entity_id=current_setting('t.title')::uuid and status='open')::int, 10,
  'ten open findings, derived from the (empty) stored metadata');

-- ---- a forged empty payload cannot clear findings ---------------------------
select lives_ok(
  format($$ select public.reconcile_title_findings(%L,%L,'[]'::jsonb,'forged') $$,
         current_setting('t.orgA'), current_setting('t.title')),
  'owner reconciles with an empty payload');
select is((select count(*) from public.findings where entity_id=current_setting('t.title')::uuid and status='open')::int, 10,
  'an empty payload does not resolve anything');

-- ---- saving metadata refreshes findings in the same call ---------------------
select lives_ok(
  format($$ select public.set_title_metadata(%L,%L,'{"synopsis":"A film.","genre":"drama"}'::jsonb) $$,
         current_setting('t.orgA'), current_setting('t.title')),
  'owner saves synopsis and genre');
select is((select status::text from public.findings where entity_id=current_setting('t.title')::uuid and code='metadata.missing.synopsis'),
  'resolved', 'filled field auto-resolved');
select is((select status::text from public.findings where entity_id=current_setting('t.title')::uuid and code='metadata.missing.runtime_minutes'),
  'open', 'missing field still open');

-- ---- AI findings are never touched by validator reconcile ------------------
reset role;
insert into public.findings (org_id, entity_type, entity_id, code, source, severity, message, source_refs, logic_version)
  values (current_setting('t.orgA')::uuid, 'title', current_setting('t.title')::uuid,
          'ai.genre_mismatch', 'ai', 'low', 'Genre may not match the synopsis.', '{}'::jsonb, 'ai-v1');
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', current_setting('t.ownerA'),'role','authenticated')::text, true);
select lives_ok(
  format($$ select public.reconcile_title_findings(%L,%L,'[]'::jsonb,'metadata-v1') $$,
         current_setting('t.orgA'), current_setting('t.title')),
  'owner reconciles again');
select is((select status::text from public.findings where code='ai.genre_mismatch'),
  'open', 'AI finding untouched by validator reconcile');

-- ---- GC can reconcile -----------------------------------------------------
select set_config('request.jwt.claims', json_build_object('sub', current_setting('t.gc'),'role','authenticated')::text, true);
select lives_ok(
  format($$ select public.reconcile_title_findings(%L,%L,%L::jsonb,'metadata-v1') $$,
         current_setting('t.orgA'), current_setting('t.title'), current_setting('t.two')),
  'GC can reconcile findings');

-- ---- RLS: another org cannot see org A's findings; my_findings scoped ------
select set_config('request.jwt.claims', json_build_object('sub', current_setting('t.ownerB'),'role','authenticated')::text, true);
select is((select count(*) from public.findings where entity_id=current_setting('t.title')::uuid)::int, 0,
  'org B owner cannot see org A findings (RLS)');
select set_config('request.jwt.claims', json_build_object('sub', current_setting('t.ownerA'),'role','authenticated')::text, true);
select ok((select count(*) from public.my_findings()) >= 1,
  'owner A my_findings returns own open findings');
select is((select count(*) from public.my_findings(0))::int, 0,
  'p_limit 0 returns no findings');
select is((select count(*) from public.my_findings(1))::int, 1,
  'p_limit bounds my_findings');
select is((select count(*) from public.my_findings(500, current_setting('t.orgB')::uuid))::int, 0,
  'p_org_id scopes away orgs the caller cannot see');

reset role;
select * from finish();
rollback;
