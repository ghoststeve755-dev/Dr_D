-- 002_auth_triggers.sql
-- Setup triggers to sync Supabase Auth users to public.users and restrict registration to single user

-- Drop triggers if they exist to avoid errors
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS before_auth_user_created ON auth.users;

-- Trigger to automatically create a public.users row when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, username, password_hash, name, timezone)
  VALUES (
    NEW.id,
    SPLIT_PART(NEW.email, '@', 1),
    'supabase-managed', -- Password hash is managed by auth.users
    COALESCE(NEW.raw_user_meta_data->>'name', 'Doctor D'),
    COALESCE(NEW.raw_user_meta_data->>'timezone', 'Asia/Kolkata')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Trigger to prevent multiple registrations (only 1 user allowed)
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

