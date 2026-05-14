-- ─────────────────────────────────────────────────────────────────────────────
-- 0002_rls.sql — Read-only posture for anon/authenticated.
--
-- Two defensive layers:
--   1. Table-level privileges — REVOKE ALL, then GRANT SELECT only on the
--      public-read subset. This means even if RLS were ever disabled on a
--      table, writes would still fail at the privilege layer.
--   2. Row-level security — RLS enabled everywhere; only SELECT policies
--      exist; no insert/update/delete policy → writes blocked.
--
-- Critical ordering: privileges first, policies second. If a later step ever
-- aborts on a re-run, the database is still left in a safe (read-only) state.
--
-- service_role bypasses both layers — that's how Edge Functions still write.
--
-- sync_state and llm_calls are *fully* private — no GRANT, no policy.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Schema usage ────────────────────────────────────────────────────────
grant usage on schema public to anon, authenticated;

-- ── 2. REVOKE everything anon/authenticated may have inherited ─────────────
-- Supabase's project init grants ALL on public.* to anon/authenticated via
-- ALTER DEFAULT PRIVILEGES, so we have to actively claw it back.
do $$
declare
  t text;
  all_tables text[] := array[
    'repos','runs','sync_state','contributors',
    'commits','releases',
    'issues','issue_comments',
    'pull_requests','pr_reviews','pr_comments',
    'discussions','discussion_comments',
    'repo_digests','org_digests','llm_calls'
  ];
begin
  foreach t in array all_tables loop
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end
$$;

revoke all on all sequences in schema public from anon, authenticated;

-- Future tables / sequences / functions also start locked.
alter default privileges in schema public
  revoke all on tables from anon, authenticated;
alter default privileges in schema public
  revoke all on sequences from anon, authenticated;
alter default privileges in schema public
  revoke all on functions from anon, authenticated;

-- ── 3. GRANT SELECT on the public-read subset only ─────────────────────────
-- sync_state and llm_calls intentionally absent.
do $$
declare
  t text;
  public_tables text[] := array[
    'repos','runs','contributors','commits','releases',
    'issues','issue_comments',
    'pull_requests','pr_reviews','pr_comments',
    'discussions','discussion_comments',
    'repo_digests','org_digests'
  ];
begin
  foreach t in array public_tables loop
    execute format('grant select on public.%I to anon, authenticated', t);
  end loop;
end
$$;

-- ── 4. Enable RLS on every table ───────────────────────────────────────────
alter table public.repos               enable row level security;
alter table public.runs                enable row level security;
alter table public.sync_state          enable row level security;
alter table public.contributors        enable row level security;
alter table public.commits             enable row level security;
alter table public.releases            enable row level security;
alter table public.issues              enable row level security;
alter table public.issue_comments      enable row level security;
alter table public.pull_requests       enable row level security;
alter table public.pr_reviews          enable row level security;
alter table public.pr_comments         enable row level security;
alter table public.discussions         enable row level security;
alter table public.discussion_comments enable row level security;
alter table public.repo_digests        enable row level security;
alter table public.org_digests         enable row level security;
alter table public.llm_calls           enable row level security;

-- ── 5. SELECT policies on the public-read subset ───────────────────────────
-- Idempotent: drop first, then create. Re-applying the migration is safe.
do $$
declare
  t text;
  public_tables text[] := array[
    'repos','runs','contributors','commits','releases',
    'issues','issue_comments',
    'pull_requests','pr_reviews','pr_comments',
    'discussions','discussion_comments',
    'repo_digests','org_digests'
  ];
begin
  foreach t in array public_tables loop
    execute format('drop policy if exists %I on public.%I', 'read_'||t, t);
    execute format(
      'create policy %I on public.%I for select to anon, authenticated using (true)',
      'read_'||t, t
    );
  end loop;
end
$$;

-- sync_state and llm_calls: no policies → no rows visible to anon/authenticated
-- even if a future migration accidentally grants SELECT. Belt and braces.
