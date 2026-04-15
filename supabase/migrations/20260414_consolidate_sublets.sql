-- Consolidate sublet_listings (web UI) and sublets (George agent) into a single
-- public.sublets table.
--
-- Context: The existing `sublet_listings` table (migration 20260104) powers the
-- web UI at /sublet and has live data. The George agent schema (001_george_schema)
-- defined a separate, empty `sublets` table for the same concept. To avoid
-- duplication, we merge: drop the empty placeholder, rename the rich table, and
-- add the George-specific columns (student_id, status) to the merged result.
--
-- Data, indexes, FK constraints, and RLS policies on sublet_listings all carry
-- over automatically through ALTER TABLE RENAME.

-- 1. Drop George's empty sublets table (created in george/supabase/migrations/001_george_schema.sql)
DROP TABLE IF EXISTS public.sublets;

-- 2. Rename sublet_listings → sublets
ALTER TABLE public.sublet_listings RENAME TO sublets;

-- 3. Rename indexes to match new table name
ALTER INDEX idx_sublet_listings_school     RENAME TO idx_sublets_school;
ALTER INDEX idx_sublet_listings_user_id    RENAME TO idx_sublets_user_id;
ALTER INDEX idx_sublet_listings_created_at RENAME TO idx_sublets_created_at;

-- 4. Allow user_id to be NULL so the George agent can insert listings
--    via service role with only a student_id (no Supabase auth user).
ALTER TABLE public.sublets ALTER COLUMN user_id DROP NOT NULL;

-- 5. Add George-specific columns
ALTER TABLE public.sublets
  ADD COLUMN student_id uuid REFERENCES public.students(id) ON DELETE SET NULL,
  ADD COLUMN status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'taken', 'expired'));

-- 6. Indexes for George queries (partial indexes to keep them small)
CREATE INDEX idx_sublets_student_id ON public.sublets (student_id)
  WHERE student_id IS NOT NULL;
CREATE INDEX idx_sublets_status ON public.sublets (status)
  WHERE status = 'active';
