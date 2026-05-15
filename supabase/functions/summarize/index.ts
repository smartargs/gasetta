import {
  createServiceClient,
  fetchItemComments,
  fetchLatestOkRun,
  fetchPendingItems,
  fetchPendingReleases,
  markItemError,
  markReleaseError,
  markReleaseSkipped,
  recordLlmCall,
  upsertOrgDigest,
  writeItemSummary,
  writeReleaseSummary,
  type ItemSummaryWrite,
  type PendingItem,
} from '../_shared/db.ts';
import { OpenAIClient, parseJSON } from '../_shared/openai.ts';
import { requireServiceRole } from '../_shared/auth.ts';
import { pool } from '../_shared/concurrency.ts';
import {
  buildItemUserPrompt,
  buildOrgDigestUserPrompt,
  buildReleaseUserPrompt,
  ITEM_SYSTEM,
  ORG_SYSTEM,
  RELEASE_SYSTEM,
  type OrgDigestInput,
  type OrgDigestInputFounderActivity,
  type OrgDigestInputItem,
  type OrgDigestInputRelease,
} from '../_shared/prompts.ts';

const MODEL_ITEM = Deno.env.get('OPENAI_MODEL_ITEM') ?? 'gpt-4o-mini';
const MODEL_RELEASE = Deno.env.get('OPENAI_MODEL_RELEASE') ?? 'gpt-4o-mini';
const MODEL_ORG = Deno.env.get('OPENAI_MODEL_ORG') ?? 'gpt-4o';
const ITEM_LIMIT = Number(Deno.env.get('SUMMARIZE_ITEM_LIMIT') ?? '50');
const RELEASE_LIMIT = Number(Deno.env.get('SUMMARIZE_RELEASE_LIMIT') ?? '20');
// Bounded parallelism for per-item + release summaries. Default 5 keeps us
// safely under OpenAI Tier 1 rate limits (200k TPM gpt-4o-mini ≈ 60-80 RPM at
// our average prompt size). Bump for higher tiers; lower for safety.
const ITEM_CONCURRENCY = Math.max(1, Number(Deno.env.get('SUMMARIZE_CONCURRENCY') ?? '5'));

interface ItemModelOutput {
  summary: string;
  framing?: string;
  consensus: string;
  consensus_chip: string;
  sentiment: 'calm' | 'mixed' | 'contentious';
  key_points: string[];
  decisions: { text: string; by: string }[];
  bullets?: { weight: string; text: string }[];
  founder_involved: boolean;
  founder_quotes: { who: string; name: string; text: string; stance?: string }[];
}

interface ReleaseModelOutput {
  summary: string;
}

interface OrgDigestModelOutput {
  headline: string;
  standfirst: string;
  body_md: string;
  issue_trends: string;
  top_items: {
    kind: string;
    repo: string;
    number: number;
    title: string;
    url: string;
    why: string;
  }[];
  releases: { repo: string; tag: string; summary: string }[];
  founder_activity: {
    login: string;
    name: string;
    where: string;
    quote: string;
  }[];
  counts: {
    repos_active: number;
    releases: number;
    hot_threads: number;
    founder_touched: number;
  };
}

Deno.serve(async (req) => {
  const denied = requireServiceRole(req);
  if (denied) return denied;

  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiKey) {
    return new Response(
      JSON.stringify({ ok: false, error: 'OPENAI_API_KEY missing' }),
      { status: 500, headers: { 'content-type': 'application/json' } },
    );
  }

  const db = createServiceClient();
  const openai = new OpenAIClient(openaiKey);

  // Per-item summaries always run. The org_digest is opt-in via ?digest=true
  // (kept for one-off manual recaps); the stream model doesn't drive the
  // masthead from it anymore.
  const doDigest = new URL(req.url).searchParams.get('digest') === 'true';

  const run = await fetchLatestOkRun(db);
  if (!run) {
    return new Response(
      JSON.stringify({ ok: true, message: 'no ok run to summarize' }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  }

  const result = {
    run_id: run.id,
    items_summarized: 0,
    items_errored: 0,
    releases_summarized: 0,
    releases_skipped: 0,
    releases_errored: 0,
    org_digest_written: false,
    total_cost_usd: 0,
  };

  // ── 1. Per-item summaries (bounded parallel) ──────────────────────────────
  const pendingItems = await fetchPendingItems(db, ITEM_LIMIT);
  console.log(
    `[summarize] ${pendingItems.length} pending items, concurrency ${ITEM_CONCURRENCY}`,
  );
  await pool(pendingItems, ITEM_CONCURRENCY, async (item) => {
    try {
      const cost = await summarizeOneItem(db, openai, run.id, item);
      result.items_summarized++;
      result.total_cost_usd += cost;
    } catch (e) {
      result.items_errored++;
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[summarize] ${item.kind}/${item.id}: ${msg}`);
      await markItemError(db, item.kind, item.id, msg, item.summary_attempts);
      await recordLlmCall(db, {
        run_id: run.id,
        purpose: 'item_summary',
        model: MODEL_ITEM,
        subject_type: item.kind,
        subject_id: item.id,
        tokens_in: 0,
        tokens_out: 0,
        cost_usd: 0,
        latency_ms: 0,
        status: 'error',
        error_text: msg.slice(0, 1000),
      });
    }
  });

  // ── 2. Releases (also parallel) ───────────────────────────────────────────
  const pendingReleases = await fetchPendingReleases(db, RELEASE_LIMIT);
  console.log(`[summarize] ${pendingReleases.length} pending releases`);
  await pool(pendingReleases, ITEM_CONCURRENCY, async (rel) => {
    // Cheap pre-flight: skip releases that are pure dependabot/noise — no LLM
    // call, no error. The UI already falls back to the body slice, so the user
    // sees what GitHub itself shows. Saves tokens and keeps the digest signal-y.
    if (isReleaseNoise(rel.body)) {
      await markReleaseSkipped(db, rel.id);
      result.releases_skipped++;
      return;
    }
    try {
      const res = await openai.chatJSON({
        model: MODEL_RELEASE,
        system: RELEASE_SYSTEM,
        user: buildReleaseUserPrompt({
          repo: rel.repo_name,
          tagName: rel.tag_name,
          releaseName: rel.release_name,
          body: rel.body,
        }),
        max_tokens: 400,
      });
      const out = parseJSON<ReleaseModelOutput>(res.content);
      await writeReleaseSummary(db, rel.id, out.summary, res.model);
      await recordLlmCall(db, {
        run_id: run.id,
        purpose: 'release_summary',
        model: res.model,
        subject_type: 'release',
        subject_id: rel.id,
        tokens_in: res.usage.prompt_tokens,
        tokens_out: res.usage.completion_tokens,
        cost_usd: res.cost_usd,
        latency_ms: res.latency_ms,
        status: 'ok',
      });
      result.releases_summarized++;
      result.total_cost_usd += res.cost_usd;
    } catch (e) {
      result.releases_errored++;
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[summarize] release ${rel.id}: ${msg}`);
      await markReleaseError(db, rel.id, msg, rel.summary_attempts);
    }
  });

  // ── 3. Org digest (manual, opt-in via ?digest=true) ──────────────────────
  if (doDigest) {
    try {
      const digestCost = await synthesizeOrgDigest(db, openai, run.id);
      result.org_digest_written = digestCost !== null;
      if (digestCost !== null) result.total_cost_usd += digestCost;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[summarize] org_digest: ${msg}`);
    }
  }

  return new Response(JSON.stringify({ ok: true, ...result }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
});

// ── per-item helper ─────────────────────────────────────────────────────────
async function summarizeOneItem(
  db: ReturnType<typeof createServiceClient>,
  openai: OpenAIClient,
  runId: number,
  item: PendingItem,
): Promise<number> {
  const comments = await fetchItemComments(db, item.kind, item.id);
  const typeLabel: 'issue' | 'pull request' | 'discussion' =
    item.kind === 'pull_request' ? 'pull request' : item.kind;

  const res = await openai.chatJSON({
    model: MODEL_ITEM,
    system: ITEM_SYSTEM,
    user: buildItemUserPrompt({
      type: typeLabel,
      repo: item.repo_name,
      title: item.title,
      body: item.body,
      author: item.author_login,
      state: item.state,
      isMerged: item.is_merged,
      isAnswered: item.is_answered,
      comments: comments.map((c) => ({
        author: c.author_login,
        role: c.role,
        body: c.body,
        createdAt: c.created_at_gh,
      })),
    }),
    max_tokens: 1200,
  });

  const parsed = parseJSON<ItemModelOutput>(res.content);

  // Build key_points + decisions arrays defensively — older models sometimes
  // omit fields when empty.
  const write: ItemSummaryWrite = {
    summary: parsed.summary,
    consensus: parsed.consensus,
    consensus_chip: parsed.consensus_chip,
    sentiment: parsed.sentiment ?? null,
    key_points: parsed.key_points ?? [],
    decisions: parsed.decisions ?? [],
    founder_quotes: parsed.founder_quotes ?? [],
    model: res.model,
  };
  // Optional: stash framing + bullets into key_points if present, so the
  // /threads page can render the full consensus block. Simple JSON, schema
  // allows it (jsonb).
  if (parsed.framing || parsed.bullets) {
    write.key_points = {
      points: parsed.key_points ?? [],
      framing: parsed.framing ?? null,
      bullets: parsed.bullets ?? [],
    } as unknown as unknown[];
  }

  await writeItemSummary(db, item.kind, item.id, write, {
    comments_count: item.comments_count,
    state: item.state,
    is_merged: item.is_merged,
    is_answered: item.is_answered,
  });

  await recordLlmCall(db, {
    run_id: runId,
    purpose: 'item_summary',
    model: res.model,
    subject_type: item.kind,
    subject_id: item.id,
    tokens_in: res.usage.prompt_tokens,
    tokens_out: res.usage.completion_tokens,
    cost_usd: res.cost_usd,
    latency_ms: res.latency_ms,
    status: 'ok',
  });

  return res.cost_usd;
}

// ── org digest helper ───────────────────────────────────────────────────────
async function synthesizeOrgDigest(
  db: ReturnType<typeof createServiceClient>,
  openai: OpenAIClient,
  runId: number,
): Promise<number | null> {
  const issuesRes = await db
    .from('issues')
    .select(
      'number, title, html_url, summary, consensus_chip, sentiment, founder_involved, comments_count, repos:repo_id(name)',
    )
    .eq('summary_status', 'done')
    .not('summary', 'is', null)
    .order('comments_count', { ascending: false })
    .limit(30)
    .returns<Array<{
      number: number;
      title: string;
      html_url: string;
      summary: string;
      consensus_chip: string;
      sentiment: string;
      founder_involved: boolean;
      comments_count: number;
      repos: { name: string } | null;
    }>>();
  const prsRes = await db
    .from('pull_requests')
    .select(
      'number, title, html_url, summary, consensus_chip, sentiment, founder_involved, comments_count, repos:repo_id(name)',
    )
    .eq('summary_status', 'done')
    .not('summary', 'is', null)
    .order('comments_count', { ascending: false })
    .limit(30)
    .returns<Array<{
      number: number;
      title: string;
      html_url: string;
      summary: string;
      consensus_chip: string;
      sentiment: string;
      founder_involved: boolean;
      comments_count: number;
      repos: { name: string } | null;
    }>>();
  const discRes = await db
    .from('discussions')
    .select(
      'number, title, html_url, summary, consensus_chip, sentiment, founder_involved, comments_count, repos:repo_id(name)',
    )
    .eq('summary_status', 'done')
    .not('summary', 'is', null)
    .order('comments_count', { ascending: false })
    .limit(20)
    .returns<Array<{
      number: number;
      title: string;
      html_url: string;
      summary: string;
      consensus_chip: string;
      sentiment: string;
      founder_involved: boolean;
      comments_count: number;
      repos: { name: string } | null;
    }>>();
  const relRes = await db
    .from('releases')
    .select('tag_name, summary, html_url, repos:repo_id(name)')
    .eq('summary_status', 'done')
    .not('summary', 'is', null)
    .order('published_at', { ascending: false })
    .limit(10)
    .returns<Array<{
      tag_name: string;
      summary: string;
      html_url: string;
      repos: { name: string } | null;
    }>>();

  const items: OrgDigestInputItem[] = [
    ...(issuesRes.data ?? []).map((i) => ({
      kind: 'issue' as const,
      repo: i.repos?.name ?? 'unknown',
      number: i.number,
      title: i.title,
      url: i.html_url,
      summary: i.summary,
      consensus_chip: i.consensus_chip,
      sentiment: i.sentiment,
      founder_involved: i.founder_involved,
      comments_count: i.comments_count,
    })),
    ...(prsRes.data ?? []).map((p) => ({
      kind: 'pull request' as const,
      repo: p.repos?.name ?? 'unknown',
      number: p.number,
      title: p.title,
      url: p.html_url,
      summary: p.summary,
      consensus_chip: p.consensus_chip,
      sentiment: p.sentiment,
      founder_involved: p.founder_involved,
      comments_count: p.comments_count,
    })),
    ...(discRes.data ?? []).map((d) => ({
      kind: 'discussion' as const,
      repo: d.repos?.name ?? 'unknown',
      number: d.number,
      title: d.title,
      url: d.html_url,
      summary: d.summary,
      consensus_chip: d.consensus_chip,
      sentiment: d.sentiment,
      founder_involved: d.founder_involved,
      comments_count: d.comments_count,
    })),
  ];

  if (!items.length) {
    console.log('[summarize] no done items — skipping org_digest');
    return null;
  }

  const releases: OrgDigestInputRelease[] = (relRes.data ?? []).map((r) => ({
    repo: r.repos?.name ?? 'unknown',
    tag: r.tag_name,
    summary: r.summary,
    url: r.html_url,
  }));

  // Founder activity: top recent founder-tagged comments from across all
  // comment tables. Same query shape as the FE data loader.
  const founderActivity = await loadFounderActivity(db);

  // Repo activity counts: how many items per repo (rough proxy for "active").
  const repoCounts: Record<string, number> = {};
  for (const it of items) repoCounts[it.repo] = (repoCounts[it.repo] ?? 0) + 1;

  const editionDate = new Date().toISOString().slice(0, 10);
  const input: OrgDigestInput = {
    editionDate,
    items,
    releases,
    founderActivity,
    repoCounts,
  };

  const res = await openai.chatJSON({
    model: MODEL_ORG,
    system: ORG_SYSTEM,
    user: buildOrgDigestUserPrompt(input),
    max_tokens: 2500,
  });

  const out = parseJSON<OrgDigestModelOutput>(res.content);

  await upsertOrgDigest(db, {
    run_id: runId,
    edition_date: editionDate,
    headline: out.headline,
    standfirst: out.standfirst,
    body_md: out.body_md,
    counts: out.counts as Record<string, unknown>,
    top_items: out.top_items as unknown[],
    releases: out.releases as unknown[],
    founder_activity: out.founder_activity as unknown[],
    model: res.model,
  });

  await recordLlmCall(db, {
    run_id: runId,
    purpose: 'org_digest',
    model: res.model,
    subject_type: 'org',
    subject_id: runId,
    tokens_in: res.usage.prompt_tokens,
    tokens_out: res.usage.completion_tokens,
    cost_usd: res.cost_usd,
    latency_ms: res.latency_ms,
    status: 'ok',
  });

  console.log(
    `[summarize] org_digest written for run ${runId} (${out.headline}) — $${res.cost_usd.toFixed(4)}`,
  );
  return res.cost_usd;
}

async function loadFounderActivity(
  db: ReturnType<typeof createServiceClient>,
): Promise<OrgDigestInputFounderActivity[]> {
  const [iss, pr, disc] = await Promise.all([
    db
      .from('issue_comments')
      .select(
        'body, author_login, created_at_gh, issues:issue_id(number, title, repos:repo_id(name))',
      )
      .eq('is_founder', true)
      .order('created_at_gh', { ascending: false })
      .limit(5)
      .returns<Array<{
        body: string;
        author_login: string | null;
        created_at_gh: string | null;
        issues: { number: number; title: string; repos: { name: string } | null } | null;
      }>>(),
    db
      .from('pr_comments')
      .select(
        'body, author_login, created_at_gh, pull_requests:pr_id(number, title, repos:repo_id(name))',
      )
      .eq('is_founder', true)
      .order('created_at_gh', { ascending: false })
      .limit(5)
      .returns<Array<{
        body: string;
        author_login: string | null;
        created_at_gh: string | null;
        pull_requests: { number: number; title: string; repos: { name: string } | null } | null;
      }>>(),
    db
      .from('discussion_comments')
      .select(
        'body, author_login, created_at_gh, discussions:discussion_id(number, title, repos:repo_id(name))',
      )
      .eq('is_founder', true)
      .order('created_at_gh', { ascending: false })
      .limit(5)
      .returns<Array<{
        body: string;
        author_login: string | null;
        created_at_gh: string | null;
        discussions: { number: number; title: string; repos: { name: string } | null } | null;
      }>>(),
  ]);

  const flat: OrgDigestInputFounderActivity[] = [];
  const displayName = (l: string | null) =>
    l === 'erikzhang' ? 'Erik Zhang' : l === 'dahongfei' ? 'Da Hongfei' : (l ?? 'Unknown');
  for (const r of iss.data ?? []) {
    if (!r.issues) continue;
    flat.push({
      login: r.author_login ?? 'unknown',
      name: displayName(r.author_login),
      where: `${r.issues.repos?.name ?? 'unknown'} · issue #${r.issues.number}`,
      quote: r.body.slice(0, 320),
    });
  }
  for (const r of pr.data ?? []) {
    if (!r.pull_requests) continue;
    flat.push({
      login: r.author_login ?? 'unknown',
      name: displayName(r.author_login),
      where: `${r.pull_requests.repos?.name ?? 'unknown'} · pr #${r.pull_requests.number}`,
      quote: r.body.slice(0, 320),
    });
  }
  for (const r of disc.data ?? []) {
    if (!r.discussions) continue;
    flat.push({
      login: r.author_login ?? 'unknown',
      name: displayName(r.author_login),
      where: `${r.discussions.repos?.name ?? 'unknown'} · discussion #${r.discussions.number}`,
      quote: r.body.slice(0, 320),
    });
  }
  return flat.slice(0, 10);
}

/**
 * True when a release body is mostly auto-generated noise — dependabot bumps,
 * empty, or trivial. A "summary" of such content is either misleading (the
 * model fabricates significance) or useless ("Routine dependency updates").
 * Skip them; the UI falls back to a body slice that already conveys the
 * shape ("Bump X from Y to Z by @dependabot[bot]").
 */
function isReleaseNoise(body: string | null): boolean {
  const b = (body ?? '').trim();
  if (b.length < 80) return true; // sub-trivial body

  const lines = b
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return true;

  const bumpLines = lines.filter(
    (l) =>
      /\bbump\b.+\bfrom\b.+\bto\b/i.test(l) ||
      l.toLowerCase().includes('@dependabot'),
  ).length;

  // More than half the body is bump-bot → noise.
  return bumpLines / lines.length > 0.5;
}
