-- Grant DML on public schema to service_role explicitly. Supabase Cloud
-- doesn't auto-grant these on tables created via raw SQL migrations the way
-- local `supabase start` does, so the Edge Functions need this to write.

grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

alter default privileges in schema public
  grant select, insert, update, delete on tables to service_role;
alter default privileges in schema public
  grant usage, select on sequences to service_role;
