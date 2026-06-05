-- Migration: Update rating column to support 0.1–10.0 decimal scale
-- The app uses a DecimalRating component with 0–10 range at 0.1 steps

-- Drop the view first — it depends on the rating column type
DROP VIEW IF EXISTS public.user_stats;

-- Drop old integer constraint (rating >= 1 AND rating <= 5)
ALTER TABLE media_entries
DROP CONSTRAINT IF EXISTS media_entries_rating_check;

-- Change column type to NUMERIC(3,1) to support decimals up to 10.0
ALTER TABLE media_entries
ALTER COLUMN rating TYPE NUMERIC(3,1);

-- Add new constraint matching the component's 0.1–10.0 range
ALTER TABLE media_entries
ADD CONSTRAINT media_entries_rating_check
CHECK (rating IS NULL OR (rating >= 0.1 AND rating <= 10.0));

-- Recreate user_stats view (depends on rating column type)
DROP VIEW IF EXISTS public.user_stats;
CREATE OR REPLACE VIEW public.user_stats AS
SELECT
    p.id,
    p.username,
    COUNT(CASE WHEN m.media_type = 'movie' THEN 1 END) as movies_count,
    COUNT(CASE WHEN m.media_type = 'show' THEN 1 END) as shows_count,
    COUNT(CASE WHEN m.media_type = 'game' THEN 1 END) as games_count,
    COUNT(CASE WHEN m.media_type = 'book' THEN 1 END) as books_count,
    COUNT(*) as total_entries,
    AVG(m.rating) as avg_rating,
    (SELECT COUNT(*) FROM public.follows WHERE follower_id = p.id) as following_count,
    (SELECT COUNT(*) FROM public.follows WHERE following_id = p.id) as followers_count
FROM public.profiles p
LEFT JOIN public.media_entries m ON p.id = m.user_id
GROUP BY p.id, p.username;
