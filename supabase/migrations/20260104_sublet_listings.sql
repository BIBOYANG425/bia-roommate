-- Sublet Listings: housing sublet posts by school
-- Apply via Supabase dashboard SQL editor or supabase db push

-- ─── Table: sublet_listings ───
CREATE TABLE IF NOT EXISTS sublet_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  apartment_name text NOT NULL,
  address text NOT NULL,
  school text NOT NULL CHECK (school IN ('USC', 'UC Berkeley', 'Stanford')),
  rent integer NOT NULL CHECK (rent > 0),
  room_type text,
  bathrooms text,
  move_in_date date,
  move_out_date date,
  gender_preference text,
  description text,
  amenities text[],
  photos text[],
  contact text NOT NULL,
  poster_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ─── Indexes ───
CREATE INDEX idx_sublet_listings_school ON sublet_listings (school);
CREATE INDEX idx_sublet_listings_user_id ON sublet_listings (user_id);
CREATE INDEX idx_sublet_listings_created_at ON sublet_listings (created_at DESC);

-- ─── RLS Policies ───
ALTER TABLE sublet_listings ENABLE ROW LEVEL SECURITY;

-- Anyone can browse listings (public)
CREATE POLICY "read_listings" ON sublet_listings FOR SELECT
  USING (true);

-- Authenticated users can create listings
CREATE POLICY "insert_own_listing" ON sublet_listings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own listings
CREATE POLICY "update_own_listing" ON sublet_listings FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own listings
CREATE POLICY "delete_own_listing" ON sublet_listings FOR DELETE
  USING (auth.uid() = user_id);
