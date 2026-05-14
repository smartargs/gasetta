import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGasettaV3 } from '../lib/v3Context';
import { LeftRail, type FeedFilters, type WindowKey } from '../components/LeftRail';
import { RightRail } from '../components/RightRail';
import { FeedCard } from '../components/FeedCard';
import { Icon } from '../components/atoms';
import type { Thread, TopContributor, ResolvedRow } from '../data/v3types';

const PAGE_SIZE = 30;

type SortKey = 'hot' | 'new' | 'discussed';

const WINDOW_DAYS: Record<Exclude<WindowKey, 'all'>, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

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

function filterThreads(
  threads: Thread[],
  f: FeedFilters,
  sort: SortKey,
  query: string,
  windowKey: WindowKey,
): Thread[] {
  let out = threads.filter((t) => t.type !== 'commits');
  if (f.type === 'issues') out = out.filter((t) => t.type === 'issue');
  else if (f.type === 'prs') out = out.filter((t) => t.type === 'pr');
  else if (f.type === 'discussions') out = out.filter((t) => t.type === 'discussion');
  else if (f.type === 'releases') out = out.filter((t) => t.type === 'release');
  else if (f.type === 'founders') out = out.filter((t) => t.founder);

  if (f.version === 'n3') out = out.filter((t) => t.version === 'N3');
  else if (f.version === 'n4') out = out.filter((t) => t.version === 'N4');

  if (f.repo !== 'all') out = out.filter((t) => t.repo === f.repo);

  if (windowKey !== 'all') {
    const cutoff = Date.now() - WINDOW_DAYS[windowKey] * 86_400_000;
    out = out.filter((t) => {
      if (!t.updatedAt) return false;
      return new Date(t.updatedAt).getTime() >= cutoff;
    });
  }

  const q = query.trim().toLowerCase();
  if (q) {
    out = out.filter((t) => {
      if (t.title.toLowerCase().includes(q)) return true;
      if (t.summary && t.summary.toLowerCase().includes(q)) return true;
      if (t.repo.toLowerCase().includes(q)) return true;
      if (t.author && t.author.toLowerCase().includes(q)) return true;
      return false;
    });
  }

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
  const query = params.get('q') ?? '';
  const windowKey: WindowKey = ((): WindowKey => {
    const w = params.get('window');
    return w === '7d' || w === '30d' || w === '90d' || w === 'all' ? w : 'all';
  })();

  const writeWithExtras = (
    next: FeedFilters,
    nextSort: SortKey = sort,
    nextQuery: string = query,
    nextWindow: WindowKey = windowKey,
  ): URLSearchParams => {
    const p = writeFilters(next);
    if (nextSort !== 'hot') p.set('sort', nextSort);
    const trimmed = nextQuery.trim();
    if (trimmed) p.set('q', trimmed);
    if (nextWindow !== 'all') p.set('window', nextWindow);
    return p;
  };

  const setFilters = (next: FeedFilters) => setParams(writeWithExtras(next), { replace: true });
  const setSort = (next: SortKey) =>
    setParams(writeWithExtras(filters, next), { replace: true });
  const setQuery = (next: string) =>
    setParams(writeWithExtras(filters, sort, next), { replace: true });
  const setWindow = (next: WindowKey) =>
    setParams(writeWithExtras(filters, sort, query, next), { replace: true });

  const filtered = useMemo(
    () => filterThreads(D.threads, filters, sort, query, windowKey),
    [D.threads, filters, sort, query, windowKey],
  );

  // Infinite scroll: render the first `visibleCount` cards, grow when an
  // IntersectionObserver sentinel near the bottom enters the viewport. Any
  // filter/sort/window/query change resets to one page so we don't show a
  // stale half-paginated view of a different set.
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filters.type, filters.version, filters.repo, sort, query, windowKey]);

  const visible = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const hasMore = filtered.length > visible.length;

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    // Re-create the observer when visibleCount changes too. Otherwise an
    // intersection that's already "active" after a load doesn't fire again
    // (observers only emit on state change), and the user has to manually
    // scroll a hair before the next page loads — easy to miss.
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisibleCount((n) => Math.min(n + PAGE_SIZE, filtered.length));
        }
      },
      { rootMargin: '600px 0px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, filtered.length, visibleCount]);

  const loadMore = () =>
    setVisibleCount((n) => Math.min(n + PAGE_SIZE, filtered.length));

  // Mobile-only state — the LeftRail is a slide-in drawer below 820px.
  // Ignored on desktop (the drawer CSS only kicks in at small widths).
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilterCount =
    (filters.type !== 'all' ? 1 : 0) +
    (filters.version !== 'all' ? 1 : 0) +
    (filters.repo !== 'all' ? 1 : 0) +
    (windowKey !== 'all' ? 1 : 0);

  const openThread = (t: Thread) => navigate(`/threads/${encodeURIComponent(t.id)}`);
  const openResolved = (r: ResolvedRow) => navigate(`/threads/${encodeURIComponent(r.id)}`);
  const openContributor = (c: TopContributor) => {
    if (c.founder) setFilters({ ...filters, type: 'founders' });
  };

  return (
    <div className="shell">
      {filtersOpen && (
        <div className="rail-backdrop" onClick={() => setFiltersOpen(false)} aria-hidden="true" />
      )}
      <LeftRail
        filters={filters}
        setFilters={setFilters}
        windowKey={windowKey}
        setWindow={setWindow}
        threads={D.threads}
        repos={D.repos}
        stats={D.stats}
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
      />
      <main style={{ minWidth: 0 }}>
        <button
          type="button"
          className="mobile-filters-btn"
          onClick={() => setFiltersOpen(true)}
          aria-label="Open filters"
        >
          <Icon name="filter" size={13} />
          Filters
          {activeFilterCount > 0 && <span className="badge">{activeFilterCount}</span>}
        </button>
        <div className="searchbar">
          <input
            type="search"
            value={query}
            placeholder="Search titles, summaries, repos…"
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search feed"
          />
          {query && (
            <button type="button" className="clear" onClick={() => setQuery('')} aria-label="Clear">
              ×
            </button>
          )}
        </div>
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
            <span>
              {hasMore
                ? `Showing ${visible.length} of ${filtered.length}`
                : `${filtered.length} items`}
              {query && ` · "${query}"`}
            </span>
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="state-card">
            <div className="title">Nothing here yet</div>
            <div className="sub">
              {query
                ? `No items match "${query}". Try a different search term, or clear the search.`
                : windowKey !== 'all'
                  ? `No items in the last ${windowKey}. Try a wider time window.`
                  : 'No items match these filters. Try widening the type or version filter, or reset to All.'}
            </div>
          </div>
        ) : (
          <>
            <div className="feed">
              {visible.map((t) => (
                <FeedCard key={t.id} thread={t} founders={D.founders} onOpen={openThread} />
              ))}
            </div>
            {hasMore && (
              <>
                <div className="load-more-bar">
                  <button type="button" className="load-more-btn" onClick={loadMore}>
                    Load {Math.min(PAGE_SIZE, filtered.length - visible.length)} more
                  </button>
                  <span className="load-more-hint">
                    Showing {visible.length} of {filtered.length}
                  </span>
                </div>
                <div ref={sentinelRef} className="feed-sentinel" aria-hidden="true" />
              </>
            )}
          </>
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
