import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL ?? '';
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

if (!url || !anon) {
  // In dev the app will simply not connect, but shouldn't crash the boot.
  // eslint-disable-next-line no-console
  console.warn(
    '[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
      'Set them in .env.local to enable remote persistence.',
  );
}

export const supabase = createClient(url, anon, {
  auth: { persistSession: false },
});
