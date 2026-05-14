-- ─────────────────────────────────────────────────────────────────────────────
-- 0004_cron.sql — Daily schedule via pg_cron + pg_net.
--
-- Schedule:
--   04:00 UTC — ingest (GitHub → Postgres)
--   04:30 UTC — summarize (Postgres → OpenAI → Postgres), incl. org_digest
--
-- Both Edge Functions are invoked over HTTP via pg_net.http_post. The
-- function URL prefix and service-role key live in a small private config
-- table (gasetta.config). Configure with:
--
--   insert into gasetta.config (key, value) values
--     ('functions_base_url', 'http://kong:8000/functions/v1'),  -- local
--     ('service_role_key',   '<from supabase status -o env>')
--   on conflict (key) do update set value = excluded.value;
--
-- For prod, swap the URL to https://YOUR_PROJECT.supabase.co/functions/v1
-- and the key to the dashboard service-role key. (We use a table instead of
-- ALTER DATABASE SET because Supabase's local postgres role can't change
-- DB-level settings, and a table is portable + auditable. For tighter prod
-- security, swap to vault.decrypted_secrets.)
--
-- If config rows are missing when a cron job fires, the http_post call is
-- skipped with a NOTICE — registration itself doesn't fail.
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists pg_cron;
create extension if not exists pg_net;

create schema if not exists gasetta;

-- ── config table — no RLS, no GRANT, postgres + service_role only ───────────
create table if not exists gasetta.config (
  key   text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
-- No GRANTs: anon/authenticated can't read or write. Service-role bypasses.

-- ── helper that resolves URL + auth and fires the function call ────────────
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
  select value into base_url from gasetta.config where key = 'functions_base_url';
  select value into service_key from gasetta.config where key = 'service_role_key';
  if base_url is null or base_url = '' or service_key is null or service_key = '' then
    raise notice
      'gasetta.invoke(%): functions_base_url or service_role_key missing from gasetta.config — skipping',
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

-- ── register the two daily jobs (idempotent on re-run) ──────────────────────
do $$
declare jid bigint;
begin
  for jid in select jobid from cron.job where jobname in (
    'gasetta-ingest', 'gasetta-summarize'
  ) loop
    perform cron.unschedule(jid);
  end loop;
end
$$;

-- Every 4 hours: ingest at the top of the hour, summarize 10 minutes later
-- so per-item consensus chips refresh as comments accumulate.
-- org_digest synthesis is opt-in via ?digest=true (manual recap only).
select cron.schedule(
  'gasetta-ingest',
  '0 */4 * * *',              -- every 4h on the hour
  $$ select gasetta.invoke('ingest'); $$
);

select cron.schedule(
  'gasetta-summarize',
  '10 */4 * * *',             -- every 4h, 10 min after ingest
  $$ select gasetta.invoke('summarize'); $$
);
