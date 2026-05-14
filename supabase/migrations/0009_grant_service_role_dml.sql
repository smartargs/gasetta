-- ─────────────────────────────────────────────────────────────────────────────
-- 0009_grant_service_role_dml.sql — make sure service_role can read/write
-- the public schema.
--
-- Supabase Cloud projects don't always auto-grant SELECT/INSERT/UPDATE/DELETE
-- to `service_role` on tables created via raw SQL migrations. We hit this on
-- the prod deploy: every public.* table had only REFERENCES/TRIGGER/TRUNCATE
-- for service_role, so the very first DB write inside ingest crashed with
-- "permission denied for table runs".
--
-- Local supabase (`supabase start`) seeds the grants automatically; cloud
-- does not. This migration makes the grants explicit so behaviour is the
-- same in every environment, and ALTERs default privileges so any future
-- table picks them up without us remembering.
-- ─────────────────────────────────────────────────────────────────────────────

grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

alter default privileges in schema public
  grant select, insert, update, delete on tables to service_role;
alter default privileges in schema public
  grant usage, select on sequences to service_role;
