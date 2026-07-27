import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import SidePanel from './SidePanel.jsx';

export default function NavBar() {
  const { session } = useAuth();
  const [panelOpen, setPanelOpen] = useState(false);

  return (
    <>
      <header className="nav">
        <div className="nav__left">
          {session && (
            <button
              className="nav__hamburger"
              onClick={() => setPanelOpen(true)}
              aria-label="Open menu"
            >
              <span />
              <span />
              <span />
            </button>
          )}
          <Link to="/" className="nav__brand">
            Language Learning App
          </Link>
        </div>
        {!session && (
          <nav className="nav__links">
            <Link to="/login">Log in</Link>
            <Link to="/signup">Sign up</Link>
          </nav>
        )}
      </header>
      <SidePanel isOpen={panelOpen} onClose={() => setPanelOpen(false)} />
    </>
  );
}
