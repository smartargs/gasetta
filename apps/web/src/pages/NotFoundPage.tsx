import { Link, useRouteError, isRouteErrorResponse } from 'react-router-dom';

export function NotFoundPage() {
  const err = useRouteError();
  const is404 = !err || (isRouteErrorResponse(err) && err.status === 404);

  return (
    <main
      style={{
        maxWidth: 720,
        margin: '0 auto',
        padding: '72px 32px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--ink-4)',
          marginBottom: 12,
        }}
      >
        {is404 ? '404 · not found' : 'Something went wrong'}
      </div>
      <h1
        style={{
          margin: '0 0 14px',
          fontFamily: 'var(--serif)',
          fontWeight: 600,
          fontSize: 32,
          color: 'var(--ink)',
          letterSpacing: '-0.01em',
        }}
      >
        {is404 ? 'Off the press run.' : "We couldn't render that."}
      </h1>
      <p
        style={{
          margin: '0 auto',
          maxWidth: 520,
          fontSize: 15,
          color: 'var(--ink-3)',
          lineHeight: 1.55,
        }}
      >
        {is404
          ? "The page you tried to open isn't part of the feed. If you followed a link from an older session, refresh and try again."
          : 'The page hit an error while loading. Try refreshing; if it keeps happening, file an issue on the project repo.'}
      </p>
      {!is404 && err instanceof Error && (
        <pre
          style={{
            marginTop: 20,
            padding: '12px 14px',
            background: 'var(--bg-tint)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            fontSize: 12,
            textAlign: 'left',
            overflowX: 'auto',
            color: 'var(--ink-2)',
          }}
        >
          {err.message}
        </pre>
      )}
      <Link
        to="/"
        style={{
          display: 'inline-block',
          marginTop: 22,
          fontSize: 14,
          color: 'var(--neo-2)',
        }}
      >
        ← Back to the feed
      </Link>
    </main>
  );
}
