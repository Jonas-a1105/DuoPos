import { z } from 'zod';

const envSchema = z.object({
  VITE_SUPABASE_URL: z.union([z.string().url(), z.literal('')]).optional().default(''),
  VITE_SUPABASE_ANON_KEY: z.string().optional().default(''),
  VITE_CLERK_PUBLISHABLE_KEY: z.string().optional().default(''),
  GEMINI_API_KEY: z.string().optional().default(''),
});

export type Env = z.infer<typeof envSchema>;

function getEnvVar(key: string): string {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return (import.meta.env as Record<string, string>)[key] || '';
  }
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] || '';
  }
  return '';
}

export const env: Env = envSchema.parse({
  VITE_SUPABASE_URL: getEnvVar('VITE_SUPABASE_URL'),
  VITE_SUPABASE_ANON_KEY: getEnvVar('VITE_SUPABASE_ANON_KEY'),
  VITE_CLERK_PUBLISHABLE_KEY: getEnvVar('VITE_CLERK_PUBLISHABLE_KEY'),
  GEMINI_API_KEY: getEnvVar('GEMINI_API_KEY'),
});
