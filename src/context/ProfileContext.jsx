import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import { useAuth } from './AuthContext.jsx';

const ProfileContext = createContext(undefined);

export function ProfileProvider({ children }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    let { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (!error && !data) {
      // No profile row yet -- e.g. the account was created before this
      // table existed, or the row creation failed silently at signup.
      // Create a bare one so Settings/Dashboard always have something
      // to read, rather than every screen needing its own fallback.
      const { data: created, error: insertError } = await supabase
        .from('profiles')
        .upsert({ id: user.id }, { onConflict: 'id' })
        .select('*')
        .maybeSingle();

      if (insertError) {
        console.warn('Could not create missing profile row:', insertError);
      } else {
        data = created;
      }
    } else if (error) {
      console.warn('Could not load profile:', error);
    }

    setProfile(data ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  return (
    <ProfileContext.Provider value={{ profile, loading, refreshProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (ctx === undefined) {
    throw new Error('useProfile must be used inside a ProfileProvider');
  }
  return ctx;
}
