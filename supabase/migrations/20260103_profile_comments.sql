-- Profile Comments: user comments on roommate profiles
-- Apply via Supabase dashboard SQL editor or supabase db push

-- ─── Table: profile_comments ───
CREATE TABLE IF NOT EXISTS profile_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES roommate_profiles(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) > 0),
  created_at timestamptz DEFAULT now()
);

-- ─── Indexes ───
-- Composite index for fetching comments on a profile sorted by time
CREATE INDEX idx_profile_comments_profile_created ON profile_comments (profile_id, created_at DESC);

-- ─── RLS Policies ───
ALTER TABLE profile_comments ENABLE ROW LEVEL SECURITY;

-- Anyone can read comments (public)
CREATE POLICY "read_comments" ON profile_comments FOR SELECT
  USING (true);

-- Authenticated users can post comments
CREATE POLICY "insert_own_comment" ON profile_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own comments
CREATE POLICY "delete_own_comment" ON profile_comments FOR DELETE
  USING (auth.uid() = user_id);
