import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '../components/atoms';

export function AboutPage() {
  const navigate = useNavigate();
  return (
    <div
      style={{
        maxWidth: 720,
        margin: '0 auto',
        padding: '32px 22px 80px',
        fontSize: 15,
        lineHeight: 1.55,
        color: 'var(--ink-2)',
      }}
    >
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
      <h1
        style={{
          fontFamily: 'var(--serif)',
          fontWeight: 600,
          fontSize: 32,
          color: 'var(--ink)',
          margin: '0 0 18px',
          letterSpacing: '-0.01em',
        }}
      >
        About Gasetta
      </h1>
      <p>
        If you want to know what's going on with Neo's development and community on GitHub without
        ever opening GitHub, you should find all of it here in 30 seconds of scanning. That's the
        whole product.
      </p>
      <p>
        Every few hours a bot scans{' '}
        <span style={{ fontFamily: 'var(--mono)' }}>neo-project</span> and an LLM turns the raw
        firehose — commits, releases, issues, pull requests, discussions — into short summaries
        with the consensus of each conversation, who's arguing for what, and a marker whenever one
        of Neo's two founders participated.
      </p>
      <p>
        Not affiliated with Neo or NGD. Open-source, community-built. Summaries are best-effort
        and may contain errors — click through to GitHub to verify anything important.
      </p>
    </div>
  );
}
