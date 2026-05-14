import { Link, useNavigate, useParams } from 'react-router-dom';
import { useGasettaV3 } from '../lib/v3Context';
import { useThreadComments, type RawComment } from '../lib/threadComments';
import {
  AITag,
  ConsensusChip,
  FounderMark,
  Icon,
  SentimentMeter,
  StatePill,
  TypePill,
  VersionChip,
} from '../components/atoms';

export function ThreadPage() {
  const D = useGasettaV3();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const decoded = id ? decodeURIComponent(id) : '';
  const t = D.threads.find((x) => x.id === decoded);

  if (!t) {
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
  const isCommentable = t.type === 'issue' || t.type === 'pr' || t.type === 'discussion';
  const { data: comments, isLoading: commentsLoading } = useThreadComments(
    isCommentable ? t.repo : null,
    isCommentable ? t.type : undefined,
    isCommentable ? t.number : undefined,
  );

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
          <span style={{ fontFamily: 'var(--mono)' }}>{t.repo}</span>
          {t.number != null && (
            <span style={{ fontFamily: 'var(--mono)', color: 'var(--ink-3)' }}>#{t.number}</span>
          )}
          <span>·</span>
          <span>{t.when}</span>
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <StatePill
              state={t.state}
              isMerged={t.isMerged}
              isAnswered={t.isAnswered}
              type={t.type}
            />
            <VersionChip value={t.version ?? undefined} />
          </span>
        </div>
        <h1>{t.title}</h1>
      </div>

      <div className="consensus-block">
        <div className="label">
          <AITag status={t.summaryStatus} />
          <span>Conversation consensus</span>
        </div>
        {t.summary ? (
          <h2>{t.summary}</h2>
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
              <div className="body">{t.founderQuote}</div>
              <div className="who">
                <span style={{ fontWeight: 600 }}>{founderName}</span>
                {t.founder && (
                  <span style={{ fontFamily: 'var(--mono)', opacity: 0.7 }}>@{t.founder}</span>
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

      {isCommentable && <RawThread comments={comments} loading={commentsLoading} />}
    </div>
  );
}

function RawThread({
  comments,
  loading,
}: {
  comments: RawComment[] | undefined;
  loading: boolean;
}) {
  const count = comments?.length ?? 0;
  return (
    <div className="raw-thread">
      <h3>Raw thread{count > 0 ? ` · ${count} comments` : ''}</h3>
      {loading && count === 0 ? (
        <div style={{ padding: '12px 0', color: 'var(--ink-4)', fontSize: 13 }}>
          Loading comments…
        </div>
      ) : count === 0 ? (
        <div style={{ padding: '12px 0', color: 'var(--ink-4)', fontSize: 13 }}>
          No comments on this thread yet.
        </div>
      ) : (
        comments!.map((c, i) => <Comment key={i} c={c} />)
      )}
    </div>
  );
}

function Comment({ c }: { c: RawComment }) {
  return (
    <div className={`comment ${c.founder ? 'is-founder' : ''}`}>
      <div className={`avatar ${c.founder ? 'founder' : ''}`}>{c.initials}</div>
      <div>
        <div className="hd">
          <span className="name">{c.name}</span>
          <span className="login">@{c.login}</span>
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
          <span className="when">{c.when}</span>
        </div>
        <div className="body">{c.body}</div>
      </div>
    </div>
  );
}
