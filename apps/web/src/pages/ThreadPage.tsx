import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useGasettaV3, useGasettaLoading } from '../lib/v3Context';
import { useThreadComments, type RawComment } from '../lib/threadComments';
import { usePageMeta } from '../lib/usePageMeta';
import { Markdown, type ResolveIssueRef } from '../components/Markdown';
import {
  AITag,
  Avatar,
  ConsensusChip,
  FounderMark,
  Icon,
  SentimentMeter,
  ShareMenu,
  StatePill,
  TypePill,
  VersionChip,
} from '../components/atoms';

export function ThreadPage() {
  const D = useGasettaV3();
  const isLoading = useGasettaLoading();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const decoded = id ? decodeURIComponent(id) : '';
  const t = D.threads.find((x) => x.id === decoded);

  const isCommentable = !!t && (t.type === 'issue' || t.type === 'pr' || t.type === 'discussion');
  const { data: comments, isLoading: commentsLoading } = useThreadComments(
    isCommentable ? t!.repo : null,
    isCommentable ? t!.type : undefined,
    isCommentable ? t!.number : undefined,
  );

  const resolveIssueRef: ResolveIssueRef = (repo, num) => {
    const match = D.threads.find((x) => x.repo === repo && x.number === num);
    return match ? `/threads/${encodeURIComponent(match.id)}` : null;
  };

  usePageMeta({
    title: t ? `${t.title} · ${t.repo}${t.number != null ? ` #${t.number}` : ''} · Gasetta` : 'Thread · Gasetta',
    description: t?.summary || (t ? `Discussion on ${t.repo}.` : undefined),
  });

  if (!t) {
    if (isLoading && D.threads.length === 0) {
      return (
        <div className="thread">
          <Link
            className="back"
            to="/"
            onClick={(e) => {
              e.preventDefault();
              navigate('/');
            }}
          >
            <Icon name="chevron-left" size={14} /> Back to feed
          </Link>
          <ThreadSkeleton />
        </div>
      );
    }
    return (
      <div className="thread">
        <Link
          className="back"
          to="/"
          onClick={(e) => {
            e.preventDefault();
            navigate('/');
          }}
        >
          <Icon name="chevron-left" size={14} /> Back to feed
        </Link>
        <div className="state-card" style={{ marginTop: 40 }}>
          <div className="title">Thread not found</div>
          <div className="sub">
            That thread isn't in the current feed. It may have rolled off, or this is a stale link.
          </div>
        </div>
      </div>
    );
  }

  const founderRecord = t.founder ? D.founders[t.founder] ?? null : null;
  const founderName = founderRecord?.name ?? null;

  return (
    <div className="thread">
      <Link
        className="back"
        to="/"
        onClick={(e) => {
          e.preventDefault();
          navigate('/');
        }}
      >
        <Icon name="chevron-left" size={14} /> Back to feed
      </Link>
      <div className="head">
        <div className="meta">
          <TypePill type={t.type} />
          {t.htmlUrl ? (
            <a
              className="repo-ref"
              href={t.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Open on GitHub"
            >
              <span style={{ fontFamily: 'var(--mono)' }}>{t.repo}</span>
              {t.number != null && (
                <span style={{ fontFamily: 'var(--mono)', color: 'var(--ink-3)' }}>
                  {' '}
                  #{t.number}
                </span>
              )}
            </a>
          ) : (
            <>
              <span style={{ fontFamily: 'var(--mono)' }}>{t.repo}</span>
              {t.number != null && (
                <span style={{ fontFamily: 'var(--mono)', color: 'var(--ink-3)' }}>
                  #{t.number}
                </span>
              )}
            </>
          )}
          <span>·</span>
          <span>{t.when}</span>
          <span className="meta-right">
            <StatePill
              state={t.state}
              isMerged={t.isMerged}
              isAnswered={t.isAnswered}
              type={t.type}
            />
            <VersionChip value={t.version ?? undefined} />
            {t.htmlUrl && (
              <a
                className="gh-link"
                href={t.htmlUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Open on GitHub"
              >
                <Icon name="github" size={12} />
                <span>GitHub</span>
              </a>
            )}
            <ShareMenu
              url={typeof window !== 'undefined' ? window.location.href : ''}
              text={t.summary || t.title}
            />
          </span>
        </div>
        <h1>
          {t.htmlUrl ? (
            <a
              className="title-link"
              href={t.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Open on GitHub"
            >
              {t.title}
            </a>
          ) : (
            t.title
          )}
        </h1>
        {t.author && (
          <div className="author-line">
            opened by{' '}
            <a
              href={`https://github.com/${t.author}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontFamily: 'var(--mono)', color: 'var(--ink-2)' }}
            >
              @{t.author}
            </a>
          </div>
        )}
      </div>

      <div className="consensus-block">
        <div className="label">
          <AITag status={t.summaryStatus} />
          <span>
            {t.summaryStatus === 'skipped' ? 'GitHub description' : 'Conversation consensus'}
          </span>
        </div>
        {t.summary ? (
          <h2>{t.summary}</h2>
        ) : t.summaryStatus === 'skipped' ? (
          <h2 style={{ color: 'var(--ink-4)' }}>No description provided.</h2>
        ) : (
          <h2 style={{ color: 'var(--ink-4)' }}>
            Summary publishing on the next refresh — check back shortly.
          </h2>
        )}
        <div className="chips">
          {t.consensusChip && <ConsensusChip value={t.consensusChip} />}
          {t.sentiment && <SentimentMeter value={t.sentiment} />}
          {founderRecord && <FounderMark founder={founderRecord} />}
        </div>

        {t.keyPoints && t.keyPoints.length > 0 && (
          <>
            <h3>Key points</h3>
            <ul>
              {t.keyPoints.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </>
        )}
        {t.decisions && t.decisions.length > 0 && (
          <>
            <h3>Decisions</h3>
            <ul>
              {t.decisions.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </>
        )}
        {t.founderQuote && (
          <>
            <h3>Founder pull-quote</h3>
            <div className="founder-quote-block">
              <div className="body">
                <Markdown repo={t.repo} resolveIssueRef={resolveIssueRef}>
                  {t.founderQuote}
                </Markdown>
              </div>
              <div className="who">
                <span style={{ fontWeight: 600 }}>{founderName}</span>
                {t.founder && (
                  <a
                    href={`https://github.com/${t.founder}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontFamily: 'var(--mono)', opacity: 0.7, textDecoration: 'none' }}
                  >
                    @{t.founder}
                  </a>
                )}
              </div>
            </div>
          </>
        )}
        <div className="ai-note">
          Summarised from public GitHub comments. The chip and one-liner reflect the AI's reading
          of the discussion as of the last refresh; click through to GitHub to verify any specific
          claim.
        </div>
      </div>

      {isCommentable && (
        <RawThread
          comments={comments}
          loading={commentsLoading}
          repo={t.repo}
          resolveIssueRef={resolveIssueRef}
        />
      )}
    </div>
  );
}

function RawThread({
  comments,
  loading,
  repo,
  resolveIssueRef,
}: {
  comments: RawComment[] | undefined;
  loading: boolean;
  repo: string;
  resolveIssueRef: ResolveIssueRef;
}) {
  const count = comments?.length ?? 0;
  const [order, setOrder] = useState<'new' | 'old'>('new');
  const sorted = useMemo(() => {
    if (!comments) return [];
    if (order === 'old') return comments;
    return [...comments].sort((a, b) => {
      const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bt - at;
    });
  }, [comments, order]);
  return (
    <div className="raw-thread">
      <div className="raw-thread-head">
        <h3>Raw thread{count > 0 ? ` · ${count} comments` : ''}</h3>
        {count > 1 && (
          <div className="seg" role="tablist" aria-label="Comment order">
            <button
              type="button"
              aria-pressed={order === 'new'}
              onClick={() => setOrder('new')}
            >
              Newest
            </button>
            <button
              type="button"
              aria-pressed={order === 'old'}
              onClick={() => setOrder('old')}
            >
              Oldest
            </button>
          </div>
        )}
      </div>
      {loading && count === 0 ? (
        <CommentSkeletonList />
      ) : count === 0 ? (
        <div style={{ padding: '12px 0', color: 'var(--ink-4)', fontSize: 13 }}>
          No comments on this thread yet.
        </div>
      ) : (
        sorted.map((c, i) => (
          <Comment key={i} c={c} repo={repo} resolveIssueRef={resolveIssueRef} />
        ))
      )}
    </div>
  );
}

function ThreadSkeleton() {
  return (
    <>
      <div className="head">
        <div className="meta">
          <div className="skel-line" style={{ width: 60, height: 18, borderRadius: 999 }} />
          <div className="skel-line" style={{ width: 140, height: 14 }} />
          <div className="skel-line" style={{ width: 80, height: 12 }} />
        </div>
        <div className="skel-line" style={{ width: '90%', height: 26 }} />
        <div className="skel-line" style={{ width: '65%', height: 26 }} />
        <div className="skel-line" style={{ width: 160, height: 12 }} />
      </div>
      <div className="consensus-block">
        <div className="skel-line" style={{ width: 180, height: 12, marginBottom: 12 }} />
        <div className="skel-line" style={{ width: '95%', height: 22, marginBottom: 6 }} />
        <div className="skel-line" style={{ width: '78%', height: 22, marginBottom: 18 }} />
        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          <div className="skel-line" style={{ width: 90, height: 22, borderRadius: 999 }} />
          <div className="skel-line" style={{ width: 80, height: 22, borderRadius: 999 }} />
        </div>
        <div className="skel-line" style={{ width: 110, height: 12, marginBottom: 8 }} />
        <div className="skel-line" style={{ width: '92%', marginBottom: 6 }} />
        <div className="skel-line" style={{ width: '86%', marginBottom: 6 }} />
        <div className="skel-line" style={{ width: '70%' }} />
      </div>
      <div className="raw-thread">
        <div className="skel-line" style={{ width: 200, height: 14, margin: '12px 0' }} />
        <CommentSkeletonList />
      </div>
    </>
  );
}

function CommentSkeletonList() {
  return (
    <>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="comment comment-skel">
          <div className="skel-line skel-avatar" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <div className="skel-line" style={{ width: 90, height: 12 }} />
              <div className="skel-line" style={{ width: 60, height: 12 }} />
            </div>
            <div className="skel-line" style={{ width: '95%' }} />
            <div className="skel-line" style={{ width: '85%' }} />
            <div className="skel-line" style={{ width: '60%' }} />
          </div>
        </div>
      ))}
    </>
  );
}

function Comment({
  c,
  repo,
  resolveIssueRef,
}: {
  c: RawComment;
  repo: string;
  resolveIssueRef: ResolveIssueRef;
}) {
  const profileHref = c.login !== 'unknown' ? `https://github.com/${c.login}` : null;
  return (
    <div className={`comment ${c.founder ? 'is-founder' : ''}`}>
      {profileHref ? (
        <a
          href={profileHref}
          target="_blank"
          rel="noopener noreferrer"
          className="avatar-link"
          aria-label={`Open @${c.login} on GitHub`}
        >
          <Avatar login={c.login} initials={c.initials} founder={c.founder} size={28} />
        </a>
      ) : (
        <Avatar login={c.login} initials={c.initials} founder={c.founder} size={28} />
      )}
      <div>
        <div className="hd">
          {profileHref ? (
            <>
              <a
                className="name name-link"
                href={profileHref}
                target="_blank"
                rel="noopener noreferrer"
              >
                {c.name}
              </a>
              <a
                className="login login-link"
                href={profileHref}
                target="_blank"
                rel="noopener noreferrer"
              >
                @{c.login}
              </a>
            </>
          ) : (
            <>
              <span className="name">{c.name}</span>
              <span className="login">@{c.login}</span>
            </>
          )}
          {c.role === 'core' && !c.founder && (
            <span
              style={{
                fontSize: 10,
                color: 'var(--ink-3)',
                background: 'var(--bg-tint)',
                padding: '1px 6px',
                borderRadius: 4,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              Core
            </span>
          )}
          {c.isAnswer && (
            <span
              style={{
                fontSize: 10,
                color: 'var(--open-fg)',
                background: 'var(--open-bg)',
                padding: '1px 6px',
                borderRadius: 4,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              Answer
            </span>
          )}
          {c.htmlUrl ? (
            <a
              className="when when-link"
              href={c.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Open this comment on GitHub"
            >
              {c.when}
            </a>
          ) : (
            <span className="when">{c.when}</span>
          )}
        </div>
        <div className="body">
          <Markdown repo={repo} resolveIssueRef={resolveIssueRef}>
            {c.body}
          </Markdown>
        </div>
      </div>
    </div>
  );
}
