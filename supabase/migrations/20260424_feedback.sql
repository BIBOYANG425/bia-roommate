-- Feedback: site-wide user feedback collected via floating button on every page.
-- Apply via Supabase dashboard SQL editor or supabase db push.

-- ─── Table: feedback ───
CREATE TABLE IF NOT EXISTS feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  category text NOT NULL CHECK (category IN ('bug', 'feature', 'general')),
  message text NOT NULL CHECK (char_length(message) BETWEEN 10 AND 2000),
  email text,
  path text,
  user_agent text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ─── Indexes ───
CREATE INDEX idx_feedback_created_at ON feedback (created_at DESC);
CREATE INDEX idx_feedback_category ON feedback (category);

-- ─── RLS Policies ───
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can submit feedback. No email/user_id required.
CREATE POLICY "insert_feedback_anyone" ON feedback FOR INSERT
  WITH CHECK (true);

-- No public SELECT / UPDATE / DELETE policies — only the service role can read
-- or modify. This keeps user feedback private from the client.
