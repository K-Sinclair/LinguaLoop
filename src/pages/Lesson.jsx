import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AppIcon from '../components/AppIcon.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useProfile } from '../context/ProfileContext.jsx';
import { supabase } from '../lib/supabaseClient.js';

export default function Lesson() {
  const { unitId } = useParams();
  const { user } = useAuth();
  const { profile } = useProfile();
  const [unit, setUnit] = useState(null);
  const [cards, setCards] = useState([]);
  const [completedIds, setCompletedIds] = useState(new Set());
  const [cardIndex, setCardIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const loadLesson = useCallback(async () => {
    if (!user?.id || !unitId) return;

    setLoading(true);
    setError(null);

    const [unitResult, languagesResult, conceptsResult] = await Promise.all([
      supabase
        .from('units')
        .select('id, language_id, title, description, sort_order')
        .eq('id', unitId)
        .maybeSingle(),
      supabase.from('languages').select('id, code, name'),
      supabase
        .from('concepts')
        .select('id, unit_id, slug, difficulty, sort_order')
        .eq('unit_id', unitId)
        .order('sort_order'),
    ]);

    const firstError = unitResult.error ?? languagesResult.error ?? conceptsResult.error;
    if (firstError) {
      setError(firstError.message);
      setLoading(false);
      return;
    }

    if (!unitResult.data) {
      setError('That lesson does not exist.');
      setLoading(false);
      return;
    }

    const concepts = conceptsResult.data ?? [];
    const conceptIds = concepts.map((concept) => concept.id);
    let translations = [];
    let progressRows = [];

    if (conceptIds.length > 0) {
      const [translationResult, progressResult] = await Promise.all([
        supabase
          .from('translations')
          .select('concept_id, language_id, term, romanization')
          .in('concept_id', conceptIds),
        supabase
          .from('progress')
          .select('concept_id, completed_at')
          .eq('user_id', user.id)
          .in('concept_id', conceptIds),
      ]);

      const contentError = translationResult.error ?? progressResult.error;
      if (contentError) {
        setError(contentError.message);
        setLoading(false);
        return;
      }

      translations = translationResult.data ?? [];
      progressRows = progressResult.data ?? [];
    }

    const languages = languagesResult.data ?? [];
    const english = languages.find((language) => language.code === 'en');
    const target = languages.find((language) => language.id === unitResult.data.language_id);

    const loadedCards = concepts.map((concept) => {
      const source = translations.find(
        (translation) =>
          translation.concept_id === concept.id && translation.language_id === english?.id
      );
      const answer = translations.find(
        (translation) =>
          translation.concept_id === concept.id && translation.language_id === target?.id
      );

      return {
        ...concept,
        prompt: source?.term || 'Translation unavailable',
        answer: answer?.term || 'Translation unavailable',
        romanization: answer?.romanization || null,
      };
    });

    setUnit({ ...unitResult.data, language: target ?? null });
    setCards(loadedCards);
    setCompletedIds(
      new Set(progressRows.filter((row) => row.completed_at).map((row) => row.concept_id))
    );
    setLoading(false);
  }, [unitId, user?.id]);

  useEffect(() => {
    loadLesson();
  }, [loadLesson]);

  const currentCard = cards[cardIndex];
  const sessionPercent = cards.length === 0
    ? 0
    : Math.round(((finished ? cards.length : cardIndex) / cards.length) * 100);
  const learnedPercent = cards.length === 0
    ? 0
    : Math.round((completedIds.size / cards.length) * 100);

  const cardWasKnown = useMemo(
    () => Boolean(currentCard && completedIds.has(currentCard.id)),
    [completedIds, currentCard]
  );

  function advance() {
    if (cardIndex >= cards.length - 1) {
      setFinished(true);
      return;
    }

    setCardIndex((index) => index + 1);
    setRevealed(false);
  }

  async function markKnown() {
    if (!currentCard || saving) return;

    if (completedIds.has(currentCard.id)) {
      advance();
      return;
    }

    setSaving(true);
    setError(null);

    const { error: progressError } = await supabase
      .from('progress')
      .upsert(
        {
          user_id: user.id,
          concept_id: currentCard.id,
          completed_at: new Date().toISOString(),
          score: 100,
        },
        { onConflict: 'user_id,concept_id' }
      );

    setSaving(false);

    if (progressError) {
      setError(progressError.message);
      return;
    }

    setCompletedIds((current) => {
      const next = new Set(current);
      next.add(currentCard.id);
      return next;
    });
    advance();
  }

  function restartLesson() {
    setCardIndex(0);
    setRevealed(false);
    setFinished(false);
    setError(null);
  }

  if (loading) {
    return <p className="page-loading">Preparing your flashcards…</p>;
  }

  if (error && !unit) {
    return (
      <section className="lesson-shell">
        <div className="notice notice--error" role="alert">
          <strong>We couldn’t open this lesson.</strong>
          <span>{error}</span>
          <Link to="/dashboard">Return to your path</Link>
        </div>
      </section>
    );
  }

  if (cards.length === 0) {
    return (
      <section className="lesson-shell">
        <Link to="/dashboard" className="back-link">← Back to learning path</Link>
        <div className="empty-state">
          <AppIcon name="learn" size={34} />
          <h1>This unit has no cards yet</h1>
          <p>The unit exists, but its lesson content has not been added.</p>
        </div>
      </section>
    );
  }

  if (finished) {
    return (
      <section className="lesson-shell lesson-complete">
        <span className="lesson-complete__icon"><AppIcon name="check" size={44} /></span>
        <p className="eyebrow">Session complete</p>
        <h1>Nice work — you finished {unit.title}.</h1>
        <p>
          You currently know <strong>{completedIds.size} of {cards.length}</strong> cards
          in this unit. Progress has been saved to your account.
        </p>
        <progress
          className="progress-bar progress-bar--large"
          max="100"
          value={learnedPercent}
          aria-label={`${learnedPercent}% of this unit learned`}
        />
        <div className="lesson-complete__actions">
          <button type="button" className="button button--secondary" onClick={restartLesson}>
            Review again
          </button>
          <Link to="/dashboard" className="button button--primary">
            Back to learning path <AppIcon name="arrow" size={18} />
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="lesson-shell">
      <div className="lesson-topbar">
        <Link to="/dashboard" className="back-link">← Leave lesson</Link>
        <span>{unit.language?.name}</span>
      </div>

      <div className="lesson-progress-row">
        <progress
          className="progress-bar progress-bar--large"
          max="100"
          value={sessionPercent}
          aria-label={`Card ${cardIndex + 1} of ${cards.length}`}
        />
        <strong>{cardIndex + 1}/{cards.length}</strong>
      </div>

      <header className="lesson-heading">
        <p className="eyebrow">{unit.title}</p>
        <h1>{revealed ? 'Here’s the answer' : 'What does this mean?'}</h1>
      </header>

      <article className={`flashcard${revealed ? ' flashcard--revealed' : ''}`}>
        <span className="flashcard__label">{revealed ? unit.language?.name : 'English'}</span>
        <strong className={unit.language?.code === 'ja' && revealed ? 'flashcard__term flashcard__term--kana' : 'flashcard__term'}>
          {revealed ? currentCard.answer : currentCard.prompt}
        </strong>
        {revealed && profile?.show_romanization && currentCard.romanization && (
          <span className="flashcard__romanization">{currentCard.romanization}</span>
        )}
        {cardWasKnown && <span className="known-badge"><AppIcon name="check" size={15} /> Previously learned</span>}
      </article>

      {error && <p className="form__error" role="alert">{error}</p>}

      {!revealed ? (
        <button type="button" className="button button--primary lesson-reveal" onClick={() => setRevealed(true)}>
          Reveal answer
        </button>
      ) : (
        <div className="lesson-actions" aria-label="Rate this flashcard">
          <button type="button" className="button button--secondary" onClick={advance} disabled={saving}>
            Not yet
          </button>
          <button type="button" className="button button--primary" onClick={markKnown} disabled={saving}>
            {saving ? 'Saving…' : cardWasKnown ? 'Continue' : 'Got it'}
            {!saving && <AppIcon name="check" size={18} />}
          </button>
        </div>
      )}
      <p className="lesson-help" aria-live="polite">
        Choose “Got it” to save the card as learned, or “Not yet” to leave it unfinished.
      </p>
    </section>
  );
}
