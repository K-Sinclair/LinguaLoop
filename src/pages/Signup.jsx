import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient.js';
import { useAuth } from '../context/AuthContext.jsx';
import { canUseUsernameColumn, normalizeUsername } from '../lib/profileHelpers.js';

export default function Signup() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState(null);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading || authLoading || user) return;

    setError(null);
    setAlreadyRegistered(false);
    setLoading(true);

    const normalizedUsername = normalizeUsername(username);
    if (!normalizedUsername) {
      setError('Please choose a username using letters, numbers, dots, or dashes.');
      setLoading(false);
      return;
    }

    const { available: usernameColumnAvailable, error: usernameCheckError } = await canUseUsernameColumn(supabase);

    if (usernameCheckError && !usernameColumnAvailable) {
      setLoading(false);
      setError('Username support is not enabled yet in the database. Please add the profiles.username column first.');
      return;
    }

    if (usernameColumnAvailable) {
      // Direct SELECT can't be used here -- RLS's "auth.uid() = id" policy
      // means an anonymous, pre-signup visitor can never see anyone else's
      // row anyway, so a plain query would always (wrongly) say "available."
      // The RPC runs with elevated privileges just for this narrow check.
      const { data: isAvailable, error: usernameCheckRpcError } = await supabase.rpc(
        'is_username_available',
        { check_username: normalizedUsername }
      );

      if (usernameCheckRpcError) {
        setLoading(false);
        setError(usernameCheckRpcError.message);
        return;
      }

      if (!isAvailable) {
        setLoading(false);
        setError('That username is already taken. Please choose another one.');
        return;
      }
    }

    const siteUrl = import.meta.env.VITE_SITE_URL?.trim() || window.location.origin;
    const redirectUrl = new URL('/login', siteUrl).toString();

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectUrl },
    });

    setLoading(false);

    // Supabase deliberately avoids confirming outright that an email is
    // taken (to stop attackers enumerating accounts). Two signals reveal it
    // instead: an explicit "already registered" error, or a successful-
    // looking response where `identities` comes back empty -- that's
    // Supabase's way of saying "this confirmed account already exists"
    // without an error message that would leak the same info to a stranger.
    // This check happens BEFORE any profile write is attempted below --
    // writing to a stranger's profile row would only ever be blocked by
    // RLS anyway, but there's no reason to attempt it in the first place.
    const looksAlreadyRegistered =
      signUpError?.message?.toLowerCase().includes('already registered') ||
      (!signUpError && data?.user && data.user.identities?.length === 0);

    if (looksAlreadyRegistered) {
      setAlreadyRegistered(true);
      return;
    }

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (data?.user) {
      const profilePayload = {
        id: data.user.id,
        display_name: username.trim(),
      };

      if (usernameColumnAvailable) {
        profilePayload.username = normalizedUsername;
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(profilePayload, { onConflict: 'id' })
        .select('*')
        .maybeSingle();

      if (profileError) {
        console.warn('Could not save initial profile data:', profileError);
      }
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

  if (alreadyRegistered) {
    return (
      <section className="card">
        <p className="eyebrow">Auth</p>
        <h1>Account already exists</h1>
        <p>
          An account with <strong>{email}</strong> is already registered.
        </p>
        <p className="form__switch">
          <Link to="/login">Log in instead</Link>
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
            We sent a confirmation link to <strong>{email}</strong>. Open it to confirm your account, then come back and log in.
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
