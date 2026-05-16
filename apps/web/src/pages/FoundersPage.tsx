import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGasettaV3, useGasettaLoading } from '../lib/v3Context';
import { FounderMark, Icon } from '../components/atoms';
import { Markdown, type ResolveIssueRef } from '../components/Markdown';

const PAGE_SIZE = 15;

export function FoundersPage() {
  const D = useGasettaV3();
  const isLoading = useGasettaLoading();
  const navigate = useNavigate();
  const resolveIssueRef: ResolveIssueRef = (repo, num) => {
    const match = D.threads.find((x) => x.repo === repo && x.number === num);
    return match ? `/threads/${encodeURIComponent(match.id)}` : null;
  };
  const [tab, setTab] = useState<'all' | 'erikzhang' | 'dahongfei'>('all');
  const items = D.founderActivity.filter((a) => tab === 'all' || a.login === tab);

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [tab]);
  const visible = items.slice(0, visibleCount);
  const hasMore = items.length > visible.length;
  const loadMore = () =>
    setVisibleCount((n) => Math.min(n + PAGE_SIZE, items.length));

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', padding: '24px 22px 80px' }}>
      <div className="founders-head">
        <div>
          <h1>Founder activity</h1>
          <div className="sub">
            Comments and reviews from Neo's founders. Showing the {D.founderActivity.length} most
            recent.
          </div>
        </div>
        <div className="tab-strip">
          <button aria-pressed={tab === 'all'} onClick={() => setTab('all')}>
            All
          </button>
          <button aria-pressed={tab === 'erikzhang'} onClick={() => setTab('erikzhang')}>
            Erik Zhang
          </button>
          <button aria-pressed={tab === 'dahongfei'} onClick={() => setTab('dahongfei')}>
            Da Hongfei
          </button>
        </div>
      </div>
      {items.length === 0 ? (
        isLoading && D.founderActivity.length === 0 ? (
          <div className="feed">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton-card">
                <div className="skel-line" style={{ width: '30%', height: 14 }} />
                <div className="skel-line" style={{ width: '90%' }} />
                <div className="skel-line" style={{ width: '75%' }} />
                <div className="skel-line" style={{ width: '50%' }} />
              </div>
            ))}
          </div>
        ) : (
          <div className="state-card">
            <div className="title">Nothing from this founder yet</div>
            <div className="sub">
              No recent comments. Try the other tab, or check back after the next refresh.
            </div>
          </div>
        )
      ) : (
        <>
        <div className="feed">
          {visible.map((a, i) => {
            const founder = D.founders[a.login] ?? null;
            const quoteRepo = a.where.split(/\s+/)[0] || undefined;
            return (
              <div
                key={i}
                className="card founder-quote has-stripe"
                onClick={() => a.threadId && navigate(`/threads/${encodeURIComponent(a.threadId)}`)}
                role="button"
                tabIndex={0}
              >
                <div className="top">
                  <div className="left">
                    <FounderMark founder={founder} />
                    <span className="sep">·</span>
                    <span
                      style={{
                        fontFamily: 'var(--mono)',
                        fontSize: 12,
                        color: 'var(--ink-3)',
                      }}
                    >
                      {a.where}
                    </span>
                    <span className="when">· {a.when}</span>
                  </div>
                </div>
                <div
                  className="quote"
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('a')) e.stopPropagation();
                  }}
                >
                  <Markdown repo={quoteRepo} resolveIssueRef={resolveIssueRef}>
                    {a.quote}
                  </Markdown>
                </div>
                <div className="who">
                  {a.kind === 'comment'
                    ? 'on'
                    : a.kind === 'issue'
                      ? 'opened issue'
                      : a.kind === 'pr'
                        ? 'opened PR'
                        : 'started discussion'}{' '}
                  <span style={{ color: 'var(--ink)', marginLeft: 4 }}>{a.whereTitle}</span>
                  <span
                    style={{
                      marginLeft: 'auto',
                      color: 'var(--neo-2)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    Open thread <Icon name="arrow-right" size={11} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        {hasMore && (
          <div className="load-more-bar">
            <button type="button" className="load-more-btn" onClick={loadMore}>
              Load {Math.min(PAGE_SIZE, items.length - visible.length)} more
            </button>
            <span className="load-more-hint">
              Showing {visible.length} of {items.length}
            </span>
          </div>
        )}
        </>
      )}
    </div>
  );
}
