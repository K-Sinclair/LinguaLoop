import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useProfile } from '../context/ProfileContext.jsx';
import { supabase } from '../lib/supabaseClient.js';
import { canUseUsernameColumn, getProfileInitials, normalizeUsername } from '../lib/profileHelpers.js';

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

    setError(null);
    setUploading(true);

    const filePath = `${user.id}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      setUploading(false);
      setError(uploadError.message);
      return;
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: urlData.publicUrl })
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

    if (!normalizedUsername && username.trim()) {
      setSaving(false);
      setError('Please choose a username using letters, numbers, dots, or dashes.');
      return;
    }

    const { available: usernameColumnAvailable, error: usernameColumnError } = await canUseUsernameColumn(supabase);

    if (!usernameColumnAvailable && username.trim()) {
      setSaving(false);
      setError('Username support is not enabled yet in the database. Please add the profiles.username column first.');
      return;
    }

    // Only worth checking if the username is actually changing -- and same
    // as Signup, this has to go through the RPC rather than a direct SELECT,
    // since RLS's "auth.uid() = id" policy means you can never see whether
    // someone ELSE already has this username via a plain query.
    if (usernameColumnAvailable && normalizedUsername && normalizedUsername !== profile?.username) {
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
    };

    if (usernameColumnAvailable) {
      profileUpdates.username = normalizedUsername || null;
    }

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
                accept="image/*"
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
              />
            </label>

            <label>
              Username
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="choose-a-username"
              />
            </label>

            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
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
