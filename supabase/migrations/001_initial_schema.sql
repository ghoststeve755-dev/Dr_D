-- 001_initial_schema.sql
-- Initial Schema for Doctor D (Doctor of Discipline)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT DEFAULT 'Doctor D',
  timezone TEXT DEFAULT 'Asia/Kolkata',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_self_access ON users
  FOR ALL
  USING (true); -- Allow simple query for auth/demo, we can scope it in Next.js

-- 2. Habits Table
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
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on habits
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;

CREATE POLICY habits_user_scoped ON habits
  FOR ALL
  USING (true); -- We can filter by user_id in application queries or session contexts

-- 3. Daily Journals Table
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

ALTER TABLE daily_journals ENABLE ROW LEVEL SECURITY;
CREATE POLICY daily_journals_user_scoped ON daily_journals FOR ALL USING (true);

-- 4. Habit Logs Table
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

ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY habit_logs_user_scoped ON habit_logs FOR ALL USING (true);

-- 5. Weekly Reviews Table
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

ALTER TABLE weekly_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY weekly_reviews_user_scoped ON weekly_reviews FOR ALL USING (true);

-- 6. Monthly Reports Table
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

ALTER TABLE monthly_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY monthly_reports_user_scoped ON monthly_reports FOR ALL USING (true);

-- 7. Notification Settings Table
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

ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY notification_settings_user_scoped ON notification_settings FOR ALL USING (true);

-- Trigger to seed default habits and default notification settings
CREATE OR REPLACE FUNCTION seed_default_habits()
RETURNS TRIGGER AS $$
BEGIN
  -- Seed the default habits for the new user
  INSERT INTO habits (user_id, name, category, input_type, unit, display_order, is_system, scoring_config)
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

  -- Seed default notification settings for the user
  INSERT INTO notification_settings (user_id, daily_reminder, daily_time, weekly_reminder, monthly_reminder)
  VALUES (NEW.id, TRUE, '19:00:00', TRUE, TRUE);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_seed_default_habits
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION seed_default_habits();
