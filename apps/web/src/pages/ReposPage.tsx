import { useNavigate } from 'react-router-dom';
import { useGasettaV3, useGasettaLoading } from '../lib/v3Context';
import { Icon } from '../components/atoms';
import type { RepoSummary, Thread } from '../data/v3types';

function sparklinePath(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const pts: number[] = [];
  for (let i = 0; i < 24; i++) {
    h = (h * 1103515245 + 12345) >>> 0;
    pts.push((h % 100) / 100);
  }
  const w = 320;
  const ht = 30;
  const step = w / (pts.length - 1);
  const max = Math.max(...pts);
  const min = Math.min(...pts);
  const range = max - min || 1;
  const path = pts
    .map((v, i) => {
      const x = i * step;
      const y = ht - ((v - min) / range) * (ht - 2) - 1;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
  const area = `${path} L ${w} ${ht} L 0 ${ht} Z`;
  return { path, area, w, ht };
}

function countFor(threads: Thread[], name: string) {
  const ts = threads.filter((t) => t.repo === name);
  return {
    issues: ts.filter((t) => t.type === 'issue').length,
    prs: ts.filter((t) => t.type === 'pr').length,
    discussions: ts.filter((t) => t.type === 'discussion').length,
    latest: ts.find((t) => t.type !== 'commits' && t.type !== 'release'),
  };
}

function RepoCard({ repo, threads, onOpen }: { repo: RepoSummary; threads: Thread[]; onOpen: () => void }) {
  const c = countFor(threads, repo.name);
  const sp = sparklinePath(repo.name);
  return (
    <div className="repo-card" onClick={onOpen} role="button" tabIndex={0}>
      <div className="top">
        <div className="name">
          <span className="org">neo-project /</span> {repo.name}
        </div>
        <span className={`momentum ${repo.momentum}`} style={{ marginLeft: 'auto' }}>
          <Icon name={repo.momentum === 'surging' ? 'flame' : 'dot'} size={9} />
          {repo.momentum.charAt(0).toUpperCase() + repo.momentum.slice(1)}
        </span>
      </div>
      <div className="desc">{repo.desc}</div>
      <div className="counts">
        <span>
          <Icon name="issue" size={12} className="ico" />
          <b>{c.issues}</b>issues
        </span>
        <span>
          <Icon name="pr" size={12} className="ico" />
          <b>{c.prs}</b>PRs
        </span>
        <span>
          <Icon name="discussion" size={12} className="ico" />
          <b>{c.discussions}</b>discussions
        </span>
        <span style={{ marginLeft: 'auto' }}>★ {repo.stars.toLocaleString()}</span>
      </div>
      <div className="spark">
        <svg
          viewBox={`0 0 ${sp.w} ${sp.ht}`}
          preserveAspectRatio="none"
          style={{ width: '100%', height: 30 }}
        >
          <path d={sp.area} fill="var(--neo-soft)" />
          <path d={sp.path} fill="none" stroke="var(--neo)" strokeWidth="1.5" />
        </svg>
      </div>
      {c.latest && (
        <div className="latest">
          <span
            style={{
              color: 'var(--ink-4)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              fontSize: 10,
            }}
          >
            Latest
          </span>
          <span className="tt">{c.latest.title}</span>
          <span style={{ marginLeft: 'auto', color: 'var(--ink-4)' }}>{c.latest.when}</span>
        </div>
      )}
    </div>
  );
}

export function ReposPage() {
  const D = useGasettaV3();
  const isLoading = useGasettaLoading();
  const navigate = useNavigate();
  const showSkeletons = isLoading && D.repos.length === 0;
  return (
    <div style={{ maxWidth: 1120, margin: '0 auto', padding: '28px 22px 80px' }}>
      <div className="founders-head">
        <div>
          <h1>Repositories</h1>
          <div className="sub">
            {showSkeletons ? (
              <>Loading repos in <span style={{ fontFamily: 'var(--mono)' }}>neo-project</span>…</>
            ) : (
              <>
                {D.repos.length} repos in{' '}
                <span style={{ fontFamily: 'var(--mono)' }}>neo-project</span>. Sorted by recent
                momentum.
              </>
            )}
          </div>
        </div>
      </div>
      <div className="repos-grid cols-2">
        {showSkeletons
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton-card">
                <div className="skel-line" style={{ width: '40%', height: 16 }} />
                <div className="skel-line" style={{ width: '85%' }} />
                <div className="skel-line" style={{ width: '70%' }} />
                <div className="skel-line" style={{ width: '50%', height: 30 }} />
              </div>
            ))
          : D.repos.map((r) => (
              <RepoCard
                key={r.name}
                repo={r}
                threads={D.threads}
                onOpen={() => navigate(`/repos/${encodeURIComponent(r.name)}`)}
              />
            ))}
      </div>
    </div>
  );
}
