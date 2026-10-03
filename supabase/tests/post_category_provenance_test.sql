-- post_category_provenance_test.sql
-- posts.category_source / category_confidence / category_logic_version /
-- category_tagged_at. Nobody picks a topic (Adam lock): a client insert
-- carries no topic and no provenance, and after insert only service_role
-- (the background topic tagger) may change them. Shape rules hold on every
-- write. An author's caption edit still works. It clears the look on a post
-- with an AI topic or no topic, so the post is re-tagged; the AI topic stays
-- until the tagger replaces or removes it. An author topic and a topic
-- recorded before provenance existed are never reopened.

begin;
select plan(39);

select set_config('t.author', gen_random_uuid()::text, false);
select set_config('t.post', gen_random_uuid()::text, false);
select set_config('t.post2', gen_random_uuid()::text, false);
select set_config('t.legacy', gen_random_uuid()::text, false);
select set_config('t.declined', gen_random_uuid()::text, false);

insert into auth.users (id) values (current_setting('t.author')::uuid);

select has_column('public', 'posts', 'category_source', 'posts.category_source exists');
select has_column('public', 'posts', 'category_confidence', 'posts.category_confidence exists');
select has_column('public', 'posts', 'category_logic_version', 'posts.category_logic_version exists');
select has_column('public', 'posts', 'category_tagged_at', 'posts.category_tagged_at exists');
select ok(
  exists (
    select 1 from pg_indexes
    where schemaname = 'public' and tablename = 'posts'
      and indexname = 'posts_category_untagged_idx'
  ),
  'untagged-post index exists');
select ok(
  (select indexdef from pg_indexes
   where schemaname = 'public' and indexname = 'posts_category_untagged_idx')
    like '%category_source = ''ai''%',
  'the waiting-post index includes AI-tagged posts reopened by a caption edit');
select ok(
  not has_function_privilege('authenticated', 'public.protect_post_category_provenance()', 'EXECUTE'),
  'authenticated cannot execute the provenance trigger function');

set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('t.author'), 'role', 'authenticated')::text,
  true);

select lives_ok(
  format($sql$
    insert into public.profiles (id, handle, display_name, birth_date)
    values (%L, 'topicauthor', 'Topic Author', (current_date - interval '30 years')::date)
  $sql$, current_setting('t.author')),
  'author profile insert');
select lives_ok(
  format($sql$
    insert into public.posts (id, author_id, body)
    values (%L, %L, 'no topic yet')
  $sql$, current_setting('t.post'), current_setting('t.author')),
  'author inserts a post with no topic and no provenance');

-- A client insert carries no topic and no provenance.
select throws_ok(
  format($sql$
    insert into public.posts (author_id, body, category)
    values (%L, 'picked music', 'Music')
  $sql$, current_setting('t.author')),
  'P0001', 'post fields are not client-writable',
  'an author cannot pick a topic');
select throws_ok(
  format($sql$
    insert into public.posts (author_id, body, category, category_source)
    values (%L, 'picked music as author', 'Music', 'author')
  $sql$, current_setting('t.author')),
  'P0001', 'post fields are not client-writable',
  'an author cannot record an author topic');
select throws_ok(
  format($sql$
    insert into public.posts (author_id, body, category_tagged_at)
    values (%L, 'pre-stamped', now())
  $sql$, current_setting('t.author')),
  'P0001', 'post fields are not client-writable',
  'an author cannot pre-stamp a post to skip tagging');
select throws_ok(
  format($sql$
    insert into public.posts
      (author_id, body, category, category_source, category_confidence,
       category_logic_version, category_tagged_at)
    values (%L, 'forged', 'Music', 'ai', 0.99, 'topics-v1', now())
  $sql$, current_setting('t.author')),
  'P0001', 'post fields are not client-writable',
  'an author cannot forge an AI topic');

select throws_ok(
  format($sql$
    update public.posts set body = 'edit and stamp', category_tagged_at = now() where id = %L
  $sql$, current_setting('t.post')),
  'P0001', 'post fields are not client-writable',
  'a caption edit cannot stamp category_tagged_at');
select lives_ok(
  format($sql$
    update public.posts set body = 'edited caption' where id = %L
  $sql$, current_setting('t.post')),
  'author caption edit still works');

reset role;
set local role service_role;
select set_config('request.jwt.claims',
  json_build_object('role', 'service_role')::text, true);

select lives_ok(
  format($sql$
    insert into public.posts (id, author_id, body, category, category_source)
    values (%L, %L, 'recorded music', 'Music', 'author')
  $sql$, current_setting('t.post2'), current_setting('t.author')),
  'service role may record an author topic');
select lives_ok(
  format($sql$
    insert into public.posts (id, author_id, body, category)
    values (%L, %L, 'older post with a topic', 'Music')
  $sql$, current_setting('t.legacy'), current_setting('t.author')),
  'a topic with no source, as on posts made before provenance');
select lives_ok(
  format($sql$
    insert into public.posts (id, author_id, body, category_tagged_at)
    values (%L, %L, 'looked at, no topic', now())
  $sql$, current_setting('t.declined'), current_setting('t.author')),
  'a look with no confident topic');
select throws_ok(
  format($sql$
    insert into public.posts (author_id, body, category, category_source)
    values (%L, 'ai without anything', 'Music', 'ai')
  $sql$, current_setting('t.author')),
  '23514', null,
  'an AI topic needs a confidence and a version');
select throws_ok(
  format($sql$
    insert into public.posts (author_id, body, category, category_source, category_tagged_at)
    values (%L, 'ai, stamped, no confidence', 'Music', 'ai', now())
  $sql$, current_setting('t.author')),
  '23514', null,
  'an AI topic needs a confidence');
select throws_ok(
  format($sql$
    insert into public.posts
      (author_id, body, category, category_source, category_confidence, category_tagged_at)
    values (%L, 'ai, stamped, no version', 'Music', 'ai', 0.9, now())
  $sql$, current_setting('t.author')),
  '23514', null,
  'an AI topic needs a classifier version');
select throws_ok(
  format($sql$
    insert into public.posts (author_id, body, category_source)
    values (%L, 'author source, no topic', 'author')
  $sql$, current_setting('t.author')),
  '23514', null,
  'an author source needs a topic');
select ok(
  not exists (
    select 1 from pg_constraint
    where conrelid = 'public.posts'::regclass and conname = 'posts_category_ai_tagged_at'
  ),
  'an AI topic may wait for a re-check without category_tagged_at');
select throws_ok(
  format($sql$
    update public.posts
    set category = 'Music', category_source = 'ai', category_confidence = 1.5,
        category_logic_version = 'topics-v1', category_tagged_at = now()
    where id = %L
  $sql$, current_setting('t.post')),
  '23514', null,
  'confidence above 1 is refused');
select throws_ok(
  format($sql$
    update public.posts set category_source = 'robot' where id = %L
  $sql$, current_setting('t.post')),
  '23514', null,
  'an unknown source is refused');
select lives_ok(
  format($sql$
    update public.posts set category_tagged_at = now() where id = %L
  $sql$, current_setting('t.post')),
  'service role records a look with no confident topic');
select lives_ok(
  format($sql$
    update public.posts
    set category = 'Music', category_source = 'ai', category_confidence = 0.912,
        category_logic_version = 'topics-v1:claude-sonnet-5-5', category_tagged_at = now()
    where id = %L
  $sql$, current_setting('t.post')),
  'service role writes an AI topic');
select results_eq(
  format($sql$
    select category, category_source, category_confidence::text
    from public.posts where id = %L
  $sql$, current_setting('t.post')),
  $$ values ('Music'::text, 'ai'::text, '0.912'::text) $$,
  'the AI topic and confidence are stored');

reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('t.author'), 'role', 'authenticated')::text,
  true);

select throws_ok(
  format($sql$
    update public.posts set body = 'edit and clear', category_source = null where id = %L
  $sql$, current_setting('t.post2')),
  'P0001', 'post fields are not client-writable',
  'a caption edit cannot clear category_source');

-- A caption edit reopens tagging: the look is cleared, the AI topic stays.
select lives_ok(
  format($sql$
    update public.posts set body = 'a new subject entirely' where id = %L
  $sql$, current_setting('t.post')),
  'author edits the caption of an AI-tagged post');
select results_eq(
  format($sql$
    select category, category_source, category_confidence::text,
           category_logic_version, category_tagged_at
    from public.posts where id = %L
  $sql$, current_setting('t.post')),
  $$ values ('Music'::text, 'ai'::text, '0.912'::text,
            'topics-v1:claude-sonnet-5-5'::text, null::timestamptz) $$,
  'a caption edit clears only the look; the AI topic stays until the re-tag');
select lives_ok(
  format($sql$
    update public.posts set body = 'recorded music, new words' where id = %L
  $sql$, current_setting('t.post2')),
  'author edits the caption of a post with an author topic');
select results_eq(
  format($sql$
    select category, category_source from public.posts where id = %L
  $sql$, current_setting('t.post2')),
  $$ values ('Music'::text, 'author'::text) $$,
  'an author topic stays after a caption edit');
select lives_ok(
  format($sql$
    update public.posts set body = 'older post, new words' where id = %L
  $sql$, current_setting('t.legacy')),
  'author edits the caption of an older post with a topic');
select results_eq(
  format($sql$
    select category, category_source from public.posts where id = %L
  $sql$, current_setting('t.legacy')),
  $$ values ('Music'::text, null::text) $$,
  'a topic recorded before provenance stays after a caption edit');
select lives_ok(
  format($sql$
    update public.posts set body = 'looked at, new words' where id = %L
  $sql$, current_setting('t.declined')),
  'author edits the caption of a post the AI left without a topic');
select results_eq(
  format($sql$
    select category, category_tagged_at from public.posts where id = %L
  $sql$, current_setting('t.declined')),
  $$ values (null::text, null::timestamptz) $$,
  'a caption edit clears a look with no topic, so the post is re-tagged');

-- The re-tag replaces the waiting AI topic in one write, or removes it.
reset role;
set local role service_role;
select set_config('request.jwt.claims',
  json_build_object('role', 'service_role')::text, true);

select lives_ok(
  format($sql$
    update public.posts
    set category = 'Directors', category_source = 'ai', category_confidence = 0.85,
        category_logic_version = 'topics-v1:claude-sonnet-5-5', category_tagged_at = now()
    where id = %L and category_tagged_at is null
  $sql$, current_setting('t.post')),
  'the tagger replaces the AI topic of a reopened post');
select results_eq(
  format($sql$
    select category, category_tagged_at is not null
    from public.posts where id = %L
  $sql$, current_setting('t.post')),
  $$ values ('Directors'::text, true) $$,
  'the new AI topic and its look are stored');

select * from finish();
rollback;
