-- Migration: Allow users to insert their own profile and add public fallback policies

-- 1. Allow authenticated users to insert their own profile
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid()::text = id);

-- 2. Allow public/anon fallback access for local-first operations when Clerk JWT is not configured
DROP POLICY IF EXISTS "Profiles public read" ON public.profiles;
CREATE POLICY "Profiles public read" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Profiles public all" ON public.profiles;
CREATE POLICY "Profiles public all" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
