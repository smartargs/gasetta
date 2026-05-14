-- ─────────────────────────────────────────────────────────────────────────────
-- 0001_schema.sql — Gasetta base schema.
--
-- Convention:
--   id        : bigint surrogate primary key (bigserial)
--   node_id   : GitHub global node_id (text, unique where applicable) — dedup key
--   github_id : GitHub numeric id (bigint, useful for cross-API references)
--   *_at      : timestamptz
--   run_id    : the runs.id that last touched / produced this row
--
-- Summary-status state machine (issues, pull_requests, discussions):
--   pending → done | error | skipped
--   pending also re-applies when an item gets new activity since last summary.
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists pgcrypto;

-- ── helper: updated_at trigger ──────────────────────────────────────────────
create or replace function public.set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end
$$ language plpgsql;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Tracking — repos / runs / sync_state / contributors
-- ─────────────────────────────────────────────────────────────────────────────

create table public.repos (
  id                  bigserial primary key,
  github_id           bigint not null unique,
  name                text not null,
  full_name           text not null unique,           -- 'neo-project/neo'
  description         text,
  html_url            text not null,
  default_branch      text,
  stargazers_count    int not null default 0,
  is_archived         boolean not null default false,
  is_fork             boolean not null default false,
  pushed_at           timestamptz,
  last_activity_at    timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index on public.repos (is_archived, is_fork);
create index on public.repos (last_activity_at desc nulls last);
create trigger trg_repos_updated before update on public.repos
  for each row execute function public.set_updated_at();


create table public.runs (
  id               bigserial primary key,
  started_at       timestamptz not null default now(),
  finished_at      timestamptz,
  status           text not null default 'running'
                     check (status in ('running','ok','error')),
  window_start     timestamptz,                       -- since last successful run
  window_end       timestamptz,                       -- now() at the moment ingest opened
  repos_seen       int not null default 0,
  items_ingested   int not null default 0,
  items_summarized int not null default 0,
  error_text       text
);
create index on public.runs (started_at desc);
create index on public.runs (status, started_at desc);


-- Watermarks + ETags + GraphQL cursors for resumable ingestion.
-- Key examples: 'org_repos', 'issues:<repo_id>', 'discussions:<repo_id>'.
create table public.sync_state (
  key           text primary key,
  last_run_at   timestamptz,
  etag          text,
  cursor        text,
  updated_at    timestamptz not null default now()
);
create trigger trg_sync_state_updated before update on public.sync_state
  for each row execute function public.set_updated_at();


-- Identity map. Drives the founder/core marker (never a filter).
create table public.contributors (
  id            bigserial primary key,
  github_login  text not null unique,
  github_id     bigint unique,
  display_name  text,
  aliases       text[] not null default '{}',        -- alt names seen in commit author fields
  role          text not null default 'community'
                  check (role in ('founder','core','community')),
  is_founder    boolean generated always as (role = 'founder') stored,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index on public.contributors (role);
create trigger trg_contributors_updated before update on public.contributors
  for each row execute function public.set_updated_at();


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Raw GitHub content
-- ─────────────────────────────────────────────────────────────────────────────

create table public.commits (
  id              bigserial primary key,
  repo_id         bigint not null references public.repos(id) on delete cascade,
  sha             text not null,
  node_id         text not null unique,
  message         text not null,
  author_login    text,
  author_name     text,
  author_email    text,
  authored_at     timestamptz,
  additions       int,
  deletions       int,
  html_url        text not null,
  run_id          bigint references public.runs(id) on delete set null,
  is_founder      boolean not null default false,
  created_at      timestamptz not null default now(),
  unique (repo_id, sha)
);
create index on public.commits (repo_id, authored_at desc);
create index on public.commits (author_login);
create index on public.commits (run_id);


create table public.releases (
  id              bigserial primary key,
  repo_id         bigint not null references public.repos(id) on delete cascade,
  github_id       bigint not null unique,
  tag_name        text not null,
  name            text,
  body            text,
  is_prerelease   boolean not null default false,
  is_draft        boolean not null default false,
  published_at    timestamptz,
  html_url        text not null,
  run_id          bigint references public.runs(id) on delete set null,
  -- LLM output
  summary         text,
  summary_status  text not null default 'pending'
                    check (summary_status in ('pending','done','error','skipped')),
  summary_attempts int not null default 0,
  summarized_at   timestamptz,
  model           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (repo_id, tag_name)
);
create index on public.releases (repo_id, published_at desc);
create index on public.releases (summary_status, summary_attempts)
  where summary_status = 'pending';
create index on public.releases (run_id);
create trigger trg_releases_updated before update on public.releases
  for each row execute function public.set_updated_at();


create table public.issues (
  id                bigserial primary key,
  repo_id           bigint not null references public.repos(id) on delete cascade,
  number            int not null,
  node_id           text not null unique,
  github_id         bigint not null unique,
  title             text not null,
  body              text,
  state             text not null check (state in ('open','closed')),
  state_reason      text,
  author_login      text,
  author_name       text,
  labels            jsonb not null default '[]'::jsonb,
  comments_count    int not null default 0,
  created_at_gh     timestamptz,
  updated_at_gh     timestamptz,
  closed_at         timestamptz,
  html_url          text not null,
  run_id            bigint references public.runs(id) on delete set null,
  founder_involved  boolean not null default false,
  -- LLM
  summary           text,
  consensus         text,
  consensus_chip    text,                              -- 'Resolved' | 'Decided: …' | 'Leaning approve' | 'Open' | 'Split' | 'Stalled'
  sentiment         text check (sentiment in ('calm','mixed','contentious')),
  key_points        jsonb,                             -- string[]
  decisions         jsonb,                             -- [{text, by}]
  founder_quotes    jsonb,                             -- [{who, name, text, url, stance?}]
  summary_status    text not null default 'pending'
                      check (summary_status in ('pending','done','error','skipped')),
  summary_attempts  int not null default 0,
  summary_error     text,
  summarized_at     timestamptz,
  model             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (repo_id, number)
);
create index on public.issues (repo_id, updated_at_gh desc);
create index on public.issues (state);
create index on public.issues (founder_involved) where founder_involved = true;
create index on public.issues (summary_status, summary_attempts)
  where summary_status = 'pending';
create index on public.issues (run_id);
create trigger trg_issues_updated before update on public.issues
  for each row execute function public.set_updated_at();


create table public.issue_comments (
  id              bigserial primary key,
  issue_id        bigint not null references public.issues(id) on delete cascade,
  node_id         text not null unique,
  github_id       bigint not null unique,
  author_login    text,
  author_name     text,
  body            text not null,
  created_at_gh   timestamptz,
  updated_at_gh   timestamptz,
  html_url        text not null,
  is_founder      boolean not null default false,
  role            text check (role in ('founder','core','community')),
  created_at      timestamptz not null default now()
);
create index on public.issue_comments (issue_id, created_at_gh);
create index on public.issue_comments (author_login);
create index on public.issue_comments (is_founder) where is_founder = true;


create table public.pull_requests (
  id                bigserial primary key,
  repo_id           bigint not null references public.repos(id) on delete cascade,
  number            int not null,
  node_id           text not null unique,
  github_id         bigint not null unique,
  title             text not null,
  body              text,
  state             text not null check (state in ('open','closed')),
  is_merged         boolean not null default false,
  merged_at         timestamptz,
  is_draft          boolean not null default false,
  review_decision   text check (review_decision in ('approved','changes_requested','review_required')),
  base_ref          text,
  head_ref          text,
  additions         int,
  deletions         int,
  changed_files     int,
  author_login      text,
  author_name       text,
  labels            jsonb not null default '[]'::jsonb,
  comments_count    int not null default 0,
  created_at_gh     timestamptz,
  updated_at_gh     timestamptz,
  closed_at         timestamptz,
  html_url          text not null,
  run_id            bigint references public.runs(id) on delete set null,
  founder_involved  boolean not null default false,
  -- LLM
  summary           text,
  consensus         text,
  consensus_chip    text,
  sentiment         text check (sentiment in ('calm','mixed','contentious')),
  key_points        jsonb,
  decisions         jsonb,
  risk_notes        text,
  founder_quotes    jsonb,
  summary_status    text not null default 'pending'
                      check (summary_status in ('pending','done','error','skipped')),
  summary_attempts  int not null default 0,
  summary_error     text,
  summarized_at     timestamptz,
  model             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (repo_id, number)
);
create index on public.pull_requests (repo_id, updated_at_gh desc);
create index on public.pull_requests (state);
create index on public.pull_requests (is_merged);
create index on public.pull_requests (founder_involved) where founder_involved = true;
create index on public.pull_requests (summary_status, summary_attempts)
  where summary_status = 'pending';
create index on public.pull_requests (run_id);
create trigger trg_prs_updated before update on public.pull_requests
  for each row execute function public.set_updated_at();


create table public.pr_reviews (
  id              bigserial primary key,
  pr_id           bigint not null references public.pull_requests(id) on delete cascade,
  node_id         text not null unique,
  github_id       bigint unique,
  author_login    text,
  state           text,            -- APPROVED|CHANGES_REQUESTED|COMMENTED|DISMISSED
  body            text,
  submitted_at    timestamptz,
  is_founder      boolean not null default false,
  role            text check (role in ('founder','core','community')),
  created_at      timestamptz not null default now()
);
create index on public.pr_reviews (pr_id, submitted_at);
create index on public.pr_reviews (is_founder) where is_founder = true;


create table public.pr_comments (
  id              bigserial primary key,
  pr_id           bigint not null references public.pull_requests(id) on delete cascade,
  node_id         text not null unique,
  github_id       bigint unique,
  author_login    text,
  author_name     text,
  body            text not null,
  path            text,              -- review-comment file path (nullable for issue-style PR comments)
  position        int,
  created_at_gh   timestamptz,
  updated_at_gh   timestamptz,
  html_url        text not null,
  is_founder      boolean not null default false,
  role            text check (role in ('founder','core','community')),
  created_at      timestamptz not null default now()
);
create index on public.pr_comments (pr_id, created_at_gh);
create index on public.pr_comments (is_founder) where is_founder = true;


create table public.discussions (
  id                bigserial primary key,
  repo_id           bigint not null references public.repos(id) on delete cascade,
  number            int not null,
  node_id           text not null unique,
  title             text not null,
  body              text,
  category          text,
  author_login      text,
  author_name       text,
  upvotes           int not null default 0,
  comments_count    int not null default 0,
  is_answered       boolean not null default false,
  answer_chosen_at  timestamptz,
  created_at_gh     timestamptz,
  updated_at_gh     timestamptz,
  html_url          text not null,
  run_id            bigint references public.runs(id) on delete set null,
  founder_involved  boolean not null default false,
  -- LLM
  summary           text,
  consensus         text,
  consensus_chip    text,
  sentiment         text check (sentiment in ('calm','mixed','contentious')),
  key_points        jsonb,
  decisions         jsonb,
  founder_quotes    jsonb,
  summary_status    text not null default 'pending'
                      check (summary_status in ('pending','done','error','skipped')),
  summary_attempts  int not null default 0,
  summary_error     text,
  summarized_at     timestamptz,
  model             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (repo_id, number)
);
create index on public.discussions (repo_id, updated_at_gh desc);
create index on public.discussions (founder_involved) where founder_involved = true;
create index on public.discussions (summary_status, summary_attempts)
  where summary_status = 'pending';
create index on public.discussions (run_id);
create trigger trg_discussions_updated before update on public.discussions
  for each row execute function public.set_updated_at();


create table public.discussion_comments (
  id              bigserial primary key,
  discussion_id   bigint not null references public.discussions(id) on delete cascade,
  parent_id       bigint references public.discussion_comments(id) on delete set null,
  node_id         text not null unique,
  author_login    text,
  author_name     text,
  body            text not null,
  upvotes         int not null default 0,
  is_answer       boolean not null default false,
  created_at_gh   timestamptz,
  updated_at_gh   timestamptz,
  html_url        text not null,
  is_founder      boolean not null default false,
  role            text check (role in ('founder','core','community')),
  created_at      timestamptz not null default now()
);
create index on public.discussion_comments (discussion_id, created_at_gh);
create index on public.discussion_comments (is_founder) where is_founder = true;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Roll-ups & ops — repo_digests / org_digests / llm_calls
-- ─────────────────────────────────────────────────────────────────────────────

create table public.repo_digests (
  id              bigserial primary key,
  repo_id         bigint not null references public.repos(id) on delete cascade,
  run_id          bigint not null references public.runs(id) on delete cascade,
  headline        text,
  body_md         text,
  activity_counts jsonb not null default '{}'::jsonb,
  -- { commits, releases, prs_opened, prs_merged, issues_opened, issues_closed,
  --   discussions_new, hot_threads }
  model           text,
  created_at      timestamptz not null default now(),
  unique (repo_id, run_id)
);
create index on public.repo_digests (run_id);
create index on public.repo_digests (repo_id, created_at desc);


create table public.org_digests (
  id                bigserial primary key,
  run_id            bigint not null unique references public.runs(id) on delete cascade,
  edition_date      date not null,
  headline          text not null,
  standfirst        text,
  body_md           text not null,
  period_label      text,
  counts            jsonb not null default '{}'::jsonb,
  -- { releases, hot_threads, founder_touched, repos_active }
  top_items         jsonb not null default '[]'::jsonb,
  -- [{ type, id, title, url, why }]
  releases          jsonb not null default '[]'::jsonb,
  founder_activity  jsonb not null default '[]'::jsonb,
  model             text,
  created_at        timestamptz not null default now()
);
create index on public.org_digests (edition_date desc);


create table public.llm_calls (
  id              bigserial primary key,
  run_id          bigint references public.runs(id) on delete set null,
  purpose         text not null,                                -- 'item_summary' | 'repo_digest' | 'org_digest'
  model           text not null,
  subject_type    text,                                         -- 'issue' | 'pull_request' | 'discussion' | 'release' | 'repo' | 'org'
  subject_id      bigint,
  tokens_in       int not null default 0,
  tokens_out      int not null default 0,
  cost_usd        numeric(10,6) not null default 0,
  latency_ms      int,
  status          text not null check (status in ('ok','error')),
  error_text      text,
  created_at      timestamptz not null default now()
);
create index on public.llm_calls (run_id);
create index on public.llm_calls (created_at desc);
create index on public.llm_calls (purpose, created_at desc);
