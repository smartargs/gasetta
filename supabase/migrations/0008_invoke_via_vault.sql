-- ─────────────────────────────────────────────────────────────────────────────
-- 0008_invoke_via_vault.sql — read pg_cron secrets from Supabase Vault.
--
-- Previously `gasetta.invoke()` read `functions_base_url` and
-- `service_role_key` from a plaintext `gasetta.config` table. Supabase's
-- official guidance (Scheduling Edge Functions, pg_net guide) is to keep
-- these in Vault instead — values stay encrypted at rest, backups carry
-- ciphertext only, and access is gated by Vault's own permission model.
--
-- After this migration, populate Vault on each environment:
--
--   select vault.create_secret(
--     'https://<project-ref>.supabase.co/functions/v1', 'functions_base_url');
--   select vault.create_secret('<service_role_jwt>', 'service_role_key');
--
-- The `gasetta.config` table is left in place but unused, so old rows
-- (if any) don't cause schema drift. Drop it in a later migration once
-- every environment has fully cut over.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function gasetta.invoke(fn_name text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  base_url    text;
  service_key text;
begin
  select decrypted_secret into base_url
    from vault.decrypted_secrets
    where name = 'functions_base_url';

  select decrypted_secret into service_key
    from vault.decrypted_secrets
    where name = 'service_role_key';

  if base_url is null or base_url = '' or service_key is null or service_key = '' then
    raise notice
      'gasetta.invoke(%): functions_base_url or service_role_key missing from Vault — skipping',
      fn_name;
    return;
  end if;

  perform net.http_post(
    url := base_url || '/' || fn_name,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 1500000  -- 25 min, matches Edge Function timeout
  );
end;
$$;

revoke all on function gasetta.invoke(text) from public;
