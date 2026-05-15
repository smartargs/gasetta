import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type {
  GhCommit,
  GhIssueComment,
  GhIssueOrPr,
  GhPullDetail,
  GhRelease,
  GhRepo,
  GhReview,
  GhReviewComment,
  GqlDiscussion,
  GqlDiscussionComment,
} from './types.ts';
import type { FoundersIndex, Role } from './founders.ts';

export function createServiceClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) {
    throw new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing from env');
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'x-application': 'gasetta-ingest' } },
  });
}

// ── material-change gate ────────────────────────────────────────────────────
const MATERIAL_COMMENT_DELTA = 3;
const MATERIAL_STALE_DAYS = 7;

function isStale(summarizedAt: string | null): boolean {
  if (!summarizedAt) return false;
  return Date.now() - new Date(summarizedAt).getTime() > MATERIAL_STALE_DAYS * 86_400_000;
}

interface IssueGateRow {
  state: string;
  comments_count: number;
  summary_status: string;
  summarized_at: string | null;
  last_summarized_comment_count: number | null;
  last_summarized_state: string | null;
}

export async function markPendingIfMaterialIssue(
  db: SupabaseClient,
  issueId: number,
): Promise<boolean> {
  const { data, error } = await db
    .from('issues')
    .select(
      'state, comments_count, summary_status, summarized_at, ' +
        'last_summarized_comment_count, last_summarized_state',
    )
    .eq('id', issueId)
    .single<IssueGateRow>();
  if (error) throw new Error(`markPendingIfMaterialIssue: ${error.message}`);
  if (!data || data.summary_status === 'pending') return false;

  const neverSummarised = data.summarized_at == null;
  const commentDelta =
    (data.comments_count ?? 0) - (data.last_summarized_comment_count ?? 0);
  const commentsGrew = commentDelta >= MATERIAL_COMMENT_DELTA;
  const stateChanged =
    data.last_summarized_state != null && data.last_summarized_state !== data.state;
  const stale = isStale(data.summarized_at);

  if (!(neverSummarised || commentsGrew || stateChanged || stale)) return false;
  const { error: upErr } = await db
    .from('issues')
    .update({ summary_status: 'pending', summary_attempts: 0 })
    .eq('id', issueId);
  if (upErr) throw new Error(`markPendingIfMaterialIssue update: ${upErr.message}`);
  return true;
}

interface PrGateRow {
  state: string;
  is_merged: boolean;
  comments_count: number;
  summary_status: string;
  summarized_at: string | null;
  last_summarized_comment_count: number | null;
  last_summarized_state: string | null;
  last_summarized_is_merged: boolean | null;
}

export async function markPendingIfMaterialPullRequest(
  db: SupabaseClient,
  prId: number,
): Promise<boolean> {
  const { data, error } = await db
    .from('pull_requests')
    .select(
      'state, is_merged, comments_count, summary_status, summarized_at, ' +
        'last_summarized_comment_count, last_summarized_state, last_summarized_is_merged',
    )
    .eq('id', prId)
    .single<PrGateRow>();
  if (error) throw new Error(`markPendingIfMaterialPullRequest: ${error.message}`);
  if (!data || data.summary_status === 'pending') return false;

  const neverSummarised = data.summarized_at == null;
  const commentDelta =
    (data.comments_count ?? 0) - (data.last_summarized_comment_count ?? 0);
  const commentsGrew = commentDelta >= MATERIAL_COMMENT_DELTA;
  const stateChanged =
    data.last_summarized_state != null && data.last_summarized_state !== data.state;
  const mergedChanged =
    data.last_summarized_is_merged != null &&
    data.last_summarized_is_merged !== data.is_merged;
  const stale = isStale(data.summarized_at);

  if (!(neverSummarised || commentsGrew || stateChanged || mergedChanged || stale)) {
    return false;
  }
  const { error: upErr } = await db
    .from('pull_requests')
    .update({ summary_status: 'pending', summary_attempts: 0 })
    .eq('id', prId);
  if (upErr) throw new Error(`markPendingIfMaterialPullRequest update: ${upErr.message}`);
  return true;
}

interface DiscussionGateRow {
  is_answered: boolean;
  comments_count: number;
  summary_status: string;
  summarized_at: string | null;
  last_summarized_comment_count: number | null;
  last_summarized_is_answered: boolean | null;
}

export async function markPendingIfMaterialDiscussion(
  db: SupabaseClient,
  discId: number,
): Promise<boolean> {
  const { data, error } = await db
    .from('discussions')
    .select(
      'is_answered, comments_count, summary_status, summarized_at, ' +
        'last_summarized_comment_count, last_summarized_is_answered',
    )
    .eq('id', discId)
    .single<DiscussionGateRow>();
  if (error) throw new Error(`markPendingIfMaterialDiscussion: ${error.message}`);
  if (!data || data.summary_status === 'pending') return false;

  const neverSummarised = data.summarized_at == null;
  const commentDelta =
    (data.comments_count ?? 0) - (data.last_summarized_comment_count ?? 0);
  const commentsGrew = commentDelta >= MATERIAL_COMMENT_DELTA;
  const answeredChanged =
    data.last_summarized_is_answered != null &&
    data.last_summarized_is_answered !== data.is_answered;
  const stale = isStale(data.summarized_at);

  if (!(neverSummarised || commentsGrew || answeredChanged || stale)) return false;
  const { error: upErr } = await db
    .from('discussions')
    .update({ summary_status: 'pending', summary_attempts: 0 })
    .eq('id', discId);
  if (upErr) throw new Error(`markPendingIfMaterialDiscussion update: ${upErr.message}`);
  return true;
}

// ── runs ────────────────────────────────────────────────────────────────────

export interface NewRun {
  window_start: string | null;
  window_end: string;
}

export async function openRun(db: SupabaseClient, r: NewRun): Promise<number> {
  const { data, error } = await db
    .from('runs')
    .insert({
      status: 'running',
      window_start: r.window_start,
      window_end: r.window_end,
    })
    .select('id')
    .single();
  if (error) throw new Error(`openRun: ${error.message}`);
  return data.id as number;
}

/**
 * Close any run that's been stuck `running` longer than `olderThanMinutes`.
 * Edge Function hard timeout is ~25 min, operators sometimes ^C mid-flight, and
 * a process crash can leave the row dangling — without this, `runs` table fills
 * with phantom in-flight rows that distort UI counters. Watermark wasn't
 * advanced (we only do that on success), so retry behaviour is unchanged.
 */
export async function reapStaleRuns(
  db: SupabaseClient,
  olderThanMinutes = 30,
): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanMinutes * 60_000).toISOString();
  const { data, error } = await db
    .from('runs')
    .update({
      status: 'error',
      finished_at: new Date().toISOString(),
      error_text: `reaped: status stuck at 'running' longer than ${olderThanMinutes}m`,
    })
    .eq('status', 'running')
    .lt('started_at', cutoff)
    .select('id');
  if (error) throw new Error(`reapStaleRuns: ${error.message}`);
  return (data ?? []).length;
}

export interface RunUpdates {
  repos_seen?: number;
  items_ingested?: number;
  items_summarized?: number;
}

export async function closeRun(
  db: SupabaseClient,
  runId: number,
  status: 'ok' | 'error',
  updates: RunUpdates & { error_text?: string | null } = {},
): Promise<void> {
  const { error } = await db
    .from('runs')
    .update({
      status,
      finished_at: new Date().toISOString(),
      ...updates,
    })
    .eq('id', runId);
  if (error) throw new Error(`closeRun: ${error.message}`);
}

// ── sync_state ──────────────────────────────────────────────────────────────

export async function getWatermark(db: SupabaseClient, key: string): Promise<string | null> {
  const { data, error } = await db
    .from('sync_state')
    .select('last_run_at')
    .eq('key', key)
    .maybeSingle();
  if (error) throw new Error(`getWatermark(${key}): ${error.message}`);
  return data?.last_run_at ?? null;
}

export async function setWatermark(
  db: SupabaseClient,
  key: string,
  lastRunAt: string,
): Promise<void> {
  const { error } = await db
    .from('sync_state')
    .upsert({ key, last_run_at: lastRunAt }, { onConflict: 'key' });
  if (error) throw new Error(`setWatermark(${key}): ${error.message}`);
}

// ── repos ───────────────────────────────────────────────────────────────────

export interface UpsertedRepo {
  id: number;
  name: string;
  full_name: string;
  last_ingested_at: string | null;
}

export async function upsertRepo(
  db: SupabaseClient,
  r: GhRepo,
): Promise<UpsertedRepo> {
  const { data, error } = await db
    .from('repos')
    .upsert(
      {
        github_id: r.id,
        name: r.name,
        full_name: r.full_name,
        description: r.description,
        html_url: r.html_url,
        default_branch: r.default_branch,
        stargazers_count: r.stargazers_count,
        is_archived: r.archived,
        is_fork: r.fork,
        pushed_at: r.pushed_at,
        last_activity_at: r.pushed_at ?? r.updated_at,
      },
      { onConflict: 'github_id' },
    )
    .select('id, name, full_name, last_ingested_at')
    .single();
  if (error) throw new Error(`upsertRepo ${r.full_name}: ${error.message}`);
  return data as UpsertedRepo;
}

/**
 * Per-repo ingest watermark. Set only after a repo's pipeline completes
 * cleanly, so a wall-clock-killed worker leaves already-finished repos
 * checkpointed — the next invocation skips them (or pulls a small delta).
 */
export async function setRepoWatermark(
  db: SupabaseClient,
  repoId: number,
  at: string,
): Promise<void> {
  const { error } = await db
    .from('repos')
    .update({ last_ingested_at: at })
    .eq('id', repoId);
  if (error) throw new Error(`setRepoWatermark ${repoId}: ${error.message}`);
}

// ── commits ─────────────────────────────────────────────────────────────────

export async function upsertCommit(
  db: SupabaseClient,
  repoId: number,
  runId: number,
  c: GhCommit,
  founders: FoundersIndex,
): Promise<void> {
  const login = c.author?.login ?? null;
  const { error } = await db.from('commits').upsert(
    {
      repo_id: repoId,
      sha: c.sha,
      node_id: c.node_id,
      message: c.commit.message,
      author_login: login,
      author_name: c.commit.author?.name ?? null,
      author_email: c.commit.author?.email ?? null,
      authored_at: c.commit.author?.date ?? null,
      additions: c.stats?.additions ?? null,
      deletions: c.stats?.deletions ?? null,
      html_url: c.html_url,
      run_id: runId,
      is_founder: founders.isFounder(login),
    },
    { onConflict: 'node_id' },
  );
  if (error) throw new Error(`upsertCommit ${c.sha}: ${error.message}`);
}

// ── releases ────────────────────────────────────────────────────────────────

export async function upsertRelease(
  db: SupabaseClient,
  repoId: number,
  runId: number,
  r: GhRelease,
): Promise<void> {
  const { error } = await db.from('releases').upsert(
    {
      repo_id: repoId,
      github_id: r.id,
      tag_name: r.tag_name,
      name: r.name,
      body: r.body,
      is_prerelease: r.prerelease,
      is_draft: r.draft,
      published_at: r.published_at,
      html_url: r.html_url,
      run_id: runId,
      summary_status: 'pending',
    },
    { onConflict: 'github_id', ignoreDuplicates: false },
  );
  if (error) throw new Error(`upsertRelease ${r.tag_name}: ${error.message}`);
}

// ── issues (NOT PRs) ────────────────────────────────────────────────────────

export interface UpsertedIssueOrPr {
  id: number;
}

export async function upsertIssue(
  db: SupabaseClient,
  repoId: number,
  runId: number,
  i: GhIssueOrPr,
  founderInvolved: boolean,
  participantsCount: number,
): Promise<UpsertedIssueOrPr> {
  // Pure data upsert. The material-change gate (and the resulting
  // summary_status='pending' flip) is a separate concern handled by
  // markPendingIfMaterialIssue() — see the rationale at the top of this file.
  const row = {
    repo_id: repoId,
    number: i.number,
    node_id: i.node_id,
    github_id: i.id,
    title: i.title,
    body: i.body,
    state: i.state,
    state_reason: i.state_reason,
    author_login: i.user?.login ?? null,
    labels: i.labels.map((l) => ({ name: l.name, color: l.color })),
    comments_count: i.comments,
    participants_count: participantsCount,
    created_at_gh: i.created_at,
    updated_at_gh: i.updated_at,
    closed_at: i.closed_at,
    html_url: i.html_url,
    run_id: runId,
    founder_involved: founderInvolved,
  };

  const { data, error } = await db
    .from('issues')
    .upsert(row, { onConflict: 'node_id' })
    .select('id')
    .single();
  if (error) throw new Error(`upsertIssue #${i.number}: ${error.message}`);
  return { id: data.id as number };
}

export async function upsertIssueComment(
  db: SupabaseClient,
  issueId: number,
  c: GhIssueComment,
  founders: FoundersIndex,
): Promise<void> {
  const login = c.user?.login ?? null;
  const role: Role = founders.lookup(login);
  const { error } = await db.from('issue_comments').upsert(
    {
      issue_id: issueId,
      node_id: c.node_id,
      github_id: c.id,
      author_login: login,
      body: c.body,
      created_at_gh: c.created_at,
      updated_at_gh: c.updated_at,
      html_url: c.html_url,
      is_founder: role === 'founder',
      role,
    },
    { onConflict: 'node_id' },
  );
  if (error) throw new Error(`upsertIssueComment ${c.id}: ${error.message}`);
}

// ── pull requests ───────────────────────────────────────────────────────────

export async function upsertPullRequest(
  db: SupabaseClient,
  repoId: number,
  runId: number,
  list: GhIssueOrPr,
  detail: GhPullDetail,
  founderInvolved: boolean,
  participantsCount: number,
): Promise<UpsertedIssueOrPr> {
  const row = {
    repo_id: repoId,
    number: list.number,
    node_id: list.node_id,
    github_id: detail.id,
    title: list.title,
    body: list.body,
    state: list.state,
    is_merged: detail.merged,
    merged_at: detail.merged_at,
    is_draft: detail.draft,
    base_ref: detail.base.ref,
    head_ref: detail.head.ref,
    additions: detail.additions,
    deletions: detail.deletions,
    changed_files: detail.changed_files,
    author_login: list.user?.login ?? null,
    labels: list.labels.map((l) => ({ name: l.name, color: l.color })),
    comments_count: list.comments,
    participants_count: participantsCount,
    created_at_gh: list.created_at,
    updated_at_gh: list.updated_at,
    closed_at: list.closed_at,
    html_url: list.html_url,
    run_id: runId,
    founder_involved: founderInvolved,
  };

  const { data, error } = await db
    .from('pull_requests')
    .upsert(row, { onConflict: 'node_id' })
    .select('id')
    .single();
  if (error) throw new Error(`upsertPullRequest #${list.number}: ${error.message}`);
  return { id: data.id as number };
}

export async function upsertPrReview(
  db: SupabaseClient,
  prId: number,
  r: GhReview,
  founders: FoundersIndex,
): Promise<void> {
  const login = r.user?.login ?? null;
  const role: Role = founders.lookup(login);
  const { error } = await db.from('pr_reviews').upsert(
    {
      pr_id: prId,
      node_id: r.node_id,
      github_id: r.id,
      author_login: login,
      state: r.state,
      body: r.body,
      submitted_at: r.submitted_at,
      is_founder: role === 'founder',
      role,
    },
    { onConflict: 'node_id' },
  );
  if (error) throw new Error(`upsertPrReview ${r.id}: ${error.message}`);
}

export async function upsertPrComment(
  db: SupabaseClient,
  prId: number,
  c: GhReviewComment,
  founders: FoundersIndex,
): Promise<void> {
  const login = c.user?.login ?? null;
  const role: Role = founders.lookup(login);
  const { error } = await db.from('pr_comments').upsert(
    {
      pr_id: prId,
      node_id: c.node_id,
      github_id: c.id,
      author_login: login,
      body: c.body,
      path: c.path,
      position: c.position,
      created_at_gh: c.created_at,
      updated_at_gh: c.updated_at,
      html_url: c.html_url,
      is_founder: role === 'founder',
      role,
    },
    { onConflict: 'node_id' },
  );
  if (error) throw new Error(`upsertPrComment ${c.id}: ${error.message}`);
}

/**
 * "Conversation" comments on a PR come from /repos/:o/:r/issues/:n/comments —
 * GitHub returns them with the GhIssueComment shape (no path/position). They
 * still belong in pr_comments (path/position left null) because pr_comments is
 * the FK target for *all* PR-attached comments. Without this, we'd be writing
 * PR-owned comments into issue_comments and violating that table's FK.
 */
export async function upsertPrConversationComment(
  db: SupabaseClient,
  prId: number,
  c: GhIssueComment,
  founders: FoundersIndex,
): Promise<void> {
  const login = c.user?.login ?? null;
  const role: Role = founders.lookup(login);
  const { error } = await db.from('pr_comments').upsert(
    {
      pr_id: prId,
      node_id: c.node_id,
      github_id: c.id,
      author_login: login,
      body: c.body,
      path: null,
      position: null,
      created_at_gh: c.created_at,
      updated_at_gh: c.updated_at,
      html_url: c.html_url,
      is_founder: role === 'founder',
      role,
    },
    { onConflict: 'node_id' },
  );
  if (error) throw new Error(`upsertPrConversationComment ${c.id}: ${error.message}`);
}

// ── discussions (GraphQL) ───────────────────────────────────────────────────

export async function upsertDiscussion(
  db: SupabaseClient,
  repoId: number,
  runId: number,
  d: GqlDiscussion,
  founderInvolved: boolean,
  participantsCount: number,
): Promise<UpsertedIssueOrPr> {
  const row = {
    repo_id: repoId,
    number: d.number,
    node_id: d.id,
    title: d.title,
    body: d.body,
    category: d.category.name,
    author_login: d.author?.login ?? null,
    upvotes: d.upvoteCount,
    comments_count: d.comments.totalCount,
    participants_count: participantsCount,
    is_answered: !!d.isAnswered,
    answer_chosen_at: d.answerChosenAt,
    created_at_gh: d.createdAt,
    updated_at_gh: d.updatedAt,
    html_url: d.url,
    run_id: runId,
    founder_involved: founderInvolved,
  };

  const { data, error } = await db
    .from('discussions')
    .upsert(row, { onConflict: 'node_id' })
    .select('id')
    .single();
  if (error) throw new Error(`upsertDiscussion #${d.number}: ${error.message}`);
  return { id: data.id as number };
}

export async function upsertDiscussionComment(
  db: SupabaseClient,
  discussionId: number,
  parentId: number | null,
  c: GqlDiscussionComment,
  founders: FoundersIndex,
): Promise<number> {
  const login = c.author?.login ?? null;
  const role: Role = founders.lookup(login);
  const { data, error } = await db
    .from('discussion_comments')
    .upsert(
      {
        discussion_id: discussionId,
        parent_id: parentId,
        node_id: c.id,
        author_login: login,
        body: c.body,
        upvotes: c.upvoteCount,
        is_answer: c.isAnswer,
        created_at_gh: c.createdAt,
        updated_at_gh: c.updatedAt,
        html_url: c.url,
        is_founder: role === 'founder',
        role,
      },
      { onConflict: 'node_id' },
    )
    .select('id')
    .single();
  if (error) throw new Error(`upsertDiscussionComment ${c.id}: ${error.message}`);
  return data.id as number;
}

// ────────────────────────────────────────────────────────────────────────────
// Summarize-side helpers
// ────────────────────────────────────────────────────────────────────────────

export interface PendingItem {
  kind: 'issue' | 'pull_request' | 'discussion';
  id: number;
  repo_id: number;
  repo_name: string;
  number: number;
  title: string;
  body: string | null;
  author_login: string | null;
  state: string;
  is_merged?: boolean;
  is_answered?: boolean;
  comments_count: number;
  html_url: string;
  summary_attempts: number;
}

interface RawPending {
  id: number;
  repo_id: number;
  number: number;
  title: string;
  body: string | null;
  author_login: string | null;
  state: string;
  is_merged?: boolean;
  is_answered?: boolean;
  comments_count: number;
  html_url: string;
  summary_attempts: number;
  repos: { name: string } | null;
}

export async function fetchLatestOkRun(
  db: SupabaseClient,
): Promise<{ id: number; window_end: string | null } | null> {
  const { data, error } = await db
    .from('runs')
    .select('id, window_end')
    .eq('status', 'ok')
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle<{ id: number; window_end: string | null }>();
  if (error) throw new Error(`fetchLatestOkRun: ${error.message}`);
  return data;
}

export async function fetchPendingItems(
  db: SupabaseClient,
  limit = 50,
): Promise<PendingItem[]> {
  const out: PendingItem[] = [];

  const issues = await db
    .from('issues')
    .select(
      'id, repo_id, number, title, body, author_login, state, comments_count, html_url, summary_attempts, repos:repo_id(name)',
    )
    .eq('summary_status', 'pending')
    .lt('summary_attempts', 5)
    .order('updated_at_gh', { ascending: true })
    .limit(limit)
    .returns<RawPending[]>();
  if (issues.error) throw new Error(`fetchPendingItems issues: ${issues.error.message}`);
  for (const r of issues.data ?? []) {
    out.push({
      kind: 'issue',
      id: r.id,
      repo_id: r.repo_id,
      repo_name: r.repos?.name ?? 'unknown',
      number: r.number,
      title: r.title,
      body: r.body,
      author_login: r.author_login,
      state: r.state,
      comments_count: r.comments_count,
      html_url: r.html_url,
      summary_attempts: r.summary_attempts,
    });
  }

  const prs = await db
    .from('pull_requests')
    .select(
      'id, repo_id, number, title, body, author_login, state, is_merged, comments_count, html_url, summary_attempts, repos:repo_id(name)',
    )
    .eq('summary_status', 'pending')
    .lt('summary_attempts', 5)
    .order('updated_at_gh', { ascending: true })
    .limit(limit)
    .returns<RawPending[]>();
  if (prs.error) throw new Error(`fetchPendingItems prs: ${prs.error.message}`);
  for (const r of prs.data ?? []) {
    out.push({
      kind: 'pull_request',
      id: r.id,
      repo_id: r.repo_id,
      repo_name: r.repos?.name ?? 'unknown',
      number: r.number,
      title: r.title,
      body: r.body,
      author_login: r.author_login,
      state: r.state,
      is_merged: r.is_merged,
      comments_count: r.comments_count,
      html_url: r.html_url,
      summary_attempts: r.summary_attempts,
    });
  }

  const disc = await db
    .from('discussions')
    .select(
      'id, repo_id, number, title, body, author_login, is_answered, comments_count, html_url, summary_attempts, repos:repo_id(name)',
    )
    .eq('summary_status', 'pending')
    .lt('summary_attempts', 5)
    .order('updated_at_gh', { ascending: true })
    .limit(limit)
    .returns<Array<RawPending & { is_answered?: boolean }>>();
  if (disc.error) throw new Error(`fetchPendingItems discussions: ${disc.error.message}`);
  for (const r of disc.data ?? []) {
    out.push({
      kind: 'discussion',
      id: r.id,
      repo_id: r.repo_id,
      repo_name: r.repos?.name ?? 'unknown',
      number: r.number,
      title: r.title,
      body: r.body,
      author_login: r.author_login,
      state: 'open', // discussions don't carry a state column in our schema
      is_answered: r.is_answered,
      comments_count: r.comments_count,
      html_url: r.html_url,
      summary_attempts: r.summary_attempts,
    });
  }

  return out;
}

export interface ItemComment {
  author_login: string | null;
  body: string;
  created_at_gh: string | null;
  role: 'founder' | 'core' | 'community';
}

export async function fetchItemComments(
  db: SupabaseClient,
  kind: 'issue' | 'pull_request' | 'discussion',
  parentId: number,
): Promise<ItemComment[]> {
  // For PRs we also include review bodies + review comments — the summary
  // should see the whole conversation, not just the issue-style comments.
  if (kind === 'issue') {
    const { data, error } = await db
      .from('issue_comments')
      .select('author_login, body, created_at_gh, role')
      .eq('issue_id', parentId)
      .order('created_at_gh', { ascending: true })
      .returns<ItemComment[]>();
    if (error) throw new Error(`fetchItemComments issue: ${error.message}`);
    return (data ?? []).map((c) => ({ ...c, role: c.role ?? 'community' }));
  }
  if (kind === 'pull_request') {
    const [conv, reviews] = await Promise.all([
      db
        .from('pr_comments')
        .select('author_login, body, created_at_gh, role')
        .eq('pr_id', parentId)
        .order('created_at_gh', { ascending: true })
        .returns<ItemComment[]>(),
      db
        .from('pr_reviews')
        .select('author_login, body, submitted_at, role, state')
        .eq('pr_id', parentId)
        .order('submitted_at', { ascending: true })
        .returns<Array<{
          author_login: string | null;
          body: string | null;
          submitted_at: string | null;
          role: 'founder' | 'core' | 'community' | null;
          state: string;
        }>>(),
    ]);
    if (conv.error) throw new Error(`fetchItemComments pr conv: ${conv.error.message}`);
    if (reviews.error) throw new Error(`fetchItemComments pr reviews: ${reviews.error.message}`);
    const out: ItemComment[] = (conv.data ?? []).map((c) => ({
      ...c,
      role: c.role ?? 'community',
    }));
    for (const rv of reviews.data ?? []) {
      const body = rv.body && rv.body.trim()
        ? `[review: ${rv.state}] ${rv.body}`
        : `[review: ${rv.state}]`;
      out.push({
        author_login: rv.author_login,
        body,
        created_at_gh: rv.submitted_at,
        role: rv.role ?? 'community',
      });
    }
    return out.sort((a, b) =>
      Date.parse(a.created_at_gh ?? '0') - Date.parse(b.created_at_gh ?? '0'),
    );
  }
  // discussion
  const { data, error } = await db
    .from('discussion_comments')
    .select('author_login, body, created_at_gh, role')
    .eq('discussion_id', parentId)
    .order('created_at_gh', { ascending: true })
    .returns<ItemComment[]>();
  if (error) throw new Error(`fetchItemComments discussion: ${error.message}`);
  return (data ?? []).map((c) => ({ ...c, role: c.role ?? 'community' }));
}

export interface ItemSummaryWrite {
  summary: string;
  consensus: string;
  consensus_chip: string;
  sentiment: 'calm' | 'mixed' | 'contentious' | null;
  key_points: unknown[];
  decisions: unknown[];
  founder_quotes: unknown[];
  model: string;
}

export async function writeItemSummary(
  db: SupabaseClient,
  kind: 'issue' | 'pull_request' | 'discussion',
  itemId: number,
  out: ItemSummaryWrite,
  snapshot: {
    comments_count: number;
    state: string;
    is_merged?: boolean;
    is_answered?: boolean;
  },
): Promise<void> {
  const table = kind === 'issue' ? 'issues' : kind === 'pull_request' ? 'pull_requests' : 'discussions';
  const update: Record<string, unknown> = {
    summary: out.summary,
    consensus: out.consensus,
    consensus_chip: out.consensus_chip,
    sentiment: out.sentiment,
    key_points: out.key_points,
    decisions: out.decisions,
    founder_quotes: out.founder_quotes,
    summary_status: 'done',
    summarized_at: new Date().toISOString(),
    model: out.model,
    last_summarized_comment_count: snapshot.comments_count,
  };
  if (kind === 'issue' || kind === 'pull_request') {
    update.last_summarized_state = snapshot.state;
  }
  if (kind === 'pull_request') {
    update.last_summarized_is_merged = snapshot.is_merged ?? false;
  }
  if (kind === 'discussion') {
    update.last_summarized_is_answered = snapshot.is_answered ?? false;
  }
  const { error } = await db.from(table).update(update).eq('id', itemId);
  if (error) throw new Error(`writeItemSummary ${kind}/${itemId}: ${error.message}`);
}

export async function markItemError(
  db: SupabaseClient,
  kind: 'issue' | 'pull_request' | 'discussion',
  itemId: number,
  errorText: string,
  attempts: number,
): Promise<void> {
  const table = kind === 'issue' ? 'issues' : kind === 'pull_request' ? 'pull_requests' : 'discussions';
  const nextAttempts = attempts + 1;
  const update: Record<string, unknown> = {
    summary_attempts: nextAttempts,
    summary_error: errorText.slice(0, 1000),
  };
  if (nextAttempts >= 5) update.summary_status = 'error';
  const { error } = await db.from(table).update(update).eq('id', itemId);
  if (error) throw new Error(`markItemError ${kind}/${itemId}: ${error.message}`);
}

export interface PendingRelease {
  id: number;
  repo_id: number;
  repo_name: string;
  tag_name: string;
  release_name: string | null;
  body: string | null;
  html_url: string;
  summary_attempts: number;
}

export async function fetchPendingReleases(
  db: SupabaseClient,
  limit = 30,
): Promise<PendingRelease[]> {
  const { data, error } = await db
    .from('releases')
    .select(
      'id, repo_id, tag_name, name, body, html_url, summary_attempts, repos:repo_id(name)',
    )
    .eq('summary_status', 'pending')
    .lt('summary_attempts', 5)
    .order('published_at', { ascending: true })
    .limit(limit)
    .returns<Array<{
      id: number;
      repo_id: number;
      tag_name: string;
      name: string | null;
      body: string | null;
      html_url: string;
      summary_attempts: number;
      repos: { name: string } | null;
    }>>();
  if (error) throw new Error(`fetchPendingReleases: ${error.message}`);
  return (data ?? []).map((r) => ({
    id: r.id,
    repo_id: r.repo_id,
    repo_name: r.repos?.name ?? 'unknown',
    tag_name: r.tag_name,
    release_name: r.name,
    body: r.body,
    html_url: r.html_url,
    summary_attempts: r.summary_attempts,
  }));
}

export async function writeReleaseSummary(
  db: SupabaseClient,
  releaseId: number,
  summary: string,
  model: string,
): Promise<void> {
  const { error } = await db
    .from('releases')
    .update({
      summary,
      summary_status: 'done',
      summarized_at: new Date().toISOString(),
      model,
    })
    .eq('id', releaseId);
  if (error) throw new Error(`writeReleaseSummary ${releaseId}: ${error.message}`);
}

export async function markReleaseError(
  db: SupabaseClient,
  releaseId: number,
  errorText: string,
  attempts: number,
): Promise<void> {
  const nextAttempts = attempts + 1;
  const update: Record<string, unknown> = { summary_attempts: nextAttempts };
  if (nextAttempts >= 5) update.summary_status = 'error';
  const { error } = await db.from('releases').update(update).eq('id', releaseId);
  if (error) throw new Error(`markReleaseError ${releaseId}: ${error.message}`);
}

export async function markReleaseSkipped(
  db: SupabaseClient,
  releaseId: number,
): Promise<void> {
  const { error } = await db
    .from('releases')
    .update({ summary_status: 'skipped' })
    .eq('id', releaseId);
  if (error) throw new Error(`markReleaseSkipped ${releaseId}: ${error.message}`);
}

export interface OrgDigestWrite {
  run_id: number;
  edition_date: string;
  headline: string;
  standfirst: string | null;
  body_md: string;
  counts: Record<string, unknown>;
  top_items: unknown[];
  releases: unknown[];
  founder_activity: unknown[];
  model: string;
}

export async function upsertOrgDigest(
  db: SupabaseClient,
  d: OrgDigestWrite,
): Promise<number> {
  const { data, error } = await db
    .from('org_digests')
    .upsert(d, { onConflict: 'run_id' })
    .select('id')
    .single();
  if (error) throw new Error(`upsertOrgDigest run ${d.run_id}: ${error.message}`);
  return data.id as number;
}

export interface LlmCallRow {
  run_id: number | null;
  purpose: string;
  model: string;
  subject_type: string | null;
  subject_id: number | null;
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
  latency_ms: number;
  status: 'ok' | 'error';
  error_text?: string | null;
}

export async function recordLlmCall(db: SupabaseClient, row: LlmCallRow): Promise<void> {
  const { error } = await db.from('llm_calls').insert(row);
  if (error) {
    // Telemetry failure shouldn't kill the whole run — log and continue.
    console.warn(`recordLlmCall: ${error.message}`);
  }
}
