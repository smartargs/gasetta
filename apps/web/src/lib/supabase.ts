import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Surface the misconfig loudly in dev — silently shipping an unauthenticated
  // client would make every PostgREST call return cryptic 401s.
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
      'Copy apps/web/.env.example to apps/web/.env.local and fill it in.',
  );
}

export const supabase = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
