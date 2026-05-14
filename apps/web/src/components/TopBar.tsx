import { useEffect, useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { Icon } from './atoms';

const NAV = [
  { to: '/', label: 'Feed' },
  { to: '/repos', label: 'Repos' },
  { to: '/founders', label: 'Founders' },
  { to: '/versions', label: 'N3 / N4' },
  { to: '/archive', label: 'Resolved' },
];

export function TopBar({ updatedRelative }: { updatedRelative: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  // Close the mobile menu whenever the user navigates — feels weird if the
  // panel hangs around after a route change.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <header className={`topbar ${menuOpen ? 'menu-open' : ''}`}>
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
        className="topbar-gh"
        title="View Gasetta's source on GitHub"
      >
        <Icon name="github" size={14} />
      </a>
      <button
        type="button"
        className="topbar-hamburger"
        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((v) => !v)}
      >
        <span className="bar" />
        <span className="bar" />
        <span className="bar" />
      </button>
      {menuOpen && (
        <div
          className="topbar-backdrop"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}
    </header>
  );
}
