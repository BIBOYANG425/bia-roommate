-- Profile Likes: tracks which users liked which roommate profiles
-- Apply via Supabase dashboard SQL editor or supabase db push

-- ─── Table: profile_likes ───
CREATE TABLE IF NOT EXISTS profile_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES roommate_profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, profile_id)
);

-- ─── Indexes ───
-- profile_id index for fast like-count queries
CREATE INDEX idx_profile_likes_profile_id ON profile_likes (profile_id);

-- ─── RLS Policies ───
ALTER TABLE profile_likes ENABLE ROW LEVEL SECURITY;

-- Anyone can read likes (public counts)
CREATE POLICY "read_likes" ON profile_likes FOR SELECT
  USING (true);

-- Authenticated users can like profiles (insert own rows)
CREATE POLICY "insert_own_like" ON profile_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can remove their own likes
CREATE POLICY "delete_own_like" ON profile_likes FOR DELETE
  USING (auth.uid() = user_id);
