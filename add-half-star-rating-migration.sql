-- Migration: Change rating from INTEGER to NUMERIC to support half-stars
-- This allows ratings like 3.5, 4.5, etc. (0.5 increments)

-- Step 1: Drop the user_stats view that depends on the rating column
DROP VIEW IF EXISTS public.user_stats;

-- Step 2: Update the rating column type and constraint
ALTER TABLE media_entries 
ALTER COLUMN rating TYPE NUMERIC(2,1);

-- Step 3: Update the rating constraint to allow decimals from 0.5 to 5.0
ALTER TABLE media_entries 
DROP CONSTRAINT IF EXISTS media_entries_rating_check;

ALTER TABLE media_entries 
ADD CONSTRAINT media_entries_rating_check 
CHECK (rating IS NULL OR (rating >= 0.5 AND rating <= 5.0));

-- Step 4: Recreate the user_stats view with NUMERIC rating support
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

-- Note: Existing integer ratings (1-5) will be automatically converted to 1.0-5.0
