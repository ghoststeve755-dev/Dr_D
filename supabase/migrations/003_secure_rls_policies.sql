-- 003_secure_rls_policies.sql
-- Restructure RLS policies to restrict data access only to the authenticated owner

-- 1. Users Table
DROP POLICY IF EXISTS users_self_access ON users;
CREATE POLICY users_self_access ON users
  FOR ALL
  USING (auth.uid() = id);

-- 2. Habits Table
DROP POLICY IF EXISTS habits_user_scoped ON habits;
CREATE POLICY habits_user_scoped ON habits
  FOR ALL
  USING (auth.uid() = user_id);

-- 3. Daily Journals Table
DROP POLICY IF EXISTS daily_journals_user_scoped ON daily_journals;
CREATE POLICY daily_journals_user_scoped ON daily_journals
  FOR ALL
  USING (auth.uid() = user_id);

-- 4. Habit Logs Table
DROP POLICY IF EXISTS habit_logs_user_scoped ON habit_logs;
CREATE POLICY habit_logs_user_scoped ON habit_logs
  FOR ALL
  USING (auth.uid() = user_id);

-- 5. Weekly Reviews Table
DROP POLICY IF EXISTS weekly_reviews_user_scoped ON weekly_reviews;
CREATE POLICY weekly_reviews_user_scoped ON weekly_reviews
  FOR ALL
  USING (auth.uid() = user_id);

-- 6. Monthly Reports Table
DROP POLICY IF EXISTS monthly_reports_user_scoped ON monthly_reports;
CREATE POLICY monthly_reports_user_scoped ON monthly_reports
  FOR ALL
  USING (auth.uid() = user_id);

-- 7. Notification Settings Table
DROP POLICY IF EXISTS notification_settings_user_scoped ON notification_settings;
CREATE POLICY notification_settings_user_scoped ON notification_settings
  FOR ALL
  USING (auth.uid() = user_id);
