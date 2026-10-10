-- ============================================================================
-- 20261009120000_title_findings_server_derived.sql
--
-- DRAFT FOR FOUNDER REVIEW — NOT APPLIED. Adam authorized drafting only
-- (2026-10-09, "Yes, draft for review"); applying it is founder-executed.
-- Section 8 (the atomic metadata merge) was drafted on the same terms
-- (Adam, 2026-10-09, "4) yes, please."; open questions "approved, use the
-- defaults"). Approving this exact SQL and applying it stay founder-only.
--
-- MERGE GATE: the founder applies it, verifies on the PR preview, then
-- merges. For the Metadata window's save either order is safe: until this is
-- applied, PostgREST reports merge_title_metadata missing and the app reads,
-- merges and sets as before; no other error falls back.
--
-- INTENT: close a forgery path in the findings store (§19) and harden the
-- title write RPCs.
--
--   1. reconcile_title_findings trusted the findings the browser sent
--      (p_findings, p_logic_version). Any member who can operate a title could
--      call it with '[]' and auto-resolve every validator finding, or insert
--      any message under sender 'gc_support'. Findings are now derived in the
--      database from the stored metadata (the validator mirrored from
--      src/lib/metadata.ts, logic 'metadata-v1'); the browser's payload is
--      ignored. The 4-argument signature stays, so the app keeps working in
--      either deploy order.
--   2. set_title_metadata accepted any JSON. It now accepts only the field
--      registry's keys, each with its type and the limits Adam approved
--      (2026-10-09, "Add these limits"): text 200, synopsis 4,000, runtime
--      1–1,000 minutes, release year 1888 to next year + 5, lists of up to
--      50; genre, rating, primary language and country of origin only from
--      the app's lists (GENRES, RATINGS, LANGUAGES, ISO_COUNTRIES). A cleared
--      (null) field is dropped. It refreshes findings in the same
--      transaction, so findings always match what was stored.
--   3. A soft-deleted title (deleted_at set) can no longer be written through
--      set_title_metadata, set_title_release_info, reconcile_title_findings
--      or submit_title.
--   4. An atomic metadata merge for the Metadata window's save
--      (merge_title_metadata): the app sends only the changed fields; the
--      database merges them onto the stored record under a lock on the
--      title, checks the whole record and refreshes findings in one
--      transaction. set_title_metadata, submit_title and
--      reconcile_title_findings take the same title lock first, so every
--      caller of the findings refresh serializes on the title, a submit
--      reads what the last save stored, and a reconcile never writes
--      findings from a record a later save replaced. submit_title reads the
--      stored record as the app does (normalize_stored_title_metadata), so a
--      record the window shows as complete is never refused over an older
--      stored shape, and it refuses a title outside the org before reading
--      its record. It checks only the required tier's values, as the app
--      counts them (required blocks delivery, docs/domain-spec.md §12): a
--      refused recommended or optional value never blocks a submit.
--   5. One pass at apply (section 9, Codex on #799): every live title's
--      validator findings are re-derived from its stored metadata, so
--      findings an earlier caller forged through the old reconcile do not
--      outlive it. After the commit the founder runs the final pass
--      (section 10), which first waits for every transaction that began
--      before it, so no reconcile call on the old body can write after it.
--
-- DESTRUCTIVE OPS (approved before apply): create or replace 4 existing
-- functions (reconcile_title_findings, set_title_metadata,
-- set_title_release_info, submit_title); create 8 new functions (2 pure
-- helpers, 1 internal refresh, 1 metadata check, in section 8
-- normalize_stored_title_metadata (internal) and merge_title_metadata, and
-- in sections 9 and 10 refresh_live_title_findings and
-- finish_title_findings_repair (internal)); a
-- titles row lock (FOR NO KEY UPDATE) added to set_title_metadata,
-- submit_title and reconcile_title_findings; submit_title refuses a title
-- outside the org or soft-deleted at that lock, reads the stored record
-- normalized and checks only its required fields; revoke/grant execute. No
-- table, column, policy or trigger change. One data step: the section 9 pass
-- upserts or resolves each live title's validator findings (findings rows
-- only; nothing is deleted; AI findings and deleted titles are untouched).
-- Existing stored metadata is not rewritten
-- or re-validated; the next save of a title checks its whole record, so a
-- stored value the checks refuse (including a language or country outside
-- the app's lists) blocks that save, named on its field, until it is
-- corrected in the same save, and a refused required value blocks submit.
-- Count those rows read-only before applying. Apply as one transaction.
--
-- ROLLBACK: re-apply the previous bodies from 20260718000700_title_metadata.sql
-- (set_title_metadata), 20260721000200_release_dates.sql (set_title_release_info),
-- 20260719000700_export_and_submit_gate.sql (submit_title) and
-- 20260727000100_gc_role_separation.sql (reconcile_title_findings); drop the
-- new functions (submit_title's previous body first: this one calls
-- normalize_stored_title_metadata), and
--   drop function public.finish_title_findings_repair(integer);
--   drop function public.refresh_live_title_findings();
-- The pass's findings stay: they are derived from stored metadata, and the
-- next save of each title derives them again. For the merge alone:
--   drop function public.merge_title_metadata(uuid, uuid, jsonb, text[]);
-- and keep normalize_stored_title_metadata, which submit_title calls. The
-- app then returns to read, merge and set by itself.
--
-- KEEP IN SYNC with src/lib/metadata.ts (METADATA_FIELDS, GENRES, RATINGS,
-- computeMetadataFindings, METADATA_LOGIC_VERSION, normalizeStoredMetadata,
-- requiredComplete) and the limits there, src/lib/languages.ts (LANGUAGES)
-- and src/lib/territories.ts (ISO_COUNTRIES); src/lib/metadata-merge.test.ts
-- pins them.
-- ============================================================================

-- ---- 1. Pure helpers ---------------------------------------------------------

-- A field counts as filled if present and non-empty (arrays: at least one
-- entry). Mirrors isEmpty() in src/lib/metadata.ts.
create or replace function public.title_metadata_value_empty(p_value jsonb)
  returns boolean
  language sql immutable
  set search_path = public
as $$
  select p_value is null
      or jsonb_typeof(p_value) = 'null'
      or (jsonb_typeof(p_value) = 'string' and p_value #>> '{}' = '')
      or (jsonb_typeof(p_value) = 'array' and jsonb_array_length(p_value) = 0);
$$;

-- The validator (§19): one finding per empty required (high) or recommended
-- (low) field; optional fields never produce one. Mirrors
-- computeMetadataFindings() — same codes, severities, messages and order.
create or replace function public.title_metadata_findings(p_data jsonb)
  returns jsonb
  language sql immutable
  set search_path = public
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'code', 'metadata.missing.' || f.key,
        'severity', case when f.tier = 'required' then 'high' else 'low' end,
        'message', f.label || case when f.tier = 'required' then ' is required.' else ' is recommended.' end,
        'field', f.key,
        'tier', f.tier
      )
      order by f.ord
    ),
    '[]'::jsonb
  )
  from (values
    (1,  'synopsis',          'Synopsis',          'required'),
    (2,  'runtime_minutes',   'Runtime (minutes)', 'required'),
    (3,  'release_year',      'Release year',      'required'),
    (4,  'genre',             'Genre',             'required'),
    (5,  'primary_language',  'Primary language',  'required'),
    (6,  'country_of_origin', 'Country of origin', 'required'),
    (7,  'director',          'Director',          'recommended'),
    (8,  'cast',              'Cast',              'recommended'),
    (9,  'rating',            'Rating',            'recommended'),
    (10, 'keywords',          'Keywords',          'recommended')
  ) as f(ord, key, label, tier)
  where public.title_metadata_value_empty(coalesce(p_data, '{}'::jsonb) -> f.key);
$$;

revoke execute on function public.title_metadata_value_empty(jsonb) from public, anon;
grant  execute on function public.title_metadata_value_empty(jsonb) to authenticated;
revoke execute on function public.title_metadata_findings(jsonb) from public, anon;
grant  execute on function public.title_metadata_findings(jsonb) to authenticated;

-- ---- 2. The metadata check -----------------------------------------------------

-- Returns the stored form of p_data (cleared fields dropped) or raises with
-- the field at fault (errcode 22023). Mirrors the app's schema and limits.
create or replace function public.check_title_metadata(p_data jsonb)
  returns jsonb
  language plpgsql stable
  set search_path = public
as $$
declare
  v_data  jsonb := jsonb_strip_nulls(coalesce(p_data, '{}'::jsonb));
  v_key   text;
  v_val   jsonb;
  v_text  text;
  v_num   numeric;
  v_item  jsonb;
  -- Next year plus five (2032 in 2026).
  v_max_year int := extract(year from now())::int + 1 + 5;
begin
  if jsonb_typeof(v_data) <> 'object' then
    raise exception 'Metadata must be an object' using errcode = '22023';
  end if;
  -- No size cap of its own: every key is the registry's and every value is
  -- bounded below, so a record within the approved limits is never refused
  -- for its bytes (Codex on #799: a 64 KB cap refused valid multibyte text).

  for v_key, v_val in select key, value from jsonb_each(v_data) loop
    case v_key
      when 'synopsis' then
        if jsonb_typeof(v_val) <> 'string' then raise exception 'synopsis: expected text' using errcode = '22023'; end if;
        v_text := v_val #>> '{}';
        if char_length(v_text) < 1 or char_length(v_text) > 4000 then
          raise exception 'synopsis: 1 to 4000 characters' using errcode = '22023';
        end if;

      when 'director', 'alternate_title', 'production_company' then
        if jsonb_typeof(v_val) <> 'string' then raise exception '%: expected text', v_key using errcode = '22023'; end if;
        v_text := v_val #>> '{}';
        if char_length(v_text) < 1 or char_length(v_text) > 200 then
          raise exception '%: 1 to 200 characters', v_key using errcode = '22023';
        end if;

      when 'runtime_minutes', 'release_year' then
        if jsonb_typeof(v_val) <> 'number' then raise exception '%: expected a number', v_key using errcode = '22023'; end if;
        v_num := (v_val #>> '{}')::numeric;
        if v_num <> trunc(v_num) then raise exception '%: expected a whole number', v_key using errcode = '22023'; end if;
        if v_key = 'runtime_minutes' and (v_num < 1 or v_num > 1000) then
          raise exception 'runtime_minutes: 1 to 1000' using errcode = '22023';
        end if;
        if v_key = 'release_year' and (v_num < 1888 or v_num > v_max_year) then
          raise exception 'release_year: 1888 to %', v_max_year using errcode = '22023';
        end if;

      when 'genre' then
        if jsonb_typeof(v_val) <> 'string' or (v_val #>> '{}') not in (
          'action','adventure','animation','biography','comedy','crime','documentary',
          'drama','family','fantasy','history','horror','music','mystery','romance',
          'sci_fi','sport','thriller','war','western'
        ) then
          raise exception 'genre: not in the list' using errcode = '22023';
        end if;

      when 'rating' then
        if jsonb_typeof(v_val) <> 'string' or (v_val #>> '{}') not in ('G','PG','PG-13','R','NC-17','NR') then
          raise exception 'rating: not in the list' using errcode = '22023';
        end if;

      when 'primary_language' then
        -- LANGUAGES (src/lib/languages.ts), in order: the app's exact list,
        -- not any two letters (Codex on #799).
        if jsonb_typeof(v_val) <> 'string' or (v_val #>> '{}') not in (
          'en','es','fr','de','it','pt','nl','sv','no','da','fi','pl','ru','uk','cs','el','tr',
          'ar','he','hi','bn','ta','ur','fa','zh','ja','ko','th','vi','id','ms','tl','sw','af',
          'hu','ro','bg','hr','sr','sk'
        ) then
          raise exception 'primary_language: not in the list' using errcode = '22023';
        end if;

      when 'country_of_origin' then
        -- ISO_COUNTRIES keys (src/lib/territories.ts), in order: the app's
        -- exact list, not any two letters (Codex on #799).
        if jsonb_typeof(v_val) <> 'string' or (v_val #>> '{}') not in (
          'DZ','AO','BJ','BW','BF','BI','CV','CM','CF','TD','KM','CG','CD','CI','DJ','EG','GQ',
          'ER','SZ','ET','GA','GM','GH','GN','GW','KE','LS','LR','LY','MG','MW','ML','MR','MU',
          'YT','MA','MZ','NA','NE','NG','RE','RW','SH','ST','SN','SC','SL','SO','ZA','SS','SD',
          'TZ','TG','TN','UG','EH','ZM','ZW','AF','AM','AZ','BH','BD','BT','BN','KH','CN','CY',
          'GE','HK','IN','ID','IR','IQ','IL','JP','JO','KZ','KW','KG','LA','LB','MO','MY','MV',
          'MN','MM','NP','KP','OM','PK','PS','PH','QA','SA','SG','KR','LK','SY','TW','TJ','TH',
          'TL','TR','TM','AE','UZ','VN','YE','AX','AL','AD','AT','BY','BE','BA','BG','HR','CZ',
          'DK','EE','FO','FI','FR','DE','GI','GR','GG','HU','IS','IE','IM','IT','JE','LV','LI',
          'LT','LU','MT','MD','MC','ME','NL','MK','NO','PL','PT','RO','RU','SM','RS','SK','SI',
          'ES','SJ','SE','CH','UA','GB','VA','AI','AG','AW','BS','BB','BZ','BM','BQ','VG','CA',
          'KY','CR','CU','CW','DM','DO','SV','GL','GD','GP','GT','HT','HN','JM','MQ','MX','MS',
          'NI','PA','PR','BL','KN','LC','MF','PM','VC','SX','TT','TC','US','VI','AR','BO','BR',
          'CL','CO','EC','FK','GF','GY','PY','PE','SR','UY','VE','AS','AU','CX','CC','CK','FJ',
          'PF','GU','KI','MH','FM','NR','NC','NZ','NU','NF','MP','PW','PG','PN','WS','SB','TK',
          'TO','TV','VU','WF','AQ','BV','IO','TF','HM','GS','UM'
        ) then
          raise exception 'country_of_origin: not in the list' using errcode = '22023';
        end if;

      when 'cast', 'keywords' then
        if jsonb_typeof(v_val) <> 'array' then raise exception '%: expected a list', v_key using errcode = '22023'; end if;
        if jsonb_array_length(v_val) > 50 then raise exception '%: at most 50', v_key using errcode = '22023'; end if;
        for v_item in select value from jsonb_array_elements(v_val) loop
          if jsonb_typeof(v_item) <> 'string'
             or char_length(v_item #>> '{}') < 1
             or char_length(v_item #>> '{}') > 200 then
            raise exception '%: each entry 1 to 200 characters', v_key using errcode = '22023';
          end if;
        end loop;

      else
        raise exception 'Unknown metadata field "%"', v_key using errcode = '22023';
    end case;
  end loop;

  return v_data;
end;
$$;

revoke execute on function public.check_title_metadata(jsonb) from public, anon;
grant  execute on function public.check_title_metadata(jsonb) to authenticated;

-- ---- 3. The findings refresh (internal) ---------------------------------------

-- Upserts the validator's findings for a title from its stored metadata and
-- auto-resolves those no longer present. Only touches source='validator'
-- rows, so AI findings are never disturbed. Callers check who may run it;
-- not granted to any client role.
create or replace function public.refresh_title_findings(p_org_id uuid, p_title_id uuid)
  returns void
  language plpgsql security definer
  set search_path = public
as $$
declare
  v_data     jsonb;
  v_findings jsonb;
  f          jsonb;
  v_codes    text[] := '{}';
begin
  select coalesce(m.data, '{}'::jsonb) into v_data
    from public.titles t
    left join public.title_metadata m on m.title_id = t.id
   where t.id = p_title_id and t.org_id = p_org_id and t.deleted_at is null;
  if not found then
    raise exception 'Title not found in this organization';
  end if;

  -- Read as the Metadata window and its required count read it
  -- (normalizeStoredMetadata; Codex on #799): a list of blank entries is
  -- missing, a number stored as text is filled.
  v_findings := public.title_metadata_findings(public.normalize_stored_title_metadata(v_data));
  for f in select * from jsonb_array_elements(v_findings) loop
    v_codes := array_append(v_codes, f->>'code');
    insert into public.findings
      (org_id, entity_type, entity_id, code, source, sender, severity, message,
       source_refs, logic_version, derived_at, status, resolved_at)
    values
      (p_org_id, 'title', p_title_id, f->>'code', 'validator', 'gc_support',
       (f->>'severity')::public.finding_severity, f->>'message',
       jsonb_build_object('title_id', p_title_id, 'field', f->>'field', 'tier', f->>'tier'),
       'metadata-v1', now(), 'open', null)
    on conflict (entity_type, entity_id, code, source) do update
      set status = 'open', resolved_at = null,
          severity = excluded.severity, message = excluded.message,
          source_refs = excluded.source_refs, logic_version = excluded.logic_version,
          derived_at = excluded.derived_at;
  end loop;

  update public.findings
     set status = 'resolved', resolved_at = now()
   where entity_type = 'title' and entity_id = p_title_id and source = 'validator'
     and status = 'open' and not (code = any (v_codes));
end;
$$;

revoke execute on function public.refresh_title_findings(uuid, uuid) from public, anon, authenticated;

-- ---- 4. reconcile_title_findings: same signature, payload ignored, title lock -

create or replace function public.reconcile_title_findings(
  p_org_id uuid, p_title_id uuid, p_findings jsonb, p_logic_version text
) returns void
  language plpgsql security definer
  set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if not (public.gc_can(auth.uid(), 'operate') or public.member_can(auth.uid(), p_org_id, 'operate')) then
    raise exception 'Not authorized';
  end if;
  -- The metadata writers' title lock, taken first as they take it: a save in
  -- flight commits before the refresh reads the record, so a refresh never
  -- writes findings from a record a later save replaced (Codex on #799). A
  -- spoofed p_org_id or a deleted title matches no row and is refused here.
  perform 1 from public.titles t
   where t.id = p_title_id and t.org_id = p_org_id and t.deleted_at is null
   for no key update;
  if not found then
    raise exception 'Title not found in this organization';
  end if;
  -- p_findings and p_logic_version are ignored: findings come from the
  -- stored metadata, never from the caller.
  perform public.refresh_title_findings(p_org_id, p_title_id);
end;
$$;

revoke execute on function public.reconcile_title_findings(uuid, uuid, jsonb, text) from public, anon;
grant  execute on function public.reconcile_title_findings(uuid, uuid, jsonb, text) to authenticated;

-- ---- 5. set_title_metadata: checked, and findings refreshed with it -------------

create or replace function public.set_title_metadata(
  p_org_id   uuid,
  p_title_id uuid,
  p_data     jsonb
) returns void
  language plpgsql security definer
  set search_path = public
as $$
declare
  v_data jsonb;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if not public.member_can(auth.uid(), p_org_id, 'operate') then
    raise exception 'Not authorized to edit metadata for this organization';
  end if;
  -- One metadata writer per title: the lock merge_title_metadata takes.
  perform 1 from public.titles t
   where t.id = p_title_id and t.org_id = p_org_id and t.deleted_at is null
   for no key update;
  if not found then
    raise exception 'Title does not belong to this organization';
  end if;

  v_data := public.check_title_metadata(p_data);

  insert into public.title_metadata (title_id, org_id, data)
    values (p_title_id, p_org_id, v_data)
  on conflict (title_id) do update
    set data = excluded.data, updated_at = now();

  perform public.refresh_title_findings(p_org_id, p_title_id);
end;
$$;

revoke execute on function public.set_title_metadata(uuid, uuid, jsonb) from public, anon;
grant  execute on function public.set_title_metadata(uuid, uuid, jsonb) to authenticated;

-- ---- 6. set_title_release_info: never on a deleted title ----------------------

create or replace function public.set_title_release_info(
  p_org_id                uuid,
  p_title_id              uuid,
  p_release_type          public.release_type,
  p_original_release_date date default null
) returns void
  language plpgsql security definer
  set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if p_release_type is null then raise exception 'Release type is required'; end if;
  if p_release_type = 're_release' and p_original_release_date is null then
    raise exception 'Original release date is required for a re-release';
  end if;
  if not public.member_can(auth.uid(), p_org_id, 'operate') then
    raise exception 'Not authorized to edit this organization''s titles';
  end if;
  if not exists (
    select 1 from public.titles t
     where t.id = p_title_id and t.org_id = p_org_id and t.deleted_at is null
  ) then
    raise exception 'Title does not belong to this organization';
  end if;

  update public.titles
     set release_type = p_release_type,
         original_release_date = case when p_release_type = 're_release' then p_original_release_date else null end
   where id = p_title_id;
end;
$$;

revoke execute on function public.set_title_release_info(uuid, uuid, public.release_type, date) from public, anon;
grant  execute on function public.set_title_release_info(uuid, uuid, public.release_type, date) to authenticated;

-- ---- 7. submit_title: never a deleted title; required tier; findings refreshed

create or replace function public.submit_title(p_org_id uuid, p_title_id uuid)
  returns void language plpgsql security definer set search_path = public as $$
declare
  v_data jsonb;
  v_key  text;
  -- REQUIRED tier from src/lib/metadata.ts METADATA_FIELDS — keep in sync.
  v_required text[] := array['synopsis','runtime_minutes','release_year','genre','primary_language','country_of_origin'];
  -- The required tier's values alone: what the delivery gate checks.
  v_required_values jsonb;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if not public.member_can(auth.uid(), p_org_id, 'operate') then
    raise exception 'Not authorized to submit titles for this organization';
  end if;

  -- The metadata writers' title lock: a save in flight finishes first, and
  -- the read below sees what it stored. A title outside p_org_id, or a
  -- soft-deleted one, is refused here, before its record is read, so no
  -- answer depends on it (Bugbot on #799: merge, set and reconcile refuse a
  -- deleted title at the lock too).
  perform 1 from public.titles t
   where t.id = p_title_id and t.org_id = p_org_id and t.deleted_at is null
   for no key update;
  if not found then
    raise exception 'Title not found in this organization, or not in draft';
  end if;

  select data into v_data from public.title_metadata where title_id = p_title_id;
  -- Read as the app and the merge read it (normalize_stored_title_metadata,
  -- section 8; resolved when this runs): a stored empty value, a number
  -- stored as text, a blank list entry or a key outside the registry never
  -- blocks a submit the window shows as complete. The record is not
  -- rewritten here.
  v_data := public.normalize_stored_title_metadata(v_data);
  foreach v_key in array v_required loop
    if v_data is null or coalesce(btrim(v_data->>v_key), '') = '' then
      raise exception 'Cannot submit: required metadata field "%" is missing', v_key;
    end if;
  end loop;
  -- Filled is not enough: a required value the checks refuse (runtime 0 from
  -- before the limits) does not submit (Codex on #801; the app checks first).
  -- Only the required tier is checked, as the app's requiredComplete counts
  -- it: required blocks delivery, the rest feed the health score
  -- (docs/domain-spec.md §12), so a recommended or optional value stored
  -- before the limits (a 201-character Director) never blocks a submit
  -- (Codex on #799). The next save of that title still names it.
  select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb) into v_required_values
    from jsonb_each(v_data) e
   where e.key = any (v_required);
  perform public.check_title_metadata(v_required_values);

  update public.titles
    set status = 'in_review'
    where id = p_title_id and org_id = p_org_id and status = 'draft' and deleted_at is null;
  if not found then
    raise exception 'Title not found in this organization, or not in draft';
  end if;

  perform public.refresh_title_findings(p_org_id, p_title_id);
end;
$$;

revoke execute on function public.submit_title(uuid, uuid) from public, anon;
grant  execute on function public.submit_title(uuid, uuid) to authenticated;

-- ---- 8. The atomic metadata merge (the Metadata window's save) ---------------

-- The stored record as the app reads it (normalizeStoredMetadata,
-- src/lib/metadata.ts), so a save is never refused over a stored value the
-- window shows as fine: empty values are dropped, a number stored as text
-- reads as that number, blank list entries are dropped, keys outside the
-- registry are left out. Anything else stays as stored, and the check names
-- its field. Known differences from JS Number(), both refused by the check
-- with the same field line: hex, binary or octal text stays text (JS reads
-- it as a number), and an exponent from 309 to 999 becomes a number (JS
-- keeps the text). The shared fixtures in
-- supabase/tests/title_metadata_merge_test.sql pin both sides. Internal: no
-- client role may execute it; merge_title_metadata and submit_title (both
-- definers) call it.
create or replace function public.normalize_stored_title_metadata(p_data jsonb)
  returns jsonb
  language plpgsql immutable
  set search_path = public
as $$
declare
  -- METADATA_FIELDS (src/lib/metadata.ts), in order.
  c_keys    constant text[] := array['synopsis','runtime_minutes','release_year','genre','primary_language',
    'country_of_origin','director','cast','rating','keywords','alternate_title','production_company'];
  -- The registry's type "number" keys and type "list" keys.
  c_numbers constant text[] := array['runtime_minutes','release_year'];
  c_lists   constant text[] := array['cast','keywords'];
  -- JS String.prototype.trim's set (WhiteSpace and LineTerminator), so a
  -- no-break space or a byte-order mark trims as it does in the app.
  c_ws      constant text := '[\u0009-\u000d\u0020\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]';
  c_trim    constant text := '^' || c_ws || '+|' || c_ws || '+$';
  -- Decimal text JS Number() reads as finite. The exponent is capped at three
  -- digits and the text at 400 characters, so the cast below cannot overflow.
  c_number  constant text := '^[+-]?([0-9]+\.?[0-9]*|\.[0-9]+)([eE][+-]?[0-9]{1,3})?$';
  v_out   jsonb := '{}'::jsonb;
  v_key   text;
  v_value jsonb;
  v_list  jsonb;
  v_text  text;
  v_n     numeric;
begin
  if jsonb_typeof(p_data) is distinct from 'object' then
    return v_out;
  end if;
  foreach v_key in array c_keys loop
    v_value := p_data -> v_key;
    -- isEmpty(): absent, null, "" or [].
    continue when v_value is null or v_value in ('null'::jsonb, '""'::jsonb, '[]'::jsonb);
    if v_key = any (c_numbers) and jsonb_typeof(v_value) = 'string' then
      v_text := regexp_replace(v_value #>> '{}', c_trim, '', 'g');
      if char_length(v_text) <= 400 and v_text ~ c_number then
        v_n := v_text::numeric;
        v_value := to_jsonb(case when v_n = trunc(v_n) then trunc(v_n) else v_n end);
      end if;
    elsif v_key = any (c_lists) and jsonb_typeof(v_value) = 'array' then
      select coalesce(jsonb_agg(x.v order by x.i), '[]'::jsonb) into v_list
        from jsonb_array_elements(v_value) with ordinality as x(v, i)
       where not (jsonb_typeof(x.v) = 'string' and regexp_replace(x.v #>> '{}', c_trim, '', 'g') = '');
      continue when v_list = '[]'::jsonb;
      v_value := v_list;
    end if;
    v_out := v_out || jsonb_build_object(v_key, v_value);
  end loop;
  return v_out;
end;
$$;

revoke execute on function public.normalize_stored_title_metadata(jsonb) from public, anon, authenticated, service_role;

-- The Metadata window's save: the changed fields (p_set) and the cleared ones
-- (p_clear), merged onto the stored record in one transaction. Set applies
-- first, then clear, so a key in both ends up cleared; an unknown key in
-- p_clear is ignored. Same-field edits stay last-writer-wins, and a list is
-- replaced whole.
--
-- Lock order for every metadata writer and every caller of the findings
-- refresh (this, set_title_metadata, submit_title, reconcile_title_findings):
-- the title row (FOR NO KEY UPDATE), then the title_metadata row, then
-- findings. NO KEY UPDATE, not SHARE: two merges never share the
-- row and then upgrade (no deadlock), and the KEY SHARE lock a title_metadata
-- insert takes for its foreign key is still allowed. A delete that commits
-- first is re-checked under the lock and refused.
--
-- The write goes through the table, so audit_title_metadata (tg_audit)
-- appends exactly one row per real write with the caller as actor. An
-- unchanged record writes nothing: no audit row, no findings refresh
-- (refresh_title_findings rewrites derived_at on every call). A failed
-- refresh fails the save.
create or replace function public.merge_title_metadata(
  p_org_id uuid, p_title_id uuid, p_set jsonb, p_clear text[]
) returns void
  language plpgsql security definer
  set search_path = public
as $$
declare
  v_set     jsonb  := coalesce(p_set, '{}'::jsonb);
  v_clear   text[] := coalesce(p_clear, '{}'::text[]);
  v_current jsonb;
  v_merged  jsonb;
  v_rows    int;
  v_wrote   boolean := false;
begin
  -- set_title_metadata's gate.
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if not public.member_can(auth.uid(), p_org_id, 'operate') then
    raise exception 'Not authorized to edit metadata for this organization';
  end if;
  if jsonb_typeof(v_set) <> 'object' then
    raise exception 'p_set must be a JSON object' using errcode = '22023';
  end if;

  -- One metadata writer per title. A spoofed p_org_id matches no row, so
  -- nothing is locked outside an org the caller may operate.
  perform 1 from public.titles t
   where t.id = p_title_id and t.org_id = p_org_id and t.deleted_at is null
   for no key update;
  if not found then
    raise exception 'Title does not belong to this organization';
  end if;

  select m.data into v_current
    from public.title_metadata m
   where m.title_id = p_title_id
   for update;
  if not found then
    v_merged := public.check_title_metadata(v_set - v_clear);
    -- An empty first record is never stored.
    if v_merged <> '{}'::jsonb then
      insert into public.title_metadata (title_id, org_id, data)
        values (p_title_id, p_org_id, v_merged)
      on conflict (title_id) do nothing;
      get diagnostics v_rows = row_count;
      if v_rows = 1 then
        v_wrote := true;
      else
        -- A writer without the title lock got there first: merge onto it.
        select m.data into v_current
          from public.title_metadata m
         where m.title_id = p_title_id
         for update;
        if not found then
          raise exception 'Could not save metadata';
        end if;
      end if;
    end if;
  end if;

  if v_current is not null then
    v_merged := public.check_title_metadata(
      (public.normalize_stored_title_metadata(v_current) || v_set) - v_clear);
    if v_merged is distinct from v_current then
      update public.title_metadata
         set data = v_merged, updated_at = now()
       where title_id = p_title_id;
      v_wrote := true;
    end if;
  end if;

  if v_wrote then
    perform public.refresh_title_findings(p_org_id, p_title_id);
  end if;
end;
$$;

revoke execute on function public.merge_title_metadata(uuid, uuid, jsonb, text[]) from public, anon;
grant  execute on function public.merge_title_metadata(uuid, uuid, jsonb, text[]) to authenticated;

-- ---- 9. One pass over every live title's findings (Codex on #799) -----------
-- Replacing reconcile_title_findings protects new calls only. Findings an
-- earlier caller forged (a '[]' that resolved every validator finding, a
-- made-up message) would stay until that title is next saved, submitted or
-- reconciled. refresh_live_title_findings re-derives every live title's
-- validator findings from its stored metadata through refresh_title_findings,
-- under each title's lock (the writers' order: title, then findings), and
-- returns how many titles it refreshed. It runs once, below, when this
-- migration is applied. It is idempotent: a second pass over an unchanged
-- record changes no finding. Only validator rows change, by upsert or by status
-- (resolved): nothing is deleted, and AI findings, a deleted title's findings
-- and the metadata itself are untouched. No client role may call it.

create or replace function public.refresh_live_title_findings()
  returns integer
  language plpgsql security definer
  set search_path = public
as $$
declare
  r       record;
  v_count integer := 0;
begin
  for r in
    select t.id, t.org_id
      from public.titles t
     where t.deleted_at is null
     order by t.id
       for no key update
  loop
    perform public.refresh_title_findings(r.org_id, r.id);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke execute on function public.refresh_live_title_findings() from public, anon, authenticated;

do $$
begin
  perform public.refresh_live_title_findings();
end;
$$;

-- ---- 10. The final pass, after the commit (founder-run; Codex on #799) ------
-- A reconcile call that began on the old body before this migration
-- committed keeps that body until its transaction ends, and the old body
-- takes no title lock: it could write after the pass above, or wait on a
-- later pass's row locks and write after it. finish_title_findings_repair
-- drains first: it waits until every other client transaction that began
-- before it was called has ended, and only then runs the pass, so no old body
-- is left to write after it. A call made after the commit runs the new body
-- (PL/pgSQL rechecks the function at each call). It refuses, writing
-- nothing, when the caller cannot see other sessions' transactions, or when
-- they have not drained within p_max_wait_seconds. The founder runs it once,
-- in its own transaction, after the migration has committed. No client role
-- may call it.

create or replace function public.finish_title_findings_repair(p_max_wait_seconds integer default 120)
  returns integer
  language plpgsql
  set search_path = public
as $$
declare
  v_since timestamptz := clock_timestamp();
  v_open  integer;
  v_waited integer := 0;
begin
  if not (coalesce((select r.rolsuper from pg_roles r where r.rolname = current_user), false)
          or pg_has_role(current_user, 'pg_read_all_stats', 'member')) then
    raise exception 'Cannot see other sessions: run as a role with pg_read_all_stats';
  end if;
  loop
    select count(*) into v_open
      from pg_stat_activity a
     where a.backend_type = 'client backend'
       and a.pid <> pg_backend_pid()
       and a.xact_start < v_since;
    exit when v_open = 0;
    if v_waited >= greatest(coalesce(p_max_wait_seconds, 0), 0) then
      raise exception '% transaction(s) from before this call are still open; nothing was refreshed', v_open;
    end if;
    perform pg_sleep(1);
    v_waited := v_waited + 1;
  end loop;
  return public.refresh_live_title_findings();
end;
$$;

revoke execute on function public.finish_title_findings_repair(integer) from public, anon, authenticated;
