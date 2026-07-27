import { Link } from 'react-router-dom';

const highlights = [
  {
    title: 'Daily practice',
    text: 'Build a consistent rhythm with short, focused lessons that fit into your day.',
  },
  {
    title: 'Track your growth',
    text: 'Watch your progress, streaks, and completed lessons grow over time.',
  },
  {
    title: 'Stay motivated',
    text: 'Clear goals and a simple dashboard help you keep moving forward.',
  },
];

const quickStats = [
  { label: 'Lessons', value: '12+' },
  { label: 'Streak', value: '7 days' },
  { label: 'Focus', value: 'Speaking' },
];

export default function Home() {
  return (
    <section className="home-page">
      <div className="hero card">
        <div className="hero__content">
          <p className="eyebrow">4-month assignment project</p>
          <h1>Meet LinguaLoop</h1>
          <p className="hero__lead">
            A calm, encouraging space to practice a new language one step at a time.
            Build habits, track progress, and stay excited about learning.
          </p>

          <div className="hero__actions">
            <Link to="/signup" className="button button--primary">
              Start learning
            </Link>
            <Link to="/login" className="button button--secondary">
              I already have an account
            </Link>
          </div>

          <div className="hero__stats">
            {quickStats.map((stat) => (
              <div key={stat.label} className="hero__stat">
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="hero__panel">
          <div className="hero__panel-card">
            <p className="hero__panel-label">Today’s focus</p>
            <h2>Build confidence with 10 minutes of practice</h2>
            <p>Short sessions, clear goals, and simple progress tracking.</p>
          </div>
        </div>
      </div>

      <div className="feature-grid">
        {highlights.map((item) => (
          <article key={item.title} className="card feature-card">
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
