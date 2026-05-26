import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ─── Environment Variables ─────────────────────────────────────────────────────
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const isKeysValid =
  supabaseUrl &&
  supabaseUrl.startsWith('http') &&
  supabaseAnonKey &&
  supabaseAnonKey.length > 20 &&
  (supabaseAnonKey.startsWith('sb_publishable_') || supabaseAnonKey.split('.').length === 3);

// ─── Real Supabase Client ──────────────────────────────────────────────────────
let supabase: SupabaseClient;

if (isKeysValid) {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
  console.log('✅ Supabase client inicializado correctamente.');
} else {
  console.warn(
    '⚠️ Supabase URL o Anon Key no configurados. La app corre en modo local (localStorage únicamente).'
  );
  // Mock seguro para que la app no crash si Supabase no está configurado
  supabase = {
    auth: {
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
      signInWithPassword: async () => ({
        data: { user: null, session: null },
        error: { message: 'Supabase no configurado. Usa el modo local.', status: 0 },
      }),
      signUp: async () => ({
        data: { user: null, session: null },
        error: { message: 'Supabase no configurado. Usa el modo local.', status: 0 },
      }),
      signOut: async () => ({ error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
    },
    from: () => ({
      select: (..._args: any[]) => ({
        eq: () => ({
          single: async () => ({ data: null, error: null }),
          maybeSingle: async () => ({ data: null, error: null }),
          order: () => ({ data: [], error: null }),
        }),
        order: () => ({ data: [], error: null }),
        limit: () => ({ data: [], error: null }),
      }),
      insert: (data: any) => ({
        select: () => ({
          single: async () => ({ data, error: null }),
          maybeSingle: async () => ({ data, error: null }),
        }),
      }),
      update: () => ({
        eq: async () => ({ data: null, error: null }),
      }),
      upsert: (data: any) => ({
        select: () => ({
          single: async () => ({ data, error: null }),
          maybeSingle: async () => ({ data, error: null }),
        }),
      }),
      delete: () => ({
        eq: async () => ({ data: null, error: null }),
      }),
    }),
  } as any;
}

// ─── Helper: Detectar si estamos online con Supabase real ──────────────────────
export const isSupabaseConfigured = (): boolean => isKeysValid;

export { supabase };
