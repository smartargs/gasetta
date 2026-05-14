import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGasettaV3 } from '../lib/v3Context';
import { FounderMark, Icon } from '../components/atoms';

export function FoundersPage() {
  const D = useGasettaV3();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'all' | 'erikzhang' | 'dahongfei'>('all');
  const items = D.founderActivity.filter((a) => tab === 'all' || a.login === tab);

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', padding: '24px 22px 80px' }}>
      <div className="founders-head">
        <div>
          <h1>Founder activity</h1>
          <div className="sub">
            Comments and reviews from Neo's founders, pulled out of the firehose.{' '}
            {D.founderActivity.length} this period.
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
        <div className="state-card">
          <div className="title">Nothing from this founder yet</div>
          <div className="sub">
            No recent comments. Try the other tab, or check back after the next refresh.
          </div>
        </div>
      ) : (
        <div className="feed">
          {items.map((a, i) => {
            const founder = D.founders[a.login] ?? null;
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
                <div className="quote">{a.quote}</div>
                <div className="who">
                  on{' '}
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
      )}
    </div>
  );
}
