import { createClient } from '@supabase/supabase-js';

/**
 * Sanitizes project URL to ensure it has no trailing slashes or incorrect paths (e.g. /rest/v1)
 */
export const cleanSupabaseUrl = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  let url = rawUrl.trim();
  // Strip trailing /rest/v1, /rest/v1/, or any /rest/* paths
  url = url.replace(/\/rest(\/v\d+)?\/?$/i, '');
  // Strip trailing slashes
  url = url.replace(/\/+$/, '');
  return url;
};

export const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
export const supabaseUrl = cleanSupabaseUrl(rawSupabaseUrl);
export const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

/**
 * Checks whether valid Supabase credentials have been configured in .env
 */
export const isSupabaseConfigured = () => {
  return (
    typeof supabaseUrl === 'string' &&
    supabaseUrl.trim() !== '' &&
    !supabaseUrl.includes('your-project-id') &&
    typeof supabaseAnonKey === 'string' &&
    supabaseAnonKey.trim() !== '' &&
    !supabaseAnonKey.includes('your-anon-publishable-key')
  );
};
/**
 * Reusable Supabase client instance.
 * If credentials are not yet added, initializes with a fallback URL so that
 * the app continues running in demo/offline mode without throwing uncaught import errors.
 */
export const supabase = createClient(
  isSupabaseConfigured() ? supabaseUrl : 'https://placeholder-learnmate.supabase.co',
  isSupabaseConfigured() ? supabaseAnonKey : 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);




