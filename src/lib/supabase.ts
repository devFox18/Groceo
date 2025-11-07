import 'react-native-url-polyfill/auto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

type SupabaseExtra = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

const extra = (Constants.expoConfig?.extra ?? Constants.manifest?.extra ?? {}) as SupabaseExtra;

const supabaseUrl =
  extra.supabaseUrl ??
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  'https://qkzoewwjhuhmmtjitmfv.supabase.co';
const supabaseAnonKey =
  extra.supabaseAnonKey ??
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrem9ld3dqaHVobW10aml0bWZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxNjY2MjksImV4cCI6MjA3Nzc0MjYyOX0.3OW4FT3w5nP1OxDWbLaQFqhC-KpIVLsgdxQJC5X_N7E';

export const SUPABASE_WARNING_MESSAGE =
  'Supabase is niet geconfigureerd. Voeg EXPO_PUBLIC_SUPABASE_URL en EXPO_PUBLIC_SUPABASE_ANON_KEY toe om datamogelijkheden te activeren.';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn('[Supabase] Configuration incomplete. Using local offline experience only.');
}

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  : null;

if (isSupabaseConfigured) {
  console.log('[Supabase] Client initialised', {
    url: supabaseUrl?.replace(/\/$/, ''),
    keyPresent: Boolean(supabaseAnonKey),
  });
} else {
  console.info('[Supabase] Skipping client initialisation');
}
