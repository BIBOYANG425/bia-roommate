-- Apartment comments: student-submitted comments on curated LA apartments
-- Each row is one comment. Reddit seed comments are stored in static data, not here.

CREATE TABLE IF NOT EXISTS public.apartment_comments (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  apartment_id text        NOT NULL,
  author_name  text        NOT NULL DEFAULT 'Anonymous',
  content      text        NOT NULL,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE public.apartment_comments ENABLE ROW LEVEL SECURITY;

-- Anyone can read comments
CREATE POLICY "apartment_comments_read"
  ON public.apartment_comments FOR SELECT
  USING (true);

-- Anyone can insert (basic length guards)
CREATE POLICY "apartment_comments_insert"
  ON public.apartment_comments FOR INSERT
  WITH CHECK (
    length(content) BETWEEN 1 AND 500 AND
    length(author_name) BETWEEN 1 AND 50
  );
