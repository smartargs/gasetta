import { Link, useNavigate } from 'react-router-dom';
import { useGasettaV3, useGasettaLoading } from '../lib/v3Context';
import { usePageMeta } from '../lib/usePageMeta';
import { Icon, ShareMenu, VersionChip } from '../components/atoms';

function statusClass(s: string): string {
  const k = s.toLowerCase();
  if (k.startsWith('leaning')) return 'leaning';
  if (k.startsWith('in review')) return 'review';
  if (k.startsWith('contested')) return 'contested';
  if (k.startsWith('approved')) return 'approved';
  if (k.startsWith('decided')) return 'decided';
  if (k.startsWith('stalled')) return 'stalled';
  return 'review';
}

export function VersionsPage() {
  const D = useGasettaV3();
  const isLoading = useGasettaLoading();
  const navigate = useNavigate();
  const VA = D.versionActivity;
  const total = VA.n3.total + VA.n4.total;
  const n4pct = total === 0 ? 50 : Math.round((VA.n4.total / total) * 100);
  const n3pct = 100 - n4pct;

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareText =
    total > 0
      ? `Where Neo dev activity is going right now: N4 ${n4pct}% vs N3 ${n3pct}% (${total} items classified). Tracked live on Gasetta.`
      : `N3 vs N4 — a live read of where Neo development effort is going right now. Tracked on Gasetta.`;
  usePageMeta({
    title: 'N3 vs N4 — Neo activity split · Gasetta',
    description: shareText,
  });

  if (isLoading && total === 0 && D.n4Features.length === 0) {
    return (
      <div className="versions-shell">
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
        <div className="skeleton-card" style={{ marginBottom: 16 }}>
          <div className="skel-line" style={{ width: '50%', height: 24 }} />
          <div className="skel-line" style={{ width: '80%' }} />
          <div className="skel-line" style={{ width: '100%', height: 16 }} />
          <div className="skel-line" style={{ width: '70%' }} />
        </div>
        <div className="skeleton-card">
          <div className="skel-line" style={{ width: '40%', height: 18 }} />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skel-line" style={{ width: `${60 + ((i * 7) % 30)}%` }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="versions-shell">
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

      <div className="versions-hero">
        <div className="versions-hero-head">
          <h1>N3 and N4 — what's going on</h1>
          <ShareMenu url={shareUrl} text={shareText} />
        </div>
        <p className="sub">
          A live read of where development effort is going right now, and what's new in N4.
        </p>

        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 8,
            marginTop: 4,
            marginBottom: 8,
          }}
        >
          <span
            style={{
              fontSize: 12,
              color: 'var(--ink-4)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              fontWeight: 600,
            }}
          >
            Activity split
          </span>
          <span style={{ fontSize: 12, color: 'var(--ink-4)' }}>· {VA.windowLabel}</span>
          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--ink-4)' }}>
            {total} items classified
          </span>
        </div>
        <div className="versions-split-bar" title={`N4 ${n4pct}% · N3 ${n3pct}%`}>
          <div className="n4" style={{ width: `${n4pct}%` }} />
          <div className="n3" style={{ width: `${n3pct}%` }} />
        </div>

        <div className="versions-split-row" style={{ marginTop: 12 }}>
          <div className="versions-stat">
            <div className="tag-row">
              <VersionChip value="N3" />
              <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                Mainnet — conservative
              </span>
            </div>
            <div className="hdr">
              <span className="big">{VA.n3.total}</span>
              <span className="pct">{n3pct}% of activity</span>
            </div>
            <div className="breakdown">
              <span>
                <b>{VA.n3.issues}</b> issues
              </span>
              <span>
                <b>{VA.n3.prs}</b> PRs
              </span>
              <span>
                <b>{VA.n3.discussions}</b> discussions
              </span>
              <span>
                <b>{VA.n3.releases}</b> releases
              </span>
            </div>
            <p
              style={{
                margin: '4px 0 0',
                fontSize: 12.5,
                color: 'var(--ink-3)',
                lineHeight: 1.45,
              }}
            >
              The production network. Work here is mostly performance, plugin lifecycle, and
              stability fixes — no protocol-level surprises.
            </p>
          </div>
          <div className="versions-stat n4">
            <div className="tag-row">
              <VersionChip value="N4" />
              <span style={{ fontSize: 12, color: 'var(--neo-2)' }}>
                In development — where the protocol is moving
              </span>
            </div>
            <div className="hdr">
              <span className="big">{VA.n4.total}</span>
              <span className="pct" style={{ color: 'var(--neo-2)' }}>
                {n4pct}% of activity
              </span>
            </div>
            <div className="breakdown">
              <span>
                <b>{VA.n4.issues}</b> issues
              </span>
              <span>
                <b>{VA.n4.prs}</b> PRs
              </span>
              <span>
                <b>{VA.n4.discussions}</b> discussions
              </span>
              <span>
                <b>{VA.n4.releases}</b> releases
              </span>
            </div>
            <p
              style={{
                margin: '4px 0 0',
                fontSize: 12.5,
                color: 'var(--ink-2)',
                lineHeight: 1.45,
              }}
            >
              The next major version. Cost-model changes, native zk-verification, lock-free TxPool,
              and event-log refactors all land here first.
            </p>
          </div>
        </div>
      </div>

      <div className="versions-features">
        <div className="hd">
          <h2>
            <VersionChip value="N4" /> Big features under discussion
          </h2>
          <div className="sub">
            Pulled from N4-tagged threads with active conversation in the last 30 days. Click
            through to the consensus block.
          </div>
        </div>
        {D.n4Features.map((f, i) => (
          <div
            key={i}
            className="feature-row"
            onClick={() => f.threadId && navigate(`/threads/${encodeURIComponent(f.threadId)}`)}
            role={f.threadId ? 'button' : undefined}
            tabIndex={f.threadId ? 0 : -1}
          >
            <div>
              <div className="tt">{f.title}</div>
            </div>
            <span className={`feature-status ${statusClass(f.status)}`}>{f.status}</span>
            <div className="one">{f.oneLiner}</div>
            <div
              className="meta"
              style={{ gridColumn: '1 / -1', marginTop: 2 }}
            >
              <span className="repo">{f.repo}</span>
              {f.threadId && (
                <>
                  <span>·</span>
                  <span style={{ marginLeft: 'auto' }} className="arrow">
                    Open consensus →
                  </span>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="versions-note">
        Tagging is done by the same AI pass that produces summaries — best-effort, based on labels,
        branch refs, and discussion content. The activity split refreshes on every bot run.
      </p>
    </div>
  );
}
