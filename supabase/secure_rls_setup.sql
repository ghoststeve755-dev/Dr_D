-- ==========================================
-- DOCTOR D — SECURITY & RLS SETUP
-- ==========================================
-- Run this in the Supabase SQL Editor to secure the database.

-- 1. FIX USERS TABLE SCHEMA
-- The auth is handled by Supabase, so the public password_hash is unnecessary and insecure.
ALTER TABLE public.users ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE public.users ALTER COLUMN username DROP NOT NULL;

-- 2. CREATE AUTH TRIGGER
-- Automatically create a user record in the public.users table when they sign up.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, username, name, timezone)
  VALUES (
    new.id,
    split_part(new.email, '@', 1), -- username from email
    COALESCE(new.raw_user_meta_data->>'name', 'Doctor D'),
    COALESCE(new.raw_user_meta_data->>'timezone', 'Asia/Kolkata')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. ENABLE ROW LEVEL SECURITY
-- This blocks ALL access by default until a policy allows it.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- 4. CREATE POLICIES (Users can only see/edit their own data)
-- Users Table
CREATE POLICY "Users can manage their own profile" 
ON public.users FOR ALL 
USING (auth.uid() = id);

-- Habits Table
CREATE POLICY "Users can manage their own habits" 
ON public.habits FOR ALL 
USING (auth.uid() = user_id);

-- Daily Journals
CREATE POLICY "Users can manage their own journals" 
ON public.daily_journals FOR ALL 
USING (auth.uid() = user_id);

-- Habit Logs
CREATE POLICY "Users can manage their own habit logs" 
ON public.habit_logs FOR ALL 
USING (auth.uid() = user_id);

-- Weekly Reviews
CREATE POLICY "Users can manage their own weekly reviews" 
ON public.weekly_reviews FOR ALL 
USING (auth.uid() = user_id);

-- Monthly Reports
CREATE POLICY "Users can manage their own monthly reports" 
ON public.monthly_reports FOR ALL 
USING (auth.uid() = user_id);

-- Notification Settings
CREATE POLICY "Users can manage their own notification settings" 
ON public.notification_settings FOR ALL 
USING (auth.uid() = user_id);

-- 5. SECURE RPC FOR REGISTRATION CHECK
-- Because RLS prevents anon users from counting rows in `users`, we create a SECURITY DEFINER function.
CREATE OR REPLACE FUNCTION public.get_user_count()
RETURNS integer AS $$
DECLARE
  total_users integer;
BEGIN
  SELECT count(*) INTO total_users FROM public.users;
  RETURN total_users;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
