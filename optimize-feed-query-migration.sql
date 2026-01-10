-- ================================================================
-- OPTIMIZE FEED QUERY PERFORMANCE
-- ================================================================
-- This migration adds composite indexes to speed up the feed query
-- which was causing statement timeouts
-- ================================================================

-- Composite index for the feed query (user_id + created_at together)
-- This is crucial for "WHERE user_id = ANY(...) ORDER BY created_at DESC"
CREATE INDEX IF NOT EXISTS idx_posts_user_created_at_desc 
ON public.posts(user_id, created_at DESC);

-- Add index on profiles for the lateral join
CREATE INDEX IF NOT EXISTS idx_profiles_id 
ON public.profiles(id);

-- Add index on media_entries for the lateral join  
CREATE INDEX IF NOT EXISTS idx_media_entries_id 
ON public.media_entries(id);

-- Covering index for posts with commonly selected columns
-- This allows index-only scans
CREATE INDEX IF NOT EXISTS idx_posts_feed_covering
ON public.posts(user_id, created_at DESC, id, content, image_url, media_entry_id);

-- Analyze tables to update statistics
ANALYZE public.posts;
ANALYZE public.profiles;
ANALYZE public.media_entries;
ANALYZE public.follows;

-- ================================================================
-- INCREASE STATEMENT TIMEOUT (Optional - if indexes aren't enough)
-- ================================================================
-- This increases the timeout from 8s to 20s for PostgREST
-- Run this as a superuser or request Supabase support to increase it
-- ALTER ROLE authenticator SET statement_timeout = '20s';

-- ================================================================
-- DONE! Feed queries should now be much faster
-- ================================================================
