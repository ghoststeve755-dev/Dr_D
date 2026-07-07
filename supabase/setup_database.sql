-- ==========================================
-- DOCTOR D — UNIFIED DATABASE SETUP SCRIPT
-- ==========================================
-- Copy this entire file and paste it into the SQL Editor in your Supabase Dashboard:
-- https://supabase.com/dashboard/project/wzqxcrdeoxssosfnqqvo/editor
-- Click "Run" to initialize all tables, triggers, and security policies.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. TABLES CREATION
-- ==========================================

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT DEFAULT 'Doctor D',
  timezone TEXT DEFAULT 'Asia/Kolkata',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Habits Table
CREATE TABLE IF NOT EXISTS habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- health, learning, productivity, finance
  input_type TEXT NOT NULL, -- boolean, number
  unit TEXT, -- 'hours', 'pages', 'rupees', etc.
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false,
  scoring_config JSONB NOT NULL,
  weekly_target DECIMAL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Daily Journals Table
CREATE TABLE IF NOT EXISTS daily_journals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  week_number INTEGER NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  day_of_week TEXT NOT NULL,
  is_late_entry BOOLEAN DEFAULT false,
  notes TEXT,
  daily_raw_score DECIMAL DEFAULT 0,
  daily_max_score DECIMAL DEFAULT 0,
  daily_pct_score DECIMAL DEFAULT 0,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Habit Logs Table
CREATE TABLE IF NOT EXISTS habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  journal_id UUID REFERENCES daily_journals(id) ON DELETE CASCADE NOT NULL,
  habit_id UUID REFERENCES habits(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  raw_value TEXT NOT NULL,
  computed_score DECIMAL NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, habit_id, date)
);

-- Weekly Reviews Table
CREATE TABLE IF NOT EXISTS weekly_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  year INTEGER NOT NULL,
  week_number INTEGER NOT NULL,
  achievement TEXT,
  challenge TEXT,
  learning TEXT,
  next_focus TEXT,
  notes TEXT,
  weekly_raw_score DECIMAL DEFAULT 0,
  weekly_max_score DECIMAL DEFAULT 0,
  weekly_pct_score DECIMAL DEFAULT 0,
  habit_summary JSONB,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, year, week_number)
);

-- Monthly Reports Table
CREATE TABLE IF NOT EXISTS monthly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  monthly_pct_score DECIMAL DEFAULT 0,
  habit_summary JSONB,
  is_auto_generated BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, year, month)
);

-- Notification Settings Table
CREATE TABLE IF NOT EXISTS notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  daily_reminder BOOLEAN DEFAULT true,
  daily_time TIME DEFAULT '19:00:00',
  weekly_reminder BOOLEAN DEFAULT true,
  monthly_reminder BOOLEAN DEFAULT true,
  push_endpoint TEXT,
  push_p256dh TEXT,
  push_auth TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- 2. ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_self_access ON users;
CREATE POLICY users_self_access ON users FOR ALL USING (auth.uid() = id);

DROP POLICY IF EXISTS habits_user_scoped ON habits;
CREATE POLICY habits_user_scoped ON habits FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS daily_journals_user_scoped ON daily_journals;
CREATE POLICY daily_journals_user_scoped ON daily_journals FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS habit_logs_user_scoped ON habit_logs;
CREATE POLICY habit_logs_user_scoped ON habit_logs FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS weekly_reviews_user_scoped ON weekly_reviews;
CREATE POLICY weekly_reviews_user_scoped ON weekly_reviews FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS monthly_reports_user_scoped ON monthly_reports;
CREATE POLICY monthly_reports_user_scoped ON monthly_reports FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS notification_settings_user_scoped ON notification_settings;
CREATE POLICY notification_settings_user_scoped ON notification_settings FOR ALL USING (auth.uid() = user_id);

-- ==========================================
-- 3. USER SIGNUP TRIGGERS & SEEDING SCRIPT
-- ==========================================

-- Drop triggers if they exist to avoid conflicts on repeat runs
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS before_auth_user_created ON auth.users;

-- Trigger function: Create public user profile + Seed default 10 habits
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Sync auth user to public users
  INSERT INTO public.users (id, username, password_hash, name, timezone)
  VALUES (
    NEW.id,
    SPLIT_PART(NEW.email, '@', 1),
    'supabase-managed',
    COALESCE(NEW.raw_user_meta_data->>'name', 'Doctor D'),
    COALESCE(NEW.raw_user_meta_data->>'timezone', 'Asia/Kolkata')
  );

  -- 2. Seed Default Habits
  INSERT INTO public.habits (user_id, name, category, input_type, unit, display_order, is_system, scoring_config)
  VALUES
    (NEW.id, 'Wake Up Before 6 AM', 'health', 'boolean', NULL, 1, TRUE, '{"type": "boolean", "yes_points": 1}'),
    (NEW.id, 'Exercise', 'health', 'boolean', NULL, 2, TRUE, '{"type": "boolean", "yes_points": 1}'),
    (NEW.id, 'Sleep Before 11 PM', 'health', 'boolean', NULL, 3, TRUE, '{"type": "boolean", "yes_points": 1}'),
    (NEW.id, 'Diet Followed', 'health', 'boolean', NULL, 4, TRUE, '{"type": "boolean", "yes_points": 1}'),
    (NEW.id, 'Intermittent Fasting', 'health', 'boolean', NULL, 5, TRUE, '{"type": "boolean", "yes_points": 1}'),
    (NEW.id, 'Income Producing Work', 'productivity', 'boolean', NULL, 6, TRUE, '{"type": "boolean", "yes_points": 1}'),
    (NEW.id, 'Study Hours', 'learning', 'number', 'hours', 7, TRUE, '{"type": "threshold", "rules": [{"min": 0, "max": 0, "points": 0}, {"min": 0.01, "max": 3, "points": 0.5}, {"min": 3.01, "max": null, "points": 1.0}]}'),
    (NEW.id, 'Reading Pages', 'learning', 'number', 'pages', 8, TRUE, '{"type": "divide_by", "divisor": 10}'),
    (NEW.id, 'Money Earned (₹)', 'finance', 'number', 'rupees', 9, TRUE, '{"type": "add_subtract", "per_unit": 100, "multiplier": 1, "direction": "positive"}'),
    (NEW.id, 'Money Spent (₹)', 'finance', 'number', 'rupees', 10, TRUE, '{"type": "add_subtract", "per_unit": 100, "multiplier": -1, "direction": "negative"}');

  -- 3. Seed Default Notification Settings
  INSERT INTO public.notification_settings (user_id, daily_reminder, daily_time, weekly_reminder, monthly_reminder)
  VALUES (NEW.id, TRUE, '19:00:00', TRUE, TRUE);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Trigger to automatically delete profile from public.users when deleted from auth.users
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_deleted_user()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.users WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_deleted_user();



-- Enforce limit count trigger
CREATE OR REPLACE FUNCTION public.prevent_multiple_users()
RETURNS TRIGGER AS $$
DECLARE
  user_count INTEGER;
BEGIN
  SELECT count(*) INTO user_count FROM auth.users;
  IF user_count > 0 THEN
    RAISE EXCEPTION 'Registration is closed. Only one user account is allowed.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER before_auth_user_created
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_multiple_users();
