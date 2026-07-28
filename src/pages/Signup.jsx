import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient.js';
import { useAuth } from '../context/AuthContext.jsx';
import { isValidUsername, normalizeUsername } from '../lib/profileHelpers.js';

export default function Signup() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading || authLoading || user) return;

    setError(null);
    setLoading(true);

    const normalizedUsername = normalizeUsername(username);
    if (!isValidUsername(normalizedUsername)) {
      setError('Use 3–30 characters. Start with a letter or number, then use letters, numbers, dots, dashes, or underscores.');
      setLoading(false);
      return;
    }

    // RLS prevents anonymous visitors from selecting other profile rows, so
    // availability is checked through a narrow security-definer function.
    // The database's unique index remains the final protection against races.
    const { data: isAvailable, error: usernameCheckError } = await supabase.rpc(
      'is_username_available',
      { check_username: normalizedUsername }
    );

    if (usernameCheckError) {
      setLoading(false);
      setError('We could not check that username. Please try again.');
      return;
    }

    if (!isAvailable) {
      setLoading(false);
      setError('That username is already taken. Please choose another one.');
      return;
    }

    // BASE_URL includes the GitHub Pages repository path in production.
    // The Pages 404 fallback restores this client-side route after confirmation.
    const redirectUrl = new URL(
      `${import.meta.env.BASE_URL}dashboard`,
      window.location.origin
    ).toString();

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          username: normalizedUsername,
          display_name: normalizedUsername,
        },
      },
    });

    setLoading(false);

    if (signUpError) {
      setError(
        signUpError.message?.toLowerCase().includes('database error')
          ? 'We could not create that account. The username may have just been taken; please try another one.'
          : signUpError.message
      );
      return;
    }

    if (!data.session) {
      setCheckEmail(true);
      return;
    }

    navigate('/dashboard');
  }

  if (authLoading) {
    return (
      <section className="card">
        <p className="eyebrow">Auth</p>
        <h1>Loading…</h1>
      </section>
    );
  }

  if (user) {
    return (
      <section className="card">
        <p className="eyebrow">Auth</p>
        <h1>You're already signed in</h1>
        <p>You don't need to create another account right now.</p>
        <p className="form__switch">
          <Link to="/dashboard">Go to dashboard</Link>
        </p>
      </section>
    );
  }

  if (checkEmail) {
    return (
      <section className="auth-shell">
        <div className="card auth-card auth-card--success">
          <p className="eyebrow">Almost there</p>
          <h1>Check your email</h1>
          <p className="auth-card__text">
            If this address can be registered, a confirmation link will arrive at{' '}
            <strong>{email}</strong>. Open it to confirm your account.
          </p>
          <p className="form__switch">
            <Link to="/login">Go to login</Link>
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="auth-shell">
      <div className="card auth-card">
        <p className="eyebrow">Start your journey</p>
        <h1>Create your LinguaLoop account</h1>
        <p className="auth-card__text">Set up your profile and begin building your language habits.</p>

        <form className="form auth-form" onSubmit={handleSubmit}>
          <label>
            Username
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="choose-a-username"
              minLength={3}
              maxLength={30}
              pattern="[A-Za-z0-9][A-Za-z0-9._-]{2,29}"
              title="3–30 characters; start with a letter or number"
              autoComplete="username"
              required
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              minLength={6}
              autoComplete="new-password"
              required
            />
          </label>

          {error && <p className="form__error">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="form__switch">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </section>
  );
}
