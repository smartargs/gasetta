import { NavLink, Link } from 'react-router-dom';
import { Icon } from './atoms';

const NAV = [
  { to: '/', label: 'Feed' },
  { to: '/repos', label: 'Repos' },
  { to: '/founders', label: 'Founders' },
  { to: '/versions', label: 'N3 / N4' },
  { to: '/archive', label: 'Resolved' },
];

export function TopBar({ updatedRelative }: { updatedRelative: string }) {
  return (
    <header className="topbar">
      <Link to="/" className="word">
        <span>
          <span style={{ color: 'var(--neo)' }}>Gas</span>etta
        </span>
        <span className="pulse" title="Live — refreshing every few hours" />
      </Link>
      <nav>
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === '/'}
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            {n.label}
          </NavLink>
        ))}
      </nav>
      <span className="spacer" />
      <span className="freshness">
        <span className="pulse" />
        Updated {updatedRelative}
      </span>
      <a
        href="https://github.com/smartargs/gasetta"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          color: 'var(--ink-3)',
          fontSize: 12,
          marginLeft: 6,
        }}
        title="View Gasetta's source on GitHub"
      >
        <Icon name="github" size={14} />
      </a>
    </header>
  );
}
