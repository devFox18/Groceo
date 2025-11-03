import { createClient } from '@supabase/supabase-js';

// Expo automatically exposes public env vars that start with EXPO_PUBLIC_.
const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://qkzoewwjhuhmmtjitmfv.supabase.co';
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrem9ld3dqaHVobW10aml0bWZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxNjY2MjksImV4cCI6MjA3Nzc0MjYyOX0.3OW4FT3w5nP1OxDWbLaQFqhC-KpIVLsgdxQJC5X_N7E';

if (!supabaseUrl) {
  throw new Error('Missing Supabase URL. Please set EXPO_PUBLIC_SUPABASE_URL.');
}

if (!supabaseAnonKey) {
  throw new Error(
    'Missing Supabase anon key. Please set EXPO_PUBLIC_SUPABASE_ANON_KEY.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
