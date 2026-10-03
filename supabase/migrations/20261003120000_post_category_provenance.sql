-- ============================================================================
-- 20261003120000_post_category_provenance.sql
--
-- INTENT: Record where a post's topic came from. Founder decisions
-- (2026-10-03): 24Frame AI assigns a post's topic automatically in the
-- background; store whether the topic came from the author or the AI, the
-- AI's confidence, the classifier version, and when the AI looked at the
-- post. Founder approved this exact SQL.
--
-- posts.category itself is unchanged: one of the 15 locked labels, or null.
--
--   category_source         'author' | 'ai'; null when no topic was recorded
--   category_confidence     0..1, AI picks only
--   category_logic_version  classifier version (model + prompt), AI picks only
--   category_tagged_at      when the AI classified the post, set even when it
--                           chose no topic, so the background job never
--                           re-classifies the same post
--
-- Only service_role may set a topic or these columns, at insert or after
-- (the background tagger runs with the server key; founder-approved
-- exception to the user-JWT rule for 24Frame AI, recorded in
-- docs/domain-spec.md section 20). Nobody picks a topic (Adam lock), so a
-- client insert carries no topic and no provenance. After insert,
-- protect_post_author_mutation already locks category itself. An author's
-- caption edit clears an AI topic and its look, so the post is re-tagged.
--
-- DESTRUCTIVE OPS (draft only; do NOT apply to production from this PR):
-- ALTER TABLE public.posts ADD COLUMN x4 (nullable, no default, so no row
-- rewrite), ADD CONSTRAINT x2 (validates existing rows, all of which have
-- null provenance), CREATE INDEX, CREATE FUNCTION, CREATE TRIGGER (before
-- insert or update), REVOKE EXECUTE. No UPDATE, DELETE, or DROP. Existing
-- rows keep null provenance.
-- ROLLBACK:
--   drop trigger posts_protect_category_provenance on public.posts;
--   drop function public.protect_post_category_provenance();
--   drop index public.posts_category_untagged_idx;
--   alter table public.posts drop constraint posts_category_ai_tagged_at;
--   alter table public.posts drop constraint posts_category_provenance;
--   alter table public.posts drop column category_tagged_at,
--     drop column category_logic_version, drop column category_confidence,
--     drop column category_source;
-- ============================================================================

alter table public.posts
  add column category_source text,
  add column category_confidence numeric(4,3),
  add column category_logic_version text,
  add column category_tagged_at timestamptz;

alter table public.posts
  add constraint posts_category_provenance check (
    (category_source is null and category_confidence is null
      and category_logic_version is null)
    or (category_source = 'author' and category is not null
      and category_confidence is null and category_logic_version is null)
    or (category_source = 'ai' and category is not null
      and category_confidence is not null
      and category_logic_version is not null
      and category_confidence between 0 and 1
      and length(btrim(category_logic_version)) between 1 and 64)),
  add constraint posts_category_ai_tagged_at check (
    category_source is distinct from 'ai' or category_tagged_at is not null);

create index posts_category_untagged_idx on public.posts (created_at desc)
  where category is null and category_tagged_at is null
    and group_id is null and status = 'active';

create or replace function public.protect_post_category_provenance()
returns trigger language plpgsql
set search_path to 'public', 'extensions' as $$
begin
  if auth.role() = 'service_role' then return new; end if;
  if tg_op = 'INSERT' then
    if new.category is not null
       or new.category_source is not null
       or new.category_confidence is not null
       or new.category_logic_version is not null
       or new.category_tagged_at is not null
    then raise exception 'post fields are not client-writable';
    end if;
    return new;
  end if;
  if new.category_source is distinct from old.category_source
     or new.category_confidence is distinct from old.category_confidence
     or new.category_logic_version is distinct from old.category_logic_version
     or new.category_tagged_at is distinct from old.category_tagged_at
  then raise exception 'post fields are not client-writable';
  end if;
  -- A caption edit reopens tagging (founder decision 2026-10-03): the AI
  -- topic and the look are cleared so the tagger reads the new caption.
  -- An author topic stays. posts_protect_author_mutation fires first (by
  -- name) and has already checked that the client left category alone.
  if new.body is distinct from old.body
     and old.category_source is distinct from 'author' then
    new.category := null;
    new.category_source := null;
    new.category_confidence := null;
    new.category_logic_version := null;
    new.category_tagged_at := null;
  end if;
  return new;
end; $$;

create trigger posts_protect_category_provenance
  before insert or update on public.posts
  for each row execute function public.protect_post_category_provenance();

revoke execute on function public.protect_post_category_provenance()
  from public, anon, authenticated, service_role;
