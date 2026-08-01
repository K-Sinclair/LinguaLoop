import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useProfile } from '../context/ProfileContext.jsx';
import { useLearningOverview } from '../hooks/useLearningOverview.js';
import AppIcon from '../components/AppIcon.jsx';

export default function Dashboard() {
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const {
    language,
    units,
    courseProgress,
    nextUnit,
    unitProgress,
    loading,
    error,
  } = useLearningOverview(user?.id, profile?.learning_language_id);

  if (profileLoading || loading) {
    return <p className="page-loading">Building your learning path…</p>;
  }

  const learnerName = profile?.display_name || profile?.username || 'Learner';
  const languageCode = language?.code?.toUpperCase() || '—';

  return (
    <section className="dashboard">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Your learning path</p>
          <h1>Ready for another loop, {learnerName}?</h1>
          <p>Small steps count. Pick up from your next unfinished unit.</p>
        </div>
        <div className="active-language-chip">
          <span>{languageCode}</span>
          <div><small>Learning</small><strong>{language?.name || 'Choose a language'}</strong></div>
        </div>
      </header>

      {error && (
        <div className="notice notice--error" role="alert">
          <strong>We couldn’t load your path.</strong>
          <span>{error}</span>
        </div>
      )}

      {!profile?.learning_language_id && !error && (
        <div className="notice">
          <strong>Choose your learning language.</strong>
          <span>Open Settings to select Spanish or Japanese before starting.</span>
          <Link to="/settings">Open settings</Link>
        </div>
      )}

      <div className="dashboard-layout">
        <div className="learning-column">
          <section className="course-banner">
            <div>
              <p>{language?.name || 'Your course'}</p>
              <h2>
                {nextUnit
                  ? `Continue: ${nextUnit.title}`
                  : courseProgress.totalCards > 0
                    ? 'Course complete — for now'
                    : 'Your first unit is coming soon'}
              </h2>
              <span>{courseProgress.completedCards} of {courseProgress.totalCards} cards learned</span>
            </div>
            {nextUnit && (
              <Link to={`/lessons/${nextUnit.id}`} className="button button--light">
                {courseProgress.completedCards > 0 ? 'Continue unit' : 'Start unit'}
                <AppIcon name="arrow" size={18} />
              </Link>
            )}
          </section>

          <section className="learning-path" aria-labelledby="learning-path-title">
            <div className="section-heading section-heading--row">
              <div>
                <p className="eyebrow">Current course</p>
                <h2 id="learning-path-title">Learning path</h2>
              </div>
              <span className="path-total">{courseProgress.percent}% complete</span>
            </div>

            {units.length === 0 && !error ? (
              <div className="empty-state">
                <AppIcon name="learn" size={32} />
                <h3>No units are available yet</h3>
                <p>Choose another language in Settings or check back after content is added.</p>
              </div>
            ) : (
              <ol className="unit-list">
                {units.map((unit, index) => {
                  const progress = unitProgress(unit.id);
                  return (
                    <li key={unit.id} className="unit-step">
                      <div className={`unit-node${progress.isComplete ? ' unit-node--complete' : ''}`}>
                        {progress.isComplete ? <AppIcon name="check" /> : index + 1}
                      </div>
                      <article className="unit-card">
                        <div className="unit-card__topline">
                          <span>Unit {index + 1}</span>
                          <strong>{progress.completed}/{progress.total} cards</strong>
                        </div>
                        <h3>{unit.title}</h3>
                        <p>{unit.description}</p>
                        <progress
                          className="progress-bar"
                          max="100"
                          value={progress.percent}
                          aria-label={`${unit.title}: ${progress.percent}% complete`}
                        />
                        <div className="unit-card__footer">
                          <span>{progress.isComplete ? 'Unit complete' : `${progress.percent}% complete`}</span>
                          <Link to={`/lessons/${unit.id}`} className="button button--outline button--small">
                            {progress.completed > 0 ? 'Review' : 'Start'}
                            <AppIcon name="arrow" size={16} />
                          </Link>
                        </div>
                      </article>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </div>

        <aside className="dashboard-rail" aria-label="Learning summary">
          <section className="summary-card summary-card--goal">
            <span className="summary-card__icon"><AppIcon name="target" /></span>
            <div>
              <small>Daily goal</small>
              <strong>{profile?.daily_goal_minutes ?? 10} minutes</strong>
              <p>Your chosen practice target.</p>
            </div>
          </section>

          <section className="summary-card">
            <p className="eyebrow">Course progress</p>
            <div className="stat-grid">
              <div><strong>{courseProgress.completedCards}</strong><span>Cards learned</span></div>
              <div><strong>{courseProgress.completedUnits}</strong><span>Units finished</span></div>
            </div>
          </section>

          <section className="summary-card summary-card--quiet">
            <p className="eyebrow">Learning preferences</p>
            <h3>Make the path yours</h3>
            <p>Switch languages, adjust your daily goal, or control Japanese romanisation.</p>
            <Link to="/settings" className="inline-link">Open settings <AppIcon name="arrow" size={16} /></Link>
          </section>
        </aside>
      </div>
    </section>
  );
}
