import { Link } from 'react-router-dom';
import { Icon } from './atoms';

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <span>
            <span style={{ color: 'var(--neo)' }}>Gas</span>etta
          </span>
          <span className="dot">·</span>
          <span className="muted">a continuous AI-summarised stream of Neo's GitHub</span>
        </div>
        <nav className="footer-nav">
          <a
            href="https://github.com/smartargs/gasetta"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Icon name="github" size={12} />
            Source
          </a>
          <span className="sep">·</span>
          <a
            href="https://github.com/smartargs/gasetta/issues"
            target="_blank"
            rel="noopener noreferrer"
          >
            Issues
          </a>
          <span className="sep">·</span>
          <Link to="/about">About</Link>
          <span className="sep">·</span>
          <span className="muted">refreshes every 4h</span>
        </nav>
        <div className="footer-disclaimer">
          Pulls public activity from <code>github.com/neo-project</code>. MIT licensed.
        </div>
      </div>
    </footer>
  );
}
