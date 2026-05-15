import { Link, useNavigate, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { useGasettaV3, useGasettaLoading } from '../lib/v3Context';
import { useThreadComments, type RawComment } from '../lib/threadComments';
import { usePageMeta } from '../lib/usePageMeta';
import {
  AITag,
  Avatar,
  ConsensusChip,
  FounderMark,
  Icon,
  SentimentMeter,
  StatePill,
  TypePill,
  VersionChip,
} from '../components/atoms';

const markdownSanitizeSchema: typeof defaultSchema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    'del',
    's',
    'sub',
    'sup',
    'kbd',
    'mark',
    'details',
    'summary',
    'ins',
    'u',
  ],
};

function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw, [rehypeSanitize, markdownSanitizeSchema]]}
      components={{
        a: ({ href, children: c }) => (
          <a href={href} target="_blank" rel="noopener noreferrer">
            {c}
          </a>
        ),
      }}
    >
      {children}
    </ReactMarkdown>
  );
}

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

  usePageMeta({
    title: t ? `${t.title} · ${t.repo}${t.number != null ? ` #${t.number}` : ''} · Gasetta` : 'Thread · Gasetta',
    description: t?.summary || (t ? `Discussion on ${t.repo}.` : undefined),
  });

  if (!t) {
    if (isLoading) {
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
          <div className="skeleton-card" style={{ marginTop: 16 }}>
            <div className="skel-line" style={{ width: '40%', height: 14 }} />
            <div className="skel-line" style={{ width: '85%', height: 22 }} />
            <div className="skel-line" style={{ width: '70%', height: 22 }} />
            <div className="skel-line" style={{ width: '95%' }} />
            <div className="skel-line" style={{ width: '90%' }} />
            <div className="skel-line" style={{ width: '60%' }} />
          </div>
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
              <div className="body">
                <Markdown>{t.founderQuote}</Markdown>
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
          <Markdown>{c.body}</Markdown>
        </div>
      </div>
    </div>
  );
}
