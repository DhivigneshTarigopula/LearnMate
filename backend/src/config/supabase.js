import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = () => {
  return (
    typeof supabaseUrl === 'string' &&
    supabaseUrl.trim() !== '' &&
    !supabaseUrl.includes('your-project-id') &&
    typeof supabaseAnonKey === 'string' &&
    supabaseAnonKey.trim() !== '' &&
    !supabaseAnonKey.includes('your_supabase_anon_key')
  );
};

export const supabase = createClient(
  isSupabaseConfigured() ? supabaseUrl : 'https://placeholder-learnmate.supabase.co',
  isSupabaseConfigured() ? supabaseAnonKey : 'placeholder-anon-key'
);
