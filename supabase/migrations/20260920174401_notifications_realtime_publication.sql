-- ============================================================================
-- 20260920174401_notifications_realtime_publication.sql
--
-- Records SQL already applied on prod under this exact version
-- (schema_migrations.name = notifications_realtime_publication).
-- MCP apply wrote the version and did not leave a file. The prefix is the
-- ledger version on purpose, so the drift check can see the row.
-- This file does not change the publication again when the row exists:
-- db push skips a version that is already in the ledger. The body is the
-- applied statement, and it is idempotent if replayed on a fresh database.
-- ============================================================================

do $$
begin
  if to_regclass('public.notifications') is null then
    raise exception 'notifications missing';
  end if;
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
