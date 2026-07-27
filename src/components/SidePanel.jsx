import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useProfile } from '../context/ProfileContext.jsx';
import { getProfileInitials } from '../lib/profileHelpers.js';

export default function SidePanel({ isOpen, onClose }) {
  const { user, signOut } = useAuth();
  const { profile } = useProfile();

  async function handleLogout() {
    await signOut();
    onClose();
  }

  return (
    <>
      <div
        className={`panel-overlay ${isOpen ? 'panel-overlay--visible' : ''}`}
        onClick={onClose}
        aria-hidden={!isOpen}
      />
      <aside className={`side-panel ${isOpen ? 'side-panel--open' : ''}`}>
        <div className="side-panel__header">
          <div className="side-panel__avatar">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" />
            ) : (
              <span>{getProfileInitials(profile?.display_name, user?.email)}</span>
            )}
          </div>
          <div>
            <p className="side-panel__name">{profile?.display_name || 'Learner'}</p>
            <p className="side-panel__email">{profile?.username ? `@${profile.username}` : user?.email}</p>
          </div>
        </div>

        <nav className="side-panel__links">
          <Link to="/dashboard" onClick={onClose}>
            Dashboard
          </Link>
          <Link to="/settings" onClick={onClose}>
            Settings
          </Link>
        </nav>

        <button className="side-panel__logout" onClick={handleLogout}>
          Log out
        </button>
      </aside>
    </>
  );
}
