-- Server-side aggregate of apartment_votes. Clients fetch ~15 tally rows
-- (one per apartment) instead of downloading the entire votes table and
-- counting in the browser. Read-only.
--
-- security_invoker = on so the underlying apartment_votes RLS (public SELECT)
-- governs access; the view adds no new exposure beyond what the table allows.

CREATE OR REPLACE VIEW public.apartment_vote_tallies
WITH (security_invoker = on) AS
SELECT
  apartment_id,
  COUNT(*) FILTER (WHERE vote = 'up')    AS up,
  COUNT(*) FILTER (WHERE vote = 'down')  AS down,
  COUNT(*) FILTER (WHERE vote = 'up')
    - COUNT(*) FILTER (WHERE vote = 'down') AS net
FROM public.apartment_votes
GROUP BY apartment_id;

GRANT SELECT ON public.apartment_vote_tallies TO anon, authenticated;
