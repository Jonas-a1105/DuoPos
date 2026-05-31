-- Migration: Create new tables and columns for complete sync and settings persistence

-- 1. Create table daily_stats for gamification stats
CREATE TABLE IF NOT EXISTS daily_stats (
    day_date TEXT PRIMARY KEY,
    stats_json JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create table app_settings for global and billing settings
CREATE TABLE IF NOT EXISTS app_settings (
    id TEXT PRIMARY KEY, -- e.g., 'billing'
    data JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create table user_preferences for UI preferences (theme, sound)
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id TEXT PRIMARY KEY, -- Clerk/Supabase user ID
    theme TEXT NOT NULL DEFAULT 'standard',
    sound_enabled BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Enable Row Level Security (RLS) for public/authenticated read and write
ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- 5. Set up RLS Policies (Allow read/write access for seamless Local-First operations)
DROP POLICY IF EXISTS "Allow public read daily_stats" ON daily_stats;
DROP POLICY IF EXISTS "Allow public insert/update/delete daily_stats" ON daily_stats;
CREATE POLICY "Allow public read daily_stats" ON daily_stats FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update/delete daily_stats" ON daily_stats FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read app_settings" ON app_settings;
DROP POLICY IF EXISTS "Allow public insert/update/delete app_settings" ON app_settings;
CREATE POLICY "Allow public read app_settings" ON app_settings FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update/delete app_settings" ON app_settings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read user_preferences" ON user_preferences;
DROP POLICY IF EXISTS "Allow public insert/update/delete user_preferences" ON user_preferences;
CREATE POLICY "Allow public read user_preferences" ON user_preferences FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update/delete user_preferences" ON user_preferences FOR ALL USING (true) WITH CHECK (true);
