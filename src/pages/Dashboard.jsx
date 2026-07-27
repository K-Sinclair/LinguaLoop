import { useAuth } from '../context/AuthContext.jsx';
import { useProfile } from '../context/ProfileContext.jsx';
import { getProfileInitials } from '../lib/profileHelpers.js';

export default function Dashboard() {
  const { user } = useAuth();
  const { profile } = useProfile();

  return (
    <section className="dashboard">
      <div className="card dashboard__hero">
        <div className="dashboard__hero-main">
          <div className="dashboard__hero-avatar">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Profile" />
            ) : (
              <span>{getProfileInitials(profile?.display_name, user?.email)}</span>
            )}
          </div>
          <div>
            <p className="eyebrow">Your learning hub</p>
            <h1>
              Welcome back{profile?.display_name ? `, ${profile.display_name}` : ''}
            </h1>
            <p className="dashboard__username">
              {profile?.username ? `@${profile.username}` : 'Set a username in settings to personalize your profile.'}
            </p>
            <p>
              You're logged in as <strong>{user?.email}</strong>.
            </p>
          </div>
        </div>
      </div>

      <div className="card dashboard__empty-state">
        <p className="eyebrow">Coming soon</p>
        <h2>Lessons aren't built yet</h2>
        <p>
          This is where your streak, completed lessons, and vocabulary progress
          will show up once lesson content and progress tracking are built
          (roadmap: Weeks 4–7). Nothing here is real data yet — we're keeping
          this page honest about what's actually working rather than showing
          placeholder numbers.
        </p>
      </div>
    </section>
  );
}
