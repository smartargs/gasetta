import { Link } from 'react-router-dom';
import { Avatar, Icon } from './atoms';
import type { LiveStats, ResolvedRow, TopContributor } from '../data/v3types';

interface RightRailProps {
  stats: LiveStats;
  topContributors: TopContributor[];
  recentlyResolved: ResolvedRow[];
  onOpenContributor?: (c: TopContributor) => void;
  onOpenResolved?: (r: ResolvedRow) => void;
}

export function RightRail({
  stats,
  topContributors,
  recentlyResolved,
  onOpenContributor,
  onOpenResolved,
}: RightRailProps) {
  return (
    <aside className="col-right">
      <div className="side-card">
        <h3>About this view</h3>
        <p style={{ fontSize: 13 }}>
          Gasetta is a continuously-updated, AI-summarised view of activity in the{' '}
          <span style={{ fontFamily: 'var(--mono)' }}>neo-project</span> GitHub organisation.
          It scans the org every few hours, then surfaces the consensus on each thread — who's
          arguing for what, where founders weighed in, and what's been decided.
        </p>
        <p style={{ fontSize: 13 }}>
          Not affiliated with Neo or NGD. Built by the community —{' '}
          <a
            className="link"
            href="https://github.com/smartargs/gasetta"
            target="_blank"
            rel="noopener noreferrer"
          >
            source on GitHub
          </a>
          .
        </p>
        <div className="meta">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span className="pulse" />
            Last refreshed {stats.updatedRelative}
          </span>
          <Link className="link" to="/about" style={{ marginLeft: 10 }}>
            About →
          </Link>
        </div>
      </div>

      <div className="side-card n4-widget">
        <h3>N4 momentum</h3>
        <p style={{ fontSize: 13, margin: '0 0 4px' }}>
          <b style={{ color: 'var(--ink)', fontWeight: 600 }}>{stats.n4Share}%</b> of activity in
          the last 14 days is tagged N4.
        </p>
        <div className="splitbar">
          <div className="n4" style={{ width: `${stats.n4Share}%` }} />
          <div className="n3" style={{ width: `${100 - stats.n4Share}%` }} />
        </div>
        <div className="legend">
          <span>
            <span className="sw" style={{ background: 'var(--neo)' }} />
            N4 in dev
          </span>
          <span>
            <span className="sw" style={{ background: 'var(--ink-3)' }} />
            N3 mainnet
          </span>
        </div>
        <div style={{ marginTop: 8 }}>
          <Link className="link" to="/versions" style={{ fontSize: 12 }}>
            What is N4? →
          </Link>
        </div>
      </div>

      {topContributors.length > 0 && (
        <div className="side-card">
          <h3>Top contributors · 14d</h3>
          {topContributors.map((c) => (
            <div
              key={c.login}
              className={`contrib ${c.founder ? 'founder' : ''}`}
              onClick={() => onOpenContributor?.(c)}
            >
              <Avatar login={c.login} initials={c.initials} founder={c.founder} size={28} />
              <div className="who">
                <span className="name">
                  {c.name}
                  {c.founder && (
                    <span style={{ color: 'var(--founder-edge)', marginLeft: 6 }}>★</span>
                  )}
                </span>
                <span className="login">@{c.login}</span>
              </div>
              <span className="ct">{c.count}</span>
            </div>
          ))}
        </div>
      )}

      {recentlyResolved.length > 0 && (
        <div className="side-card recently-resolved">
          <h3>Recently resolved</h3>
          {recentlyResolved.map((r) => (
            <div key={r.id} className="item" onClick={() => onOpenResolved?.(r)}>
              <Icon
                name="check-circle"
                size={14}
                style={{ color: 'var(--neo-2)', marginTop: 2, flex: '0 0 14px' }}
              />
              <div style={{ flex: 1 }}>
                <div className="tt">{r.title}</div>
                <div className="when">
                  {r.outcome} · {r.when}
                </div>
              </div>
            </div>
          ))}
          <div style={{ marginTop: 8 }}>
            <Link className="link" to="/archive" style={{ fontSize: 12 }}>
              All resolved →
            </Link>
          </div>
        </div>
      )}
    </aside>
  );
}
