-- Replace the single `contact` text field with a structured list of
-- platform+value pairs (WeChat / Instagram / Xiaohongshu / Weibo / Email /
-- Phone / Other). Keeps `contact` column for backwards-compat readers;
-- new writes keep both in sync from the first channel.

ALTER TABLE public.roommate_profiles
  ADD COLUMN IF NOT EXISTS contact_channels jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.roommate_profiles
SET contact_channels = jsonb_build_array(
  jsonb_build_object('platform', 'other', 'value', contact)
)
WHERE contact_channels = '[]'::jsonb
  AND contact IS NOT NULL
  AND contact <> '';
