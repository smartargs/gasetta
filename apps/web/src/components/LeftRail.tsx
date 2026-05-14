import { Link } from 'react-router-dom';
import { Icon, type IconName } from './atoms';
import type { RepoSummary, Thread, LiveStats } from '../data/v3types';

export interface FeedFilters {
  type: 'all' | 'issues' | 'prs' | 'discussions' | 'releases' | 'founders';
  version: 'all' | 'n3' | 'n4';
  repo: string; // 'all' or repo name
}

export type WindowKey = '7d' | '30d' | '90d' | 'all';

interface LeftRailProps {
  filters: FeedFilters;
  setFilters: (next: FeedFilters) => void;
  windowKey: WindowKey;
  setWindow: (next: WindowKey) => void;
  threads: Thread[];
  repos: RepoSummary[];
  stats: LiveStats;
  /** Only used on mobile, where the rail is a slide-in drawer; ignored on desktop. */
  open?: boolean;
  onClose?: () => void;
}

export function LeftRail({
  filters,
  setFilters,
  windowKey,
  setWindow,
  threads,
  repos,
  stats,
  open = false,
  onClose,
}: LeftRailProps) {
  const counts = {
    all: threads.filter((t) => t.type !== 'commits').length,
    issues: threads.filter((t) => t.type === 'issue').length,
    prs: threads.filter((t) => t.type === 'pr').length,
    discussions: threads.filter((t) => t.type === 'discussion').length,
    releases: threads.filter((t) => t.type === 'release').length,
    founders: threads.filter((t) => t.founder).length,
    n3: threads.filter((t) => t.version === 'N3' && t.type !== 'commits').length,
    n4: threads.filter((t) => t.version === 'N4' && t.type !== 'commits').length,
  };

  const setType = (v: FeedFilters['type']) => setFilters({ ...filters, type: v });
  const setVersion = (v: FeedFilters['version']) => setFilters({ ...filters, version: v });
  const setRepo = (v: FeedFilters['repo']) => setFilters({ ...filters, repo: v });

  const types: { id: FeedFilters['type']; label: string; icon: IconName; n: number }[] = [
    { id: 'all', label: 'All activity', icon: 'list', n: counts.all },
    { id: 'issues', label: 'Issues', icon: 'issue', n: counts.issues },
    { id: 'prs', label: 'Pull requests', icon: 'pr', n: counts.prs },
    { id: 'discussions', label: 'Discussions', icon: 'discussion', n: counts.discussions },
    { id: 'releases', label: 'Releases', icon: 'release', n: counts.releases },
    { id: 'founders', label: 'Founder-touched', icon: 'sparkle', n: counts.founders },
  ];

  const versions: { id: FeedFilters['version']; label: string; n: number }[] = [
    { id: 'all', label: 'All versions', n: counts.all },
    { id: 'n3', label: 'N3 — Mainnet', n: counts.n3 },
    { id: 'n4', label: 'N4 — In development', n: counts.n4 },
  ];

  const timeWindows: { id: WindowKey; label: string }[] = [
    { id: 'all', label: 'All time' },
    { id: '7d', label: 'Last 7 days' },
    { id: '30d', label: 'Last 30 days' },
    { id: '90d', label: 'Last 90 days' },
  ];

  const repoOpts = [
    { id: 'all', label: 'All repos' },
    ...repos.slice(0, 8).map((r) => ({ id: r.name, label: r.name })),
  ];

  return (
    <aside className={`col-left ${open ? 'is-open' : ''}`}>
      {onClose && (
        <div className="rail-close-row">
          <button type="button" className="rail-close" onClick={onClose} aria-label="Close filters">
            Done
          </button>
        </div>
      )}
      <div className="rail-section">
        <div className="rail-title">Type</div>
        <div className="rail-list">
          {types.map((t) => (
            <div
              key={t.id}
              className={`rail-item ${filters.type === t.id ? 'active' : ''}`}
              onClick={() => setType(t.id)}
            >
              <Icon name={t.icon} size={13} className="ico" />
              <span>{t.label}</span>
              <span className="count">{t.n}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rail-section">
        <div className="rail-title">Version</div>
        <div className="rail-list">
          {versions.map((v) => (
            <div
              key={v.id}
              className={`rail-item ${filters.version === v.id ? 'active' : ''}`}
              onClick={() => setVersion(v.id)}
            >
              <span className="dot" />
              <span>{v.label}</span>
              <span className="count">{v.n}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rail-section">
        <div className="rail-title">Time</div>
        <div className="rail-list">
          {timeWindows.map((w) => (
            <div
              key={w.id}
              className={`rail-item ${windowKey === w.id ? 'active' : ''}`}
              onClick={() => setWindow(w.id)}
            >
              <span className="dot" />
              <span>{w.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rail-section">
        <div className="rail-title">Repo</div>
        <div className="rail-list">
          {repoOpts.map((r) => (
            <div
              key={r.id}
              className={`rail-item ${filters.repo === r.id ? 'active' : ''}`}
              onClick={() => setRepo(r.id)}
              style={{
                fontFamily: r.id === 'all' ? 'inherit' : 'var(--mono)',
                fontSize: r.id === 'all' ? 13 : 12.5,
              }}
            >
              <span className="dot" />
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {r.label}
              </span>
            </div>
          ))}
          <Link to="/repos" className="rail-item" style={{ color: 'var(--neo-2)' }}>
            <span className="dot" style={{ background: 'var(--neo)' }} />
            <span>All repos →</span>
          </Link>
        </div>
      </div>

      <div className="rail-section">
        <div className="rail-title">This week</div>
        <div className="rail-stats">
          <div className="rail-stat">
            <span className="lbl">Open issues</span>
            <span className="val">{stats.openIssues}</span>
          </div>
          <div className="rail-stat">
            <span className="lbl">Open PRs</span>
            <span className="val">{stats.openPRs}</span>
          </div>
          <div className="rail-stat">
            <span className="lbl">Founder comments</span>
            <span className="val">{stats.founderCommentsWeek}</span>
          </div>
          <div className="rail-stat">
            <span className="lbl">Releases (30d)</span>
            <span className="val">{stats.releasesMonth}</span>
          </div>
        </div>
      </div>

      <div className="rail-section">
        <details className="rail-legend">
          <summary>
            <span style={{ color: 'var(--ink-3)', fontWeight: 500 }}>
              What do the consensus chips mean?
            </span>
          </summary>
          <dl>
            <dt>
              <span className="chip consensus-resolved">Resolved</span>
            </dt>
            <dd>Thread reached a clear outcome.</dd>
            <dt>
              <span className="chip consensus-decided">Decided</span>
            </dt>
            <dd>Direction chosen, work in progress.</dd>
            <dt>
              <span className="chip consensus-leaning">Leaning approve</span>
            </dt>
            <dd>Reviewers tilting yes.</dd>
            <dt>
              <span className="chip consensus-open">Open</span>
            </dt>
            <dd>Active, no direction yet.</dd>
            <dt>
              <span className="chip consensus-split">Split</span>
            </dt>
            <dd>Substantive disagreement.</dd>
            <dt>
              <span className="chip consensus-stalled">Stalled</span>
            </dt>
            <dd>No activity in 7+ days.</dd>
          </dl>
        </details>
      </div>
    </aside>
  );
}
