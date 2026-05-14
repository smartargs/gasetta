-- ─────────────────────────────────────────────────────────────────────────────
-- 0006_per_repo_watermark.sql — per-repo ingest watermark.
--
-- The org-level `sync_state.org_repos` watermark forces one big invocation to
-- pull every repo's history in a single shot. When backfilling 6 months that
-- exceeds the Supabase edge runtime wall-clock limit (the supervisor kills the
-- worker mid-run). We never call `closeRun`, the watermark never advances,
-- and the next attempt re-pulls everything from the same starting point.
--
-- A per-repo watermark lets each repo checkpoint independently: after a repo
-- finishes ingesting, its `last_ingested_at` jumps forward, so a follow-up
-- invocation skips it (or pulls a tiny delta) — multiple short invocations
-- can finish what one long one cannot.
--
-- For existing rows we seed `last_ingested_at` from the current org-level
-- watermark so the in-flight 6-month backfill resumes cleanly.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.repos
  add column if not exists last_ingested_at timestamptz null;

-- Seed from the org watermark only where it's not set yet.
update public.repos r
set last_ingested_at = (
  select last_run_at from public.sync_state where key = 'org_repos'
)
where r.last_ingested_at is null
  and exists (select 1 from public.sync_state where key = 'org_repos');
