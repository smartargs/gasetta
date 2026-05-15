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
} from './types.ts';

const GH_REST = 'https://api.github.com';
const GH_GRAPHQL = 'https://api.github.com/graphql';
const USER_AGENT = 'gasetta/0.1 (https://github.com/)';

export interface GitHubClientOptions {
  token: string;
  /** Hard ceiling on individual REST page count, mostly for tests. */
  maxPages?: number;
  /** Sleep when X-RateLimit-Remaining drops to this number or below. */
  rateLimitFloor?: number;
}

export class GitHubClient {
  private token: string;
  private maxPages: number;
  private rateLimitFloor: number;

  constructor(opts: GitHubClientOptions) {
    this.token = opts.token;
    this.maxPages = opts.maxPages ?? 50;
    this.rateLimitFloor = opts.rateLimitFloor ?? 50;
  }

  // ── REST core ────────────────────────────────────────────────────────────

  private headers(extra: Record<string, string> = {}): Headers {
    const h = new Headers({
      Authorization: `Bearer ${this.token}`,
      'User-Agent': USER_AGENT,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    });
    for (const [k, v] of Object.entries(extra)) h.set(k, v);
    return h;
  }

  private async rest(
    url: string,
    init: { headers?: Record<string, string> } = {},
  ): Promise<Response> {
    let lastErr: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await fetch(url, { headers: this.headers(init.headers) });

      // Rate-limit watchdog. Sleep proactively when we're close.
      const remaining = Number(res.headers.get('x-ratelimit-remaining') ?? '');
      const reset = Number(res.headers.get('x-ratelimit-reset') ?? '');
      if (
        Number.isFinite(remaining) &&
        remaining > 0 &&
        remaining <= this.rateLimitFloor &&
        Number.isFinite(reset)
      ) {
        const wait = Math.max(0, reset * 1000 - Date.now()) + 250;
        if (wait > 0 && wait < 60_000) await sleep(wait);
      }

      if (res.status === 304) return res; // not modified — caller handles
      if (res.ok) return res;

      // Hard rate limit / secondary rate limit.
      if (res.status === 403 || res.status === 429) {
        const retryAfter = Number(res.headers.get('retry-after') ?? '0');
        const resetMs = Number.isFinite(reset) ? reset * 1000 - Date.now() : 0;
        const wait = Math.max(retryAfter * 1000, resetMs, 1000);
        await sleep(Math.min(wait, 60_000));
        continue;
      }

      // Retry transient 5xx with backoff.
      if (res.status >= 500 && res.status < 600) {
        await sleep(500 * Math.pow(2, attempt));
        continue;
      }

      // 4xx other than rate-limit: fail fast.
      const body = await res.text().catch(() => '');
      throw new Error(`GitHub REST ${res.status} ${res.statusText}: ${body.slice(0, 500)}`);
    }
    throw lastErr instanceof Error ? lastErr : new Error('GitHub REST: exhausted retries');
  }

  /**
   * Paginate a REST endpoint via Link headers, accumulating results.
   * `stop` is checked after each page; return true to break early.
   */
  private async paginate<T>(
    initialUrl: string,
    stop?: (page: T[]) => boolean,
  ): Promise<T[]> {
    const out: T[] = [];
    let url: string | null = initialUrl;
    let page = 0;
    while (url && page < this.maxPages) {
      const res = await this.rest(url);
      const batch = (await res.json()) as T[];
      out.push(...batch);
      if (stop?.(batch)) break;
      url = parseLinkNext(res.headers.get('link'));
      page++;
    }
    return out;
  }

  // ── Public REST endpoints ────────────────────────────────────────────────

  /** All repos in an org. Caller filters archived/forks. */
  listOrgRepos(org: string): Promise<GhRepo[]> {
    return this.paginate<GhRepo>(`${GH_REST}/orgs/${org}/repos?per_page=100&type=all`);
  }

  /** Commits on default branch updated since `since` (ISO timestamp). */
  listCommits(
    owner: string,
    repo: string,
    since: string,
  ): Promise<GhCommit[]> {
    const url =
      `${GH_REST}/repos/${owner}/${repo}/commits?since=${encodeURIComponent(since)}&per_page=100`;
    return this.paginate<GhCommit>(url);
  }

  /** Releases — there's no `since` parameter; we filter by published_at client-side. */
  async listReleasesSince(
    owner: string,
    repo: string,
    since: string,
  ): Promise<GhRelease[]> {
    const sinceMs = Date.parse(since);
    const items = await this.paginate<GhRelease>(
      `${GH_REST}/repos/${owner}/${repo}/releases?per_page=30`,
      (batch) => {
        // Stop as soon as we hit a published_at older than `since`.
        const oldest = batch[batch.length - 1];
        return !!oldest?.published_at && Date.parse(oldest.published_at) < sinceMs;
      },
    );
    return items.filter(
      (r) => r.published_at != null && Date.parse(r.published_at) >= sinceMs,
    );
  }

  /** Issues + PRs in one call. Caller splits on `pull_request` presence. */
  listIssuesAndPrs(
    owner: string,
    repo: string,
    since: string,
  ): Promise<GhIssueOrPr[]> {
    const url =
      `${GH_REST}/repos/${owner}/${repo}/issues?state=all&since=${encodeURIComponent(since)}&per_page=100`;
    return this.paginate<GhIssueOrPr>(url);
  }

  /** Full PR detail (for diffstat, merged status, base/head refs). */
  async getPull(
    owner: string,
    repo: string,
    number: number,
  ): Promise<GhPullDetail> {
    const res = await this.rest(`${GH_REST}/repos/${owner}/${repo}/pulls/${number}`);
    return (await res.json()) as GhPullDetail;
  }

  /** All comments on an issue or PR (PRs share the issue-comments API for the "conversation" tab). */
  listIssueComments(
    owner: string,
    repo: string,
    number: number,
  ): Promise<GhIssueComment[]> {
    return this.paginate<GhIssueComment>(
      `${GH_REST}/repos/${owner}/${repo}/issues/${number}/comments?per_page=100`,
    );
  }

  /** Review *summaries* (Approved / ChangesRequested / etc.). */
  listPullReviews(
    owner: string,
    repo: string,
    number: number,
  ): Promise<GhReview[]> {
    return this.paginate<GhReview>(
      `${GH_REST}/repos/${owner}/${repo}/pulls/${number}/reviews?per_page=100`,
    );
  }

  /** Inline review comments (the file/line ones). */
  listPullReviewComments(
    owner: string,
    repo: string,
    number: number,
  ): Promise<GhReviewComment[]> {
    return this.paginate<GhReviewComment>(
      `${GH_REST}/repos/${owner}/${repo}/pulls/${number}/comments?per_page=100`,
    );
  }

  // ── GraphQL — Discussions ────────────────────────────────────────────────

  private async graphql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await fetch(GH_GRAPHQL, {
        method: 'POST',
        headers: this.headers({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ query, variables }),
      });
      if (res.status >= 500 && res.status < 600) {
        await sleep(500 * Math.pow(2, attempt));
        continue;
      }
      const body = await res.json();
      if (body.errors?.length) {
        console.warn(
          `[graphql] errors: ${JSON.stringify(body.errors).slice(0, 800)}`,
        );
        throw new Error(`GitHub GraphQL: ${JSON.stringify(body.errors).slice(0, 500)}`);
      }
      if (!res.ok) {
        console.warn(`[graphql] HTTP ${res.status}: ${JSON.stringify(body).slice(0, 800)}`);
        throw new Error(`GitHub GraphQL ${res.status} ${res.statusText}`);
      }
      return body.data as T;
    }
    throw new Error('GitHub GraphQL: exhausted retries');
  }

  /**
   * Fetch discussions updated since `since`. Stops paginating when the page's
   * oldest updatedAt is older than `since`. Comments are fetched in the same
   * query (first 50); the caller can do a follow-up for the long tail.
   */
  async listDiscussionsSince(
    owner: string,
    repo: string,
    since: string,
  ): Promise<GqlDiscussion[]> {
    type DiscussionsResp = {
      repository: {
        discussions: {
          pageInfo: { hasNextPage: boolean; endCursor: string | null };
          nodes: GqlDiscussion[];
        } | null;
      } | null;
    };
    const out: GqlDiscussion[] = [];
    const sinceMs = Date.parse(since);
    let cursor: string | null = null;
    console.log(`[discussions] ${owner}/${repo}: fetching since ${since}`);
    for (let page = 0; page < this.maxPages; page++) {
      const data: DiscussionsResp = await this.graphql<DiscussionsResp>(
        /* GraphQL */ `
          query Discussions($owner: String!, $name: String!, $after: String) {
            repository(owner: $owner, name: $name) {
              discussions(
                first: 30
                orderBy: { field: UPDATED_AT, direction: DESC }
                after: $after
              ) {
                pageInfo { hasNextPage endCursor }
                nodes {
                  id
                  number
                  title
                  body
                  url
                  upvoteCount
                  isAnswered
                  answerChosenAt
                  createdAt
                  updatedAt
                  category { name }
                  author { login }
                  comments(first: 50) {
                    totalCount
                    pageInfo { hasNextPage endCursor }
                    nodes {
                      id body url upvoteCount isAnswer createdAt updatedAt
                      author { login }
                      replies(first: 50) {
                        nodes {
                          id body url upvoteCount isAnswer createdAt updatedAt
                          author { login }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        `,
        { owner, name: repo, after: cursor },
      );

      // Diagnostic: detect "discussions disabled on this repo" vs "empty page"
      // vs "real data". `repository` can be null if access is denied, and
      // `discussions` can be null if the repo has discussions disabled.
      if (!data.repository) {
        console.warn(
          `[discussions] ${owner}/${repo}: GraphQL returned null repository ` +
            `(scope/permission issue — discussions:read or visibility?)`,
        );
        return out;
      }
      if (!data.repository.discussions) {
        console.log(`[discussions] ${owner}/${repo}: discussions not enabled on this repo`);
        return out;
      }

      const nodes = data.repository.discussions.nodes ?? [];
      const pi = data.repository.discussions.pageInfo;
      console.log(
        `[discussions] ${owner}/${repo}: page ${page} → ${nodes.length} nodes, ` +
          `hasNext=${pi?.hasNextPage}` +
          (nodes.length
            ? ` (range ${nodes[nodes.length - 1].updatedAt} → ${nodes[0].updatedAt})`
            : ''),
      );

      for (const d of nodes) {
        if (Date.parse(d.updatedAt) < sinceMs) {
          // We've crossed the watermark; everything older is irrelevant.
          console.log(
            `[discussions] ${owner}/${repo}: stopping at #${d.number} ` +
              `(updated ${d.updatedAt} < since ${since}), kept ${out.length} total`,
          );
          return out;
        }
        out.push(d);
      }
      if (!pi?.hasNextPage) break;
      cursor = pi.endCursor;
    }
    console.log(`[discussions] ${owner}/${repo}: done, kept ${out.length} total`);
    return out;
  }
}

// ── helpers ────────────────────────────────────────────────────────────────

function parseLinkNext(linkHeader: string | null): string | null {
  if (!linkHeader) return null;
  const parts = linkHeader.split(',');
  for (const p of parts) {
    const m = p.match(/<([^>]+)>;\s*rel="next"/);
    if (m) return m[1];
  }
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
