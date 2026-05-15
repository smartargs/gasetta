// ── Shared values ───────────────────────────────────────────────────────────

const ITEM_BODY_BUDGET = 800;
const COMMENT_BODY_BUDGET = 400;
const ORG_DIGEST_ITEM_BUDGET = 320;

const CONSENSUS_CHIPS = [
  'Resolved',
  'Decided: <one phrase>',
  'Leaning approve',
  'Open',
  'Split',
  'Stalled',
] as const;

const SENTIMENTS = ['calm', 'mixed', 'contentious'] as const;

function clip(s: string | null | undefined, n: number): string {
  if (!s) return '';
  return s.length > n ? s.slice(0, n) + '…' : s;
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-item summary (issues / PRs / discussions)
// ─────────────────────────────────────────────────────────────────────────────

export interface ItemPromptInput {
  type: 'issue' | 'pull request' | 'discussion';
  repo: string;
  title: string;
  body: string | null;
  author: string | null;
  state: string;
  isMerged?: boolean;
  isAnswered?: boolean;
  comments: Array<{
    author: string | null;
    role: 'founder' | 'core' | 'community';
    body: string;
    createdAt: string | null;
  }>;
}

export const ITEM_SYSTEM = `You are an editorial summariser for Gasetta, a daily newspaper covering open-source development on GitHub.

Read the thread (issue, pull request, or discussion) and produce a JSON summary that captures what the thread is about, where the conversation has landed, the participants' sentiment, key points, decisions, and any founder participation.

Rules:
- NEUTRAL VOICE. Describe what people say, never endorse positions. Say "several commenters argue X", not "X is correct".
- REDDIT-STYLE WEIGHTING. Use words like "most", "several", "a few", "one commenter", "both founders". Never use percentages.
- VERBATIM QUOTES. When the JSON includes a founder quote, copy the text exactly — do not paraphrase, do not add words. If you can't find a verbatim sentence, leave the quote out.
- CONCISE. Summary: 2–4 sentences. Framing: 1–2 sentences. Each key_point and decision: one short line.
- DETERMINISTIC CHIP. Use exactly one of: ${CONSENSUS_CHIPS.join(' | ')}. "Decided: ..." should be a short phrase, e.g. "Decided: ship after testnet bake".
- Output STRICT JSON matching the schema. No prose outside the JSON. No markdown code fences.

Founders for this org: erikzhang (Erik Zhang) and dahongfei (Da Hongfei). Other people may appear; only treat the two above as founders.`;

export function buildItemUserPrompt(input: ItemPromptInput): string {
  const stateLine = (() => {
    const parts = [input.state];
    if (input.type === 'pull request' && input.isMerged) parts.push('merged');
    if (input.type === 'discussion' && input.isAnswered) parts.push('answered');
    return parts.join(', ');
  })();

  const commentsOldestFirst = [...input.comments].sort((a, b) => {
    const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
    const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
    return ta - tb;
  });

  const commentsRendered = commentsOldestFirst
    .map((c, i) => {
      const roleTag =
        c.role === 'founder' ? ' [FOUNDER]' : c.role === 'core' ? ' [core]' : '';
      // Founder comments are kept full; everyone else is truncated.
      const body = c.role === 'founder' ? c.body : clip(c.body, COMMENT_BODY_BUDGET);
      return `[${i + 1}] @${c.author ?? 'unknown'}${roleTag}\n${body}`;
    })
    .join('\n\n');

  return `Repo: neo-project/${input.repo}
Type: ${input.type}
State: ${stateLine}
Title: ${input.title}
Opened by: @${input.author ?? 'unknown'}

Body:
${clip(input.body, ITEM_BODY_BUDGET) || '(no body)'}

Comments (${input.comments.length} total):
${commentsRendered || '(no comments yet)'}

Return JSON matching exactly this schema:
{
  "summary": string,                 // 2-4 sentences. Plain prose. The reader's TL;DR.
  "framing": string,                 // 1-2 sentences. The headline-style framing for the consensus block. "Commenters are largely <aligned|divided|unresolved> on …"
  "consensus": string,               // One sentence on where the thread stands now.
  "consensus_chip": string,          // exactly one of: ${CONSENSUS_CHIPS.join(' | ')}
  "sentiment": string,               // exactly one of: ${SENTIMENTS.join(' | ')}
  "key_points": [string],            // 2-5 short bullets, each one line
  "decisions": [{"text": string, "by": string}],  // [] if none. "by" is "consensus" or a GitHub login
  "bullets": [                       // 2-4 weighted bullets for the consensus block
    { "weight": "Most|Several|A few|One commenter|Both founders|<X>", "text": string }
  ],
  "founder_involved": boolean,
  "founder_quotes": [
    { "who": string, "name": string, "text": string, "stance"?: string }
  ]
}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Release summary
// ─────────────────────────────────────────────────────────────────────────────

export interface ReleasePromptInput {
  repo: string;
  tagName: string;
  releaseName: string | null;
  body: string | null;
}

export const RELEASE_SYSTEM = `You are a release-notes summariser for Gasetta, a daily newspaper.

Given a GitHub release's tag and body, write a single 1–3 sentence paragraph describing what shipped. Plain prose, no markdown headings or bullets. Neutral, factual. End with a note on operator impact when obvious (e.g., "Mainnet-safe", "Breaking change for X").

Output strict JSON. No code fences.`;

export function buildReleaseUserPrompt(input: ReleasePromptInput): string {
  return `Repo: neo-project/${input.repo}
Tag: ${input.tagName}
Name: ${input.releaseName ?? input.tagName}

Body:
${clip(input.body, 2000) || '(no body)'}

Return JSON:
{
  "summary": string  // 1-3 sentence paragraph
}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Org-level digest (the front-page synthesis — gpt-4o)
// ─────────────────────────────────────────────────────────────────────────────

export interface OrgDigestInputItem {
  kind: 'issue' | 'pull request' | 'discussion';
  repo: string;
  number: number;
  title: string;
  url: string;
  summary: string;
  consensus_chip: string;
  sentiment: string;
  founder_involved: boolean;
  comments_count: number;
}

export interface OrgDigestInputRelease {
  repo: string;
  tag: string;
  summary: string;
  url: string;
}

export interface OrgDigestInputFounderActivity {
  login: string;
  name: string;
  where: string;
  quote: string;
}

export interface OrgDigestInput {
  editionDate: string;
  items: OrgDigestInputItem[];
  releases: OrgDigestInputRelease[];
  founderActivity: OrgDigestInputFounderActivity[];
  repoCounts: Record<string, number>;
}

export const ORG_SYSTEM = `You are the editor-in-chief of Gasetta, a daily newspaper covering Neo blockchain development on GitHub. Today is publication day. You have the day's per-thread summaries, releases, and founder activity. Write the front-page synthesis.

Voice: editorial but neutral. Think a calm tech section — confident sentences, no hype, no clickbait. Pick THE story of the day.

Rules:
- Headline: ≤ 80 chars, newspaper-style. Describes what happened, not a question. Avoid colons.
- Standfirst: 1 sentence (≤ 200 chars), italic-tone. Sets the scene, mentions founders by name if they participated meaningfully.
- top_items: 4–7 entries readers should see today. Mix issues / PRs / discussions. Each entry has a single "why this matters" line.
- issue_trends: 2-3 sentences of prose about today's issue activity. What clusters of bugs/themes appeared.
- Output strict JSON, no markdown fences.

Founders: erikzhang (Erik Zhang), dahongfei (Da Hongfei).`;

export function buildOrgDigestUserPrompt(input: OrgDigestInput): string {
  const itemLines = input.items
    .map(
      (it) =>
        `- ${it.kind} ${it.repo}#${it.number}: "${clip(it.title, 100)}" — chip:${it.consensus_chip}, sentiment:${it.sentiment}, comments:${it.comments_count}${it.founder_involved ? ', FOUNDER' : ''}\n  summary: ${clip(it.summary, ORG_DIGEST_ITEM_BUDGET)}`,
    )
    .join('\n');
  const releaseLines = input.releases
    .map((r) => `- ${r.repo} ${r.tag}: ${clip(r.summary, 240)}`)
    .join('\n');
  const founderLines = input.founderActivity
    .map((f) => `- @${f.login} (${f.name}) in ${f.where}: "${clip(f.quote, 200)}"`)
    .join('\n');
  const repoActivityLines = Object.entries(input.repoCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([r, n]) => `- ${r}: ${n} item(s)`)
    .join('\n');

  return `Edition date: ${input.editionDate}

Repo activity (most active first):
${repoActivityLines || '(none)'}

Per-thread summaries (${input.items.length} total):
${itemLines || '(none)'}

Releases shipped this edition:
${releaseLines || '(none)'}

Founder activity:
${founderLines || '(none)'}

Return JSON matching this schema:
{
  "headline": string,         // ≤ 80 chars
  "standfirst": string,       // 1 sentence, ≤ 200 chars
  "body_md": string,          // 5-12 sentence markdown body. Sections allowed (## Shipped, ## Hot threads, ## Founder watch). Optional.
  "issue_trends": string,     // 2-3 sentence prose
  "top_items": [
    { "kind": "issue|pull request|discussion", "repo": string, "number": number, "title": string, "url": string, "why": string }
  ],
  "releases": [
    { "repo": string, "tag": string, "summary": string }
  ],
  "founder_activity": [
    { "login": string, "name": string, "where": string, "quote": string }
  ],
  "counts": {
    "repos_active": number,
    "releases": number,
    "hot_threads": number,
    "founder_touched": number
  }
}`;
}
