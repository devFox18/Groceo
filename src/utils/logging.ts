import type { PostgrestError } from '@supabase/supabase-js';

type LogDetails = Record<string, unknown>;

export function logSupabaseError(context: string, error: PostgrestError | null, details: LogDetails = {}) {
  console.error(`[Supabase:${context}]`, {
    error: error
      ? {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        }
      : null,
    details,
  });
}
