-- findings_test.sql
-- reconcile_title_findings (operate/GC-gated; derived from stored metadata, the
-- caller's payload ignored; under the title lock, so another org's title is
-- refused; upsert + auto-resolve; validator-only) + my_findings + RLS (own-org
-- only) for the findings store (§19). Codex on #799: the one pass that
-- re-derives every live title's findings when the migration is applied, and
-- a Synopsis that trims to nothing is missing. The audit on #799: a new title
-- starts with its findings (create_title), the queue (my_findings) leaves out
-- a soft-deleted title's findings, and the internal refresh and the passes
-- are revoked from every client role, service_role included.

begin;
select plan(36);

select set_config('t.orgA',   gen_random_uuid()::text, false);
select set_config('t.orgB',   gen_random_uuid()::text, false);
select set_config('t.ownerA', gen_random_uuid()::text, false);
select set_config('t.viewerA',gen_random_uuid()::text, false);
select set_config('t.ownerB', gen_random_uuid()::text, false);
select set_config('t.gc',     gen_random_uuid()::text, false);
select set_config('t.title',  gen_random_uuid()::text, false);
select set_config('t.gone',   gen_random_uuid()::text, false);
select set_config('t.blank',  gen_random_uuid()::text, false);

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
-- Org B's owner, under org B, cannot reconcile org A's title. This asserts the
-- refusal only: the title lock (20261009120000, Codex on #799) and the refresh
-- both raise this message, so it passes with or without the lock. The lock is
-- proven by the stored-source checks in title_metadata_merge_test.sql and by
-- vitest src/lib/metadata-merge.test.ts.
select throws_ok(
  format($$ select public.reconcile_title_findings(%L,%L,'[]'::jsonb,'metadata-v1') $$,
         current_setting('t.orgB'), current_setting('t.title')),
  'P0001', 'Title not found in this organization', 'SPOOF: own org, another org''s title is refused');
select set_config('request.jwt.claims', json_build_object('sub', current_setting('t.ownerA'),'role','authenticated')::text, true);
select ok((select count(*) from public.my_findings()) >= 1,
  'owner A my_findings returns own open findings');
select is((select count(*) from public.my_findings(0))::int, 0,
  'p_limit 0 returns no findings');
select is((select count(*) from public.my_findings(1))::int, 1,
  'p_limit bounds my_findings');
select is((select count(*) from public.my_findings(500, current_setting('t.orgB')::uuid))::int, 0,
  'p_org_id scopes away orgs the caller cannot see');

-- ---- a new title starts with its findings (audit on #799) -------------------
-- The page counts a new title "0 of 6 complete" from its first load;
-- create_title derives its ten findings in the same call, so the queue lists
-- it too (before, a title created after the pass had none until its first save).
select lives_ok(
  format($$ select public.create_title(%L, 'Created', 'new_release'::public.release_type, null) $$,
         current_setting('t.orgA')),
  'owner creates a title');
select is(
  (select count(*) from public.findings f join public.titles t on t.id = f.entity_id
    where t.org_id = current_setting('t.orgA')::uuid and t.title = 'Created'
      and f.source = 'validator' and f.status = 'open')::int,
  10, 'a new title has its ten open findings from the start');
select is(
  (select count(*) from public.my_findings(500, current_setting('t.orgA')::uuid) f
     join public.titles t on t.id = f.entity_id
    where t.title = 'Created')::int,
  10, 'and the queue serves them');

-- ---- the one pass over live titles (Codex on #799) -------------------------
-- Findings an earlier caller forged, before the migration: every validator
-- finding resolved (a '[]'), one message made up, one code invented. And a
-- soft-deleted title with a forged open finding.
reset role;
update public.findings set status = 'resolved', resolved_at = now()
 where entity_id = current_setting('t.title')::uuid and source = 'validator';
update public.findings set status = 'open', resolved_at = null, message = 'Forged.'
 where entity_id = current_setting('t.title')::uuid and source = 'validator'
   and code = 'metadata.missing.runtime_minutes';
insert into public.findings (org_id, entity_type, entity_id, code, source, severity, message, source_refs, logic_version)
  values (current_setting('t.orgA')::uuid, 'title', current_setting('t.title')::uuid,
          'metadata.forged', 'validator', 'high', 'Forged.', '{}'::jsonb, 'forged');
insert into public.titles (id, org_id, title, status) values
  (current_setting('t.gone')::uuid, current_setting('t.orgA')::uuid, 'Gone', 'draft');
update public.titles set deleted_at = now() where id = current_setting('t.gone')::uuid;
-- A live title whose stored Cast holds only a blank entry and whose Synopsis
-- is an ideographic space (a direct write): the window reads both as missing
-- (normalizeStoredMetadata, isEmpty).
insert into public.titles (id, org_id, title, status) values
  (current_setting('t.blank')::uuid, current_setting('t.orgA')::uuid, 'Blank', 'draft');
insert into public.title_metadata (title_id, org_id, data) values
  (current_setting('t.blank')::uuid, current_setting('t.orgA')::uuid,
   '{"cast":[" "],"runtime_minutes":"96","release_year":2024,"country_of_origin":"ZZ","synopsis":"\u3000"}'::jsonb);
insert into public.findings (org_id, entity_type, entity_id, code, source, severity, message, source_refs, logic_version)
  values (current_setting('t.orgA')::uuid, 'title', current_setting('t.gone')::uuid,
          'metadata.forged', 'validator', 'high', 'Forged.', '{}'::jsonb, 'forged');

select ok(
  not has_function_privilege('authenticated', 'public.refresh_live_title_findings()', 'EXECUTE')
    and not has_function_privilege('anon', 'public.refresh_live_title_findings()', 'EXECUTE')
    and not has_function_privilege('service_role', 'public.refresh_live_title_findings()', 'EXECUTE'),
  'no client role may run the one pass, service_role included');
select ok(
  not has_function_privilege('authenticated', 'public.refresh_title_findings(uuid, uuid)', 'EXECUTE')
    and not has_function_privilege('anon', 'public.refresh_title_findings(uuid, uuid)', 'EXECUTE')
    and not has_function_privilege('service_role', 'public.refresh_title_findings(uuid, uuid)', 'EXECUTE'),
  'no client role may run the internal refresh, service_role included');
select ok(public.refresh_live_title_findings() >= 1, 'the pass refreshes every live title');
select is(
  (select coalesce(array_agg(code order by code), '{}'::text[]) from public.findings
    where entity_type = 'title' and entity_id = current_setting('t.title')::uuid
      and source = 'validator' and status = 'open'),
  (select coalesce(array_agg(f->>'code' order by f->>'code'), '{}'::text[])
     from jsonb_array_elements(public.title_metadata_findings(
       public.normalize_stored_title_metadata(
         (select data from public.title_metadata where title_id = current_setting('t.title')::uuid)))) f),
  'after the pass, the open validator findings are exactly the stored record''s');
select isnt((select message from public.findings
    where entity_id = current_setting('t.title')::uuid and code = 'metadata.missing.runtime_minutes'),
  'Forged.', 'a made-up message is replaced by the derived one');
select is((select status::text from public.findings
    where entity_id = current_setting('t.title')::uuid and code = 'metadata.forged'),
  'resolved', 'an invented code is resolved, not deleted');
select is((select status::text from public.findings where code = 'ai.genre_mismatch'),
  'open', 'AI findings are untouched by the pass');
select is((select status::text from public.findings
    where entity_id = current_setting('t.gone')::uuid and code = 'metadata.forged'),
  'open', 'a deleted title is skipped (its findings are untouched)');
-- ...and never served: the queue leaves out a soft-deleted title's findings
-- (audit on #799), forged or not, so it never lists a title that is gone.
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', current_setting('t.ownerA'),'role','authenticated')::text, true);
select is((select count(*) from public.my_findings(500) where entity_id = current_setting('t.gone')::uuid)::int, 0,
  'a deleted title''s open findings are not in the queue');
reset role;
-- A second pass (the final pass runs one after the commit) over unchanged
-- records changes no finding's status, code or message, so re-running it is
-- safe. It is not a no-op (review on #799): it re-stamps derived_at (to its
-- transaction's time, the same here) and appends an audit row per open
-- finding, which this does not compare.
create temp table pass_one as
  select id, code, status, message from public.findings where source = 'validator';
select ok(public.refresh_live_title_findings() >= 1, 'a second pass runs');
select is(
  (select count(*) from public.findings f join pass_one p on p.id = f.id
    where f.status is distinct from p.status or f.code is distinct from p.code
       or f.message is distinct from p.message)::int,
  0, 'a second pass over unchanged records changes no finding''s status, code or message');

-- The founder's final pass after the commit (Codex on #799): it waits for
-- every transaction that began before it, then refreshes. No client may run it.
select ok(
  not has_function_privilege('authenticated', 'public.finish_title_findings_repair(integer)', 'EXECUTE')
    and not has_function_privilege('anon', 'public.finish_title_findings_repair(integer)', 'EXECUTE')
    and not has_function_privilege('service_role', 'public.finish_title_findings_repair(integer)', 'EXECUTE'),
  'no client role may run the final pass, service_role included');
select ok(public.finish_title_findings_repair(30) >= 1, 'the final pass drains, then refreshes every live title');

-- Derived as the window reads the record (Codex on #799): a blank-only Cast
-- is missing, a runtime stored as text is filled.
select is(
  (select array_agg(code order by code) from public.findings
    where entity_id = current_setting('t.blank')::uuid and source = 'validator' and status = 'open'
      and code in ('metadata.missing.cast', 'metadata.missing.runtime_minutes')),
  array['metadata.missing.cast']::text[],
  'a blank-only Cast is missing and a runtime stored as text is filled');
-- Codex on #799: text that trims to nothing is missing, as the page, the
-- window and submit read it (it was filled here before).
select is((select status::text from public.findings
    where entity_id = current_setting('t.blank')::uuid and source = 'validator'
      and code = 'metadata.missing.synopsis'),
  'open', 'a Synopsis that trims to nothing (an ideographic space) is missing');
-- metadata-v2 (Codex on #799): a value the checks refuse is not filled, as
-- requiredComplete counts it: a country off the list is missing, a valid
-- year is not. Stamped with the app's logic version.
select is(
  (select array_agg(code || ':' || logic_version order by code) from public.findings
    where entity_id = current_setting('t.blank')::uuid and source = 'validator' and status = 'open'
      and code in ('metadata.missing.country_of_origin', 'metadata.missing.release_year')),
  array['metadata.missing.country_of_origin:metadata-v2']::text[],
  'a country off the list is missing and a valid year is filled');

select * from finish();
rollback;
