CREATE TABLE operation_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  event_type TEXT NOT NULL DEFAULT 'regular' CHECK (event_type IN ('regular','special','closed','exceed')),
  color_override TEXT,
  recurrence_type TEXT NOT NULL DEFAULT 'none' CHECK (recurrence_type IN ('none','daily','weekly','monthly')),
  recurrence_days INTEGER[],
  recurrence_day_of_month INTEGER,
  recurrence_end_date DATE,
  parent_event_id UUID REFERENCES operation_events(id),
  image_urls TEXT[] DEFAULT '{}',
  notion_page_id TEXT,
  gcal_event_id TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE operation_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'custom' CHECK (category IN ('opening','during','closing','weekly','monthly','custom')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  recurrence_type TEXT NOT NULL DEFAULT 'none' CHECK (recurrence_type IN ('none','daily','weekly','monthly')),
  recurrence_days INTEGER[],
  recurrence_day_of_month INTEGER,
  assignee_id UUID REFERENCES profiles(id),
  due_date DATE,
  notes TEXT,
  image_urls TEXT[] DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  kanban_status TEXT NOT NULL DEFAULT 'todo' CHECK (kanban_status IN ('todo','in_progress','done','skipped')),
  notion_page_id TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE task_completions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES operation_tasks(id) ON DELETE CASCADE NOT NULL,
  completion_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'done' CHECK (status IN ('done','skipped')),
  completed_by UUID REFERENCES profiles(id),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  UNIQUE (task_id, completion_date)
);

CREATE TABLE exceed_tournaments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  tournament_date DATE NOT NULL,
  start_time TIME,
  venue_notes TEXT,
  max_participants INTEGER NOT NULL DEFAULT 20,
  current_participants INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning','registration','active','completed')),
  notes TEXT,
  image_urls TEXT[] DEFAULT '{}',
  notion_page_id TEXT,
  gcal_event_id TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE exceed_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID REFERENCES exceed_tournaments(id) ON DELETE CASCADE NOT NULL,
  phase TEXT NOT NULL CHECK (phase IN ('pre','day','post')),
  title TEXT NOT NULL,
  is_done BOOLEAN NOT NULL DEFAULT FALSE,
  assignee_id UUID REFERENCES profiles(id),
  sort_order INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  image_urls TEXT[] DEFAULT '{}',
  done_at TIMESTAMPTZ,
  done_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE exceed_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID REFERENCES exceed_tournaments(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  seat_number INTEGER,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered','checked_in','eliminated','final_table','winner')),
  notes TEXT,
  UNIQUE (tournament_id, seat_number)
);

CREATE TRIGGER operation_events_updated_at
  BEFORE UPDATE ON operation_events FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER operation_tasks_updated_at
  BEFORE UPDATE ON operation_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER exceed_tournaments_updated_at
  BEFORE UPDATE ON exceed_tournaments FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE operation_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events_select" ON operation_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "events_admin" ON operation_events FOR ALL TO authenticated
  USING (EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

ALTER TABLE operation_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tasks_select" ON operation_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "tasks_admin" ON operation_tasks FOR ALL TO authenticated
  USING (EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "completions_select" ON task_completions FOR SELECT TO authenticated USING (true);
CREATE POLICY "completions_insert" ON task_completions FOR INSERT TO authenticated
  WITH CHECK (completed_by = auth.uid());
CREATE POLICY "completions_delete" ON task_completions FOR DELETE TO authenticated
  USING (completed_by = auth.uid() OR EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

ALTER TABLE exceed_tournaments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tournaments_select" ON exceed_tournaments FOR SELECT TO authenticated USING (true);
CREATE POLICY "tournaments_admin" ON exceed_tournaments FOR ALL TO authenticated
  USING (EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

ALTER TABLE exceed_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "etasks_select" ON exceed_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "etasks_update_done" ON exceed_tasks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "etasks_admin_insert" ON exceed_tasks FOR INSERT TO authenticated
  WITH CHECK (EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "etasks_admin_delete" ON exceed_tasks FOR DELETE TO authenticated
  USING (EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

ALTER TABLE exceed_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participants_select" ON exceed_participants FOR SELECT TO authenticated USING (true);
CREATE POLICY "participants_admin" ON exceed_participants FOR ALL TO authenticated
  USING (EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
