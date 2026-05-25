import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Validar si las claves son reales y tienen el formato correcto antes de inicializar para evitar caídas
const isKeysValid = 
  supabaseUrl && 
  supabaseUrl.startsWith('http') && 
  supabaseAnonKey && 
  supabaseAnonKey.length > 10;

if (!isKeysValid) {
  console.warn(
    'Supabase URL or Anon Key is invalid or missing. App is running in Local/Mock fallback mode.'
  );
}

// Cliente Mock seguro para evitar crashes si el usuario no ha configurado sus variables en Vercel aún
const mockSupabase = {
  auth: {
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signInWithPassword: async () => ({ data: { user: null }, error: { message: 'Supabase no está configurado en las variables de entorno de Vercel.' } }),
    signUp: async () => ({ data: { user: null }, error: { message: 'Supabase no está configurado en las variables de entorno de Vercel.' } }),
    signOut: async () => {}
  },
  from: () => ({
    select: () => ({
      eq: () => ({
        single: async () => ({ data: null, error: { message: 'Supabase no configurado' } }),
        maybeSingle: async () => ({ data: null, error: { message: 'Supabase no configurado' } })
      })
    }),
    update: () => ({
      eq: async () => ({ error: { message: 'Supabase no configurado' } })
    })
  })
} as any;

export const supabase = isKeysValid
  ? createClient(supabaseUrl, supabaseAnonKey)
  : mockSupabase;
