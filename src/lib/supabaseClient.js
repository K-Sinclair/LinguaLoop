import { createClient } from '@supabase/supabase-js';

function normalizeSupabaseUrl(url) {
  if (!url) return '';

  return url.replace(/\/(?:rest|auth)\/v1\/?$/i, '').replace(/\/+$/, '');
}

const supabaseUrl = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL);
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

function createFallbackClient() {
  const fallbackMessage =
    'Supabase is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment to enable authentication.';

  return {
    auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
      signInWithPassword: async () => ({
        data: { session: null, user: null },
        error: { message: fallbackMessage },
      }),
      signUp: async () => ({
        data: { session: null, user: null },
        error: { message: fallbackMessage },
      }),
      signOut: async () => ({ error: null }),
    },
    from: () => ({
      insert: async () => ({ data: null, error: null }),
      select: async () => ({ data: [], error: null }),
      update: async () => ({ data: null, error: null }),
      delete: async () => ({ data: null, error: null }),
    }),
  };
}

let supabase;

if (supabaseUrl && supabaseAnonKey && /^https?:\/\//.test(supabaseUrl)) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
  console.warn('Supabase env vars are missing or invalid. Falling back to a demo-safe client.');
  supabase = createFallbackClient();
}

export { supabase };
