import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGasettaV3 } from '../lib/v3Context';
import { Icon } from '../components/atoms';
import type { ResolvedRow } from '../data/v3types';

type OutcomeFilter = 'all' | 'merged' | 'resolved' | 'decided' | 'closed';

const ICON_BY_OUTCOME: Record<ResolvedRow['outcome'], { name: 'pr' | 'check-circle' | 'check' | 'issue'; cls: string }> = {
  Merged: { name: 'pr', cls: 'merged' },
  Resolved: { name: 'check-circle', cls: 'resolved' },
  Decided: { name: 'check', cls: 'decided' },
  Closed: { name: 'issue', cls: 'closed' },
};

export function ArchivePage() {
  const D = useGasettaV3();
  const navigate = useNavigate();
  const [outcome, setOutcome] = useState<OutcomeFilter>('all');
  const [q, setQ] = useState('');
  const [scope, setScope] = useState<'all' | 'founders'>('all');

  const items = useMemo(
    () =>
      D.recentlyResolved.filter((r) => {
        if (outcome !== 'all' && r.outcome.toLowerCase() !== outcome) return false;
        if (scope === 'founders' && !r.founder) return false;
        if (
          q &&
          !`${r.title} ${r.repo} ${r.oneLiner ?? ''}`.toLowerCase().includes(q.toLowerCase())
        )
          return false;
        return true;
      }),
    [D.recentlyResolved, outcome, scope, q],
  );

  const stats = useMemo(
    () => ({
      total: D.recentlyResolved.length,
      merged: D.recentlyResolved.filter((r) => r.outcome === 'Merged').length,
      resolved: D.recentlyResolved.filter((r) => r.outcome === 'Resolved').length,
      decided: D.recentlyResolved.filter((r) => r.outcome === 'Decided').length,
      closed: D.recentlyResolved.filter((r) => r.outcome === 'Closed').length,
      founders: D.recentlyResolved.filter((r) => r.founder).length,
    }),
    [D.recentlyResolved],
  );

  const groups = useMemo(() => {
    const g: { today: ResolvedRow[]; week: ResolvedRow[]; earlier: ResolvedRow[] } = {
      today: [],
      week: [],
      earlier: [],
    };
    for (const r of items) {
      if (r.daysAgo <= 1) g.today.push(r);
      else if (r.daysAgo <= 7) g.week.push(r);
      else g.earlier.push(r);
    }
    return g;
  }, [items]);

  const Row = ({ r }: { r: ResolvedRow }) => {
    const ic = ICON_BY_OUTCOME[r.outcome];
    return (
      <div
        className="archive-row"
        onClick={() => navigate(`/threads/${encodeURIComponent(r.id)}`)}
        role="button"
        tabIndex={0}
      >
        <span className={`ico ${ic.cls}`}>
          <Icon name={ic.name} size={16} />
        </span>
        <span className={`outcome ${r.outcome}`}>{r.outcome}</span>
        <div className="body">
          <div className="tt">{r.title}</div>
          {r.oneLiner && <div className="one">{r.oneLiner}</div>}
        </div>
        <div className="meta-r">
          <span className="repo">
            {r.repo} #{r.number}
          </span>
          <span className="when">{r.when}</span>
          {r.founder && r.founderLogin && D.founders[r.founderLogin] && (
            <span
              className="founder-dot"
              title={`${D.founders[r.founderLogin].name} participated`}
            >
              <span
                style={{
                  width: 11,
                  height: 11,
                  borderRadius: '50%',
                  background: '#533F00',
                  color: 'var(--founder)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 8,
                  fontWeight: 700,
                }}
              >
                {D.founders[r.founderLogin].initials}
              </span>
              {D.founders[r.founderLogin].name.split(' ')[0]}
            </span>
          )}
        </div>
      </div>
    );
  };

  const Group = ({ label, list }: { label: string; list: ResolvedRow[] }) =>
    list.length === 0 ? null : (
      <div className="archive-group">
        <div className="group-h">
          <span>{label}</span>
          <span className="ct">
            {list.length} item{list.length === 1 ? '' : 's'}
          </span>
        </div>
        <div>
          {list.map((r) => (
            <Row key={r.id} r={r} />
          ))}
        </div>
      </div>
    );

  return (
    <div className="archive-shell">
      <Link
        className="back"
        to="/"
        onClick={(e) => {
          e.preventDefault();
          navigate('/');
        }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          color: 'var(--ink-3)',
          fontSize: 13,
          marginBottom: 18,
        }}
      >
        <Icon name="chevron-left" size={14} /> Back to feed
      </Link>
      <div className="archive-head">
        <h1>Resolved threads</h1>
        <div className="sub">
          Threads that reached a clear outcome — merged, decided, resolved, or closed. Newest first.
        </div>
      </div>

      <div className="archive-stats">
        <div className="stat">
          <span className="v">{stats.total}</span>
          <span className="l">Total · 30d</span>
        </div>
        <div className="stat">
          <span className="v" style={{ color: 'var(--merged-fg)' }}>
            {stats.merged}
          </span>
          <span className="l">Merged</span>
        </div>
        <div className="stat">
          <span className="v" style={{ color: 'var(--c-resolved-fg)' }}>
            {stats.resolved}
          </span>
          <span className="l">Resolved</span>
        </div>
        <div className="stat">
          <span className="v" style={{ color: 'var(--c-decided-fg)' }}>
            {stats.decided}
          </span>
          <span className="l">Decided</span>
        </div>
        <div className="stat">
          <span className="v" style={{ color: 'var(--ink-3)' }}>
            {stats.closed}
          </span>
          <span className="l">Closed</span>
        </div>
        <div className="stat">
          <span className="v" style={{ color: '#5E4400' }}>
            {stats.founders}
          </span>
          <span className="l">Founder-touched</span>
        </div>
      </div>

      <div className="archive-controls">
        <div className="archive-search">
          <Icon name="filter" size={13} style={{ color: 'var(--ink-4)' }} />
          <input
            placeholder="Filter resolved threads — title, repo, or summary"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {q && (
            <button
              onClick={() => setQ('')}
              style={{
                appearance: 'none',
                border: 0,
                background: 'transparent',
                color: 'var(--ink-4)',
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              clear
            </button>
          )}
        </div>
      </div>
      <div className="archive-chips">
        {([
          { id: 'all' as const, label: `All (${stats.total})` },
          { id: 'merged' as const, label: `Merged (${stats.merged})` },
          { id: 'resolved' as const, label: `Resolved (${stats.resolved})` },
          { id: 'decided' as const, label: `Decided (${stats.decided})` },
          { id: 'closed' as const, label: `Closed (${stats.closed})` },
        ]).map((c) => (
          <button
            key={c.id}
            className="archive-chip"
            aria-pressed={outcome === c.id}
            onClick={() => setOutcome(c.id)}
          >
            {c.label}
          </button>
        ))}
        <span
          style={{
            width: 1,
            background: 'var(--border)',
            height: 24,
            alignSelf: 'center',
            margin: '0 4px',
          }}
        />
        <button
          className="archive-chip"
          aria-pressed={scope === 'founders'}
          onClick={() => setScope(scope === 'founders' ? 'all' : 'founders')}
        >
          <span style={{ color: scope === 'founders' ? 'var(--founder)' : '#5E4400' }}>★</span>{' '}
          Founder-touched ({stats.founders})
        </button>
      </div>

      {items.length === 0 ? (
        <div className="state-card" style={{ marginTop: 22 }}>
          <div className="title">No matches</div>
          <div className="sub">
            Nothing matches that filter. Try clearing the search or picking a different outcome.
          </div>
        </div>
      ) : (
        <>
          <Group label="Last 24 hours" list={groups.today} />
          <Group label="This week" list={groups.week} />
          <Group label="Earlier" list={groups.earlier} />
        </>
      )}
    </div>
  );
}
