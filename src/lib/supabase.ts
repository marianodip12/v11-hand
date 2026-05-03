import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL ?? '';
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

if (!url || !anon) {
  console.warn(
    '[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
      'Set them in .env.local to enable remote persistence.',
  );
}

// ============================================================================
// SUPABASE CLIENT
// ============================================================================
export const supabase = createClient(url, anon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// ============================================================================
// AUTH HELPERS
// ============================================================================
export async function getCurrentUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) return null;
    return user;
  } catch {
    return null;
  }
}

/**
 * Crea o reutiliza una sesión anónima.
 * Devuelve el user.id si está autenticado.
 */
export async function ensureAnonSession(): Promise<string | null> {
  const user = await getCurrentUser();
  if (user) return user.id;

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) {
    console.warn('[supabase] anonymous sign-in failed:', error.message);
    return null;
  }
  return data.user?.id ?? null;
}

export const isSupabaseReady = (): boolean => Boolean(url && anon);
