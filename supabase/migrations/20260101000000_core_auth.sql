-- Core Auth: Tenants, Sucursales, Usuarios y Roles
CREATE TABLE public.profiles (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL DEFAULT 'Cajero',
  email TEXT,
  avatar TEXT DEFAULT 'duo',
  streak INTEGER DEFAULT 1,
  last_sale_date TEXT,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  daily_goal INTEGER DEFAULT 150,
  level_title TEXT DEFAULT 'Cajero Novato',
  role TEXT DEFAULT 'cashier',
  gems INTEGER DEFAULT 0,
  gems_earned_total INTEGER DEFAULT 0,
  unlocked_skins TEXT[] DEFAULT ARRAY['standard'],
  active_skin TEXT DEFAULT 'standard',
  unlocked_badges TEXT[] DEFAULT ARRAY[]::TEXT[],
  completed_missions_today TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);
