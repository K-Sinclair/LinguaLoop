import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useProfile } from '../context/ProfileContext.jsx';
import { supabase } from '../lib/supabaseClient.js';
import {
  getProfileInitials,
  isValidUsername,
  normalizeUsername,
} from '../lib/profileHelpers.js';

export default function Settings() {
  const { user } = useAuth();
  const { profile, loading, refreshProfile } = useProfile();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [nativeLanguageId, setNativeLanguageId] = useState('');
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
    }

    if (user?.email) {
      setEmail(user.email);
    }
  }, [profile, user?.email]);

  useEffect(() => {
    supabase
      .from('languages')
      .select('id, name')
      .order('name')
      .then(({ data, error: langError }) => {
        if (langError) {
          console.warn('Could not load languages:', langError);
          return;
        }
        setLanguages(data ?? []);
      });
  }, []);

  async function handleAvatarChange(e) {
    const file = e.target.files[0];
    if (!file || !user) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const maxFileSize = 5 * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
      setError('Choose a JPEG, PNG, WebP, or GIF image.');
      e.target.value = '';
      return;
    }

    if (file.size > maxFileSize) {
      setError('Profile photos must be 5 MB or smaller.');
      e.target.value = '';
      return;
    }

    setError(null);
    setUploading(true);

    // A stable path replaces the previous avatar instead of leaving every
    // historical upload in Storage.
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

    await refreshProfile();
  }

  async function handleSave(e) {
    e.preventDefault();
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

    // Only worth checking if the username is actually changing -- and same
    // as Signup, this has to go through the RPC rather than a direct SELECT,
    // since RLS's "auth.uid() = id" policy means you can never see whether
    // someone ELSE already has this username via a plain query.
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
      display_name: displayName || null,
      native_language_id: nativeLanguageId || null,
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

  if (loading) {
    return (
      <section className="card">
        <p className="eyebrow">Settings</p>
        <h1>Loading…</h1>
      </section>
    );
  }

  return (
    <section className="settings-page">
      <div className="card settings__hero">
        <div>
          <p className="eyebrow">Settings</p>
          <h1>Profile settings</h1>
          <p>
            Manage the basics of your account while the bigger learning features are still being built.
          </p>
        </div>
        <div className="settings__hero-badge">In progress</div>
      </div>

      <div className="card settings__content settings__content--single">
        <div className="settings__main">
          <div className="settings__avatar-row">
            <div className="settings__avatar">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile" />
              ) : (
                <span>{getProfileInitials(profile?.display_name, user?.email)}</span>
              )}
            </div>
            <label className="settings__avatar-upload">
              {uploading ? 'Uploading…' : 'Change photo'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleAvatarChange}
                disabled={uploading}
                hidden
              />
            </label>
          </div>

          <form className="form settings__form" onSubmit={handleSave}>
            <label>
              Display name
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="What should we call you?"
                maxLength={80}
              />
            </label>

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
              />
            </label>

            <label>
              Native language
              <select
                value={nativeLanguageId}
                onChange={(e) => setNativeLanguageId(e.target.value)}
              >
                <option value="">Not set</option>
                {languages.map((lang) => (
                  <option key={lang.id} value={lang.id}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </label>

            {error && <p className="form__error">{error}</p>}
            {saved && !emailConfirmPending && <p className="form__success">Saved.</p>}
            {saved && emailConfirmPending && (
              <p className="form__success">
                Saved. Check your new email address for a confirmation link — your
                login email won't change until you confirm it.
              </p>
            )}

            <button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
