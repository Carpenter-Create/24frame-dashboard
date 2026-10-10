-- title_metadata_checks_test.sql
-- 20261009120000: set_title_metadata accepts only the field registry with
-- its types and limits (Adam 2026-10-09, "Add these limits"; the year limit
-- counted in UTC, as the app counts it), and a language
-- or country only from the app's lists (LANGUAGES, ISO_COUNTRIES; Codex on
-- #799); a cleared field is dropped; a soft-deleted title cannot be written,
-- reconciled or submitted.

begin;
select plan(31);

select set_config('t.org',   gen_random_uuid()::text, false);
select set_config('t.owner', gen_random_uuid()::text, false);
select set_config('t.title', gen_random_uuid()::text, false);
select set_config('t.gone',  gen_random_uuid()::text, false);
select set_config('t.bad',   gen_random_uuid()::text, false);

insert into auth.users (id) values (current_setting('t.owner')::uuid);
insert into public.organizations (id, name, status) values (current_setting('t.org')::uuid, 'Org', 'active');
insert into public.memberships (user_id, org_id, role) values
  (current_setting('t.owner')::uuid, current_setting('t.org')::uuid, 'account_owner');
insert into public.titles (id, org_id, title, status) values
  (current_setting('t.title')::uuid, current_setting('t.org')::uuid, 'Film', 'draft'),
  (current_setting('t.gone')::uuid,  current_setting('t.org')::uuid, 'Gone', 'draft'),
  (current_setting('t.bad')::uuid,   current_setting('t.org')::uuid, 'Bad',  'draft');
-- Every required field filled, but runtime 0 (stored before the limits).
insert into public.title_metadata (title_id, org_id, data) values
  (current_setting('t.bad')::uuid, current_setting('t.org')::uuid,
   '{"synopsis":"x","runtime_minutes":0,"release_year":2024,"genre":"drama","primary_language":"en","country_of_origin":"US"}'::jsonb);
-- The deleted title has complete required metadata, so only its deletion
-- can refuse a submit.
insert into public.title_metadata (title_id, org_id, data) values
  (current_setting('t.gone')::uuid, current_setting('t.org')::uuid,
   '{"synopsis":"x","runtime_minutes":90,"release_year":2024,"genre":"drama","primary_language":"en","country_of_origin":"US"}'::jsonb);
update public.titles set deleted_at = now() where id = current_setting('t.gone')::uuid;

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', current_setting('t.owner'),'role','authenticated')::text, true);

-- A full, valid record is stored.
select lives_ok(
  format($$ select public.set_title_metadata(%L,%L,%L::jsonb) $$,
         current_setting('t.org'), current_setting('t.title'),
         '{"synopsis":"A film.","runtime_minutes":90,"release_year":2024,"genre":"sci_fi",'
         '"primary_language":"en","country_of_origin":"US","director":"Ada Lovelace",'
         '"cast":["Ada","Grace"],"rating":"PG-13","keywords":["space"],'
         '"alternate_title":"Another","production_company":"Studio"}'),
  'a full valid record is stored');
select is((select count(*) from public.findings where entity_id=current_setting('t.title')::uuid and status='open')::int, 0,
  'a complete record leaves no open findings');

-- A cleared field (null) is dropped, not stored.
select lives_ok(
  format($$ select public.set_title_metadata(%L,%L,'{"synopsis":"A film.","director":null}'::jsonb) $$,
         current_setting('t.org'), current_setting('t.title')),
  'null fields are accepted');
select ok(not ((select data from public.title_metadata where title_id=current_setting('t.title')::uuid) ? 'director'),
  'a cleared field is dropped');

-- Unknown keys and wrong shapes are refused (22023).
select throws_ok(
  format($$ select public.set_title_metadata(%L,%L,'{"budget":1}'::jsonb) $$, current_setting('t.org'), current_setting('t.title')),
  '22023', 'Unknown metadata field "budget"', 'unknown key refused');
select throws_ok(
  format($$ select public.set_title_metadata(%L,%L,'[]'::jsonb) $$, current_setting('t.org'), current_setting('t.title')),
  '22023', 'Metadata must be an object', 'non-object refused');
select throws_ok(
  format($$ select public.set_title_metadata(%L,%L,'{"synopsis":5}'::jsonb) $$, current_setting('t.org'), current_setting('t.title')),
  '22023', 'synopsis: expected text', 'synopsis must be text');
select throws_ok(
  format($$ select public.set_title_metadata(%L,%L,%L::jsonb) $$, current_setting('t.org'), current_setting('t.title'),
         json_build_object('synopsis', repeat('a', 4001))::text),
  '22023', 'synopsis: 1 to 4000 characters', 'synopsis over 4000 refused');
select throws_ok(
  format($$ select public.set_title_metadata(%L,%L,%L::jsonb) $$, current_setting('t.org'), current_setting('t.title'),
         json_build_object('director', repeat('a', 201))::text),
  '22023', 'director: 1 to 200 characters', 'text over 200 refused');
select throws_ok(
  format($$ select public.set_title_metadata(%L,%L,'{"runtime_minutes":0}'::jsonb) $$, current_setting('t.org'), current_setting('t.title')),
  '22023', 'runtime_minutes: 1 to 1000', 'runtime 0 refused');
select throws_ok(
  format($$ select public.set_title_metadata(%L,%L,'{"runtime_minutes":1001}'::jsonb) $$, current_setting('t.org'), current_setting('t.title')),
  '22023', 'runtime_minutes: 1 to 1000', 'runtime over 1000 refused');
select throws_ok(
  format($$ select public.set_title_metadata(%L,%L,'{"runtime_minutes":90.5}'::jsonb) $$, current_setting('t.org'), current_setting('t.title')),
  '22023', 'runtime_minutes: expected a whole number', 'fractional runtime refused');
select throws_ok(
  format($$ select public.set_title_metadata(%L,%L,'{"release_year":1887}'::jsonb) $$, current_setting('t.org'), current_setting('t.title')),
  '22023', format('release_year: 1888 to %s', extract(year from now() at time zone 'UTC')::int + 6), 'year before 1888 refused');
-- Next year plus five is the last year accepted.
select lives_ok(
  format($$ select public.set_title_metadata(%L,%L,%L::jsonb) $$, current_setting('t.org'), current_setting('t.title'),
         json_build_object('release_year', extract(year from now() at time zone 'UTC')::int + 6)::text),
  'next year plus five accepted');
select throws_ok(
  format($$ select public.set_title_metadata(%L,%L,%L::jsonb) $$, current_setting('t.org'), current_setting('t.title'),
         json_build_object('release_year', extract(year from now() at time zone 'UTC')::int + 7)::text),
  '22023', format('release_year: 1888 to %s', extract(year from now() at time zone 'UTC')::int + 6), 'a year past that refused');
select throws_ok(
  format($$ select public.set_title_metadata(%L,%L,'{"genre":"opera"}'::jsonb) $$, current_setting('t.org'), current_setting('t.title')),
  '22023', 'genre: not in the list', 'genre outside the list refused');
select throws_ok(
  format($$ select public.set_title_metadata(%L,%L,'{"rating":"X"}'::jsonb) $$, current_setting('t.org'), current_setting('t.title')),
  '22023', 'rating: not in the list', 'rating outside the list refused');
select throws_ok(
  format($$ select public.set_title_metadata(%L,%L,'{"primary_language":"english"}'::jsonb) $$, current_setting('t.org'), current_setting('t.title')),
  '22023', 'primary_language: not in the list', 'language not a code refused');
select throws_ok(
  format($$ select public.set_title_metadata(%L,%L,'{"country_of_origin":"us"}'::jsonb) $$, current_setting('t.org'), current_setting('t.title')),
  '22023', 'country_of_origin: not in the list', 'country not a code refused');
-- Two letters are not enough: only the app's lists (Codex on #799).
select throws_ok(
  format($$ select public.set_title_metadata(%L,%L,'{"primary_language":"zz"}'::jsonb) $$, current_setting('t.org'), current_setting('t.title')),
  '22023', 'primary_language: not in the list', 'a two-letter language outside LANGUAGES refused');
select throws_ok(
  format($$ select public.set_title_metadata(%L,%L,'{"country_of_origin":"ZZ"}'::jsonb) $$, current_setting('t.org'), current_setting('t.title')),
  '22023', 'country_of_origin: not in the list', 'a two-letter country outside ISO_COUNTRIES refused');
select lives_ok(
  format($$ select public.set_title_metadata(%L,%L,'{"primary_language":"fr","country_of_origin":"GB"}'::jsonb) $$, current_setting('t.org'), current_setting('t.title')),
  'a language and a country from the lists are accepted');
select throws_ok(
  format($$ select public.set_title_metadata(%L,%L,%L::jsonb) $$, current_setting('t.org'), current_setting('t.title'),
         json_build_object('cast', (select json_agg('x' || g) from generate_series(1, 51) g))::text),
  '22023', 'cast: at most 50', 'list over 50 refused');
select throws_ok(
  format($$ select public.set_title_metadata(%L,%L,'{"keywords":["ok",""]}'::jsonb) $$, current_setting('t.org'), current_setting('t.title')),
  '22023', 'keywords: each entry 1 to 200 characters', 'empty list entry refused');

-- A soft-deleted title cannot be written, reconciled, released or submitted.
select throws_ok(
  format($$ select public.set_title_metadata(%L,%L,'{"synopsis":"x"}'::jsonb) $$, current_setting('t.org'), current_setting('t.gone')),
  'P0001', 'Title does not belong to this organization', 'deleted title: metadata refused');
select throws_ok(
  format($$ select public.set_title_release_info(%L,%L,'new_release') $$, current_setting('t.org'), current_setting('t.gone')),
  'P0001', 'Title does not belong to this organization', 'deleted title: release info refused');
select throws_ok(
  format($$ select public.reconcile_title_findings(%L,%L,'[]'::jsonb,'metadata-v1') $$, current_setting('t.org'), current_setting('t.gone')),
  'P0001', 'Title not found in this organization', 'deleted title: findings refused');
select throws_ok(
  format($$ select public.submit_title(%L,%L) $$, current_setting('t.org'), current_setting('t.gone')),
  'P0001', 'Title not found in this organization, or not in draft', 'deleted title: submit refused');

-- Filled is not enough: a stored value the checks refuse does not submit.
select throws_ok(
  format($$ select public.submit_title(%L,%L) $$, current_setting('t.org'), current_setting('t.bad')),
  '22023', 'runtime_minutes: 1 to 1000', 'filled but refused required value: submit refused');

-- The largest record the approved limits allow, in four-byte characters,
-- is stored: no byte cap of its own refuses it (Codex on #799).
select lives_ok(
  format($$ select public.set_title_metadata(%L,%L,%L::jsonb) $$,
    current_setting('t.org'), current_setting('t.title'),
    jsonb_build_object(
      'synopsis', repeat('𝄞', 4000), 'runtime_minutes', 1000, 'release_year', 2024, 'genre', 'drama',
      'primary_language', 'en', 'country_of_origin', 'US', 'rating', 'PG',
      'director', repeat('𝄞', 200), 'alternate_title', repeat('𝄞', 200), 'production_company', repeat('𝄞', 200),
      'cast', (select jsonb_agg(repeat('𝄞', 200)) from generate_series(1, 50)),
      'keywords', (select jsonb_agg(repeat('𝄞', 200)) from generate_series(1, 50)))::text),
  'the largest record within the limits, in four-byte characters, is stored');

-- The internal refresh is not callable by a client.
select throws_ok(
  format($$ select public.refresh_title_findings(%L,%L) $$, current_setting('t.org'), current_setting('t.title')),
  '42501', null, 'refresh_title_findings is not granted to clients');

reset role;
select * from finish();
rollback;
