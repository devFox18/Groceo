import 'react-native-url-polyfill/auto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

type SupabaseExtra = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

const extra = (Constants.expoConfig?.extra ?? Constants.manifest?.extra ?? {}) as SupabaseExtra;

const supabaseUrl =
  extra.supabaseUrl ?? (process.env.EXPO_PUBLIC_SUPABASE_URL || undefined);
const supabaseAnonKey =
  extra.supabaseAnonKey ?? (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || undefined);

export const SUPABASE_WARNING_MESSAGE =
  'Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to enable data features.';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn(SUPABASE_WARNING_MESSAGE);
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
