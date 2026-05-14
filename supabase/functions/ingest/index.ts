// supabase/functions/ingest/index.ts
//
// Stage 1 of the pipeline: GitHub → Postgres. Boring and reliable.
// Invoked by pg_cron once a day via pg_net, with the service-role key as bearer.
//
// Auth: handled by the Supabase platform, not by us.
//   - Locally: config.toml sets `verify_jwt = false` for this function, so
//     `supabase functions serve` accepts unauthenticated invocations.
//   - In production: deploy with the default `verify_jwt = true`. The platform
//     validates the bearer; pg_cron passes the service-role key from Vault.
//     Outsiders without a valid key get 401 *before* our code runs.
//
// Flow:
//   1. Open a runs row (status='running').
//   3. Read the org_repos watermark. If empty, bootstrap to now() - 30d.
//   4. List the org. Skip archived + forks. Upsert repos.
//   5. For each repo, in series (gentle on rate limits):
//        commits (since), releases (filter), issues+PRs (since), comments,
//        PR detail + reviews + review-comments, discussions (GraphQL).
//   6. Founder/role tagging happens at write time via _shared/founders.
//   7. Close the run with status='ok' and advance the watermark.
//   8. On error: status='error', error_text set, watermark NOT advanced.

import { createServiceClient } from '../_shared/db.ts';
import {
  closeRun,
  markPendingIfMaterialDiscussion,
  markPendingIfMaterialIssue,
  markPendingIfMaterialPullRequest,
  openRun,
  reapStaleRuns,
  setRepoWatermark,
  upsertCommit,
  upsertDiscussion,
  upsertDiscussionComment,
  upsertIssue,
  upsertIssueComment,
  upsertPrComment,
  upsertPrConversationComment,
  upsertPrReview,
  upsertPullRequest,
  upsertRelease,
  upsertRepo,
} from '../_shared/db.ts';
import { GitHubClient } from '../_shared/github.ts';
import { anyFounder, type FoundersIndex, loadFoundersIndex } from '../_shared/founders.ts';
import { requireServiceRole } from '../_shared/auth.ts';
import { pool } from '../_shared/concurrency.ts';
import type { GhRepo } from '../_shared/types.ts';
import type { SupabaseClient } from '@supabase/supabase-js';

const ORG = Deno.env.get('GASETTA_ORG') ?? 'neo-project';
const BOOTSTRAP_DAYS = Number(Deno.env.get('GASETTA_BOOTSTRAP_DAYS') ?? '30');
// Cap per-run work so we never blow the function timeout. Tune later.
const MAX_REPOS_PER_RUN = Number(Deno.env.get('GASETTA_MAX_REPOS_PER_RUN') ?? '60');
// Bounded parallelism across repos. GitHub's quota is a per-hour budget
// (5000 req/h authenticated), not a per-second rate — concurrency is limited
// by total volume, not request bursts. 5 is safe; tune up on larger PATs.
// CRITICAL: never parallelize calls within a single repo's pipeline (a hot PR
// with hundreds of comments would otherwise hammer one endpoint). Each worker
// handles one full repo at a time, serially.
const REPO_CONCURRENCY = Math.max(1, Number(Deno.env.get('INGEST_REPO_CONCURRENCY') ?? '5'));

Deno.serve(async (req) => {
  // Service-role only. The gateway already validated the JWT signature; we
  // additionally require the JWT's role claim is 'service_role' so that an
  // authenticated user (anyone with a Supabase Auth account) can't trigger
  // GitHub API + OpenAI calls on our dime.
  const denied = requireServiceRole(req);
  if (denied) return denied;

  const ghToken = Deno.env.get('GITHUB_TOKEN');
  if (!ghToken) {
    return new Response(JSON.stringify({ error: 'GITHUB_TOKEN missing' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }

  const db = createServiceClient();
  const gh = new GitHubClient({ token: ghToken });

  // Reap any orphaned `running` rows from earlier invocations that crashed,
  // timed out, or were interrupted. Keeps the runs table honest.
  const reaped = await reapStaleRuns(db);
  if (reaped > 0) console.log(`reaped ${reaped} stale running run(s)`);

  // Each repo carries its own `last_ingested_at`. We pick that up *inside*
  // ingestOneRepo so a wall-clock-killed worker leaves already-finished repos
  // checkpointed. The run row's window bounds reflect the overall span this
  // invocation might touch — purely diagnostic, not a watermark.
  const invocationStart = new Date().toISOString();
  const bootstrapStart = new Date(Date.now() - BOOTSTRAP_DAYS * 86_400_000).toISOString();

  const runId = await openRun(db, {
    window_start: bootstrapStart,
    window_end: invocationStart,
  });
  let reposSeen = 0;
  let itemsIngested = 0;

  try {
    const founders = await loadFoundersIndex(db);

    // ── repos ──
    // Sort: stalest watermark first, then any GitHub repos we've never seen
    // (no DB row yet). This lets follow-up invocations finish backfills
    // predictably — the worker spends its budget on repos that actually
    // need it.
    const allRepos = await gh.listOrgRepos(ORG);
    const live = allRepos.filter((r) => !r.archived && !r.fork);
    const { data: existingRows } = await db
      .from('repos')
      .select('github_id, last_ingested_at')
      .returns<{ github_id: number; last_ingested_at: string | null }[]>();
    const wmByGhId = new Map<number, string | null>();
    for (const row of existingRows ?? []) wmByGhId.set(row.github_id, row.last_ingested_at);
    const sorted = [...live].sort((a, b) => {
      const aw = wmByGhId.get(a.id) ?? null;
      const bw = wmByGhId.get(b.id) ?? null;
      // null (never ingested) sorts before any real watermark.
      if (aw === null && bw === null) return 0;
      if (aw === null) return -1;
      if (bw === null) return 1;
      return aw < bw ? -1 : aw > bw ? 1 : 0;
    });
    const targets = sorted.slice(0, MAX_REPOS_PER_RUN);

    console.log(
      `[ingest] processing ${targets.length} repos (stalest first) ` +
        `with concurrency ${REPO_CONCURRENCY}`,
    );
    const perRepoResults = await pool(targets, REPO_CONCURRENCY, (r) =>
      ingestOneRepo(db, gh, runId, founders, bootstrapStart, r),
    );
    for (const r of perRepoResults) {
      reposSeen += r.reposSeen;
      itemsIngested += r.itemsIngested;
    }

    await closeRun(db, runId, 'ok', {
      repos_seen: reposSeen,
      items_ingested: itemsIngested,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        run_id: runId,
        repos_seen: reposSeen,
        items_ingested: itemsIngested,
        invocation_start: invocationStart,
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await closeRun(db, runId, 'error', {
      repos_seen: reposSeen,
      items_ingested: itemsIngested,
      error_text: msg.slice(0, 4000),
    });
    return new Response(
      JSON.stringify({ ok: false, run_id: runId, error: msg }),
      { status: 500, headers: { 'content-type': 'application/json' } },
    );
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Per-repo pipeline. Sequential within a repo (we don't want to slam one
// repo's API endpoints), but the outer pool runs N of these in parallel.
// One bad repo logs and returns zero counts; never fails the whole run.
// ─────────────────────────────────────────────────────────────────────────────
async function ingestOneRepo(
  db: SupabaseClient,
  gh: GitHubClient,
  runId: number,
  founders: FoundersIndex,
  bootstrapStart: string,
  r: GhRepo,
): Promise<{ reposSeen: number; itemsIngested: number }> {
  let itemsIngested = 0;
  // Mark the moment we *start* this repo. We advance the per-repo watermark to
  // this value only after the whole pipeline finishes — so any error short of
  // a successful return leaves the watermark untouched, and the next
  // invocation re-pulls from the same point.
  const repoWindowEnd = new Date().toISOString();
  try {
    const repo = await upsertRepo(db, r);
    const [owner, name] = r.full_name.split('/');
    const windowStart = repo.last_ingested_at ?? bootstrapStart;
    console.log(
      `[ingest] ${r.full_name}: window ${windowStart} → ${repoWindowEnd}`,
    );

    // ── commits ──
    try {
      const commits = await gh.listCommits(owner, name, windowStart);
      for (const c of commits) {
        await upsertCommit(db, repo.id, runId, c, founders);
        itemsIngested++;
      }
    } catch (e) {
      // 409 (empty repo) etc — log and continue.
      console.warn(`commits ${r.full_name}: ${(e as Error).message}`);
    }

    // ── releases ──
    try {
      const releases = await gh.listReleasesSince(owner, name, windowStart);
      for (const rel of releases) {
        await upsertRelease(db, repo.id, runId, rel);
        itemsIngested++;
      }
    } catch (e) {
      console.warn(`releases ${r.full_name}: ${(e as Error).message}`);
    }

    // ── issues + PRs (single endpoint, split by pull_request key) ──
    let issuesAndPrs: Awaited<ReturnType<typeof gh.listIssuesAndPrs>> = [];
    try {
      issuesAndPrs = await gh.listIssuesAndPrs(owner, name, windowStart);
    } catch (e) {
      console.warn(`issues ${r.full_name}: ${(e as Error).message}`);
    }

    for (const item of issuesAndPrs) {
      const isPR = !!item.pull_request;
      let comments: Awaited<ReturnType<typeof gh.listIssueComments>> = [];
      try {
        comments = await gh.listIssueComments(owner, name, item.number);
      } catch (e) {
        console.warn(`comments ${r.full_name}#${item.number}: ${(e as Error).message}`);
      }

      const founderInvolved = anyFounder(
        founders,
        item.user?.login,
        ...comments.map((c) => c.user?.login ?? null),
      );

      if (isPR) {
        let detail: Awaited<ReturnType<typeof gh.getPull>>;
        try {
          detail = await gh.getPull(owner, name, item.number);
        } catch (e) {
          console.warn(`pull detail ${r.full_name}#${item.number}: ${(e as Error).message}`);
          continue;
        }
        let reviews: Awaited<ReturnType<typeof gh.listPullReviews>> = [];
        let reviewComments: Awaited<ReturnType<typeof gh.listPullReviewComments>> = [];
        try {
          reviews = await gh.listPullReviews(owner, name, item.number);
          reviewComments = await gh.listPullReviewComments(owner, name, item.number);
        } catch (e) {
          console.warn(`reviews ${r.full_name}#${item.number}: ${(e as Error).message}`);
        }
        const founderInvolvedFull =
          founderInvolved ||
          anyFounder(founders, ...reviews.map((rv) => rv.user?.login ?? null)) ||
          anyFounder(founders, ...reviewComments.map((rc) => rc.user?.login ?? null));

        // Distinct participants = author + everyone who left a conversation
        // comment, review, or review comment. Drives "👥 N" on the card.
        const prParticipants = new Set<string>();
        if (item.user?.login) prParticipants.add(item.user.login);
        for (const c of comments) if (c.user?.login) prParticipants.add(c.user.login);
        for (const rv of reviews) if (rv.user?.login) prParticipants.add(rv.user.login);
        for (const rc of reviewComments) if (rc.user?.login) prParticipants.add(rc.user.login);

        const up = await upsertPullRequest(
          db,
          repo.id,
          runId,
          item,
          detail,
          founderInvolvedFull,
          prParticipants.size,
        );
        itemsIngested++;
        for (const c of comments) await upsertPrConversationComment(db, up.id, c, founders);
        for (const rv of reviews) await upsertPrReview(db, up.id, rv, founders);
        for (const rc of reviewComments) await upsertPrComment(db, up.id, rc, founders);
        await markPendingIfMaterialPullRequest(db, up.id);
      } else {
        const issueParticipants = new Set<string>();
        if (item.user?.login) issueParticipants.add(item.user.login);
        for (const c of comments) if (c.user?.login) issueParticipants.add(c.user.login);

        const up = await upsertIssue(
          db,
          repo.id,
          runId,
          item,
          founderInvolved,
          issueParticipants.size,
        );
        itemsIngested++;
        for (const c of comments) await upsertIssueComment(db, up.id, c, founders);
        await markPendingIfMaterialIssue(db, up.id);
      }
    }

    // ── discussions ──
    try {
      const discussions = await gh.listDiscussionsSince(owner, name, windowStart);
      for (const d of discussions) {
        const directCommentAuthors = d.comments.nodes.map((c) => c.author?.login ?? null);
        const replyAuthors = d.comments.nodes.flatMap(
          (c) => c.replies?.nodes.map((rep) => rep.author?.login ?? null) ?? [],
        );
        const dFounderInvolved = anyFounder(
          founders,
          d.author?.login,
          ...directCommentAuthors,
          ...replyAuthors,
        );

        const dParticipants = new Set<string>();
        if (d.author?.login) dParticipants.add(d.author.login);
        for (const a of directCommentAuthors) if (a) dParticipants.add(a);
        for (const a of replyAuthors) if (a) dParticipants.add(a);

        const up = await upsertDiscussion(
          db,
          repo.id,
          runId,
          d,
          dFounderInvolved,
          dParticipants.size,
        );
        itemsIngested++;
        for (const c of d.comments.nodes) {
          const cId = await upsertDiscussionComment(db, up.id, null, c, founders);
          for (const reply of c.replies?.nodes ?? []) {
            await upsertDiscussionComment(db, up.id, cId, reply, founders);
          }
        }
        await markPendingIfMaterialDiscussion(db, up.id);
      }
    } catch (e) {
      console.warn(`discussions ${r.full_name}: ${(e as Error).message}`);
    }

    // Checkpoint *this* repo so the next invocation skips it (or pulls only
    // a small delta). Done last on purpose — partial failures above leave the
    // watermark where it was and the next run retries from there.
    await setRepoWatermark(db, repo.id, repoWindowEnd);
    return { reposSeen: 1, itemsIngested };
  } catch (e) {
    // Whole-repo failure (e.g. upsertRepo crash). Log and let other repos run.
    console.warn(`[ingest] repo ${r.full_name} failed: ${(e as Error).message}`);
    return { reposSeen: 0, itemsIngested };
  }
}
