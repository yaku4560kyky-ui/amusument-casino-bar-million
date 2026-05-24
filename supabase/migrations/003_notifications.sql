CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('task_assigned','task_due','event_reminder','tournament_update','system','mention')),
  title TEXT NOT NULL,
  body TEXT,
  link_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  ref_table TEXT,
  ref_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION set_notification_read_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.is_read = TRUE AND OLD.is_read = FALSE THEN
    NEW.read_at = NOW();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER notifications_read_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION set_notification_read_at();

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_own" ON notifications FOR ALL TO authenticated
  USING (user_id = auth.uid());

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "push_subs_own" ON push_subscriptions FOR ALL TO authenticated
  USING (user_id = auth.uid());
