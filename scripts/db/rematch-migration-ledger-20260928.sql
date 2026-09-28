-- ============================================================================
-- Rematch prod schema_migrations.version to repo filename prefixes.
--
-- READ THIS WITH docs/scheduled/migration-ledger-rematch.md
--
-- What this does
--   Updates 38 ledger versions from the MCP apply-time timestamp to the
--   hand-named prefix of the repo file with the same name. Statements,
--   name, created_by, idempotency_key, and rollback are left as they are.
--   Deletes 2 duplicate rows whose SQL is an alias of a row that is kept:
--     20260924124157 like_target_story_item  (the one-line ADD VALUE)
--     20260924124241 story_item_likes        (same body plus a trailing newline)
--
-- What this refuses to do
--   It does not insert a version for a file that was not applied.
--   It does not delete the six account_invites_* rows. Those are split
--   applies, not aliases of 20260919130000_account_invites.sql.
--   It does not run migration SQL. It does not call db push.
--
-- Who runs it
--   Adam, in the Supabase SQL editor for project 24Frame
--   (ref uevsculwzwlhxeamagwg), as postgres or another role that can
--   UPDATE supabase_migrations.schema_migrations.
--   drift_reader cannot. This script raises if current_user is drift_reader.
--
-- Idempotent. A second run sees the target versions and does nothing.
-- Same SQL-editor session: DROP TABLE IF EXISTS rematch before CREATE, so a
-- re-paste does not collide with the temp table left by the previous commit.
-- One transaction. Any guard failure rolls the whole script back.
-- ============================================================================

begin;

do $$
begin
  if current_user = 'drift_reader' then
    raise exception 'drift_reader cannot write the ledger. Run as postgres in the 24Frame SQL editor.';
  end if;
end $$;

drop table if exists rematch;

create temp table rematch (
  from_version text primary key,
  to_version text not null unique,
  expected_name text not null,
  -- md5 after removing full-line '--' comments, including indented
  -- comment lines, then all whitespace. Stored as the literal prefix
  -- 'md5:' plus 32 hex digits so a bare digest is not a generic-api-key
  -- shape. The compare below strips that prefix. Same normalization as
  -- the test, which recomputes the hex from the repo file.
  expected_md5 text not null
);

insert into rematch (from_version, to_version, expected_name, expected_md5) values
  ('20260912032826', '20260912000100', 'rename_ask_globee_ai_conversation_tables', 'md5:bd2c4716a4c872ceb49453a2024079c5'),
  ('20260912034413', '20260912033234', 'identity_spine', 'md5:db4a12dc0ee0925bc4d2653fef4ba151'),
  ('20260912040353', '20260912120000', 'groups_posts', 'md5:9d8154863c7bca81217b1882e9d8709b'),
  ('20260912044030', '20260912180000', 'likes', 'md5:af8e9d4ce853bb4a372ec1260ea77464'),
  ('20260912050532', '20260912200000', 'direct_messages', 'md5:7e62060e7f85aa297490c42c53eecabf'),
  ('20260912155643', '20260912220000', 'leaderboards', 'md5:0d7c56231349cfe0f4543e167d81a399'),
  ('20260912164653', '20260912230000', 'group_dms', 'md5:1e93c2f5d3e0f10c7ef6fa5d1980ca40'),
  ('20260912170303', '20260912240000', 'courses', 'md5:4eb1573974748379e9f0cb496ed49fe9'),
  ('20260913125400', '20260913120000', 'dashboard_sign_in_requests', 'md5:5743b3c9f027ced56e99ac04995287d9'),
  ('20260913215055', '20260913130000', 'finance_ops_slice_1', 'md5:000281573df940e29767c4c8d3b8e1b9'),
  ('20260913225857', '20260913220000', 'finance_ops_slice_2_suspense', 'md5:8422b6817e5a940684c7439bc616ede5'),
  ('20260913225947', '20260913230000', 'finance_ops_slice_2_aws_spine', 'md5:aa240f4bee84b4b9a1cc68361fca82ac'),
  ('20260914025648', '20260914120000', 'social_home_stories', 'md5:d939d7637df4054e2aa9a2fc297455a4'),
  ('20260914035946', '20260914180000', 'profiles_birth_date_nullable', 'md5:642f985ccb07e9b1f505bc0e1e8a358d'),
  ('20260914040743', '20260914190000', 'social_group_delete_no_cascade_posts', 'md5:8cd4ee9b1bbbfaf72d0f56367c8eee03'),
  ('20260914044320', '20260914200000', 'social_media_author_bound', 'md5:13b603e41c8b265030292a3f82adb820'),
  ('20260914050541', '20260914310000', 'bound_my_rpcs', 'md5:a69c37bc087b4126514c863c8d820c98'),
  ('20260914052332', '20260914210000', 'profiles_select_active_public', 'md5:79ae960068704f412d8f0d072eb3a645'),
  ('20260914060027', '20260914420000', 'dm_fanout_caps', 'md5:ba40544130bd938fe71b6ee985654931'),
  ('20260916014642', '20260916010000', 'course_education_media', 'md5:36103f012af6d04e34d696e57dd158ed'),
  ('20260916024716', '20260916020000', 'education_catalog', 'md5:93b69fd10c40450f35ee8949ddd24e82'),
  ('20260917184318', '20260917120000', 'title_status_archived', 'md5:6a6f3e02fd4c53f7d340055669edcddf'),
  ('20260917184347', '20260917120100', 'titles_delete_archive', 'md5:9e3f418f69c32db61f43f79fadcffd7f'),
  ('20260918000638', '20260917120200', 'title_delete_s3_purge', 'md5:e6dadd51d8ecc822eed6aa6f003422e5'),
  ('20260918005107', '20260918120000', 'gc_title_status_override', 'md5:be65f6da17e690229783d7e5fde94c63'),
  ('20260919203022', '20260919201500', 'update_legal_entity', 'md5:cf86d7d92c110e31eaab9ed7fd77fdee'),
  ('20260920152729', '20260920140200', 'profile_welcome_video', 'md5:e3a134c1dd78ac18b6cc1caeae9364b7'),
  ('20260920152755', '20260920150000', 'profile_topics', 'md5:00614fab9b0649d136f36f151f75cd64'),
  ('20260920163318', '20260920140000', 'notification_kind_new_follower', 'md5:cf31ddcbe1732f5a4046781ae56c4c99'),
  ('20260920170717', '20260919120000', 'user_notification_preferences', 'md5:de95f4cff92d76e96fd64b489c2f469f'),
  ('20260920170750', '20260920140100', 'social_follow_alerts', 'md5:547d5b6fc2dea0fc76f522a16d6db92d'),
  ('20260921113132', '20260921120000', 'profile_cover_key', 'md5:e26e46d44f3709dd35fa69b78916b34f'),
  ('20260924030404', '20260924000100', 'portal_claim_otp_attempt', 'md5:c50b5d418a7cdfb5694e3aa9617bdcee'),
  ('20260924124221', '20260924120000', 'like_target_story_item', 'md5:5c9d23e5533895845dcb79ab9584dff2'),
  ('20260924124222', '20260924120100', 'story_item_likes', 'md5:2ceae500302fbbfc4015b68e6ad9ba3a'),
  ('20260924152453', '20260924140000', 'story_send_self_dm', 'md5:84623fba2a6114b437dbc84accfd03b5'),
  ('20260924162806', '20260924190000', 'dm_membership_sealed', 'md5:5fe8b853480f86f97e438738016fd218'),
  ('20260926050031', '20260926120000', 'social_post_author_edit', 'md5:aa12e1655fe36bec0e144bdb013a673a');

-- Drop alias rows before the version update, so a keeper is never asked
-- to occupy a version that a duplicate still holds. None of these targets
-- collide with each other; this order is for the duplicate pair only.
do $$
declare
  keeper text;
  extra text;
begin
  select statements[1] into extra
    from supabase_migrations.schema_migrations
   where version = '20260924124157'
   limit 1;

  if extra is not null then
    if extra is distinct from 'alter type public.like_target add value if not exists ''story_item'';' then
      raise exception '20260924124157 is not the one-line like_target alias; refusing to delete it';
    end if;
    if not exists (
      select 1 from supabase_migrations.schema_migrations
       where version in ('20260924124221', '20260924120000')
         and name = 'like_target_story_item'
    ) then
      raise exception 'like_target_story_item keeper missing; refusing to delete 20260924124157';
    end if;
    delete from supabase_migrations.schema_migrations where version = '20260924124157';
  end if;

  -- Both the MCP version and the filename version can match after a
  -- partial re-run. ORDER BY version picks the lower prefix so the
  -- choice is stable. LIMIT 1 keeps SELECT INTO from raising.
  select statements[1] into keeper
    from supabase_migrations.schema_migrations
   where version in ('20260924124222', '20260924120100')
     and name = 'story_item_likes'
   order by version
   limit 1;

  select statements[1] into extra
    from supabase_migrations.schema_migrations
   where version = '20260924124241'
   limit 1;

  if extra is not null then
    if keeper is null then
      raise exception 'story_item_likes keeper missing; refusing to delete 20260924124241';
    end if;
    if rtrim(extra, E'\n') is distinct from rtrim(keeper, E'\n') then
      raise exception '20260924124241 is not a trailing-newline alias of story_item_likes; refusing to delete it';
    end if;
    delete from supabase_migrations.schema_migrations where version = '20260924124241';
  end if;
end $$;

do $$
declare
  r record;
  n_from int;
  n_to int;
  got_name text;
  got_md5 text;
begin
  for r in select * from rematch order by from_version loop
    select count(*) into n_from
      from supabase_migrations.schema_migrations
     where version = r.from_version;
    select count(*) into n_to
      from supabase_migrations.schema_migrations
     where version = r.to_version;

    if n_from = 1 and n_to = 0 then
      select name,
             md5(regexp_replace(regexp_replace(statements[1], '^\s*--.*$', '', 'gn'), '\s+', '', 'g'))
        into got_name, got_md5
        from supabase_migrations.schema_migrations
       where version = r.from_version
       limit 1;

      if got_name is distinct from r.expected_name then
        raise exception 'refusing rematch % -> %: name is %, expected %',
          r.from_version, r.to_version, got_name, r.expected_name;
      end if;
      if r.expected_md5 !~ '^md5:[0-9a-f]{32}$' then
        raise exception 'rematch % expected_md5 must be md5:<32 hex>, got %',
          r.from_version, r.expected_md5;
      end if;
      if got_md5 is distinct from regexp_replace(r.expected_md5, '^md5:', '') then
        raise exception 'refusing rematch % -> %: statement md5 is %, expected %',
          r.from_version, r.to_version, got_md5, regexp_replace(r.expected_md5, '^md5:', '');
      end if;

      update supabase_migrations.schema_migrations
         set version = r.to_version
       where version = r.from_version;

    elsif n_from = 0 and n_to = 1 then
      select name into got_name
        from supabase_migrations.schema_migrations
       where version = r.to_version
       limit 1;
      if got_name is distinct from r.expected_name then
        raise exception 'target % already exists with name %, expected %',
          r.to_version, got_name, r.expected_name;
      end if;

    elsif n_from = 1 and n_to = 1 then
      raise exception 'both % and % exist; refusing to guess', r.from_version, r.to_version;
    else
      raise exception 'neither % nor % is in schema_migrations', r.from_version, r.to_version;
    end if;
  end loop;
end $$;

do $$
declare
  missing int;
  still_dup int;
  slices int;
begin
  select count(*) into missing
    from rematch m
   where not exists (
     select 1 from supabase_migrations.schema_migrations s
      where s.version = m.to_version
        and s.name = m.expected_name
   );
  if missing <> 0 then
    raise exception '% rematch targets missing after update', missing;
  end if;

  select count(*) into still_dup
    from supabase_migrations.schema_migrations
   where version in ('20260924124157', '20260924124241');
  if still_dup <> 0 then
    raise exception 'duplicate alias versions still present';
  end if;

  -- The six split applies must still be here. This script does not own them.
  select count(*) into slices
    from supabase_migrations.schema_migrations
   where version in (
     '20260920001249',
     '20260920001311',
     '20260920001335',
     '20260920001405',
     '20260920001415',
     '20260920040244'
   );
  if slices <> 6 then
    raise exception 'expected the six account_invites_* rows to remain, found %', slices;
  end if;
end $$;

commit;
