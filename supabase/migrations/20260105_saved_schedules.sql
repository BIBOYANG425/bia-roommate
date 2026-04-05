-- Saved Schedules: user-saved course schedules with preferences
-- Apply via Supabase dashboard SQL editor or supabase db push

-- ─── Table: saved_schedules ───
CREATE TABLE IF NOT EXISTS saved_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  semester text NOT NULL,
  courses jsonb NOT NULL DEFAULT '[]',
  preferences jsonb DEFAULT '{}',
  schedule_data jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);

-- ─── Indexes ───
-- Composite index for fetching a user's schedules sorted by time
CREATE INDEX idx_saved_schedules_user_created ON saved_schedules (user_id, created_at DESC);

-- ─── RLS Policies ───
ALTER TABLE saved_schedules ENABLE ROW LEVEL SECURITY;

-- Users can only read their own schedules
CREATE POLICY "read_own_schedules" ON saved_schedules FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own schedules
CREATE POLICY "insert_own_schedule" ON saved_schedules FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own schedules
CREATE POLICY "update_own_schedule" ON saved_schedules FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own schedules
CREATE POLICY "delete_own_schedule" ON saved_schedules FOR DELETE
  USING (auth.uid() = user_id);
