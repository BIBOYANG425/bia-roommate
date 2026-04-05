-- Roommate Profiles: core table for roommate matching
-- Apply via Supabase dashboard SQL editor or supabase db push

-- ─── Table: roommate_profiles ───
CREATE TABLE IF NOT EXISTS roommate_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  school text NOT NULL CHECK (school IN ('USC', 'UC Berkeley', 'Stanford')),
  gender text,
  major text,
  year text,
  enrollment_term text,
  contact text NOT NULL,
  sleep_habit text,
  clean_level text,
  noise_level text,
  music_habit text,
  study_style text,
  hobbies text,
  tags text[],
  avatar_url text,
  bio text,
  visible boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ─── Indexes ───
CREATE INDEX idx_roommate_profiles_school ON roommate_profiles (school);
CREATE INDEX idx_roommate_profiles_user_id ON roommate_profiles (user_id);
CREATE INDEX idx_roommate_profiles_visible_school ON roommate_profiles (visible, school);

-- ─── RLS Policies ───
ALTER TABLE roommate_profiles ENABLE ROW LEVEL SECURITY;

-- Anyone can read visible profiles (public browse)
CREATE POLICY "read_visible_profiles" ON roommate_profiles FOR SELECT
  USING (visible = true);

-- Authenticated users can create profiles
CREATE POLICY "insert_own_profile" ON roommate_profiles FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update their own profile
CREATE POLICY "update_own_profile" ON roommate_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own profile
CREATE POLICY "delete_own_profile" ON roommate_profiles FOR DELETE
  USING (auth.uid() = user_id);
