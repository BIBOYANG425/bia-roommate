-- Secure access layer for apartment_votes.
--
-- Votes are anonymous (a localStorage fingerprint, no auth user), so RLS has no
-- identity to scope writes by. Instead we lock the table and route every access
-- through SECURITY DEFINER routines that bake the rules in:
--   * read   -> get_apartment_vote_tallies()  (aggregates only; never returns
--               voter_fingerprint, so fingerprints can't be enumerated)
--   * cast   -> set_apartment_vote(apt, vote, fp)
--   * remove -> clear_apartment_vote(apt, fp)  — only deletes the row whose
--               fingerprint the caller supplies. This replaces the original
--               "owner can delete own vote" policy that used `using (true)`
--               and let anyone delete anyone's vote.

-- 1. Drop every existing policy on the table (names have drifted between the
--    migration file and what was applied live, so drop them all by enumeration).
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'apartment_votes'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.apartment_votes', pol.policyname);
  END LOOP;
END $$;

-- 2. No direct table access for the API roles. RLS stays enabled with no
--    policies, and the default grants are revoked, so the only way in is the
--    definer routines below (which run as the table owner).
REVOKE ALL ON public.apartment_votes FROM anon, authenticated;

-- 3. Cast or change a vote (idempotent per fingerprint).
CREATE OR REPLACE FUNCTION public.set_apartment_vote(
  p_apartment_id text,
  p_vote text,
  p_fingerprint text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_vote NOT IN ('up', 'down') THEN
    RAISE EXCEPTION 'invalid vote: %', p_vote;
  END IF;
  IF p_apartment_id IS NULL OR length(p_apartment_id) NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'invalid apartment_id';
  END IF;
  IF p_fingerprint IS NULL OR length(p_fingerprint) NOT BETWEEN 8 AND 100 THEN
    RAISE EXCEPTION 'invalid fingerprint';
  END IF;

  INSERT INTO public.apartment_votes (apartment_id, vote, voter_fingerprint)
  VALUES (p_apartment_id, p_vote, p_fingerprint)
  ON CONFLICT (apartment_id, voter_fingerprint)
  DO UPDATE SET vote = excluded.vote;
END;
$$;

-- 4. Remove a vote — scoped to the caller's own fingerprint.
CREATE OR REPLACE FUNCTION public.clear_apartment_vote(
  p_apartment_id text,
  p_fingerprint text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM public.apartment_votes
  WHERE apartment_id = p_apartment_id
    AND voter_fingerprint = p_fingerprint;
END;
$$;

-- 5. Aggregate read — counts only, never the fingerprints.
CREATE OR REPLACE FUNCTION public.get_apartment_vote_tallies()
RETURNS TABLE (apartment_id text, up bigint, down bigint, net bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT apartment_id,
         count(*) FILTER (WHERE vote = 'up')   AS up,
         count(*) FILTER (WHERE vote = 'down') AS down,
         count(*) FILTER (WHERE vote = 'up')
           - count(*) FILTER (WHERE vote = 'down') AS net
  FROM public.apartment_votes
  GROUP BY apartment_id;
$$;

-- 6. Expose only the routines to the API roles.
REVOKE ALL ON FUNCTION public.set_apartment_vote(text, text, text) FROM public;
REVOKE ALL ON FUNCTION public.clear_apartment_vote(text, text) FROM public;
REVOKE ALL ON FUNCTION public.get_apartment_vote_tallies() FROM public;

GRANT EXECUTE ON FUNCTION public.set_apartment_vote(text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.clear_apartment_vote(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_apartment_vote_tallies() TO anon, authenticated;
