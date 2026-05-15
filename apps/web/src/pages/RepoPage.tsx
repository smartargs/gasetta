import { Link, useNavigate, useParams } from 'react-router-dom';
import { useGasettaV3, useGasettaLoading } from '../lib/v3Context';
import { Icon } from '../components/atoms';
import { FeedCard } from '../components/FeedCard';

export function RepoPage() {
  const D = useGasettaV3();
  const isLoading = useGasettaLoading();
  const navigate = useNavigate();
  const { name } = useParams<{ name: string }>();
  const repoName = name ? decodeURIComponent(name) : '';
  const repo = D.repos.find((r) => r.name === repoName);
  if (!repo) {
    if (isLoading) {
      return (
        <div style={{ padding: 24, maxWidth: 980, margin: '0 auto' }}>
          <Link to="/repos" className="back">
            <Icon name="chevron-left" size={14} /> All repos
          </Link>
          <div className="skeleton-card" style={{ marginTop: 16 }}>
            <div className="skel-line" style={{ width: '30%', height: 22 }} />
            <div className="skel-line" style={{ width: '70%' }} />
            <div className="skel-line" style={{ width: '60%' }} />
            <div className="skel-line" style={{ width: '90%' }} />
          </div>
        </div>
      );
    }
    return (
      <div style={{ padding: 40, maxWidth: 720, margin: '0 auto' }}>
        <Link to="/repos" className="back">
          <Icon name="chevron-left" size={14} /> All repos
        </Link>
        <div className="state-card" style={{ marginTop: 24 }}>
          <div className="title">Repo not found</div>
          <div className="sub">We're not tracking a repo by that name yet.</div>
        </div>
      </div>
    );
  }
  const threads = D.threads.filter((t) => t.repo === repoName && t.type !== 'commits');

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: '24px 22px 80px' }}>
      <Link
        className="back"
        to="/repos"
        onClick={(e) => {
          e.preventDefault();
          navigate('/repos');
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
        <Icon name="chevron-left" size={14} /> All repos
      </Link>
      <div className="repo-head">
        <div className="row1">
          <a
            className="full repo-head-link"
            href={`https://github.com/neo-project/${repo.name}`}
            target="_blank"
            rel="noopener noreferrer"
            title={`Open neo-project/${repo.name} on GitHub`}
          >
            neo-project / <span style={{ color: 'var(--ink)' }}>{repo.name}</span>
          </a>
          <span
            className={`momentum ${repo.momentum}`}
            style={{
              marginLeft: 'auto',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '2px 9px',
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 500,
              background: repo.momentum === 'surging' ? 'var(--neo-soft)' : 'var(--bg-tint)',
              color: repo.momentum === 'surging' ? 'var(--neo-2)' : 'var(--ink-3)',
            }}
          >
            <Icon name={repo.momentum === 'surging' ? 'flame' : 'dot'} size={10} />
            {repo.momentum.charAt(0).toUpperCase() + repo.momentum.slice(1)}
          </span>
        </div>
        <div className="desc">{repo.desc}</div>
        <div className="stats">
          <div className="stat">
            <span className="v">{threads.filter((t) => t.type === 'issue').length}</span>
            <span className="l">Open issues</span>
          </div>
          <div className="stat">
            <span className="v">{threads.filter((t) => t.type === 'pr').length}</span>
            <span className="l">Open PRs</span>
          </div>
          <div className="stat">
            <span className="v">{threads.filter((t) => t.type === 'discussion').length}</span>
            <span className="l">Discussions</span>
          </div>
          <div className="stat">
            <span className="v">{repo.stars.toLocaleString()}</span>
            <span className="l">Stars</span>
          </div>
        </div>
      </div>
      {threads.length === 0 ? (
        <div className="state-card">
          <div className="title">No recent activity</div>
          <div className="sub">
            This repo hasn't surfaced anything notable in the last refresh window.
          </div>
        </div>
      ) : (
        <div className="feed">
          {threads.map((t) => (
            <FeedCard
              key={t.id}
              thread={t}
              founders={D.founders}
              onOpen={(th) => navigate(`/threads/${encodeURIComponent(th.id)}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
