import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useProfile } from '../context/ProfileContext.jsx';
import { getProfileInitials } from '../lib/profileHelpers.js';
import AppIcon from './AppIcon.jsx';

export default function NavBar() {
  const navigate = useNavigate();
  const { session, user, signOut } = useAuth();
  const { profile } = useProfile();

  async function handleLogout() {
    await signOut();
    navigate('/');
  }

  if (!session) {
    return (
      <header className="public-nav">
        <Link to="/" className="brand" aria-label="LinguaLoop home">
          <span className="brand__mark">L</span>
          <span>LinguaLoop</span>
        </Link>
        <nav className="public-nav__links" aria-label="Public navigation">
          <Link to="/login" className="text-link">Log in</Link>
          <Link to="/signup" className="button button--primary button--small">
            Get started
          </Link>
        </nav>
      </header>
    );
  }

  const avatar = (
    <span className="nav-avatar" aria-hidden="true">
      {profile?.avatar_url ? (
        <img src={profile.avatar_url} alt="" />
      ) : (
        getProfileInitials(profile?.display_name, user?.email)
      )}
    </span>
  );

  const navItems = [
    { to: '/dashboard', label: 'Learn', icon: 'learn' },
    { to: '/settings', label: 'Settings', icon: 'settings' },
  ];

  return (
    <>
      <aside className="app-sidebar">
        <Link to="/dashboard" className="brand" aria-label="LinguaLoop learning dashboard">
          <span className="brand__mark">L</span>
          <span>LinguaLoop</span>
        </Link>

        <nav className="app-sidebar__nav" aria-label="App navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `app-nav-link${isActive ? ' app-nav-link--active' : ''}`}
            >
              <AppIcon name={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="app-sidebar__profile">
          <div className="sidebar-user">
            {avatar}
            <div>
              <strong>{profile?.display_name || profile?.username || 'Learner'}</strong>
              <span>{profile?.username ? `@${profile.username}` : user?.email}</span>
            </div>
          </div>
          <button type="button" className="app-nav-link app-nav-link--button" onClick={handleLogout}>
            <AppIcon name="logout" />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      <header className="mobile-app-header">
        <Link to="/dashboard" className="brand" aria-label="LinguaLoop learning dashboard">
          <span className="brand__mark">L</span>
          <span>LinguaLoop</span>
        </Link>
        <Link to="/settings" aria-label="Open settings">{avatar}</Link>
      </header>

      <nav className="mobile-bottom-nav" aria-label="Mobile app navigation">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `mobile-nav-link${isActive ? ' mobile-nav-link--active' : ''}`}
          >
            <AppIcon name={item.icon} size={21} />
            <span>{item.label}</span>
          </NavLink>
        ))}
        <button type="button" className="mobile-nav-link" onClick={handleLogout}>
          <AppIcon name="logout" size={21} />
          <span>Log out</span>
        </button>
      </nav>
    </>
  );
}
