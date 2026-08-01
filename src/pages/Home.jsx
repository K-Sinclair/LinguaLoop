import { Link } from 'react-router-dom';
import AppIcon from '../components/AppIcon.jsx';

const highlights = [
  {
    icon: 'learn',
    title: 'Bite-sized units',
    text: 'Learn practical vocabulary in short, focused sessions that are easy to return to.',
  },
  {
    icon: 'target',
    title: 'Progress that is real',
    text: 'Every completed card is saved to your account and reflected on your learning path.',
  },
  {
    icon: 'spark',
    title: 'Two ways to begin',
    text: 'Start with conversational Spanish or build a foundation in Japanese hiragana.',
  },
];

export default function Home() {
  return (
    <section className="home-page">
      <div className="home-hero">
        <div className="home-hero__content">
          <p className="pill-label"><AppIcon name="spark" size={17} /> Learn a little every day</p>
          <h1>Make a new language feel <span>within reach.</span></h1>
          <p className="hero__lead">
            Follow a clear path, practise with friendly flashcards, and keep every
            step of your progress connected to your account.
          </p>

          <div className="hero__actions">
            <Link to="/signup" className="button button--primary">
              Start learning free <AppIcon name="arrow" size={18} />
            </Link>
            <Link to="/login" className="button button--secondary">
              I have an account
            </Link>
          </div>
          <div className="hero__trust">
            <span><AppIcon name="check" size={17} /> Spanish greetings</span>
            <span><AppIcon name="check" size={17} /> Japanese hiragana</span>
            <span><AppIcon name="check" size={17} /> Saved progress</span>
          </div>
        </div>

        <div className="path-preview" aria-label="Preview of the LinguaLoop learning path">
          <div className="path-preview__header">
            <div>
              <span>Spanish · Unit 1</span>
              <strong>Everyday greetings</strong>
            </div>
            <span className="course-badge" aria-hidden="true">ES</span>
          </div>
          <div className="path-preview__progress"><span /></div>
          <div className="path-preview__nodes" aria-hidden="true">
            <span className="preview-node preview-node--done"><AppIcon name="check" /></span>
            <span className="preview-line preview-line--done" />
            <span className="preview-node preview-node--current"><AppIcon name="spark" /></span>
            <span className="preview-line" />
            <span className="preview-node"><AppIcon name="target" /></span>
          </div>
          <div className="path-preview__card">
            <span>Up next</span>
            <strong>Meet and greet</strong>
            <p>A short set of practical first phrases.</p>
          </div>
        </div>
      </div>

      <section className="home-section">
        <div className="section-heading">
          <p className="eyebrow">Built for steady progress</p>
          <h2>A simple loop that keeps learning clear.</h2>
        </div>
        <div className="feature-grid">
        {highlights.map((item) => (
          <article key={item.title} className="feature-card">
            <span className="feature-card__icon"><AppIcon name={item.icon} /></span>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </article>
        ))}
        </div>
      </section>

      <section className="course-showcase">
        <div>
          <p className="eyebrow">Choose your first path</p>
          <h2>Start useful. Expand later.</h2>
          <p>
            LinguaLoop begins with two deliberately focused tracks. More units
            and multi-language course management will grow from this foundation.
          </p>
        </div>
        <div className="course-showcase__cards">
          <article className="course-tile course-tile--spanish">
            <span className="course-tile__flag" aria-hidden="true">¡Hola!</span>
            <div><strong>Spanish</strong><span>Practical greetings</span></div>
          </article>
          <article className="course-tile course-tile--japanese">
            <span className="course-tile__flag course-tile__flag--jp" aria-hidden="true">あ</span>
            <div><strong>Japanese</strong><span>Hiragana foundations</span></div>
          </article>
        </div>
      </section>

      <section className="home-cta">
        <div>
          <p className="eyebrow">Your next word is waiting</p>
          <h2>Begin your first learning loop.</h2>
        </div>
        <Link to="/signup" className="button button--light">
          Create an account <AppIcon name="arrow" size={18} />
        </Link>
      </section>
    </section>
  );
}
