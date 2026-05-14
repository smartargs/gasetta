-- ─────────────────────────────────────────────────────────────────────────────
-- 0005_participants_count.sql — distinct-participant counts on summarizable rows.
--
-- `comments_count` (from the GitHub API) tells us how many comments a thread
-- has, but says nothing about how many *distinct people* are talking. The UI
-- wants to show "X comments · Y participants" honestly — that needs this.
--
-- The column is populated by the ingest function, which already has the
-- comments array in memory. Existing rows get a `count_distinct(author_login)`
-- backfill from the matching comments table.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.issues
  add column if not exists participants_count int not null default 0;

alter table public.pull_requests
  add column if not exists participants_count int not null default 0;

alter table public.discussions
  add column if not exists participants_count int not null default 0;

-- Backfill from existing comment tables. Fast on a populated DB; no-op on a
-- fresh one. Distinct counts include only non-null author logins.
update public.issues i
set participants_count = sub.n
from (
  select issue_id, count(distinct author_login) as n
  from public.issue_comments
  where author_login is not null
  group by issue_id
) sub
where sub.issue_id = i.id;

update public.pull_requests p
set participants_count = sub.n
from (
  select pr_id, count(distinct author_login) as n
  from public.pr_comments
  where author_login is not null
  group by pr_id
) sub
where sub.pr_id = p.id;

update public.discussions d
set participants_count = sub.n
from (
  select discussion_id, count(distinct author_login) as n
  from public.discussion_comments
  where author_login is not null
  group by discussion_id
) sub
where sub.discussion_id = d.id;
