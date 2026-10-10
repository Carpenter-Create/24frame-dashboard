-- titles_delete_archive_test.sql
-- CoS unlock: owner drafts only; staff drafts always; staff Complete/Live only
-- when sales_lines + ledger_entries are empty; archive + restore; asset cascade;
-- audit; deleted titles leave the catalog. Staff delete needs a GC role that
-- can operate (Adam, 2026-10-10, "Yes, in #799 (Recommended)"): legal and
-- accountant are refused; delivery ops and account owner still delete.

begin;
select plan(29);

select set_config('t.org_a', gen_random_uuid()::text, false);
select set_config('t.org_b', gen_random_uuid()::text, false);
select set_config('t.owner', gen_random_uuid()::text, false);
select set_config('t.deliv', gen_random_uuid()::text, false);
select set_config('t.viewer', gen_random_uuid()::text, false);
select set_config('t.gc', gen_random_uuid()::text, false);
select set_config('t.gc_legal', gen_random_uuid()::text, false);
select set_config('t.gc_acct', gen_random_uuid()::text, false);
select set_config('t.gc_own', gen_random_uuid()::text, false);
select set_config('t.draft', gen_random_uuid()::text, false);
select set_config('t.draft_ro', gen_random_uuid()::text, false);
select set_config('t.draft_own', gen_random_uuid()::text, false);
select set_config('t.live_ro', gen_random_uuid()::text, false);
select set_config('t.live_clean', gen_random_uuid()::text, false);
select set_config('t.live_money', gen_random_uuid()::text, false);
select set_config('t.period', gen_random_uuid()::text, false);
select set_config('t.import', gen_random_uuid()::text, false);
select set_config('t.asset', gen_random_uuid()::text, false);

insert into auth.users (id) values
  (current_setting('t.owner')::uuid),
  (current_setting('t.deliv')::uuid),
  (current_setting('t.viewer')::uuid),
  (current_setting('t.gc')::uuid),
  (current_setting('t.gc_legal')::uuid),
  (current_setting('t.gc_acct')::uuid),
  (current_setting('t.gc_own')::uuid);

insert into public.organizations (id, name, status) values
  (current_setting('t.org_a')::uuid, 'Org A', 'active'),
  (current_setting('t.org_b')::uuid, 'Org B', 'active');

insert into public.memberships (org_id, user_id, role, status) values
  (current_setting('t.org_a')::uuid, current_setting('t.owner')::uuid, 'account_owner', 'active'),
  (current_setting('t.org_a')::uuid, current_setting('t.deliv')::uuid, 'delivery_ops', 'active'),
  (current_setting('t.org_a')::uuid, current_setting('t.viewer')::uuid, 'viewer', 'active');

-- One gc_staff row per role (gc_staff_role_no_viewer: no gc_viewer seat).
insert into public.gc_staff (user_id, role) values
  (current_setting('t.gc')::uuid, 'gc_delivery_ops'),
  (current_setting('t.gc_legal')::uuid, 'gc_legal'),
  (current_setting('t.gc_acct')::uuid, 'gc_accountant'),
  (current_setting('t.gc_own')::uuid, 'gc_account_owner');

insert into public.titles (id, org_id, title, status, created_by) values
  (current_setting('t.draft')::uuid, current_setting('t.org_a')::uuid, 'Draft One', 'draft', current_setting('t.owner')::uuid),
  (current_setting('t.live_clean')::uuid, current_setting('t.org_a')::uuid, 'Live Clean', 'live', current_setting('t.owner')::uuid),
  (current_setting('t.live_money')::uuid, current_setting('t.org_a')::uuid, 'Live Money', 'live', current_setting('t.owner')::uuid),
  (current_setting('t.draft_ro')::uuid, current_setting('t.org_a')::uuid, 'Draft Read Only', 'draft', current_setting('t.owner')::uuid),
  (current_setting('t.draft_own')::uuid, current_setting('t.org_a')::uuid, 'Draft GC Owner', 'draft', current_setting('t.owner')::uuid),
  (current_setting('t.live_ro')::uuid, current_setting('t.org_a')::uuid, 'Live Read Only', 'live', current_setting('t.owner')::uuid);

insert into public.assets (
  id, org_id, title_id, kind, storage_key, content_hash, bytes, provided_by
) values (
  current_setting('t.asset')::uuid,
  current_setting('t.org_a')::uuid,
  current_setting('t.draft')::uuid,
  'poster',
  'poster/draft-one',
  'abc',
  12,
  current_setting('t.owner')::uuid
);

insert into public.finance_periods (id, org_id, period_year, period_month, created_by)
values (current_setting('t.period')::uuid, current_setting('t.org_a')::uuid, 2026, 1, current_setting('t.gc')::uuid);

insert into public.sales_imports (id, org_id, period_id, filename, content_hash, imported_by)
values (
  current_setting('t.import')::uuid,
  current_setting('t.org_a')::uuid,
  current_setting('t.period')::uuid,
  'jan.csv',
  'hash-jan',
  current_setting('t.gc')::uuid
);

insert into public.sales_lines (
  org_id, period_id, import_id, line_no, endpoint, external_id, title_id, bank_receipt_cents
) values (
  current_setting('t.org_a')::uuid,
  current_setting('t.period')::uuid,
  current_setting('t.import')::uuid,
  1,
  'endpoint-a',
  'ext-1',
  current_setting('t.live_money')::uuid,
  1000
);

insert into public.ledger_entries (
  org_id, period_id, title_id, kind, amount_cents, posted_by
) values (
  current_setting('t.org_a')::uuid,
  current_setting('t.period')::uuid,
  current_setting('t.live_money')::uuid,
  'sale',
  850,
  current_setting('t.gc')::uuid
);

-- ===== viewer cannot delete =====
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('t.viewer'), 'role', 'authenticated')::text, true);

select throws_ok(
  $$ select public.delete_title(current_setting('t.draft')::uuid) $$,
  'P0001', null, 'viewer cannot delete a draft');

-- ===== owner: draft delete cascades assets; live refused =====
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('t.owner'), 'role', 'authenticated')::text, true);

select throws_ok(
  $$ select public.delete_title(current_setting('t.live_clean')::uuid) $$,
  'P0001', null, 'owner cannot delete after submit');

select lives_ok(
  $$ select public.delete_title(current_setting('t.draft')::uuid) $$,
  'owner deletes own draft');

select is((select count(*) from public.titles where id = current_setting('t.draft')::uuid)::int,
  0, 'soft-deleted draft leaves the owner catalog');

select is((select count(*) from public.assets where title_id = current_setting('t.draft')::uuid)::int,
  0, 'cascaded assets leave the owner catalog');

-- ===== owner archive / restore on live without inventing money tables =====
select lives_ok(
  $$ select public.archive_title(current_setting('t.live_clean')::uuid) $$,
  'owner can archive a submitted/live title');

select is((select status::text from public.titles where id = current_setting('t.live_clean')::uuid),
  'archived', 'archived status is first-class');

select is((select archived_from::text from public.titles where id = current_setting('t.live_clean')::uuid),
  'live', 'archive remembers the prior status');

select lives_ok(
  $$ select public.restore_title(current_setting('t.live_clean')::uuid) $$,
  'owner can restore an archived title');

select is((select status::text from public.titles where id = current_setting('t.live_clean')::uuid),
  'live', 'restore returns the prior status');

-- ===== staff: live with facts refused; live without facts deleted =====
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('t.gc'), 'role', 'authenticated')::text, true);

select is(public.title_has_reporting_activity(current_setting('t.live_money')::uuid),
  true, 'sales_lines + ledger_entries count as reporting activity');

select is(public.title_has_reporting_activity(current_setting('t.live_clean')::uuid),
  false, 'no fact rows → predicate empty');

select throws_ok(
  $$ select public.delete_title(current_setting('t.live_money')::uuid) $$,
  'P0001', null, 'staff cannot delete a title with reporting facts');

select lives_ok(
  $$ select public.archive_title(current_setting('t.live_money')::uuid) $$,
  'staff archives a title that cannot be deleted');

select is((select status::text from public.titles where id = current_setting('t.live_money')::uuid),
  'archived', 'money title remains archived, not deleted');

select lives_ok(
  $$ select public.delete_title(current_setting('t.live_clean')::uuid) $$,
  'staff deletes Complete/Live with no reporting facts');

-- ===== staff delete needs a GC role that can operate (Adam, 2026-10-10) =====
-- delete_title's staff gate is gc_can(auth.uid(), 'operate'). Legal and
-- accountant (read all, operate nothing) take the member branch, where
-- member_can defers to gc_can for GC staff, and are refused before any
-- write, a draft and a live title with no reporting facts alike. Each title
-- stays live: titles_select shows them only while deleted_at is null.
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('t.gc_legal'), 'role', 'authenticated')::text, true);

select throws_ok(
  $$ select public.delete_title(current_setting('t.draft_ro')::uuid) $$,
  'P0001', 'Not authorized to delete this title', 'gc_legal cannot delete a draft');

select is((select count(*) from public.titles
            where id = current_setting('t.draft_ro')::uuid and deleted_at is null)::int,
  1, 'gc_legal''s refused delete leaves the draft live (deleted_at null)');

select throws_ok(
  $$ select public.delete_title(current_setting('t.live_ro')::uuid) $$,
  'P0001', 'Not authorized to delete this title', 'gc_legal cannot delete a live title without reporting facts');

select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('t.gc_acct'), 'role', 'authenticated')::text, true);

select throws_ok(
  $$ select public.delete_title(current_setting('t.draft_ro')::uuid) $$,
  'P0001', 'Not authorized to delete this title', 'gc_accountant cannot delete a draft');

select is((select count(*) from public.titles
            where id = current_setting('t.draft_ro')::uuid and deleted_at is null)::int,
  1, 'gc_accountant''s refused delete leaves the draft live (deleted_at null)');

select throws_ok(
  $$ select public.delete_title(current_setting('t.live_ro')::uuid) $$,
  'P0001', 'Not authorized to delete this title', 'gc_accountant cannot delete a live title without reporting facts');

select is((select count(*) from public.titles
            where id = current_setting('t.live_ro')::uuid and deleted_at is null)::int,
  1, 'the refused deletes leave the live title live (deleted_at null)');

-- The staff branch is unchanged for the roles that can operate.
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('t.gc'), 'role', 'authenticated')::text, true);

select lives_ok(
  $$ select public.delete_title(current_setting('t.draft_ro')::uuid) $$,
  'gc_delivery_ops still deletes a draft');

select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('t.gc_own'), 'role', 'authenticated')::text, true);

select lives_ok(
  $$ select public.delete_title(current_setting('t.draft_own')::uuid) $$,
  'gc_account_owner still deletes a draft');

reset role;
select is((select count(*) from public.titles
            where id in (current_setting('t.draft_ro')::uuid, current_setting('t.draft_own')::uuid)
              and deleted_at is not null)::int,
  2, 'the operate-capable staff deletes land (delivery ops, account owner)');

-- ===== audit trail on the soft-delete =====
select isnt_empty($$
  select 1 from public.audit_log
   where entity = 'titles'
     and entity_id = current_setting('t.live_clean')::uuid
     and action = 'update'
     and after ? 'deleted_at' $$,
  'soft-delete writes an audit_log update');

select isnt_empty($$
  select 1 from public.titles
   where id = current_setting('t.live_clean')::uuid
     and deleted_at is not null $$,
  'soft-deleted row remains in the table');

select is((select count(*) from public.titles
            where id = current_setting('t.live_money')::uuid
              and status = 'archived'
              and deleted_at is null)::int,
  1, 'archived title with money history is not erased');

select finish();
rollback;
