-- ─────────────────────────────────────────────────────────────────────────────
-- 0003_summary_gate.sql — Material-change tracking for the summarizer.
--
-- Snapshots of the thread's state at the moment it was last summarised. The
-- summarizer compares these against the current row values to decide whether
-- a re-summary is warranted; without this we either flicker the consensus on
-- every comment (the v0 behaviour) or never refresh it.
--
-- The actual policy lives in code: a re-summary is triggered when the row
-- has never been summarised, comments grew by ≥3 since last summary, state
-- shifted, is_merged/is_answered shifted, or it's been ≥7 days. The fields
-- below are just the inputs.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.issues
  add column if not exists last_summarized_comment_count int,
  add column if not exists last_summarized_state text;

alter table public.pull_requests
  add column if not exists last_summarized_comment_count int,
  add column if not exists last_summarized_state text,
  add column if not exists last_summarized_is_merged boolean;

alter table public.discussions
  add column if not exists last_summarized_comment_count int,
  add column if not exists last_summarized_is_answered boolean;
