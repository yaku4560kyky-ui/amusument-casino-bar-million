CREATE TABLE attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bucket TEXT NOT NULL DEFAULT 'uploads',
  object_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  content_type TEXT,
  size_bytes INTEGER,
  ref_table TEXT NOT NULL,
  ref_id UUID NOT NULL,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE integration_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('notion','google_calendar','google_drive')),
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, provider)
);

CREATE TRIGGER integration_configs_updated_at
  BEFORE UPDATE ON integration_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "attachments_select" ON attachments FOR SELECT TO authenticated USING (true);
CREATE POLICY "attachments_insert" ON attachments FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid());
CREATE POLICY "attachments_delete" ON attachments FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid() OR EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

ALTER TABLE integration_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "integration_own" ON integration_configs FOR ALL TO authenticated
  USING (user_id = auth.uid());
