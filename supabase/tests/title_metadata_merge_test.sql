-- title_metadata_merge_test.sql
-- 20261009120000 section 8: merge_title_metadata, the Metadata window's
-- atomic save (Adam 2026-10-09, "4) yes, please."), and the title lock every
-- metadata writer takes. Covers the signature, definer and privileges; the
-- lock pins on each function's source; merge, clear and first-save
-- semantics; the audit rows; the shared normalize fixtures (also asserted by
-- src/lib/metadata-merge.test.ts against normalizeStoredMetadata); refusals;
-- the no-op; findings; the auth matrix; a deleted title; submit reading the
-- stored record as the app does, and refusing another org's title first.
-- Codex on #799: submit checks only the required tier (a refused Director
-- submits, a refused required value does not); a stored country outside the
-- app's list is named on the next save and corrected in it; reconcile takes
-- the same title lock; so do set_title_release_info (its update repeats the
-- live-title predicates) and the refresh itself; one emptiness rule (text
-- that trims to nothing is empty, to submit as to the findings); normalize
-- reads numbers as the double JS reads, with no known difference left.
-- Review on #799: a repair (p_repair) is stored only while the stored value
-- is still the one the window opened on, never over a field the save sets or
-- clears, and never as a clear.

begin;
select plan(134);

select set_config('t.org_a',  gen_random_uuid()::text, false);
select set_config('t.org_b',  gen_random_uuid()::text, false);
select set_config('t.owner',  gen_random_uuid()::text, false);  -- account_owner, A
select set_config('t.deliv',  gen_random_uuid()::text, false);  -- delivery_ops,  A
select set_config('t.viewer', gen_random_uuid()::text, false);  -- viewer,        A
select set_config('t.gc',     gen_random_uuid()::text, false);  -- gc_delivery_ops
select set_config('t.legal',  gen_random_uuid()::text, false);  -- gc_legal
select set_config('t.ta',     gen_random_uuid()::text, false);  -- A, stored record
select set_config('t.tb',     gen_random_uuid()::text, false);  -- B, stored record
select set_config('t.tnew',   gen_random_uuid()::text, false);  -- A, no record
select set_config('t.tempty', gen_random_uuid()::text, false);  -- A, no record
select set_config('t.tgone',  gen_random_uuid()::text, false);  -- A, deleted
select set_config('t.tlegacy',gen_random_uuid()::text, false);  -- A, legacy stored values
select set_config('t.tgenre', gen_random_uuid()::text, false);  -- A, stored genre the list refuses
select set_config('t.tsub',   gen_random_uuid()::text, false);  -- A, complete, older stored shapes
select set_config('t.tbad',   gen_random_uuid()::text, false);  -- A, complete, a recommended value the checks refuse
select set_config('t.tlang',  gen_random_uuid()::text, false);  -- A, complete, a language outside the list
select set_config('t.toff',   gen_random_uuid()::text, false);  -- A, complete, a country outside the list
select set_config('t.tgonebad', gen_random_uuid()::text, false);  -- A, deleted, complete, a language outside the list
select set_config('t.tws',    gen_random_uuid()::text, false);  -- A, complete but a Synopsis that trims to nothing
select set_config('t.trepair', gen_random_uuid()::text, false);  -- A, Cast as text and a numeric Director (repairable)
select set_config('t.tstale', gen_random_uuid()::text, false);  -- A, Cast saved as a list since the window opened
select set_config('t.tskip',  gen_random_uuid()::text, false);  -- A, Cast as text, repair expecting another value

insert into auth.users (id) values
  (current_setting('t.owner')::uuid), (current_setting('t.deliv')::uuid),
  (current_setting('t.viewer')::uuid), (current_setting('t.gc')::uuid),
  (current_setting('t.legal')::uuid);
insert into public.organizations (id, name, status) values
  (current_setting('t.org_a')::uuid, 'Org A', 'active'),
  (current_setting('t.org_b')::uuid, 'Org B', 'active');
insert into public.memberships (org_id, user_id, role, status) values
  (current_setting('t.org_a')::uuid, current_setting('t.owner')::uuid,  'account_owner', 'active'),
  (current_setting('t.org_a')::uuid, current_setting('t.deliv')::uuid,  'delivery_ops',  'active'),
  (current_setting('t.org_a')::uuid, current_setting('t.viewer')::uuid, 'viewer',        'active');
insert into public.gc_staff (user_id, role) values
  (current_setting('t.gc')::uuid,    'gc_delivery_ops'),
  (current_setting('t.legal')::uuid, 'gc_legal');
insert into public.titles (id, org_id, title, status) values
  (current_setting('t.ta')::uuid,      current_setting('t.org_a')::uuid, 'Title A', 'draft'),
  (current_setting('t.tb')::uuid,      current_setting('t.org_b')::uuid, 'Title B', 'draft'),
  (current_setting('t.tnew')::uuid,    current_setting('t.org_a')::uuid, 'New',     'draft'),
  (current_setting('t.tempty')::uuid,  current_setting('t.org_a')::uuid, 'Empty',   'draft'),
  (current_setting('t.tgone')::uuid,   current_setting('t.org_a')::uuid, 'Gone',    'draft'),
  (current_setting('t.tlegacy')::uuid, current_setting('t.org_a')::uuid, 'Legacy',  'draft'),
  (current_setting('t.tgenre')::uuid,  current_setting('t.org_a')::uuid, 'Genre',   'draft'),
  (current_setting('t.tsub')::uuid,    current_setting('t.org_a')::uuid, 'Submit',  'draft'),
  (current_setting('t.tbad')::uuid,    current_setting('t.org_a')::uuid, 'Bad',     'draft'),
  (current_setting('t.tlang')::uuid,   current_setting('t.org_a')::uuid, 'Lang',    'draft'),
  (current_setting('t.toff')::uuid,    current_setting('t.org_a')::uuid, 'Country', 'draft'),
  (current_setting('t.tgonebad')::uuid, current_setting('t.org_a')::uuid, 'Gone bad', 'draft'),
  (current_setting('t.tws')::uuid,     current_setting('t.org_a')::uuid, 'Blank synopsis', 'draft'),
  (current_setting('t.trepair')::uuid, current_setting('t.org_a')::uuid, 'Repair',  'draft'),
  (current_setting('t.tstale')::uuid,  current_setting('t.org_a')::uuid, 'Stale',   'draft'),
  (current_setting('t.tskip')::uuid,   current_setting('t.org_a')::uuid, 'Skip',    'draft');
insert into public.title_metadata (title_id, org_id, data) values
  (current_setting('t.ta')::uuid, current_setting('t.org_a')::uuid,
   '{"synopsis":"A film.","runtime_minutes":96,"release_year":2024,"genre":"drama","primary_language":"en","country_of_origin":"US","director":"Jo"}'::jsonb),
  (current_setting('t.tb')::uuid, current_setting('t.org_b')::uuid, '{"synopsis":"B film."}'::jsonb),
  -- Stored before the checks: empties, a number as text, a blank list entry, an unknown key.
  (current_setting('t.tlegacy')::uuid, current_setting('t.org_a')::uuid,
   '{"synopsis":"","runtime_minutes":"96","cast":["","Ada"],"director":null,"keywords":[],"genre":"drama","foo":"bar"}'::jsonb),
  (current_setting('t.tgenre')::uuid, current_setting('t.org_a')::uuid, '{"synopsis":"x","genre":"Drama"}'::jsonb),
  -- Complete, stored before the checks: a number as text, an empty value, a
  -- blank list entry, an unknown key. The window shows it as complete.
  (current_setting('t.tsub')::uuid, current_setting('t.org_a')::uuid,
   '{"synopsis":"A film.","runtime_minutes":"96","release_year":2024,"genre":"drama","primary_language":"en","country_of_origin":"US","director":"","keywords":["","space"],"foo":"bar"}'::jsonb),
  -- Complete, with a Director over 200 characters (stored before the limits):
  -- a recommended value, so it never blocks submit.
  (current_setting('t.tbad')::uuid, current_setting('t.org_a')::uuid,
   jsonb_build_object('synopsis', 'A film.', 'runtime_minutes', 96, 'release_year', 2024, 'genre', 'drama',
                      'primary_language', 'en', 'country_of_origin', 'US', 'director', repeat('x', 201))),
  -- Complete, with two letters that are not in LANGUAGES (a required value).
  (current_setting('t.tlang')::uuid, current_setting('t.org_a')::uuid,
   '{"synopsis":"A film.","runtime_minutes":96,"release_year":2024,"genre":"drama","primary_language":"zz","country_of_origin":"US"}'::jsonb),
  -- Complete, with two letters that are not in ISO_COUNTRIES (stored before the lists).
  (current_setting('t.toff')::uuid, current_setting('t.org_a')::uuid,
   '{"synopsis":"A film.","runtime_minutes":96,"release_year":2024,"genre":"drama","primary_language":"en","country_of_origin":"ZZ"}'::jsonb),
  -- Soft-deleted, complete, with a required language the checks refuse.
  (current_setting('t.tgonebad')::uuid, current_setting('t.org_a')::uuid,
   '{"synopsis":"A film.","runtime_minutes":96,"release_year":2024,"genre":"drama","primary_language":"zz","country_of_origin":"US"}'::jsonb),
  -- Complete but a Synopsis of a space and a no-break space (a direct write):
  -- btrim left the no-break space, so the old submit let it through.
  (current_setting('t.tws')::uuid, current_setting('t.org_a')::uuid,
   '{"synopsis":" \u00a0","runtime_minutes":96,"release_year":2024,"genre":"drama","primary_language":"en","country_of_origin":"US"}'::jsonb),
  -- Stored before the checks: Cast as text, Director as a number. The page
  -- refuses both; the window shows them as a list and as text.
  (current_setting('t.trepair')::uuid, current_setting('t.org_a')::uuid,
   '{"synopsis":"A film.","cast":"Ada, Bob","director":5}'::jsonb),
  -- The window opened on Cast "Ada, Bob"; another user saved ["Cy"] since.
  (current_setting('t.tstale')::uuid, current_setting('t.org_a')::uuid,
   '{"synopsis":"A film.","cast":["Cy"],"director":"Jo"}'::jsonb),
  (current_setting('t.tskip')::uuid, current_setting('t.org_a')::uuid,
   '{"synopsis":"x","cast":"Ada, Bob"}'::jsonb);
update public.titles set deleted_at = now()
 where id in (current_setting('t.tgone')::uuid, current_setting('t.tgonebad')::uuid);

-- ===== structure, grants, lock pins (as postgres) =====
select has_function('public', 'merge_title_metadata', array['uuid','uuid','jsonb','text[]','jsonb'],
  'merge_title_metadata(uuid, uuid, jsonb, text[], jsonb) exists');
select ok(
  (select p.prosecdef from pg_proc p
    where p.oid = 'public.merge_title_metadata(uuid, uuid, jsonb, text[], jsonb)'::regprocedure),
  'merge_title_metadata is SECURITY DEFINER');
select ok(
  has_function_privilege('authenticated', 'public.merge_title_metadata(uuid, uuid, jsonb, text[], jsonb)', 'EXECUTE'),
  'authenticated may execute merge_title_metadata');
select ok(
  not has_function_privilege('anon', 'public.merge_title_metadata(uuid, uuid, jsonb, text[], jsonb)', 'EXECUTE'),
  'anon may not execute merge_title_metadata');
select ok(
  not has_function_privilege('public', 'public.merge_title_metadata(uuid, uuid, jsonb, text[], jsonb)', 'EXECUTE'),
  'PUBLIC may not execute merge_title_metadata');
select ok(
  not has_function_privilege('anon', 'public.normalize_stored_title_metadata(jsonb)', 'EXECUTE')
    and not has_function_privilege('authenticated', 'public.normalize_stored_title_metadata(jsonb)', 'EXECUTE')
    and not has_function_privilege('service_role', 'public.normalize_stored_title_metadata(jsonb)', 'EXECUTE'),
  'normalize_stored_title_metadata is internal: no client role may execute it');

-- The locks, read from each function's own source.
select ok(
  (select p.prosrc from pg_proc p
    where p.oid = 'public.merge_title_metadata(uuid, uuid, jsonb, text[], jsonb)'::regprocedure)
  ~* 'from\s+public\.titles\s+t\s+where\s+t\.id\s*=\s*p_title_id\s+and\s+t\.org_id\s*=\s*p_org_id\s+and\s+t\.deleted_at\s+is\s+null\s+for\s+no\s+key\s+update',
  'merge: the live title row is locked FOR NO KEY UPDATE, deleted titles excluded');
select ok(
  (select p.prosrc from pg_proc p
    where p.oid = 'public.merge_title_metadata(uuid, uuid, jsonb, text[], jsonb)'::regprocedure)
  ~* 'from\s+public\.title_metadata\s+m\s+where\s+m\.title_id\s*=\s*p_title_id\s+for\s+update',
  'merge: the stored record is read FOR UPDATE');
select ok(
  (select p.prosrc ~* 'public\.check_title_metadata\s*\('
      and p.prosrc ~* 'public\.normalize_stored_title_metadata\s*\('
      and p.prosrc ~* 'public\.refresh_title_findings\s*\('
     from pg_proc p
    where p.oid = 'public.merge_title_metadata(uuid, uuid, jsonb, text[], jsonb)'::regprocedure),
  'merge: checks the whole record, normalizes the stored one, refreshes findings');
select ok(
  (select p.prosrc from pg_proc p
    where p.oid = 'public.set_title_metadata(uuid, uuid, jsonb)'::regprocedure)
  ~* 'from\s+public\.titles\s+t\s+where\s+t\.id\s*=\s*p_title_id\s+and\s+t\.org_id\s*=\s*p_org_id\s+and\s+t\.deleted_at\s+is\s+null\s+for\s+no\s+key\s+update',
  'set_title_metadata takes the same title lock');
select ok(
  (select strpos(p.prosrc, 'for no key update') > 0
      and strpos(p.prosrc, 'for no key update') < strpos(p.prosrc, 'into public.title_metadata')
     from pg_proc p
    where p.oid = 'public.set_title_metadata(uuid, uuid, jsonb)'::regprocedure),
  'set_title_metadata locks the title before it writes the record');
select ok(
  (select p.prosrc from pg_proc p
    where p.oid = 'public.submit_title(uuid, uuid)'::regprocedure)
  ~* 'from\s+public\.titles\s+t\s+where\s+t\.id\s*=\s*p_title_id\s+and\s+t\.org_id\s*=\s*p_org_id\s+and\s+t\.deleted_at\s+is\s+null\s+for\s+no\s+key\s+update',
  'submit_title takes the same title lock, live titles only (Bugbot on #799)');
select ok(
  (select strpos(p.prosrc, 'for no key update') > 0
      and strpos(p.prosrc, 'for no key update') < strpos(p.prosrc, 'from public.title_metadata')
     from pg_proc p
    where p.oid = 'public.submit_title(uuid, uuid)'::regprocedure),
  'submit_title locks the title before it reads the record');
select ok(
  (select p.prosrc ~* 'from\s+jsonb_each\s*\(\s*v_data\s*\)\s+e\s+where\s+e\.key\s*=\s*any\s*\(\s*v_required\s*\)'
      and p.prosrc ~* 'public\.check_title_metadata\s*\(\s*v_required_values\s*\)'
      and p.prosrc !~* 'public\.check_title_metadata\s*\(\s*v_data\s*\)'
     from pg_proc p
    where p.oid = 'public.submit_title(uuid, uuid)'::regprocedure),
  'submit_title checks only the required tier''s values (Codex on #799)');
select ok(
  (select p.prosrc from pg_proc p
    where p.oid = 'public.reconcile_title_findings(uuid, uuid, jsonb, text)'::regprocedure)
  ~* 'from\s+public\.titles\s+t\s+where\s+t\.id\s*=\s*p_title_id\s+and\s+t\.org_id\s*=\s*p_org_id\s+and\s+t\.deleted_at\s+is\s+null\s+for\s+no\s+key\s+update',
  'reconcile_title_findings takes the same title lock (Codex on #799)');
select ok(
  (select strpos(p.prosrc, 'for no key update') > 0
      and strpos(p.prosrc, 'for no key update') < strpos(p.prosrc, 'perform public.refresh_title_findings')
     from pg_proc p
    where p.oid = 'public.reconcile_title_findings(uuid, uuid, jsonb, text)'::regprocedure),
  'reconcile_title_findings locks the title before it refreshes findings');
-- Codex on #799: set_title_release_info took no lock and updated by id alone,
-- so a delete committed in between let it write a soft-deleted title.
select ok(
  (select p.prosrc from pg_proc p
    where p.oid = 'public.set_title_release_info(uuid, uuid, public.release_type, date)'::regprocedure)
  ~* 'from\s+public\.titles\s+t\s+where\s+t\.id\s*=\s*p_title_id\s+and\s+t\.org_id\s*=\s*p_org_id\s+and\s+t\.deleted_at\s+is\s+null\s+for\s+no\s+key\s+update',
  'set_title_release_info takes the same live-title lock (Codex on #799)');
select ok(
  (select strpos(p.prosrc, 'for no key update') > 0
      and strpos(p.prosrc, 'for no key update') < strpos(p.prosrc, 'update public.titles')
      and p.prosrc ~* 'where\s+id\s*=\s*p_title_id\s+and\s+org_id\s*=\s*p_org_id\s+and\s+deleted_at\s+is\s+null;\s+if\s+not\s+found\s+then'
     from pg_proc p
    where p.oid = 'public.set_title_release_info(uuid, uuid, public.release_type, date)'::regprocedure),
  'set_title_release_info locks before it updates, and its update repeats the live-title predicates');
-- The refresh takes the title lock itself (audit on #799): a no-op under its
-- callers' lock, and no refresh can write from a record a later save replaced.
select ok(
  (select p.prosrc from pg_proc p
    where p.oid = 'public.refresh_title_findings(uuid, uuid)'::regprocedure)
  ~* 'where\s+t\.id\s*=\s*p_title_id\s+and\s+t\.org_id\s*=\s*p_org_id\s+and\s+t\.deleted_at\s+is\s+null\s+for\s+no\s+key\s+update\s+of\s+t',
  'refresh_title_findings locks the live title it reads');
-- Codex on #799: one emptiness rule. Submit reads empty as the findings do,
-- never with btrim.
select ok(
  (select p.prosrc ~* 'public\.title_metadata_value_empty\s*\(\s*v_data\s*->\s*v_key\s*\)'
      and p.prosrc !~* 'btrim'
     from pg_proc p
    where p.oid = 'public.submit_title(uuid, uuid)'::regprocedure),
  'submit_title reads a required field as empty with title_metadata_value_empty, not btrim');
select ok(
  public.title_metadata_value_empty('" "'::jsonb)
    and public.title_metadata_value_empty('" \u00a0\ufeff\u3000\u2028\t"'::jsonb)
    and public.title_metadata_value_empty('""'::jsonb)
    and public.title_metadata_value_empty(null)
    and not public.title_metadata_value_empty('"\u0085"'::jsonb)
    and not public.title_metadata_value_empty('"\u200b"'::jsonb)
    and not public.title_metadata_value_empty('" x "'::jsonb)
    and not public.title_metadata_value_empty('[" "]'::jsonb),
  'title_metadata_value_empty: text that trims to nothing (JS trim''s set) is empty, nothing else');
-- float8 output follows the session's extra_float_digits; normalize sets its
-- own, so a session at 0 (15 digits) never rounds the double it stores.
set local extra_float_digits = 0;
select is(public.normalize_stored_title_metadata('{"runtime_minutes":"1000.0000000000001"}'::jsonb),
  '{"runtime_minutes":1000.0000000000001}'::jsonb,
  'normalize reads the double whole, whatever extra_float_digits the session sets');
set local extra_float_digits = 1;

-- ===== normalize parity (as postgres) =====
-- One row per line: (input, sql_expected, js_expected). vitest parses this
-- block and asserts normalizeStoredMetadata(input) = js_expected, and
-- js_expected = sql_expected on every row: no known difference is left
-- (Codex on #799: number text and JSON numbers are read as the same double on
-- both sides, and text that trims to nothing is empty on both).
select is(public.normalize_stored_title_metadata(f.input::jsonb), f.sql_expected::jsonb, 'normalize: ' || f.input)
  from (values
-- normalize-fixtures:start
  ($j${"runtime_minutes":" 96 "}$j$, $j${"runtime_minutes":96}$j$, $j${"runtime_minutes":96}$j$),
  ($j${"runtime_minutes":"96.0"}$j$, $j${"runtime_minutes":96}$j$, $j${"runtime_minutes":96}$j$),
  ($j${"runtime_minutes":"1e2"}$j$, $j${"runtime_minutes":100}$j$, $j${"runtime_minutes":100}$j$),
  ($j${"runtime_minutes":"+5"}$j$, $j${"runtime_minutes":5}$j$, $j${"runtime_minutes":5}$j$),
  ($j${"runtime_minutes":"96.5"}$j$, $j${"runtime_minutes":96.5}$j$, $j${"runtime_minutes":96.5}$j$),
  ($j${"release_year":"\t2024\n"}$j$, $j${"release_year":2024}$j$, $j${"release_year":2024}$j$),
  ($j${"release_year":"\u20032024\u3000"}$j$, $j${"release_year":2024}$j$, $j${"release_year":2024}$j$),
  ($j${"runtime_minutes":"96abc"}$j$, $j${"runtime_minutes":"96abc"}$j$, $j${"runtime_minutes":"96abc"}$j$),
  ($j${"runtime_minutes":"Infinity"}$j$, $j${"runtime_minutes":"Infinity"}$j$, $j${"runtime_minutes":"Infinity"}$j$),
  ($j${"runtime_minutes":"1_000"}$j$, $j${"runtime_minutes":"1_000"}$j$, $j${"runtime_minutes":"1_000"}$j$),
  ($j${"runtime_minutes":" "}$j$, $j${}$j$, $j${}$j$),
  ($j${"runtime_minutes":"0x60"}$j$, $j${"runtime_minutes":"0x60"}$j$, $j${"runtime_minutes":"0x60"}$j$),
  ($j${"runtime_minutes":"0b11"}$j$, $j${"runtime_minutes":"0b11"}$j$, $j${"runtime_minutes":"0b11"}$j$),
  ($j${"release_year":"0o3720"}$j$, $j${"release_year":"0o3720"}$j$, $j${"release_year":"0o3720"}$j$),
  ($j${"runtime_minutes":"1e999"}$j$, $j${"runtime_minutes":"1e999"}$j$, $j${"runtime_minutes":"1e999"}$j$),
  ($j${"release_year":"-1e999"}$j$, $j${"release_year":"-1e999"}$j$, $j${"release_year":"-1e999"}$j$),
  ($j${"runtime_minutes":"96e0000"}$j$, $j${"runtime_minutes":"96e0000"}$j$, $j${"runtime_minutes":"96e0000"}$j$),
  ($j${"runtime_minutes":"1.00000000000000000001"}$j$, $j${"runtime_minutes":1}$j$, $j${"runtime_minutes":1}$j$),
  ($j${"runtime_minutes":"0.99999999999999999999"}$j$, $j${"runtime_minutes":1}$j$, $j${"runtime_minutes":1}$j$),
  ($j${"runtime_minutes":"1000.0000000000001"}$j$, $j${"runtime_minutes":1000.0000000000001}$j$, $j${"runtime_minutes":1000.0000000000001}$j$),
  ($j${"runtime_minutes":"1e-400"}$j$, $j${"runtime_minutes":0}$j$, $j${"runtime_minutes":0}$j$),
  ($j${"runtime_minutes":"1.7976931348623159e308"}$j$, $j${"runtime_minutes":"1.7976931348623159e308"}$j$, $j${"runtime_minutes":"1.7976931348623159e308"}$j$),
  ($j${"runtime_minutes":"1e308"}$j$, $j${"runtime_minutes":1e308}$j$, $j${"runtime_minutes":1e308}$j$),
  ($j${"runtime_minutes":"3e-324"}$j$, $j${"runtime_minutes":5e-324}$j$, $j${"runtime_minutes":5e-324}$j$),
  ($j${"runtime_minutes":"5."}$j$, $j${"runtime_minutes":5}$j$, $j${"runtime_minutes":5}$j$),
  ($j${"runtime_minutes":".5"}$j$, $j${"runtime_minutes":0.5}$j$, $j${"runtime_minutes":0.5}$j$),
  ($j${"release_year":"9007199254740993"}$j$, $j${"release_year":9007199254740992}$j$, $j${"release_year":9007199254740992}$j$),
  ($j${"runtime_minutes":"-0"}$j$, $j${"runtime_minutes":0}$j$, $j${"runtime_minutes":0}$j$),
  ($j${"runtime_minutes":"-1e-400"}$j$, $j${"runtime_minutes":0}$j$, $j${"runtime_minutes":0}$j$),
  ($j${"runtime_minutes":96.00000000000000000001}$j$, $j${"runtime_minutes":96}$j$, $j${"runtime_minutes":96}$j$),
  ($j${"release_year":2024.0000000000001}$j$, $j${"release_year":2024}$j$, $j${"release_year":2024}$j$),
  ($j${"runtime_minutes":1e400}$j$, $j${"runtime_minutes":1e400}$j$, $j${"runtime_minutes":1e400}$j$),
  ($j${"synopsis":"","director":null,"keywords":[]}$j$, $j${}$j$, $j${}$j$),
  ($j${"cast":[" ","\u00a0","Ada"]}$j$, $j${"cast":["Ada"]}$j$, $j${"cast":["Ada"]}$j$),
  ($j${"keywords":["\ufeff"]}$j$, $j${}$j$, $j${}$j$),
  ($j${"cast":[1,"Ada","\t"]}$j$, $j${"cast":[1,"Ada"]}$j$, $j${"cast":[1,"Ada"]}$j$),
  ($j${"cast":"Ada, Bob"}$j$, $j${"cast":"Ada, Bob"}$j$, $j${"cast":"Ada, Bob"}$j$),
  ($j${"foo":"bar","rating":"PG"}$j$, $j${"rating":"PG"}$j$, $j${"rating":"PG"}$j$),
  ($j${"director":" ","genre":"Drama"}$j$, $j${"genre":"Drama"}$j$, $j${"genre":"Drama"}$j$),
  ($j${"synopsis":" \u00a0\ufeff\u3000","alternate_title":"\u2028"}$j$, $j${}$j$, $j${}$j$),
  ($j${"synopsis":"\u0085","director":"\u200b"}$j$, $j${"synopsis":"\u0085","director":"\u200b"}$j$, $j${"synopsis":"\u0085","director":"\u200b"}$j$),
  ($j$"str"$j$, $j${}$j$, $j${}$j$),
  ($j$null$j$, $j${}$j$, $j${}$j$),
  ($j${"synopsis":"","runtime_minutes":"96","cast":["","Ada"],"director":null,"keywords":[],"genre":"drama","foo":"bar"}$j$, $j${"runtime_minutes":96,"cast":["Ada"],"genre":"drama"}$j$, $j${"runtime_minutes":96,"cast":["Ada"],"genre":"drama"}$j$)
-- normalize-fixtures:end
  ) as f(input, sql_expected, js_expected);

-- Audit rows for title A's record so far (the fixture insert, actor null).
select set_config('t.audit_a',
  (select count(*) from public.audit_log
    where entity = 'title_metadata' and after->>'title_id' = current_setting('t.ta'))::text, false);

-- ===== merge, as A's account_owner =====
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('t.owner'), 'role', 'authenticated')::text, true);

select lives_ok(
  format($$ select public.merge_title_metadata(%L, %L, '{"runtime_minutes":100}'::jsonb, array['director']) $$,
         current_setting('t.org_a'), current_setting('t.ta')),
  'owner merges one change and one clear');
select is((select data from public.title_metadata where title_id = current_setting('t.ta')::uuid),
  '{"synopsis":"A film.","runtime_minutes":100,"release_year":2024,"genre":"drama","primary_language":"en","country_of_origin":"US"}'::jsonb,
  'only the changed field moves, the cleared one is gone, the rest is kept');
select is((select count(*) from public.title_metadata where title_id = current_setting('t.ta')::uuid)::int,
  1, 'still one record per title');

reset role;
select is(
  (select count(*) from public.audit_log
    where entity = 'title_metadata' and after->>'title_id' = current_setting('t.ta'))::int
    - current_setting('t.audit_a')::int,
  1, 'the merge appends exactly one audit row');
select ok(exists (
    select 1 from public.audit_log
     where entity = 'title_metadata' and after->>'title_id' = current_setting('t.ta')
       and action = 'update' and actor = current_setting('t.owner')::uuid
       and (before->'data') ? 'director' and not ((after->'data') ? 'director')),
  'the audit row is an update by the owner, before with Director and after without');
select set_config('t.audit_a',
  (select count(*) from public.audit_log
    where entity = 'title_metadata' and after->>'title_id' = current_setting('t.ta'))::text, false);

set local role authenticated;
-- Set applies first, then clear; an unknown key in p_clear is ignored.
select lives_ok(
  format($$ select public.merge_title_metadata(%L, %L, '{"director":"X"}'::jsonb, array['director','not_a_field']) $$,
         current_setting('t.org_a'), current_setting('t.ta')),
  'a key both set and cleared, and an unknown cleared key, are accepted');
select ok(not ((select data from public.title_metadata where title_id = current_setting('t.ta')::uuid) ? 'director'),
  'a key both set and cleared ends up cleared');

-- No-op: a value equal to the stored one writes nothing.
select lives_ok(
  format($$ select public.merge_title_metadata(%L, %L, '{"runtime_minutes":100}'::jsonb, '{}'::text[]) $$,
         current_setting('t.org_a'), current_setting('t.ta')),
  'merging the stored value again succeeds');
select is((select data->'runtime_minutes' from public.title_metadata where title_id = current_setting('t.ta')::uuid),
  '100'::jsonb, 'the record is unchanged');
reset role;
select is(
  (select count(*) from public.audit_log
    where entity = 'title_metadata' and after->>'title_id' = current_setting('t.ta'))::int,
  current_setting('t.audit_a')::int, 'an unchanged record writes no audit row');

-- ===== first save =====
set local role authenticated;
select lives_ok(
  format($$ select public.merge_title_metadata(%L, %L, '{"synopsis":"New."}'::jsonb, '{}'::text[]) $$,
         current_setting('t.org_a'), current_setting('t.tnew')),
  'a first save on a title with no record succeeds');
select is((select data from public.title_metadata where title_id = current_setting('t.tnew')::uuid),
  '{"synopsis":"New."}'::jsonb, 'the first record is exactly the set fields');
select lives_ok(
  format($$ select public.merge_title_metadata(%L, %L, '{}'::jsonb, array['synopsis']) $$,
         current_setting('t.org_a'), current_setting('t.tempty')),
  'a clear-only save on a title with no record succeeds');
reset role;
select is(
  (select count(*) from public.audit_log
    where entity = 'title_metadata' and after->>'title_id' = current_setting('t.tnew') and action = 'insert'
      and actor = current_setting('t.owner')::uuid)::int,
  1, 'the first save appends one insert audit row');
select is((select count(*) from public.title_metadata where title_id = current_setting('t.tempty')::uuid)::int,
  0, 'nothing to store: no empty record is created');
select is(
  (select count(*) from public.audit_log
    where entity = 'title_metadata' and after->>'title_id' = current_setting('t.tempty'))::int,
  0, 'nothing to store: no audit row');

-- ===== refusals =====
set local role authenticated;
select throws_ok(
  format($$ select public.merge_title_metadata(%L, %L, '{"budget":1}'::jsonb, '{}'::text[]) $$,
         current_setting('t.org_a'), current_setting('t.ta')),
  '22023', 'Unknown metadata field "budget"', 'an unknown key is refused');
select throws_like(
  format($$ select public.merge_title_metadata(%L, %L, '{"runtime_minutes":0}'::jsonb, '{}'::text[]) $$,
         current_setting('t.org_a'), current_setting('t.ta')),
  'runtime_minutes:%', 'a value past its limit is refused, naming its field');
select throws_ok(
  format($$ select public.merge_title_metadata(%L, %L, '[]'::jsonb, '{}'::text[]) $$,
         current_setting('t.org_a'), current_setting('t.ta')),
  '22023', 'p_set must be a JSON object', 'p_set must be an object');
select is((select data->'runtime_minutes' from public.title_metadata where title_id = current_setting('t.ta')::uuid),
  '100'::jsonb, 'a refused save changes nothing');
-- A stored value the list refuses is named (the app shows "Choose one from the list.").
select throws_like(
  format($$ select public.merge_title_metadata(%L, %L, '{"director":"X"}'::jsonb, '{}'::text[]) $$,
         current_setting('t.org_a'), current_setting('t.tgenre')),
  'genre:%', 'a stored genre outside the list is named');
select is((select data from public.title_metadata where title_id = current_setting('t.tgenre')::uuid),
  '{"synopsis":"x","genre":"Drama"}'::jsonb, 'and the record is unchanged');
-- So is a stored country outside ISO_COUNTRIES (Codex on #799), and the save
-- that picks one from the list stores both changes.
select throws_like(
  format($$ select public.merge_title_metadata(%L, %L, '{"director":"X"}'::jsonb, '{}'::text[]) $$,
         current_setting('t.org_a'), current_setting('t.toff')),
  'country_of_origin:%', 'a stored country outside the list is named on a save of another field');
select is((select data->>'country_of_origin' from public.title_metadata where title_id = current_setting('t.toff')::uuid),
  'ZZ', 'and the record is unchanged');
select lives_ok(
  format($$ select public.merge_title_metadata(%L, %L, '{"country_of_origin":"GB","director":"X"}'::jsonb, '{}'::text[]) $$,
         current_setting('t.org_a'), current_setting('t.toff')),
  'the same save with a country from the list succeeds');
select is((select data from public.title_metadata where title_id = current_setting('t.toff')::uuid),
  '{"synopsis":"A film.","runtime_minutes":96,"release_year":2024,"genre":"drama","primary_language":"en","country_of_origin":"GB","director":"X"}'::jsonb,
  'it stores the corrected country and the change');

-- ===== a legacy record merges as the app reads it =====
select lives_ok(
  format($$ select public.merge_title_metadata(%L, %L, '{"rating":"PG"}'::jsonb, '{}'::text[]) $$,
         current_setting('t.org_a'), current_setting('t.tlegacy')),
  'stored empties and a number as text never block a save');
select is((select data from public.title_metadata where title_id = current_setting('t.tlegacy')::uuid),
  '{"runtime_minutes":96,"cast":["Ada"],"genre":"drama","rating":"PG"}'::jsonb,
  'the legacy record is stored normalized, with the change');

-- ===== repairs: only while the stored value is the one the window opened on (review on #799) =====
select lives_ok(
  format($$ select public.merge_title_metadata(%L, %L, '{"synopsis":"Edited."}'::jsonb, '{}'::text[],
           '{"cast":{"from":"Ada, Bob","to":["Ada","Bob"]},"director":{"from":5,"to":"5"}}'::jsonb) $$,
         current_setting('t.org_a'), current_setting('t.trepair')),
  'a change with repairs whose stored values are unchanged saves');
select is((select data from public.title_metadata where title_id = current_setting('t.trepair')::uuid),
  '{"synopsis":"Edited.","cast":["Ada","Bob"],"director":"5"}'::jsonb,
  'each repair is stored with the change');
select lives_ok(
  format($$ select public.merge_title_metadata(%L, %L, '{"synopsis":"Edited."}'::jsonb, '{}'::text[],
           '{"cast":{"from":"Ada, Bob","to":["Ada","Bob"]}}'::jsonb) $$,
         current_setting('t.org_a'), current_setting('t.tstale')),
  'a change whose repair no longer matches the stored value saves');
select is((select data from public.title_metadata where title_id = current_setting('t.tstale')::uuid),
  '{"synopsis":"Edited.","cast":["Cy"],"director":"Jo"}'::jsonb,
  'the newer Cast is kept: a stale repair never overwrites a save made since');
select lives_ok(
  format($$ select public.merge_title_metadata(%L, %L, '{"cast":["Di"]}'::jsonb, array['director'],
           '{"cast":{"from":["Cy"],"to":["Ada"]},"director":{"from":"Jo","to":"X"},"synopsis":{"from":"Edited.","to":null}}'::jsonb) $$,
         current_setting('t.org_a'), current_setting('t.tstale')),
  'repairs that match, on fields the save sets or clears or with an empty value, are accepted');
select is((select data from public.title_metadata where title_id = current_setting('t.tstale')::uuid),
  '{"synopsis":"Edited.","cast":["Di"]}'::jsonb,
  'a repair never overrides a field the save sets or clears, and never clears one');
select throws_like(
  format($$ select public.merge_title_metadata(%L, %L, '{"synopsis":"y"}'::jsonb, '{}'::text[],
           '{"cast":{"from":"Ada","to":["Ada"]}}'::jsonb) $$,
         current_setting('t.org_a'), current_setting('t.tskip')),
  'cast:%', 'a skipped repair leaves the stored value, and the check names it');
select throws_ok(
  format($$ select public.merge_title_metadata(%L, %L, '{"synopsis":"y"}'::jsonb, '{}'::text[], '[]'::jsonb) $$,
         current_setting('t.org_a'), current_setting('t.ta')),
  '22023', 'p_repair must be a JSON object', 'p_repair must be an object');

-- ===== findings follow the record =====
select lives_ok(
  format($$ select public.merge_title_metadata(%L, %L, '{}'::jsonb, array['synopsis']) $$,
         current_setting('t.org_a'), current_setting('t.ta')),
  'owner clears Synopsis');
select is(
  (select status::text from public.findings
    where entity_type = 'title' and entity_id = current_setting('t.ta')::uuid
      and source = 'validator' and code = 'metadata.missing.synopsis'),
  'open', 'a cleared required field opens its finding in the same call');
select lives_ok(
  format($$ select public.merge_title_metadata(%L, %L, '{"synopsis":"Back."}'::jsonb, '{}'::text[]) $$,
         current_setting('t.org_a'), current_setting('t.ta')),
  'owner fills Synopsis again');
select is(
  (select status::text from public.findings
    where entity_type = 'title' and entity_id = current_setting('t.ta')::uuid
      and source = 'validator' and code = 'metadata.missing.synopsis'),
  'resolved', 'filling it resolves the finding');

-- ===== auth and tenancy =====
select throws_ok(
  format($$ select public.merge_title_metadata(%L, %L, '{"synopsis":"PWNED"}'::jsonb, '{}'::text[]) $$,
         current_setting('t.org_a'), current_setting('t.tb')),
  'P0001', 'Title does not belong to this organization', 'SPOOF: own org, another org''s title is refused');
select throws_ok(
  format($$ select public.merge_title_metadata(%L, %L, '{}'::jsonb, array['synopsis']) $$,
         current_setting('t.org_a'), current_setting('t.tb')),
  'P0001', 'Title does not belong to this organization', 'SPOOF: a clear-only save on another org''s title is refused');
select throws_ok(
  format($$ select public.merge_title_metadata(%L, %L, '{"synopsis":"PWNED"}'::jsonb, '{}'::text[]) $$,
         current_setting('t.org_b'), current_setting('t.tb')),
  'P0001', 'Not authorized to edit metadata for this organization', 'another org''s title under its own org is refused');
select throws_ok(
  format($$ select public.merge_title_metadata(%L, %L, '{"synopsis":"x"}'::jsonb, '{}'::text[]) $$,
         current_setting('t.org_a'), current_setting('t.tgone')),
  'P0001', 'Title does not belong to this organization', 'a deleted title is refused');
reset role;
select is((select data from public.title_metadata where title_id = current_setting('t.tb')::uuid),
  '{"synopsis":"B film."}'::jsonb, 'org B''s record is unchanged');
select is((select count(*) from public.title_metadata where title_id = current_setting('t.tgone')::uuid)::int,
  0, 'no record is created on a deleted title');

set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('t.viewer'), 'role', 'authenticated')::text, true);
select throws_ok(
  format($$ select public.merge_title_metadata(%L, %L, '{"synopsis":"x"}'::jsonb, '{}'::text[]) $$,
         current_setting('t.org_a'), current_setting('t.ta')),
  'P0001', 'Not authorized to edit metadata for this organization', 'viewer: refused');

select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('t.legal'), 'role', 'authenticated')::text, true);
select throws_ok(
  format($$ select public.merge_title_metadata(%L, %L, '{"synopsis":"x"}'::jsonb, '{}'::text[]) $$,
         current_setting('t.org_a'), current_setting('t.ta')),
  'P0001', 'Not authorized to edit metadata for this organization', 'gc_legal: refused (read all, write nothing)');

select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('t.deliv'), 'role', 'authenticated')::text, true);
select lives_ok(
  format($$ select public.merge_title_metadata(%L, %L, '{"keywords":["space"]}'::jsonb, '{}'::text[]) $$,
         current_setting('t.org_a'), current_setting('t.ta')),
  'delivery_ops in the org: merges');

select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('t.gc'), 'role', 'authenticated')::text, true);
select lives_ok(
  format($$ select public.merge_title_metadata(%L, %L, '{"director":"GC"}'::jsonb, '{}'::text[]) $$,
         current_setting('t.org_b'), current_setting('t.tb')),
  'gc_delivery_ops: merges on any org');

select set_config('request.jwt.claims', json_build_object('role', 'authenticated')::text, true);
select throws_ok(
  format($$ select public.merge_title_metadata(%L, %L, '{"synopsis":"x"}'::jsonb, '{}'::text[]) $$,
         current_setting('t.org_a'), current_setting('t.ta')),
  'P0001', 'Not authenticated', 'no user: refused');

set local role anon;
select set_config('request.jwt.claims', null, true);
select throws_ok(
  format($$ select public.merge_title_metadata(%L, %L, '{"synopsis":"x"}'::jsonb, '{}'::text[]) $$,
         current_setting('t.org_a'), current_setting('t.ta')),
  '42501', null, 'anon has no execute privilege');

-- ===== submit reads the merged record and leaves findings current =====
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('t.owner'), 'role', 'authenticated')::text, true);
select lives_ok(
  format($$ select public.submit_title(%L, %L) $$, current_setting('t.org_a'), current_setting('t.ta')),
  'owner submits the complete title');
select is((select status::text from public.titles where id = current_setting('t.ta')::uuid),
  'in_review', 'the title is in review');
select is(
  (select coalesce(array_agg(code order by code), '{}'::text[]) from public.findings
    where entity_type = 'title' and entity_id = current_setting('t.ta')::uuid
      and source = 'validator' and status = 'open'),
  (select coalesce(array_agg(f->>'code' order by f->>'code'), '{}'::text[])
     from jsonb_array_elements(public.title_metadata_findings(
       (select data from public.title_metadata where title_id = current_setting('t.ta')::uuid))) f),
  'after submit, the open findings are exactly the stored record''s');

-- Submit reads the stored record as the app does: a complete record in an
-- older shape submits, and is not rewritten (Codex on #799).
select lives_ok(
  format($$ select public.submit_title(%L, %L) $$, current_setting('t.org_a'), current_setting('t.tsub')),
  'a complete record stored in an older shape submits');
select is((select status::text from public.titles where id = current_setting('t.tsub')::uuid),
  'in_review', 'and the title is in review');
select is((select data from public.title_metadata where title_id = current_setting('t.tsub')::uuid),
  '{"synopsis":"A film.","runtime_minutes":"96","release_year":2024,"genre":"drama","primary_language":"en","country_of_origin":"US","director":"","keywords":["","space"],"foo":"bar"}'::jsonb,
  'submit never rewrites the stored record');
-- Only the required tier is checked (Codex on #799; docs/domain-spec.md §12,
-- required blocks delivery): a Director over 200 characters, stored before
-- the limits, never blocks a submit, and is not rewritten.
select lives_ok(
  format($$ select public.submit_title(%L, %L) $$, current_setting('t.org_a'), current_setting('t.tbad')),
  'six valid required fields and a refused Director: submits');
select is((select status::text from public.titles where id = current_setting('t.tbad')::uuid),
  'in_review', 'and the title is in review');
select is((select char_length(data->>'director') from public.title_metadata where title_id = current_setting('t.tbad')::uuid),
  201, 'and the stored Director is not rewritten');
-- A required value the checks refuse still blocks submit, naming its field:
-- two letters outside LANGUAGES.
select throws_like(
  format($$ select public.submit_title(%L, %L) $$, current_setting('t.org_a'), current_setting('t.tlang')),
  'primary_language:%', 'a required language outside the list still blocks submit');
select is((select status::text from public.titles where id = current_setting('t.tlang')::uuid),
  'draft', 'and the title stays in draft');
-- Codex on #799: a required value that trims to nothing is missing, as the
-- page and the findings read it.
select throws_ok(
  format($$ select public.submit_title(%L, %L) $$, current_setting('t.org_a'), current_setting('t.tws')),
  'P0001', 'Cannot submit: required metadata field "synopsis" is missing',
  'a Synopsis of a space and a no-break space is missing to submit');
-- Another org's title is refused at the lock, before its record is read: the
-- answer never depends on that record (org B's is incomplete).
select throws_ok(
  format($$ select public.submit_title(%L, %L) $$, current_setting('t.org_a'), current_setting('t.tb')),
  'P0001', 'Title not found in this organization, or not in draft',
  'SPOOF: own org, another org''s title is refused before its record is read');
-- A soft-deleted title is refused at the lock too, before its record is read
-- (Bugbot on #799): with no record, never "required field missing"; with a
-- refused required value, never that field's check.
select throws_ok(
  format($$ select public.submit_title(%L, %L) $$, current_setting('t.org_a'), current_setting('t.tgone')),
  'P0001', 'Title not found in this organization, or not in draft',
  'a deleted title with no record is refused at the lock');
select throws_ok(
  format($$ select public.submit_title(%L, %L) $$, current_setting('t.org_a'), current_setting('t.tgonebad')),
  'P0001', 'Title not found in this organization, or not in draft',
  'a deleted title with a refused required value is refused at the lock, not by the check');

reset role;
-- Read as the owner: row security hides a deleted title from members.
select is((select status::text from public.titles where id = current_setting('t.tgonebad')::uuid),
  'draft', 'and the deleted title is untouched');
select * from finish();
rollback;
