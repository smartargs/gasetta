import { Fragment } from 'react';
import {
  AITag,
  ConsensusChip,
  FounderMark,
  Icon,
  SentimentMeter,
  StatePill,
  TypePill,
  VersionChip,
  type FounderRecord,
} from './atoms';
import type { Thread } from '../data/v3types';

export type FounderMarkerMode = 'chip' | 'stripe' | 'both';

interface FeedCardProps {
  thread: Thread;
  founders: Record<string, FounderRecord>;
  founderMarkerMode?: FounderMarkerMode;
  onOpen?: (t: Thread) => void;
}

export function FeedCard({
  thread,
  founders,
  founderMarkerMode = 'both',
  onOpen,
}: FeedCardProps) {
  const t = thread;
  const founder = t.founder ? (founders[t.founder] ?? null) : null;
  const isFounder = !!founder;
  const showStripe = isFounder && (founderMarkerMode === 'stripe' || founderMarkerMode === 'both');
  const showChip = isFounder && (founderMarkerMode === 'chip' || founderMarkerMode === 'both');
  const isClosed = t.state === 'closed' || t.isMerged;

  const handleClick = () => onOpen?.(t);

  // ── Release card ────────────────────────────────────────────────────────
  if (t.type === 'release') {
    return (
      <div
        className={`card release ${showStripe ? 'has-stripe' : ''}`}
        onClick={handleClick}
        role="button"
        tabIndex={0}
      >
        <div className="top">
          <div className="left">
            <TypePill type="release" />
            <span className="repo">{t.repo}</span>
            <span className="sep">·</span>
            <span className="when">{t.when}</span>
          </div>
          <div className="right">
            <VersionChip value={t.version ?? undefined} />
          </div>
        </div>
        <div className="tagrow">
          <span className="tag">{t.tag}</span>
          <div className="title" style={{ fontSize: 15, fontWeight: 600 }}>
            {t.title}
          </div>
        </div>
        <div className="summary">{t.summary}</div>
        <div className="bottom">
          <AITag status={t.summaryStatus} />
          {showChip && <FounderMark founder={founder} />}
          <span className="gap" />
        </div>
      </div>
    );
  }

  // ── Commit roll-up ──────────────────────────────────────────────────────
  if (t.type === 'commits') {
    const rows = t.commits ?? [];
    return (
      <div className="card commit-roll" onClick={handleClick} role="button" tabIndex={0}>
        <div className="top">
          <div className="left">
            <TypePill type="commits" />
            <span className="repo">{t.repo}/main</span>
            <span className="sep">·</span>
            <span className="when">{t.when}</span>
          </div>
          <div className="right">
            <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>{rows.length} merged</span>
          </div>
        </div>
        <div className="commits">
          {rows.map((c) => (
            <Fragment key={c.sha}>
              <span className="sha">{c.sha}</span>
              <span
                style={{
                  color: 'var(--ink-2)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {c.msg}
              </span>
              <span
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 11,
                  color: 'var(--ink-3)',
                }}
              >
                {c.author}
              </span>
            </Fragment>
          ))}
        </div>
      </div>
    );
  }

  // ── Default card (issue / pr / discussion) ──────────────────────────────
  const summaryText =
    t.summaryStatus === 'pending'
      ? `Summary publishing soon${t.newCommentsSince ? ` — thread had ${t.newCommentsSince} new comment${t.newCommentsSince === 1 ? '' : 's'} since last summary.` : '.'}`
      : t.summaryStatus === 'error'
        ? 'Summary failed on last refresh — will retry shortly.'
        : t.summary;

  return (
    <div
      className={['card', showStripe ? 'has-stripe' : '', isClosed ? 'is-closed' : '']
        .filter(Boolean)
        .join(' ')}
      onClick={handleClick}
      role="button"
      tabIndex={0}
    >
      <div className="top">
        <div className="left">
          <TypePill type={t.type} />
          <span className="repo">{t.repo}</span>
          {t.number != null && <span className="num">#{t.number}</span>}
          <span className="when">· {t.when}</span>
        </div>
        <div className="right">
          <ConsensusChip value={t.consensusChip} />
          <SentimentMeter value={t.sentiment} />
          <StatePill
            state={t.state}
            isMerged={t.isMerged}
            isAnswered={t.isAnswered}
            type={t.type}
          />
        </div>
      </div>
      <div className="title">{t.title}</div>
      <div
        className={`summary ${
          t.summaryStatus === 'pending'
            ? 'pending'
            : t.summaryStatus === 'error'
              ? 'errored'
              : ''
        }`}
      >
        {summaryText}
      </div>
      <div className="bottom">
        <AITag status={t.summaryStatus} />
        {showChip && <FounderMark founder={founder} />}
        <span className="gap" />
        {t.comments != null && (
          <span className="meta" title={`${t.comments} comments`}>
            <Icon name="comment" size={12} />
            {t.comments}
          </span>
        )}
        {t.participants != null && (
          <span className="meta" title={`${t.participants} participants`}>
            <Icon name="people" size={12} />
            {t.participants}
          </span>
        )}
        {t.type === 'pr' && t.additions != null && t.deletions != null && (
          <span className="diffstat">
            <span className="plus">+{t.additions.toLocaleString()}</span>
            <span className="minus">−{t.deletions.toLocaleString()}</span>
          </span>
        )}
        <VersionChip value={t.version ?? undefined} />
      </div>
    </div>
  );
}
