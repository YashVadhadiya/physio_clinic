-- =====================================================
-- PhysioClinic Supabase Setup
-- Run in this order:
--   1. Run supabase-schema.sql (tables)
--   2. Run this file (RLS + triggers)
--   3. Create admin user via Supabase Dashboard
-- =====================================================

-- Enable Row Level Security on all tables
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- ─── Helper: check if current user is admin ───
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM workers
    WHERE "Email" = auth.email()
    AND "Role" = 'admin'
    AND "Status" = 'active'
  );
$$;

-- ─── Workers ───

CREATE POLICY "Authenticated users can read workers"
ON workers FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can insert workers"
ON workers FOR INSERT
WITH CHECK (is_admin());

CREATE POLICY "Admins can update workers"
ON workers FOR UPDATE
USING (is_admin());

-- ─── Patients ───

CREATE POLICY "Authenticated users can read patients"
ON patients FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert patients"
ON patients FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update patients"
ON patients FOR UPDATE
USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can delete patients"
ON patients FOR DELETE
USING (is_admin());

-- ─── Visits ───

CREATE POLICY "Authenticated users can read visits"
ON visits FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert visits"
ON visits FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update visits"
ON visits FOR UPDATE
USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can delete visits"
ON visits FOR DELETE
USING (is_admin());

-- ─── Activity Logs ───

CREATE POLICY "Authenticated users can read logs"
ON activity_logs FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert logs"
ON activity_logs FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- ─── Settings ───

CREATE POLICY "Authenticated users can read settings"
ON settings FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can update settings"
ON settings FOR UPDATE
USING (is_admin());

-- ─── Auto-create worker profile on user signup ───
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.workers (
    "WorkerID",
    "Name",
    "Email",
    "Mobile",
    "PasswordHash",
    "Role",
    "Status",
    "JoiningDate",
    "CreatedAt",
    "UpdatedAt"
  ) VALUES (
    'USR' || upper(substr(md5(new.id::text), 1, 8)),
    COALESCE(new.raw_user_meta_data->>'name', new.email),
    new.email,
    COALESCE(new.raw_user_meta_data->>'mobile', ''),
    '',
    COALESCE(new.raw_user_meta_data->>'role', 'worker'),
    'active',
    CURRENT_DATE::text,
    NOW()::text,
    NOW()::text
  )
  ON CONFLICT ("Email") DO NOTHING;
  RETURN new;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ─── Admin password reset function ───
CREATE OR REPLACE FUNCTION reset_worker_password(p_email TEXT, p_password TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Only admins can call this
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can reset passwords';
  END IF;

  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Update password in auth.users
  UPDATE auth.users
  SET encrypted_password = crypt(p_password, gen_salt('bf'))
  WHERE id = v_user_id;

  RETURN p_password;
END;
$$;
