CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  name_kana TEXT,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
  position TEXT,
  phone TEXT,
  avatar_url TEXT,
  notification_prefs JSONB NOT NULL DEFAULT '{"in_app":true,"push":false,"email":false,"task_assigned":true,"event_reminder":true,"tournament_update":true}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR EXISTS(SELECT 1 FROM profiles p2 WHERE p2.id = auth.uid() AND p2.role = 'admin'));

CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles_admin_all" ON profiles FOR ALL TO authenticated
  USING (EXISTS(SELECT 1 FROM profiles p2 WHERE p2.id = auth.uid() AND p2.role = 'admin'));

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'staff')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
