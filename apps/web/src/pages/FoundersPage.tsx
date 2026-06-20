import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGasettaV3, useGasettaLoading } from '../lib/v3Context';
import { usePageMeta } from '../lib/usePageMeta';
import { FounderMark, Icon, ShareMenu } from '../components/atoms';
import { Markdown, type ResolveIssueRef } from '../components/Markdown';

const PAGE_SIZE = 15;

type FounderTab = 'all' | 'erikzhang' | 'dahongfei';
const FOUNDER_LABEL: Record<Exclude<FounderTab, 'all'>, string> = {
  erikzhang: 'Erik Zhang',
  dahongfei: 'Da Hongfei',
};

export function FoundersPage() {
  const D = useGasettaV3();
  const isLoading = useGasettaLoading();
  const navigate = useNavigate();
  const resolveIssueRef: ResolveIssueRef = (repo, num) => {
    const match = D.threads.find((x) => x.repo === repo && x.number === num);
    return match ? `/threads/${encodeURIComponent(match.id)}` : null;
  };
  const [params, setParams] = useSearchParams();
  const tabParam = params.get('founder');
  const tab: FounderTab =
    tabParam === 'erikzhang' || tabParam === 'dahongfei' ? tabParam : 'all';
  const setTab = (next: FounderTab) => {
    const p = new URLSearchParams(params);
    if (next === 'all') p.delete('founder');
    else p.set('founder', next);
    setParams(p, { replace: true });
  };
  const items = D.founderActivity.filter((a) => tab === 'all' || a.login === tab);

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareText =
    tab === 'all'
      ? `What Neo's founders are saying and shipping across GitHub — tracked live on Gasetta.`
      : `${FOUNDER_LABEL[tab]}'s recent activity across Neo's GitHub — tracked live on Gasetta.`;
  usePageMeta({
    title:
      tab === 'all'
        ? 'Founder activity · Gasetta'
        : `${FOUNDER_LABEL[tab]} · Founder activity · Gasetta`,
    description: shareText,
  });

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
        <div className="founders-head-actions">
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
          <ShareMenu url={shareUrl} text={shareText} />
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
