-- social_media_author_bound_test.sql
-- Remediation class 3. posts.media / stories.media keys must be
-- author-bound (Mapping C: profiles.id). Foreign author keys cannot
-- persist. No org_id. Do not apply the companion migration to prod here.

begin;
select plan(20);

select set_config('t.author', gen_random_uuid()::text, false);
select set_config('t.other',  gen_random_uuid()::text, false);
select set_config('t.object', gen_random_uuid()::text, false);

insert into auth.users (id) values
  (current_setting('t.author')::uuid),
  (current_setting('t.other')::uuid);

select ok(
  to_regprocedure('public.social_media_keys_owned(jsonb, uuid, text)') is not null,
  'social_media_keys_owned exists');
select ok(
  exists (
    select 1 from pg_constraint
    where conname = 'posts_media_author_bound'
      and conrelid = 'public.posts'::regclass
  ),
  'posts_media_author_bound exists');
select ok(
  exists (
    select 1 from pg_constraint
    where conname = 'stories_media_author_bound'
      and conrelid = 'public.stories'::regclass
  ),
  'stories_media_author_bound exists');
select ok(
  not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name in ('posts', 'stories')
      and column_name = 'org_id'
  ),
  'posts/stories have no org_id');

select ok(
  public.social_media_keys_owned(
    jsonb_build_array(
      jsonb_build_object(
        'kind', 'image',
        'key', 'posts/' || current_setting('t.author') || '/'
          || current_setting('t.object') || '.jpg',
        'contentType', 'image/jpeg'
      )
    ),
    current_setting('t.author')::uuid,
    'posts'
  ),
  'owned posts key is accepted');
select ok(
  not public.social_media_keys_owned(
    jsonb_build_array(
      jsonb_build_object(
        'kind', 'image',
        'key', 'posts/' || current_setting('t.other') || '/'
          || current_setting('t.object') || '.jpg',
        'contentType', 'image/jpeg'
      )
    ),
    current_setting('t.author')::uuid,
    'posts'
  ),
  'foreign posts key is rejected');
select ok(
  public.social_media_keys_owned('[]'::jsonb, current_setting('t.author')::uuid, 'posts'),
  'empty posts media is accepted');
select ok(
  not public.social_media_keys_owned(
    jsonb_build_array(
      jsonb_build_object(
        'kind', 'image',
        'key', 'stories/' || current_setting('t.author') || '/'
          || current_setting('t.object') || '.jpg',
        'contentType', 'image/jpeg'
      )
    ),
    current_setting('t.author')::uuid,
    'posts'
  ),
  'stories key is rejected on the posts lane');
select ok(
  public.social_media_keys_owned(
    jsonb_build_array(
      jsonb_build_object(
        'kind', 'image',
        'key', 'stories/' || current_setting('t.author') || '/'
          || current_setting('t.object') || '.jpg',
        'contentType', 'image/jpeg'
      )
    ),
    current_setting('t.author')::uuid,
    'stories'
  ),
  'owned stories key is accepted');
select ok(
  not public.social_media_keys_owned(
    jsonb_build_array(
      jsonb_build_object(
        'kind', 'image',
        'key', 'stories/' || current_setting('t.other') || '/'
          || current_setting('t.object') || '.jpg',
        'contentType', 'image/jpeg'
      )
    ),
    current_setting('t.author')::uuid,
    'stories'
  ),
  'foreign stories key is rejected');

-- Browser upload keys (<lane>/upload/<author>/<object>) are copy sources
-- only. Rows hold the server's published copy, never an upload key.
select ok(
  not public.social_media_keys_owned(
    jsonb_build_array(
      jsonb_build_object(
        'kind', 'image',
        'key', 'posts/upload/' || current_setting('t.author') || '/'
          || current_setting('t.object') || '.jpg',
        'contentType', 'image/jpeg'
      )
    ),
    current_setting('t.author')::uuid,
    'posts'
  ),
  'own posts upload key is rejected');
select ok(
  not public.social_media_keys_owned(
    jsonb_build_array(
      jsonb_build_object(
        'kind', 'image',
        'key', 'stories/upload/' || current_setting('t.author') || '/'
          || current_setting('t.object') || '.jpg',
        'contentType', 'image/jpeg'
      )
    ),
    current_setting('t.author')::uuid,
    'stories'
  ),
  'own stories upload key is rejected');

insert into public.profiles (id, handle, display_name)
values
  (current_setting('t.author')::uuid, 'mediaauthor', 'Media Author'),
  (current_setting('t.other')::uuid, 'mediaother', 'Media Other');

set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('t.author'), 'role', 'authenticated')::text,
  true);

select lives_ok(
  format(
    $sql$
      insert into public.posts (author_id, body, media)
      values (
        %L,
        'owned media',
        jsonb_build_array(
          jsonb_build_object(
            'kind', 'image',
            'key', 'posts/' || %L || '/' || %L || '.jpg',
            'contentType', 'image/jpeg'
          )
        )
      )
    $sql$,
    current_setting('t.author'),
    current_setting('t.author'),
    current_setting('t.object')
  ),
  'author can persist an owned posts media key');

select throws_ok(
  format(
    $sql$
      insert into public.posts (author_id, body, media)
      values (
        %L,
        'stolen media',
        jsonb_build_array(
          jsonb_build_object(
            'kind', 'image',
            'key', 'posts/' || %L || '/' || %L || '.jpg',
            'contentType', 'image/jpeg'
          )
        )
      )
    $sql$,
    current_setting('t.author'),
    current_setting('t.other'),
    current_setting('t.object')
  ),
  '23514',
  null,
  'author cannot persist another author posts media key');

select lives_ok(
  format(
    $sql$
      insert into public.stories (author_id, body, media)
      values (
        %L,
        'owned story',
        jsonb_build_array(
          jsonb_build_object(
            'kind', 'image',
            'key', 'stories/' || %L || '/' || %L || '.jpg',
            'contentType', 'image/jpeg'
          )
        )
      )
    $sql$,
    current_setting('t.author'),
    current_setting('t.author'),
    current_setting('t.object')
  ),
  'author can persist an owned stories media key');

select throws_ok(
  format(
    $sql$
      insert into public.stories (author_id, body, media)
      values (
        %L,
        'stolen story',
        jsonb_build_array(
          jsonb_build_object(
            'kind', 'image',
            'key', 'stories/' || %L || '/' || %L || '.jpg',
            'contentType', 'image/jpeg'
          )
        )
      )
    $sql$,
    current_setting('t.author'),
    current_setting('t.other'),
    current_setting('t.object')
  ),
  '23514',
  null,
  'author cannot persist another author stories media key');

select set_config('t.post',
  (select id::text from public.posts where body = 'owned media' limit 1),
  true);

select throws_ok(
  format(
    $sql$
      update public.posts
         set media = jsonb_build_array(
           jsonb_build_object(
             'kind', 'image',
             'key', 'posts/' || %L || '/' || %L || '.jpg',
             'contentType', 'image/jpeg'
           )
         )
       where id = %L::uuid
    $sql$,
    current_setting('t.other'),
    current_setting('t.object'),
    current_setting('t.post')
  ),
  '23514',
  null,
  'author cannot attach a foreign posts media key on update');

reset role;
set local role service_role;
select set_config('request.jwt.claims',
  json_build_object('role', 'service_role')::text, true);

select throws_ok(
  format(
    $sql$
      insert into public.posts (author_id, body, media)
      values (
        %L,
        'service stolen',
        jsonb_build_array(
          jsonb_build_object(
            'kind', 'image',
            'key', 'posts/' || %L || '/' || %L || '.jpg',
            'contentType', 'image/jpeg'
          )
        )
      )
    $sql$,
    current_setting('t.author'),
    current_setting('t.other'),
    current_setting('t.object')
  ),
  '23514',
  null,
  'service_role cannot persist a foreign posts media key');

select lives_ok(
  format(
    $sql$
      insert into public.posts (author_id, body)
      values (%L, 'text only')
    $sql$,
    current_setting('t.author')
  ),
  'text-only posts still insert');

reset role;

select ok(
  not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public'
      and table_name in ('posts', 'stories')
      and constraint_type = 'FOREIGN KEY'
      and constraint_name ilike '%organization%'
  ),
  'posts/stories have no organizations FK');

select * from finish();
rollback;
