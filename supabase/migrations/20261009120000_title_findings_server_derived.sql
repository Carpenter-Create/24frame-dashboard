-- ============================================================================
-- 20261009120000_title_findings_server_derived.sql
--
-- DRAFT FOR FOUNDER REVIEW — NOT APPLIED. Adam authorized drafting only
-- (2026-10-09, "Yes, draft for review"); applying it is founder-executed.
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
--      50. A cleared (null) field is dropped. It refreshes findings in the
--      same transaction, so findings always match what was stored.
--   3. A soft-deleted title (deleted_at set) can no longer be written through
--      set_title_metadata, set_title_release_info, reconcile_title_findings
--      or submit_title.
--
-- DESTRUCTIVE OPS (approved before apply): create or replace 4 existing
-- functions (reconcile_title_findings, set_title_metadata,
-- set_title_release_info, submit_title); create 4 new functions (2 pure
-- helpers, 1 internal refresh, 1 metadata check); revoke/grant execute. No
-- table, column, policy, trigger or data change. Existing stored metadata is
-- not rewritten or re-validated; the next save of a title is checked.
--
-- ROLLBACK: re-apply the previous bodies from 20260718000700_title_metadata.sql
-- (set_title_metadata), 20260721000200_release_dates.sql (set_title_release_info),
-- 20260719000700_export_and_submit_gate.sql (submit_title) and
-- 20260727000100_gc_role_separation.sql (reconcile_title_findings); drop the
-- four new functions.
--
-- KEEP IN SYNC with src/lib/metadata.ts (METADATA_FIELDS, GENRES, RATINGS,
-- computeMetadataFindings, METADATA_LOGIC_VERSION) and the limits there.
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
  v_max_year int := extract(year from now())::int + 5;
begin
  if jsonb_typeof(v_data) <> 'object' then
    raise exception 'Metadata must be an object' using errcode = '22023';
  end if;
  if octet_length(v_data::text) > 65536 then
    raise exception 'Metadata is too large' using errcode = '22023';
  end if;

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
        -- ISO 639-1 (the app checks the exact list).
        if jsonb_typeof(v_val) <> 'string' or (v_val #>> '{}') !~ '^[a-z]{2}$' then
          raise exception 'primary_language: a two-letter language code' using errcode = '22023';
        end if;

      when 'country_of_origin' then
        -- ISO 3166-1 alpha-2 (the app checks the exact list).
        if jsonb_typeof(v_val) <> 'string' or (v_val #>> '{}') !~ '^[A-Z]{2}$' then
          raise exception 'country_of_origin: a two-letter country code' using errcode = '22023';
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

  v_findings := public.title_metadata_findings(v_data);
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

-- ---- 4. reconcile_title_findings: same signature, payload ignored ------------

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
  if not exists (
    select 1 from public.titles t
     where t.id = p_title_id and t.org_id = p_org_id and t.deleted_at is null
  ) then
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

-- ---- 7. submit_title: never a deleted title; findings refreshed --------------

create or replace function public.submit_title(p_org_id uuid, p_title_id uuid)
  returns void language plpgsql security definer set search_path = public as $$
declare
  v_data jsonb;
  v_key  text;
  -- REQUIRED tier from src/lib/metadata.ts METADATA_FIELDS — keep in sync.
  v_required text[] := array['synopsis','runtime_minutes','release_year','genre','primary_language','country_of_origin'];
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if not public.member_can(auth.uid(), p_org_id, 'operate') then
    raise exception 'Not authorized to submit titles for this organization';
  end if;

  select data into v_data from public.title_metadata where title_id = p_title_id;
  foreach v_key in array v_required loop
    if v_data is null or coalesce(btrim(v_data->>v_key), '') = '' then
      raise exception 'Cannot submit: required metadata field "%" is missing', v_key;
    end if;
  end loop;

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
