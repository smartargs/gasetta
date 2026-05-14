import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGasettaV3 } from '../lib/v3Context';
import { LeftRail, type FeedFilters } from '../components/LeftRail';
import { RightRail } from '../components/RightRail';
import { FeedCard } from '../components/FeedCard';
import type { Thread, TopContributor, ResolvedRow } from '../data/v3types';

type SortKey = 'hot' | 'new' | 'discussed';

function readFilters(params: URLSearchParams): FeedFilters {
  const type = (params.get('type') as FeedFilters['type']) || 'all';
  const version = (params.get('version') as FeedFilters['version']) || 'all';
  const repo = params.get('repo') || 'all';
  return { type, version, repo };
}

function writeFilters(f: FeedFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.type !== 'all') p.set('type', f.type);
  if (f.version !== 'all') p.set('version', f.version);
  if (f.repo !== 'all') p.set('repo', f.repo);
  return p;
}

function filterThreads(threads: Thread[], f: FeedFilters, sort: SortKey): Thread[] {
  let out = threads.filter((t) => t.type !== 'commits');
  if (f.type === 'issues') out = out.filter((t) => t.type === 'issue');
  else if (f.type === 'prs') out = out.filter((t) => t.type === 'pr');
  else if (f.type === 'discussions') out = out.filter((t) => t.type === 'discussion');
  else if (f.type === 'releases') out = out.filter((t) => t.type === 'release');
  else if (f.type === 'founders') out = out.filter((t) => t.founder);

  if (f.version === 'n3') out = out.filter((t) => t.version === 'N3');
  else if (f.version === 'n4') out = out.filter((t) => t.version === 'N4');

  if (f.repo !== 'all') out = out.filter((t) => t.repo === f.repo);

  if (sort === 'discussed') {
    out = [...out].sort((a, b) => (b.comments ?? 0) - (a.comments ?? 0));
  } else if (sort === 'new') {
    out = [...out]; // input order is by updated_at desc
  } else {
    out = [...out].sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0));
  }
  return out;
}

export function FeedPage() {
  const D = useGasettaV3();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const filters = readFilters(params);
  const sort: SortKey = (params.get('sort') as SortKey) || 'hot';

  const setFilters = (next: FeedFilters) => {
    const p = writeFilters(next);
    if (sort !== 'hot') p.set('sort', sort);
    setParams(p, { replace: true });
  };
  const setSort = (next: SortKey) => {
    const p = writeFilters(filters);
    if (next !== 'hot') p.set('sort', next);
    setParams(p, { replace: true });
  };

  const filtered = useMemo(
    () => filterThreads(D.threads, filters, sort),
    [D.threads, filters, sort],
  );

  const openThread = (t: Thread) => navigate(`/threads/${encodeURIComponent(t.id)}`);
  const openResolved = (r: ResolvedRow) => navigate(`/threads/${encodeURIComponent(r.id)}`);
  const openContributor = (c: TopContributor) => {
    if (c.founder) setFilters({ ...filters, type: 'founders' });
  };

  return (
    <div className="shell">
      <LeftRail
        filters={filters}
        setFilters={setFilters}
        threads={D.threads}
        repos={D.repos}
        stats={D.stats}
      />
      <main style={{ minWidth: 0 }}>
        <div className="sortbar">
          <span className="label">Sort</span>
          <div className="seg" role="tablist">
            {(['hot', 'new', 'discussed'] as SortKey[]).map((k) => (
              <button key={k} aria-pressed={sort === k} onClick={() => setSort(k)}>
                {k === 'hot' ? 'Hot' : k === 'new' ? 'New' : 'Most discussed'}
              </button>
            ))}
          </div>
          <div className="right">
            <span>{filtered.length} items</span>
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="state-card">
            <div className="title">Nothing here yet</div>
            <div className="sub">
              No items match these filters. Try widening the type or version filter, or reset to All.
            </div>
          </div>
        ) : (
          <div className="feed">
            {filtered.map((t) => (
              <FeedCard key={t.id} thread={t} founders={D.founders} onOpen={openThread} />
            ))}
          </div>
        )}
      </main>
      <RightRail
        stats={D.stats}
        topContributors={D.topContributors}
        recentlyResolved={D.recentlyResolved}
        onOpenContributor={openContributor}
        onOpenResolved={openResolved}
      />
    </div>
  );
}
