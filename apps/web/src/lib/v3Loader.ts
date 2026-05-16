import { supabase } from './supabase';
import type { FounderRecord, ItemType, Sentiment, SummaryStatus } from '../components/atoms';
import type {
  CommitRow,
  GasettaV3,
  Momentum,
  N4Feature,
  RepoSummary,
  ResolvedRow,
  Thread,
  TopContributor,
  Version,
  VersionActivity,
} from '../data/v3types';

// ── DB row shapes ───────────────────────────────────────────────────────────

interface DbRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  stargazers_count: number;
  pushed_at: string | null;
  last_activity_at: string | null;
}

interface DbIssue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  comments_count: number;
  participants_count: number;
  author_login: string | null;
  founder_involved: boolean;
  consensus_chip: string | null;
  summary: string | null;
  summary_status: string;
  sentiment: Sentiment | null;
  html_url: string;
  updated_at_gh: string;
  closed_at: string | null;
  labels: unknown;
  key_points: unknown;
  decisions: unknown;
  founder_quotes: unknown;
  repos: { name: string } | null;
}

interface DbPr {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  is_merged: boolean;
  is_draft: boolean;
  additions: number | null;
  deletions: number | null;
  changed_files: number | null;
  author_login: string | null;
  comments_count: number;
  participants_count: number;
  founder_involved: boolean;
  consensus_chip: string | null;
  summary: string | null;
  summary_status: string;
  sentiment: Sentiment | null;
  html_url: string;
  updated_at_gh: string;
  closed_at: string | null;
  base_ref: string | null;
  labels: unknown;
  key_points: unknown;
  decisions: unknown;
  founder_quotes: unknown;
  repos: { name: string } | null;
}

interface DbDiscussion {
  id: number;
  number: number;
  title: string;
  body: string | null;
  is_answered: boolean;
  comments_count: number;
  participants_count: number;
  author_login: string | null;
  founder_involved: boolean;
  consensus_chip: string | null;
  summary: string | null;
  summary_status: string;
  sentiment: Sentiment | null;
  html_url: string;
  updated_at_gh: string;
  key_points: unknown;
  decisions: unknown;
  founder_quotes: unknown;
  repos: { name: string } | null;
}

interface DbRelease {
  tag_name: string;
  name: string | null;
  body: string | null;
  summary: string | null;
  summary_status: string;
  published_at: string | null;
  html_url: string;
  repos: { name: string } | null;
}

// ── helpers ─────────────────────────────────────────────────────────────────

export const FOUNDERS: Record<string, FounderRecord> = {
  erikzhang: { login: 'erikzhang', name: 'Erik Zhang', initials: 'EZ' },
  dahongfei: { login: 'dahongfei', name: 'Da Hongfei', initials: 'DH' },
};

function relTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  const m = ms / 60_000;
  if (m < 1) return 'just now';
  if (m < 60) return `${Math.round(m)}m ago`;
  const h = m / 60;
  if (h < 24) return `${Math.round(h)}h ago`;
  const d = h / 24;
  if (d < 30) return `${Math.round(d)}d ago`;
  return `${Math.round(d / 30)}mo ago`;
}

function daysAgo(iso: string | null | undefined): number {
  if (!iso) return 9999;
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000));
}

function recencyDecay(updatedAt: string | null | undefined): number {
  if (!updatedAt) return 0;
  const days = Math.max(0, (Date.now() - new Date(updatedAt).getTime()) / 86_400_000);
  return Math.exp(-days / 14);
}

function momentumFromPushed(pushedAt: string | null): Momentum {
  if (!pushedAt) return 'dormant';
  const days = (Date.now() - new Date(pushedAt).getTime()) / 86_400_000;
  if (days < 1) return 'surging';
  if (days < 7) return 'active';
  if (days < 30) return 'quiet';
  return 'dormant';
}

function labelArray(labels: unknown): string[] {
  if (!Array.isArray(labels)) return [];
  return labels
    .map((l) =>
      typeof l === 'object' && l && 'name' in l ? String((l as { name: unknown }).name) : '',
    )
    .filter(Boolean)
    .map((n) => n.toLowerCase());
}

/** N3/N4 classifier (mirrors versionsLoader.ts; inlined to keep v3 self-contained). */
function classifyVersion(
  title: string,
  labels: unknown,
  baseRef?: string | null,
): Version {
  if (baseRef) {
    const b = baseRef.toLowerCase();
    if (b === 'n4' || /(^|[-_/])n4([-_/]|$)/.test(b)) return 'N4';
  }
  for (const l of labelNames(labels)) {
    if (l.includes('n4') || l.includes('neo 4') || l.includes('neo4')) return 'N4';
  }
  if (/(^|\W)n4(\W|$)/i.test(title) || /neo\s*n?4/i.test(title)) return 'N4';
  return 'N3';
}

function labelNames(labels: unknown): string[] {
  return labelArray(labels);
}

function asKeyPoints(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((s): s is string => typeof s === 'string');
  if (value && typeof value === 'object' && 'points' in value) {
    const p = (value as { points?: unknown }).points;
    if (Array.isArray(p)) return p.filter((s): s is string => typeof s === 'string');
  }
  return [];
}

function asDecisions(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((d) => {
      if (typeof d === 'string') return d;
      if (d && typeof d === 'object' && 'text' in d) return String((d as { text: unknown }).text);
      return '';
    })
    .filter(Boolean);
}

function extractFounderQuote(quotes: unknown, founderLogin: string | null): string | null {
  if (!founderLogin || !Array.isArray(quotes)) return null;
  for (const q of quotes) {
    if (q && typeof q === 'object' && 'who' in q && 'text' in q) {
      if ((q as { who: unknown }).who === founderLogin) {
        return String((q as { text: unknown }).text);
      }
    }
  }
  return null;
}

function scoreForThread(
  type: ItemType,
  commentsCount: number,
  participantsCount: number,
  founderInvolved: boolean,
  sentiment: Sentiment | null,
  state: string,
  consensusChip: string | null,
  updatedAtGh: string | null,
  resolved: boolean,
): number {
  let s = commentsCount * recencyDecay(updatedAtGh);
  s += Math.log(participantsCount + 1) * 2;
  if (founderInvolved) s += 5;
  if (sentiment === 'contentious') s += 3;
  if (state === 'open') s += 2;
  if (type === 'issue') s += 2;
  else if (type === 'discussion') s += 1;
  const c = (consensusChip ?? '').toLowerCase();
  if (
    c.startsWith('split') ||
    c.startsWith('open') ||
    c.startsWith('stalled') ||
    c.startsWith('leaning')
  ) {
    s += 2;
  }
  if (resolved) s *= 0.5;
  return s;
}

// ── transformers ────────────────────────────────────────────────────────────

function toIssueThread(i: DbIssue): Thread {
  const version = classifyVersion(i.title, i.labels);
  const founderLogin = i.founder_involved ? guessFounderLogin(i.founder_quotes) : null;
  return {
    id: `${i.repos?.name ?? 'unknown'}-issue-${i.number}`,
    type: 'issue' as ItemType,
    repo: i.repos?.name ?? 'unknown',
    number: i.number,
    title: i.title,
    summary: i.summary ?? '',
    state: i.state,
    consensusChip: i.consensus_chip,
    sentiment: i.sentiment,
    comments: i.comments_count,
    participants: i.participants_count,
    version,
    when: relTime(i.updated_at_gh),
    updatedAt: i.updated_at_gh,
    author: i.author_login,
    htmlUrl: i.html_url,
    founder: founderLogin,
    founderQuote: extractFounderQuote(i.founder_quotes, founderLogin),
    summaryStatus: (i.summary_status as SummaryStatus) ?? 'pending',
    keyPoints: asKeyPoints(i.key_points),
    decisions: asDecisions(i.decisions),
    importance: scoreForThread(
      'issue',
      i.comments_count,
      i.participants_count,
      i.founder_involved,
      i.sentiment,
      i.state,
      i.consensus_chip,
      i.updated_at_gh,
      i.state === 'closed',
    ),
  };
}

function toPrThread(p: DbPr): Thread {
  const version = classifyVersion(p.title, p.labels, p.base_ref);
  const founderLogin = p.founder_involved ? guessFounderLogin(p.founder_quotes) : null;
  return {
    id: `${p.repos?.name ?? 'unknown'}-pr-${p.number}`,
    type: 'pr' as ItemType,
    repo: p.repos?.name ?? 'unknown',
    number: p.number,
    title: p.title,
    summary: p.summary ?? '',
    state: p.state,
    consensusChip: p.consensus_chip,
    sentiment: p.sentiment,
    comments: p.comments_count,
    participants: p.participants_count,
    version,
    when: relTime(p.updated_at_gh),
    updatedAt: p.updated_at_gh,
    author: p.author_login,
    htmlUrl: p.html_url,
    founder: founderLogin,
    founderQuote: extractFounderQuote(p.founder_quotes, founderLogin),
    summaryStatus: (p.summary_status as SummaryStatus) ?? 'pending',
    keyPoints: asKeyPoints(p.key_points),
    decisions: asDecisions(p.decisions),
    isMerged: p.is_merged,
    additions: p.additions ?? undefined,
    deletions: p.deletions ?? undefined,
    changedFiles: p.changed_files ?? undefined,
    baseRef: p.base_ref ?? undefined,
    importance: scoreForThread(
      'pr',
      p.comments_count,
      p.participants_count,
      p.founder_involved,
      p.sentiment,
      p.state,
      p.consensus_chip,
      p.updated_at_gh,
      p.is_merged || p.state === 'closed',
    ),
  };
}

function toDiscussionThread(d: DbDiscussion): Thread {
  const version = classifyVersion(d.title, null);
  const founderLogin = d.founder_involved ? guessFounderLogin(d.founder_quotes) : null;
  return {
    id: `${d.repos?.name ?? 'unknown'}-discussion-${d.number}`,
    type: 'discussion' as ItemType,
    repo: d.repos?.name ?? 'unknown',
    number: d.number,
    title: d.title,
    summary: d.summary ?? '',
    state: 'open',
    consensusChip: d.consensus_chip,
    sentiment: d.sentiment,
    comments: d.comments_count,
    participants: d.participants_count,
    version,
    when: relTime(d.updated_at_gh),
    updatedAt: d.updated_at_gh,
    author: d.author_login,
    htmlUrl: d.html_url,
    founder: founderLogin,
    founderQuote: extractFounderQuote(d.founder_quotes, founderLogin),
    summaryStatus: (d.summary_status as SummaryStatus) ?? 'pending',
    keyPoints: asKeyPoints(d.key_points),
    decisions: asDecisions(d.decisions),
    isAnswered: d.is_answered,
    importance: scoreForThread(
      'discussion',
      d.comments_count,
      d.participants_count,
      d.founder_involved,
      d.sentiment,
      'open',
      d.consensus_chip,
      d.updated_at_gh,
      d.is_answered,
    ),
  };
}

function toReleaseThread(r: DbRelease): Thread {
  return {
    id: `${r.repos?.name ?? 'unknown'}-release-${r.tag_name}`,
    type: 'release' as ItemType,
    repo: r.repos?.name ?? 'unknown',
    title: r.name ?? r.tag_name,
    summary: r.summary ?? r.body?.slice(0, 240) ?? '(no notes)',
    when: relTime(r.published_at),
    updatedAt: r.published_at,
    htmlUrl: r.html_url,
    tag: r.tag_name,
    summaryStatus: (r.summary_status as SummaryStatus) ?? 'pending',
    importance: releaseImportance(r),
  };
}

function releaseImportance(r: DbRelease): number {
  const body = (r.body ?? '').toLowerCase();
  const lines = body.split('\n').map((l) => l.trim()).filter(Boolean);

  if (lines.length === 0) return 8;

  const bumpLines = lines.filter(
    (l) => /\bbump\b.+\bfrom\b.+\bto\b/.test(l) || l.includes('@dependabot'),
  ).length;
  const bumpRatio = bumpLines / lines.length;

  if (bumpRatio > 0.5) return 4;
  const hasCuratedSummary = r.summary && r.summary.trim().length > 20;
  if (hasCuratedSummary) return 22;
  if (bumpRatio > 0.2) return 10;
  return 16;
}

function guessFounderLogin(quotes: unknown): string | null {
  if (!Array.isArray(quotes) || quotes.length === 0) return null;
  for (const q of quotes) {
    if (q && typeof q === 'object' && 'who' in q) {
      const who = String((q as { who: unknown }).who).toLowerCase();
      if (FOUNDERS[who]) return who;
    }
  }
  return null;
}

function toRepoSummary(r: DbRepo): RepoSummary {
  return {
    name: r.name,
    desc: r.description || '',
    stars: r.stargazers_count,
    momentum: momentumFromPushed(r.pushed_at ?? r.last_activity_at),
  };
}

// ── top contributors aggregation ────────────────────────────────────────────

interface ContributorBucket {
  login: string;
  count: number;
}

async function loadTopContributors(): Promise<TopContributor[]> {
  const since = new Date(Date.now() - 14 * 86_400_000).toISOString();
  const [iss, pr, disc] = await Promise.all([
    supabase
      .from('issue_comments')
      .select('author_login')
      .gt('created_at_gh', since)
      .returns<{ author_login: string | null }[]>(),
    supabase
      .from('pr_comments')
      .select('author_login')
      .gt('created_at_gh', since)
      .returns<{ author_login: string | null }[]>(),
    supabase
      .from('discussion_comments')
      .select('author_login')
      .gt('created_at_gh', since)
      .returns<{ author_login: string | null }[]>(),
  ]);

  const counts = new Map<string, number>();
  for (const list of [iss.data ?? [], pr.data ?? [], disc.data ?? []]) {
    for (const row of list) {
      const login = row.author_login;
      if (!login) continue;
      counts.set(login, (counts.get(login) ?? 0) + 1);
    }
  }

  const buckets: ContributorBucket[] = Array.from(counts.entries())
    .map(([login, count]) => ({ login, count }))
    .sort((a, b) => b.count - a.count);

  const founderEntries = buckets.filter((b) => FOUNDERS[b.login]);
  const others = buckets.filter((b) => !FOUNDERS[b.login]).slice(0, 8);
  const all = [...founderEntries, ...others].slice(0, 10);

  return all.map((b) => {
    const f = FOUNDERS[b.login];
    return {
      login: b.login,
      name: f?.name ?? b.login,
      initials: f?.initials ?? b.login.slice(0, 2).toUpperCase(),
      count: b.count,
      founder: !!f,
    };
  });
}

// ── stats ───────────────────────────────────────────────────────────────────

async function loadStats(threads: Thread[], n4Pct: number, lastRunStartedAt: string | null): Promise<{
  openIssues: number;
  openPRs: number;
  founderCommentsWeek: number;
  releasesMonth: number;
  n4Share: number;
  updatedRelative: string;
}> {
  const openIssues = threads.filter((t) => t.type === 'issue' && t.state === 'open').length;
  const openPRs = threads.filter((t) => t.type === 'pr' && t.state === 'open' && !t.isMerged).length;

  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const monthAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const [founderIssCmt, founderPrCmt, founderDiscCmt, recentReleases] = await Promise.all([
    supabase
      .from('issue_comments')
      .select('*', { count: 'exact', head: true })
      .eq('is_founder', true)
      .gt('created_at_gh', weekAgo),
    supabase
      .from('pr_comments')
      .select('*', { count: 'exact', head: true })
      .eq('is_founder', true)
      .gt('created_at_gh', weekAgo),
    supabase
      .from('discussion_comments')
      .select('*', { count: 'exact', head: true })
      .eq('is_founder', true)
      .gt('created_at_gh', weekAgo),
    supabase
      .from('releases')
      .select('*', { count: 'exact', head: true })
      .gt('published_at', monthAgo),
  ]);

  return {
    openIssues,
    openPRs,
    founderCommentsWeek:
      (founderIssCmt.count ?? 0) + (founderPrCmt.count ?? 0) + (founderDiscCmt.count ?? 0),
    releasesMonth: recentReleases.count ?? 0,
    n4Share: Math.round(n4Pct),
    updatedRelative: lastRunStartedAt ? relTime(lastRunStartedAt) : 'unknown',
  };
}

// ── resolved ────────────────────────────────────────────────────────────────

function buildResolved(issues: DbIssue[], prs: DbPr[]): ResolvedRow[] {
  const rows: ResolvedRow[] = [];
  for (const i of issues) {
    if (i.state !== 'closed' || !i.closed_at) continue;
    const founderLogin = i.founder_involved ? guessFounderLogin(i.founder_quotes) : null;
    rows.push({
      id: `${i.repos?.name ?? 'unknown'}-issue-${i.number}`,
      title: i.title,
      outcome: pickOutcome(i.summary_status, i.consensus_chip, 'closed'),
      when: relTime(i.closed_at),
      daysAgo: daysAgo(i.closed_at),
      repo: i.repos?.name ?? 'unknown',
      number: i.number,
      oneLiner: i.summary ?? undefined,
      founder: i.founder_involved,
      founderLogin: founderLogin ?? undefined,
    });
  }
  for (const p of prs) {
    if (!p.closed_at) continue;
    const founderLogin = p.founder_involved ? guessFounderLogin(p.founder_quotes) : null;
    rows.push({
      id: `${p.repos?.name ?? 'unknown'}-pr-${p.number}`,
      title: p.title,
      outcome: p.is_merged ? 'Merged' : pickOutcome(p.summary_status, p.consensus_chip, 'closed'),
      when: relTime(p.closed_at),
      daysAgo: daysAgo(p.closed_at),
      repo: p.repos?.name ?? 'unknown',
      number: p.number,
      oneLiner: p.summary ?? undefined,
      founder: p.founder_involved,
      founderLogin: founderLogin ?? undefined,
    });
  }
  return rows.sort((a, b) => a.daysAgo - b.daysAgo).slice(0, 60);
}

function pickOutcome(
  _summaryStatus: string,
  chip: string | null,
  fallback: 'closed',
): ResolvedRow['outcome'] {
  const c = (chip ?? '').toLowerCase();
  if (c.startsWith('resolved')) return 'Resolved';
  if (c.startsWith('decided')) return 'Decided';
  void fallback;
  return 'Closed';
}

// ── version activity ───────────────────────────────────────────────────────

const VERSION_ACTIVITY_WINDOW_DAYS = 14;

function buildVersionActivity(
  issues: DbIssue[],
  prs: DbPr[],
  discussions: DbDiscussion[],
  releases: DbRelease[],
): VersionActivity {
  const cutoffMs = Date.now() - VERSION_ACTIVITY_WINDOW_DAYS * 86_400_000;
  const within = (iso: string | null | undefined): boolean =>
    !!iso && new Date(iso).getTime() >= cutoffMs;

  const n3 = { total: 0, issues: 0, prs: 0, discussions: 0, releases: 0 };
  const n4 = { total: 0, issues: 0, prs: 0, discussions: 0, releases: 0 };

  for (const i of issues) {
    if (!within(i.updated_at_gh)) continue;
    const b = classifyVersion(i.title, i.labels) === 'N4' ? n4 : n3;
    b.total++; b.issues++;
  }
  for (const p of prs) {
    if (!within(p.updated_at_gh)) continue;
    const b = classifyVersion(p.title, p.labels, p.base_ref) === 'N4' ? n4 : n3;
    b.total++; b.prs++;
  }
  for (const d of discussions) {
    if (!within(d.updated_at_gh)) continue;
    const b = classifyVersion(d.title, null) === 'N4' ? n4 : n3;
    b.total++; b.discussions++;
  }
  for (const r of releases) {
    if (!within(r.published_at)) continue;
    // Releases don't carry version labels — best-effort title-only.
    const b = classifyVersion(r.name ?? r.tag_name, null) === 'N4' ? n4 : n3;
    b.total++; b.releases++;
  }

  return { windowLabel: `last ${VERSION_ACTIVITY_WINDOW_DAYS}d`, n3, n4 };
}

// ── N4 features ─────────────────────────────────────────────────────────────

const N4_FEATURES_STATIC: Omit<N4Feature, 'threadId'>[] = [
  {
    title: 'dBFT 2.5 — pipelined commits and parameterised round time',
    oneLiner:
      'A revised consensus protocol that pipelines the commit phase and exposes round time as a governance-tunable parameter.',
    status: 'Leaning approve',
    repo: 'neo-modules',
  },
  {
    title: 'NeoVM 4 — pooled stack and richer reference types',
    oneLiner:
      'Replaces the eval-stack List<StackItem> with a pooled allocator and adds first-class struct references.',
    status: 'In review',
    repo: 'neo-vm',
  },
  {
    title: 'StateService 2 — verkle tries replace MPT',
    oneLiner:
      'Migrates state commitment from a Merkle-Patricia trie to a verkle-style commitment; ~150-byte proofs.',
    status: 'In review',
    repo: 'neo',
  },
  {
    title: 'Lock-free TxPool reservation queue',
    oneLiner:
      'Refactors the transaction pool to use a lock-free reservation queue; encouraging benchmarks, contested memory-model.',
    status: 'Contested',
    repo: 'neo',
  },
  {
    title: 'Native zk-proof verification (NEP-29)',
    oneLiner:
      'Adds a native verifier in the core protocol; initial scope is Groth16 only per Da Hongfei.',
    status: 'Decided',
    repo: 'proposals',
  },
  {
    title: 'C# devpack: N4-only language features behind --target n4',
    oneLiner:
      'The devpack compiles N4-only opcodes behind an explicit flag so contract authors can experiment without committing.',
    status: 'Approved',
    repo: 'neo-devpack-dotnet',
  },
];

function attachN4FeatureThreadIds(threads: Thread[]): N4Feature[] {
  return N4_FEATURES_STATIC.map((f) => {
    const candidate = threads.find(
      (t) => t.repo === f.repo && t.version === 'N4' && t.type !== 'release',
    );
    return { ...f, threadId: candidate?.id ?? '' };
  });
}

// ── founder activity ───────────────────────────────────────────────────────

interface FounderCommentRow {
  body: string;
  author_login: string | null;
  created_at_gh: string | null;
  parent: { number: number; title: string; repo: string } | null;
}

async function loadFounderActivity(threads: Thread[]) {
  const [iss, pr, disc] = await Promise.all([
    supabase
      .from('issue_comments')
      .select('body, author_login, created_at_gh, issues:issue_id(number, title, repos:repo_id(name))')
      .eq('is_founder', true)
      .order('created_at_gh', { ascending: false })
      .limit(40)
      .returns<Array<{
        body: string;
        author_login: string | null;
        created_at_gh: string | null;
        issues: { number: number; title: string; repos: { name: string } | null } | null;
      }>>(),
    supabase
      .from('pr_comments')
      .select('body, author_login, created_at_gh, pull_requests:pr_id(number, title, repos:repo_id(name))')
      .eq('is_founder', true)
      .order('created_at_gh', { ascending: false })
      .limit(40)
      .returns<Array<{
        body: string;
        author_login: string | null;
        created_at_gh: string | null;
        pull_requests: { number: number; title: string; repos: { name: string } | null } | null;
      }>>(),
    supabase
      .from('discussion_comments')
      .select('body, author_login, created_at_gh, discussions:discussion_id(number, title, repos:repo_id(name))')
      .eq('is_founder', true)
      .order('created_at_gh', { ascending: false })
      .limit(40)
      .returns<Array<{
        body: string;
        author_login: string | null;
        created_at_gh: string | null;
        discussions: { number: number; title: string; repos: { name: string } | null } | null;
      }>>(),
  ]);

  const flat: FounderCommentRow[] = [];
  for (const row of iss.data ?? []) {
    if (!row.issues) continue;
    flat.push({
      body: row.body,
      author_login: row.author_login,
      created_at_gh: row.created_at_gh,
      parent: { number: row.issues.number, title: row.issues.title, repo: row.issues.repos?.name ?? 'unknown' },
    });
  }
  for (const row of pr.data ?? []) {
    if (!row.pull_requests) continue;
    flat.push({
      body: row.body,
      author_login: row.author_login,
      created_at_gh: row.created_at_gh,
      parent: { number: row.pull_requests.number, title: row.pull_requests.title, repo: row.pull_requests.repos?.name ?? 'unknown' },
    });
  }
  for (const row of disc.data ?? []) {
    if (!row.discussions) continue;
    flat.push({
      body: row.body,
      author_login: row.author_login,
      created_at_gh: row.created_at_gh,
      parent: { number: row.discussions.number, title: row.discussions.title, repo: row.discussions.repos?.name ?? 'unknown' },
    });
  }

  return flat
    .filter((f) => f.author_login && FOUNDERS[f.author_login])
    .sort((a, b) => Date.parse(b.created_at_gh ?? '0') - Date.parse(a.created_at_gh ?? '0'))
    .slice(0, 60)
    .map((f) => {
      // Find the matching thread for navigation
      const parent = f.parent!;
      const candidate = threads.find(
        (t) =>
          t.repo === parent.repo &&
          t.number === parent.number &&
          (t.type === 'issue' || t.type === 'pr' || t.type === 'discussion'),
      );
      return {
        login: f.author_login!,
        threadId: candidate?.id ?? '',
        where: `${parent.repo} #${parent.number}`,
        whereTitle: parent.title,
        quote: f.body.slice(0, 280),
        when: relTime(f.created_at_gh),
      };
    });
}

// ── main loader ─────────────────────────────────────────────────────────────

export async function loadGasettaV3(): Promise<GasettaV3> {
  const [reposRes, issuesRes, prsRes, discRes, releasesRes, latestRun] = await Promise.all([
    supabase.from('repos').select('*').order('stargazers_count', { ascending: false }),
    supabase
      .from('issues')
      .select(
        'id, number, title, body, state, comments_count, participants_count, ' +
          'author_login, founder_involved, consensus_chip, summary, summary_status, ' +
          'sentiment, html_url, updated_at_gh, closed_at, labels, key_points, ' +
          'decisions, founder_quotes, repos:repo_id(name)',
      )
      .order('updated_at_gh', { ascending: false })
      .limit(150),
    supabase
      .from('pull_requests')
      .select(
        'id, number, title, body, state, is_merged, is_draft, additions, deletions, ' +
          'changed_files, author_login, comments_count, participants_count, ' +
          'founder_involved, consensus_chip, summary, summary_status, sentiment, ' +
          'html_url, updated_at_gh, closed_at, base_ref, labels, key_points, ' +
          'decisions, founder_quotes, repos:repo_id(name)',
      )
      .order('updated_at_gh', { ascending: false })
      .limit(300),
    supabase
      .from('discussions')
      .select(
        'id, number, title, body, is_answered, comments_count, participants_count, ' +
          'author_login, founder_involved, consensus_chip, summary, summary_status, ' +
          'sentiment, html_url, updated_at_gh, key_points, decisions, ' +
          'founder_quotes, repos:repo_id(name)',
      )
      .order('updated_at_gh', { ascending: false })
      .limit(80),
    supabase
      .from('releases')
      .select('tag_name, name, body, summary, summary_status, published_at, html_url, repos:repo_id(name)')
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(20),
    supabase
      .from('runs')
      .select('started_at')
      .eq('status', 'ok')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle<{ started_at: string }>(),
  ]);

  if (reposRes.error) console.warn('v3: repos:', reposRes.error.message);
  if (issuesRes.error) console.warn('v3: issues:', issuesRes.error.message);
  if (prsRes.error) console.warn('v3: prs:', prsRes.error.message);
  if (discRes.error) console.warn('v3: discussions:', discRes.error.message);
  if (releasesRes.error) console.warn('v3: releases:', releasesRes.error.message);

  const repos = (reposRes.data ?? []).map(toRepoSummary);
  const issuesRaw = (issuesRes.data ?? []) as unknown as DbIssue[];
  const prsRaw = (prsRes.data ?? []) as unknown as DbPr[];
  const discRaw = (discRes.data ?? []) as unknown as DbDiscussion[];
  const releasesRaw = (releasesRes.data ?? []) as unknown as DbRelease[];

  const threads: Thread[] = [
    ...issuesRaw.map(toIssueThread),
    ...prsRaw.map(toPrThread),
    ...discRaw.map(toDiscussionThread),
    ...releasesRaw.map(toReleaseThread),
  ];

  const versionActivity = buildVersionActivity(issuesRaw, prsRaw, discRaw, releasesRaw);
  const n4Pct =
    versionActivity.n3.total + versionActivity.n4.total === 0
      ? 50
      : (versionActivity.n4.total / (versionActivity.n3.total + versionActivity.n4.total)) * 100;

  const [topContributors, founderActivity, stats] = await Promise.all([
    loadTopContributors(),
    loadFounderActivity(threads),
    loadStats(threads, n4Pct, latestRun.data?.started_at ?? null),
  ]);

  const recentlyResolved = buildResolved(issuesRaw, prsRaw);
  const n4Features = attachN4FeatureThreadIds(threads);

  return {
    threads,
    repos,
    topContributors,
    recentlyResolved,
    founderActivity,
    stats,
    founders: FOUNDERS,
    versionActivity,
    n4Features,
  };
}

// ── fallback ────────────────────────────────────────────────────────────────

export const V3_FALLBACK: GasettaV3 = {
  threads: [],
  repos: [],
  topContributors: [],
  recentlyResolved: [],
  founderActivity: [],
  stats: {
    openIssues: 0,
    openPRs: 0,
    founderCommentsWeek: 0,
    releasesMonth: 0,
    n4Share: 50,
    updatedRelative: '—',
  },
  founders: FOUNDERS,
  versionActivity: {
    windowLabel: 'last 14d',
    n3: { total: 0, issues: 0, prs: 0, discussions: 0, releases: 0 },
    n4: { total: 0, issues: 0, prs: 0, discussions: 0, releases: 0 },
  },
  n4Features: [],
};

export type { CommitRow };
