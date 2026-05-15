import { useState } from 'react';
import type { CSSProperties, SVGProps } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Icon

export type IconName =
  | 'issue'
  | 'pr'
  | 'discussion'
  | 'release'
  | 'comment'
  | 'people'
  | 'sparkle'
  | 'check'
  | 'clock'
  | 'alert'
  | 'arrow-right'
  | 'chevron-left'
  | 'filter'
  | 'github'
  | 'dot'
  | 'list'
  | 'flame'
  | 'check-circle';

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 14, ...rest }: IconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 16 16',
    fill: 'currentColor',
    ...rest,
  };
  switch (name) {
    case 'issue':
      return (
        <svg {...common}>
          <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm9 3a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm-.25-6.25v3.5a.75.75 0 0 1-1.5 0v-3.5a.75.75 0 0 1 1.5 0Z" />
        </svg>
      );
    case 'pr':
      return (
        <svg {...common}>
          <path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354ZM3.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm0 9.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm8.25.75a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Z" />
        </svg>
      );
    case 'discussion':
      return (
        <svg {...common}>
          <path d="M1.75 1h8.5c.966 0 1.75.784 1.75 1.75v5.5A1.75 1.75 0 0 1 10.25 10H7.061l-2.574 2.573A1.458 1.458 0 0 1 2 11.543V10h-.25A1.75 1.75 0 0 1 0 8.25v-5.5C0 1.784.784 1 1.75 1ZM1.5 2.75v5.5c0 .138.112.25.25.25h1a.75.75 0 0 1 .75.75v2.19l2.72-2.72a.749.749 0 0 1 .53-.22h3.5a.25.25 0 0 0 .25-.25v-5.5a.25.25 0 0 0-.25-.25h-8.5a.25.25 0 0 0-.25.25Zm13 2a.25.25 0 0 0-.25-.25h-.5a.75.75 0 0 1 0-1.5h.5c.966 0 1.75.784 1.75 1.75v5.5A1.75 1.75 0 0 1 14.25 12H14v1.543a1.457 1.457 0 0 1-2.487 1.03L9.22 12.28a.749.749 0 0 1 .326-1.275.749.749 0 0 1 .734.215l2.22 2.22v-2.19a.75.75 0 0 1 .75-.75h1a.25.25 0 0 0 .25-.25Z" />
        </svg>
      );
    case 'release':
      return (
        <svg {...common}>
          <path d="M7.775 3.275a.75.75 0 0 0 1.06 1.06l1.25-1.25a2 2 0 1 1 2.83 2.83l-2.5 2.5a2 2 0 0 1-2.83 0 .75.75 0 0 0-1.06 1.06 3.5 3.5 0 0 0 4.95 0l2.5-2.5a3.5 3.5 0 0 0-4.95-4.95l-1.25 1.25Zm-4.69 9.64a2 2 0 0 1 0-2.83l2.5-2.5a2 2 0 0 1 2.83 0 .75.75 0 0 0 1.06-1.06 3.5 3.5 0 0 0-4.95 0l-2.5 2.5a3.5 3.5 0 0 0 4.95 4.95l1.25-1.25a.75.75 0 0 0-1.06-1.06l-1.25 1.25a2 2 0 0 1-2.83 0Z" />
        </svg>
      );
    case 'comment':
      return (
        <svg {...common}>
          <path d="M1 2.75C1 1.784 1.784 1 2.75 1h10.5c.966 0 1.75.784 1.75 1.75v7.5A1.75 1.75 0 0 1 13.25 12H9.06l-2.573 2.573A1.458 1.458 0 0 1 4 13.543V12H2.75A1.75 1.75 0 0 1 1 10.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h2a.75.75 0 0 1 .75.75v2.19l2.72-2.72a.75.75 0 0 1 .53-.22h4.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z" />
        </svg>
      );
    case 'people':
      return (
        <svg {...common}>
          <path d="M5.5 3.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4ZM2 8.06A4 4 0 0 1 5.5 5a4 4 0 0 1 3.5 3.06V9H2v-.94Zm8.5-5.06a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm-1 5a2.99 2.99 0 0 1 2 .76V9H10v-.5a2 2 0 0 0-.5.06ZM14 13H2v-1h12v1Z" />
        </svg>
      );
    case 'sparkle':
      return (
        <svg {...common}>
          <path
            d="M8 .5l1.6 4.4 4.4 1.6-4.4 1.6L8 12.5 6.4 8.1 2 6.5l4.4-1.6L8 .5Zm5.5 9.5l.75 2.05 2.05.75-2.05.75L13.5 16l-.75-2.95-2.05-.75 2.05-.75L13.5 10Z"
            transform="scale(0.95) translate(0.4,0.4)"
          />
        </svg>
      );
    case 'check':
      return (
        <svg {...common}>
          <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
        </svg>
      );
    case 'clock':
      return (
        <svg {...common}>
          <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0Zm0 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM7.25 4a.75.75 0 0 1 1.5 0v3.69l2.28 2.28a.75.75 0 1 1-1.06 1.06l-2.5-2.5A.75.75 0 0 1 7.25 8.25Z" />
        </svg>
      );
    case 'alert':
      return (
        <svg {...common}>
          <path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575Zm1.763.707-6.082 11.378a.25.25 0 0 0 .22.368h12.164a.25.25 0 0 0 .22-.368L8.659 1.754a.25.25 0 0 0-.44 0ZM7.25 5a.75.75 0 0 1 1.5 0v3a.75.75 0 0 1-1.5 0Zm.75 6.25a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z" />
        </svg>
      );
    case 'arrow-right':
      return (
        <svg {...common}>
          <path d="M8.22 2.97a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734L11.19 8.75H2.75a.75.75 0 0 1 0-1.5h8.44L8.22 4.28a.75.75 0 0 1 0-1.06Z" />
        </svg>
      );
    case 'chevron-left':
      return (
        <svg {...common}>
          <path d="M9.78 12.78a.75.75 0 0 1-1.06 0L4.47 8.53a.75.75 0 0 1 0-1.06l4.25-4.25a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042L6.06 8l3.72 3.72a.75.75 0 0 1 0 1.06Z" />
        </svg>
      );
    case 'filter':
      return (
        <svg {...common}>
          <path d="M.75 3h14.5a.75.75 0 0 1 0 1.5H.75a.75.75 0 0 1 0-1.5Zm3 4.5h8.5a.75.75 0 0 1 0 1.5h-8.5a.75.75 0 0 1 0-1.5Zm3 4.5h2.5a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1 0-1.5Z" />
        </svg>
      );
    case 'github':
      return (
        <svg {...common}>
          <path d="M8 0a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.38v-1.34c-2.22.48-2.69-1.07-2.69-1.07-.36-.92-.89-1.17-.89-1.17-.73-.5.05-.49.05-.49.8.06 1.23.83 1.23.83.72 1.23 1.88.87 2.34.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.83-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.04 2.2-.83 2.2-.83.44 1.1.16 1.92.08 2.12.52.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.65 3.94.29.25.55.74.55 1.49v2.21c0 .21.15.46.55.38A8 8 0 0 0 8 0Z" />
        </svg>
      );
    case 'dot':
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="3" />
        </svg>
      );
    case 'list':
      return (
        <svg {...common}>
          <path d="M1.75 2h12.5a.75.75 0 0 1 0 1.5H1.75a.75.75 0 0 1 0-1.5Zm0 5h12.5a.75.75 0 0 1 0 1.5H1.75a.75.75 0 0 1 0-1.5Zm0 5h12.5a.75.75 0 0 1 0 1.5H1.75a.75.75 0 0 1 0-1.5Z" />
        </svg>
      );
    case 'flame':
      return (
        <svg {...common}>
          <path d="M8 0s2 2 2 5c0 1.5-1 2.5-1 2.5S11 7 11 10c0 3-3 6-3 6s-3-3-3-6c0-3 3-2.5 3-2.5s-1-1-1-2.5C7 2 8 0 8 0Z" />
        </svg>
      );
    case 'check-circle':
      return (
        <svg {...common}>
          <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16Zm3.78-9.72-4.25 4.25a.75.75 0 0 1-1.06 0L4.22 8.28a.75.75 0 1 1 1.06-1.06L7 8.94l3.72-3.72a.75.75 0 1 1 1.06 1.06Z" />
        </svg>
      );
    default:
      return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Type pill, State pill, Consensus chip, Sentiment meter, Founder mark,
// AI tag, Version chip, Skeleton card.

export type ItemType = 'issue' | 'pr' | 'discussion' | 'release' | 'commits';

export function TypePill({ type }: { type: ItemType }) {
  const label =
    type === 'pr'
      ? 'Pull request'
      : type === 'discussion'
        ? 'Discussion'
        : type === 'release'
          ? 'Release'
          : type === 'commits'
            ? 'Commits'
            : 'Issue';
  const cls = type === 'commits' ? 'type-issue' : `type-${type}`;
  const iconName: IconName = type === 'commits' ? 'github' : type;
  return (
    <span className={`pill ${cls}`}>
      <Icon name={iconName} size={11} />
      {label}
    </span>
  );
}

export interface StatePillProps {
  state?: string | null;
  isMerged?: boolean;
  isAnswered?: boolean;
  type?: ItemType;
}

export function StatePill({ state, isMerged, isAnswered, type }: StatePillProps) {
  if (type === 'pr' && isMerged) return <span className="pill state-merged">Merged</span>;
  if (state === 'draft') return <span className="pill state-draft">Draft</span>;
  if (state === 'closed') return <span className="pill state-closed">Closed</span>;
  if (state === 'changes-requested')
    return <span className="pill state-cr">Changes requested</span>;
  if (type === 'discussion' && isAnswered)
    return <span className="pill state-answered">Answered</span>;
  return <span className="pill state-open">Open</span>;
}

export function ConsensusChip({ value }: { value?: string | null }) {
  if (!value) return null;
  const v = value.toLowerCase();
  let cls = 'consensus-open';
  if (v.startsWith('resolved')) cls = 'consensus-resolved';
  else if (v.startsWith('decided')) cls = 'consensus-decided';
  else if (v.startsWith('leaning')) cls = 'consensus-leaning';
  else if (v.startsWith('split')) cls = 'consensus-split';
  else if (v.startsWith('stalled')) cls = 'consensus-stalled';
  const display = v === 'open' ? 'In discussion' : value;
  return (
    <span className={`chip ${cls}`} title="AI-derived conversation consensus">
      {display}
    </span>
  );
}

export type Sentiment = 'calm' | 'mixed' | 'contentious';

export function SentimentMeter({ value }: { value?: Sentiment | null }) {
  const v: Sentiment = value || 'calm';
  const label = v === 'calm' ? 'Calm' : v === 'mixed' ? 'Mixed' : 'Contentious';
  return (
    <>
      <span className={`sent-bars ${v}`} aria-hidden="true" title={`Conversation tone: ${label}`}>
        <i />
        <i />
        <i />
      </span>
      <span className={`sent-label ${v}`}>{label}</span>
    </>
  );
}

export interface FounderRecord {
  login: string;
  name: string;
  initials: string;
}

export function Avatar({
  login,
  initials,
  founder = false,
  size = 36,
  className,
}: {
  login: string | null | undefined;
  initials: string;
  founder?: boolean;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const cls = ['avatar', founder ? 'founder' : '', className].filter(Boolean).join(' ');
  // Inline style is authoritative for sizing — beats any class width/height
  // already in place (e.g. legacy .comment .avatar { width: 28px }).
  const sizeStyle = { width: size, height: size, flex: 'none' as const };
  if (!login || login === 'unknown' || failed) {
    return (
      <span className={cls} style={sizeStyle}>
        {initials}
      </span>
    );
  }
  return (
    <img
      src={`https://avatars.githubusercontent.com/${login}?s=${size * 2}`}
      alt={`@${login}`}
      onError={() => setFailed(true)}
      loading="lazy"
      className={cls}
      style={{ ...sizeStyle, objectFit: 'cover', borderRadius: '50%' }}
    />
  );
}

export function FounderMark({
  founder,
  name,
}: {
  founder: FounderRecord | null | undefined;
  name?: string;
}) {
  if (!founder) return null;
  return (
    <span className="founder-mark" title={`${founder.name} participated in this thread`}>
      <Avatar login={founder.login} initials={founder.initials} founder size={18} />
      {name || founder.name}
    </span>
  );
}

export type SummaryStatus = 'done' | 'pending' | 'error';

export function AITag({ status = 'done' }: { status?: SummaryStatus }) {
  if (status === 'pending') {
    return (
      <span className="ai-tag pending" title="Summary will publish on the next refresh.">
        <Icon name="sparkle" size={10} />
        AI pending
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span className="ai-tag errored" title="Summary failed on last refresh. Will retry.">
        <Icon name="alert" size={10} />
        AI error
      </span>
    );
  }
  return (
    <span
      className="ai-tag"
      title="Summarised from public GitHub comments — may contain errors. Click to see source."
    >
      <Icon name="sparkle" size={10} />
      AI summary
    </span>
  );
}

export function VersionChip({ value }: { value?: 'N3' | 'N4' | null }) {
  if (!value) return null;
  const cls = value === 'N4' ? 'v-n4' : 'v-n3';
  return <span className={`v-tag ${cls}`}>{value}</span>;
}

export function SkeletonCard({ style }: { style?: CSSProperties }) {
  return (
    <div className="skeleton-card" style={style}>
      <div className="skel-line" style={{ width: '40%', height: 12 }} />
      <div className="skel-line" style={{ width: '88%', height: 14 }} />
      <div className="skel-line" style={{ width: '70%', height: 10 }} />
      <div className="skel-line" style={{ width: '30%', height: 10 }} />
    </div>
  );
}
