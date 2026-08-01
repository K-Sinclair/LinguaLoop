import { useEffect, useState } from 'react';
import AppIcon from '../components/AppIcon.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useProfile } from '../context/ProfileContext.jsx';
import { supabase } from '../lib/supabaseClient.js';
import {
  getProfileInitials,
  isValidUsername,
  normalizeUsername,
} from '../lib/profileHelpers.js';

const DAILY_GOALS = [5, 10, 15, 20];

export default function Settings() {
  const { user } = useAuth();
  const { profile, loading, refreshProfile } = useProfile();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [nativeLanguageId, setNativeLanguageId] = useState('');
  const [learningLanguageId, setLearningLanguageId] = useState('');
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(10);
  const [showRomanization, setShowRomanization] = useState(true);
  const [languages, setLanguages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [emailConfirmPending, setEmailConfirmPending] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setUsername(profile.username || '');
      setNativeLanguageId(profile.native_language_id || '');
      setLearningLanguageId(profile.learning_language_id || '');
      setDailyGoalMinutes(profile.daily_goal_minutes ?? 10);
      setShowRomanization(profile.show_romanization ?? true);
    }

    if (user?.email) setEmail(user.email);
  }, [profile, user?.email]);

  useEffect(() => {
    supabase
      .from('languages')
      .select('id, code, name')
      .order('name')
      .then(({ data, error: languageError }) => {
        if (languageError) {
          setError('We couldn’t load the language options. Please refresh and try again.');
          return;
        }
        setLanguages(data ?? []);
      });
  }, []);

  const learningLanguages = languages.filter((language) => language.code !== 'en');

  async function handleAvatarChange(event) {
    const file = event.target.files[0];
    if (!file || !user) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const maxFileSize = 5 * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
      setError('Choose a JPEG, PNG, WebP, or GIF image.');
      event.target.value = '';
      return;
    }

    if (file.size > maxFileSize) {
      setError('Profile photos must be 5 MB or smaller.');
      event.target.value = '';
      return;
    }

    setError(null);
    setSaved(false);
    setUploading(true);

    const filePath = `${user.id}/avatar`;
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type,
        cacheControl: '3600',
      });

    if (uploadError) {
      setUploading(false);
      setError(uploadError.message);
      return;
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
    const avatarUrl = `${urlData.publicUrl}?v=${Date.now()}`;
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', user.id);

    setUploading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSaved(true);
    await refreshProfile();
  }

  async function handleSave(event) {
    event.preventDefault();
    if (!user) return;

    setSaving(true);
    setError(null);
    setSaved(false);
    setEmailConfirmPending(false);

    const normalizedUsername = normalizeUsername(username);

    if (!isValidUsername(normalizedUsername)) {
      setSaving(false);
      setError('Use 3–30 characters. Start with a letter or number, then use letters, numbers, dots, dashes, or underscores.');
      return;
    }

    if (!learningLanguageId) {
      setSaving(false);
      setError('Choose the language you want to learn.');
      return;
    }

    if (normalizedUsername !== profile?.username) {
      const { data: isAvailable, error: usernameCheckError } = await supabase.rpc(
        'is_username_available',
        { check_username: normalizedUsername }
      );

      if (usernameCheckError) {
        setSaving(false);
        setError(usernameCheckError.message);
        return;
      }

      if (!isAvailable) {
        setSaving(false);
        setError('That username is already taken. Please choose another one.');
        return;
      }
    }

    let emailChangePending = false;
    if (email.trim().toLowerCase() !== user.email?.toLowerCase()) {
      const { error: emailError } = await supabase.auth.updateUser({ email: email.trim() });
      if (emailError) {
        setSaving(false);
        setError(emailError.message);
        return;
      }
      emailChangePending = true;
    }

    const profileUpdates = {
      display_name: displayName.trim() || null,
      native_language_id: nativeLanguageId || null,
      learning_language_id: learningLanguageId,
      daily_goal_minutes: Number(dailyGoalMinutes),
      show_romanization: showRomanization,
      username: normalizedUsername,
    };

    const { error: updateError } = await supabase
      .from('profiles')
      .upsert({ id: user.id, ...profileUpdates }, { onConflict: 'id' })
      .select('*')
      .maybeSingle();

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSaved(true);
    setEmailConfirmPending(emailChangePending);
    await refreshProfile();
  }

  if (loading) return <p className="page-loading">Loading your settings…</p>;

  return (
    <section className="settings-page">
      <header className="settings-header">
        <p className="eyebrow">Personalise LinguaLoop</p>
        <h1>Settings</h1>
        <p>Manage your public profile and decide how your learning path works.</p>
      </header>

      <form className="settings-form" onSubmit={handleSave}>
        <section className="settings-panel" aria-labelledby="profile-settings-title">
          <div className="settings-panel__heading">
            <span className="settings-panel__icon"><AppIcon name="profile" /></span>
            <div>
              <h2 id="profile-settings-title">Profile</h2>
              <p>The details used across your account.</p>
            </div>
          </div>

          <div className="settings-avatar-row">
            <div className="settings-avatar">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Your profile" />
              ) : (
                <span>{getProfileInitials(profile?.display_name, user?.email)}</span>
              )}
            </div>
            <div>
              <label className="button button--outline button--small settings-avatar-upload">
                {uploading ? 'Uploading…' : 'Change photo'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleAvatarChange}
                  disabled={uploading}
                  hidden
                />
              </label>
              <p>JPEG, PNG, WebP or GIF. Maximum 5 MB.</p>
            </div>
          </div>

          <div className="settings-grid">
            <label>
              Display name
              <input
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="What should we call you?"
                maxLength={80}
                autoComplete="name"
              />
            </label>

            <label>
              Username
              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
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
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </label>

            <label>
              Native language
              <select
                value={nativeLanguageId}
                onChange={(event) => setNativeLanguageId(event.target.value)}
              >
                <option value="">Not set</option>
                {languages.map((language) => (
                  <option key={language.id} value={language.id}>{language.name}</option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="settings-panel" aria-labelledby="learning-settings-title">
          <div className="settings-panel__heading">
            <span className="settings-panel__icon settings-panel__icon--purple"><AppIcon name="target" /></span>
            <div>
              <h2 id="learning-settings-title">Learning preferences</h2>
              <p>These choices update your dashboard and lessons.</p>
            </div>
          </div>

          <div className="settings-grid">
            <label>
              Learning language
              <select
                value={learningLanguageId}
                onChange={(event) => setLearningLanguageId(event.target.value)}
                required
              >
                <option value="" disabled>Choose a language</option>
                {learningLanguages.map((language) => (
                  <option key={language.id} value={language.id}>{language.name}</option>
                ))}
              </select>
            </label>

            <label>
              Daily goal
              <select
                value={dailyGoalMinutes}
                onChange={(event) => setDailyGoalMinutes(event.target.value)}
              >
                {DAILY_GOALS.map((minutes) => (
                  <option key={minutes} value={minutes}>{minutes} minutes</option>
                ))}
              </select>
            </label>
          </div>

          <label className="toggle-row">
            <span>
              <strong>Show Japanese romanisation</strong>
              <small>Display Latin pronunciation hints below Japanese answers.</small>
            </span>
            <input
              type="checkbox"
              checked={showRomanization}
              onChange={(event) => setShowRomanization(event.target.checked)}
            />
          </label>
        </section>

        <div className="settings-savebar">
          <div aria-live="polite">
            {error && <p className="form__error" role="alert">{error}</p>}
            {saved && !emailConfirmPending && <p className="form__success">Your changes are saved.</p>}
            {saved && emailConfirmPending && (
              <p className="form__success">
                Saved. Confirm the message sent to your new email before it becomes your login.
              </p>
            )}
          </div>
          <button type="submit" className="button button--primary" disabled={saving || uploading}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </section>
  );
}
