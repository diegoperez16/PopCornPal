-- ================================================================
-- FEED ARCHITECTURE MIGRATION
-- ================================================================
-- Consolidates and version-controls the server-side pieces the feed
-- depends on, which had drifted into dashboard-only state:
--   1. Trigger-maintained likes_count / comments_count columns on posts
--      (avoids COUNT(*) subqueries on every feed page load)
--   2. get_feed() RPC — single round trip, server-shaped feed read
--   3. Indexes that make get_feed()'s plan fast at scale
--   4. Realtime publication + REPLICA IDENTITY FULL so DELETE payloads
--      carry enough data for cheap client-side cache updates
--
-- Idempotent — safe to run multiple times and safe to run even if some
-- pieces already exist from prior ad-hoc dashboard changes.
-- ================================================================

-- ─── 1. Counter columns on posts ────────────────────────────────────
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS likes_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comments_count integer NOT NULL DEFAULT 0;

-- Backfill from source of truth, but only touch rows whose counters are
-- actually wrong. The triggers below already keep these in sync in prod, so
-- on a re-run this updates zero rows and takes no write lock.
UPDATE public.posts p
SET likes_count = c.real_likes,
    comments_count = c.real_comments
FROM (
  SELECT p2.id,
         COALESCE((SELECT COUNT(*) FROM public.post_likes l WHERE l.post_id = p2.id), 0)    AS real_likes,
         COALESCE((SELECT COUNT(*) FROM public.post_comments k WHERE k.post_id = p2.id), 0) AS real_comments
  FROM public.posts p2
) c
WHERE c.id = p.id
  AND (p.likes_count IS DISTINCT FROM c.real_likes
       OR p.comments_count IS DISTINCT FROM c.real_comments);

-- ─── 2. Trigger functions to keep counters in sync ──────────────────
CREATE OR REPLACE FUNCTION public.bump_post_likes_count()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.bump_post_comments_count()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_post_likes_count_ins ON public.post_likes;
DROP TRIGGER IF EXISTS trg_post_likes_count_del ON public.post_likes;
CREATE TRIGGER trg_post_likes_count_ins AFTER INSERT ON public.post_likes
  FOR EACH ROW EXECUTE FUNCTION public.bump_post_likes_count();
CREATE TRIGGER trg_post_likes_count_del AFTER DELETE ON public.post_likes
  FOR EACH ROW EXECUTE FUNCTION public.bump_post_likes_count();

DROP TRIGGER IF EXISTS trg_post_comments_count_ins ON public.post_comments;
DROP TRIGGER IF EXISTS trg_post_comments_count_del ON public.post_comments;
CREATE TRIGGER trg_post_comments_count_ins AFTER INSERT ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION public.bump_post_comments_count();
CREATE TRIGGER trg_post_comments_count_del AFTER DELETE ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION public.bump_post_comments_count();

-- ─── 3. Indexes for the feed query plan ─────────────────────────────
CREATE INDEX IF NOT EXISTS idx_posts_user_created_at_desc
  ON public.posts(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_posts_feed_covering
  ON public.posts(user_id, created_at DESC)
  INCLUDE (id, content, image_url, media_entry_id, likes_count, comments_count, updated_at);

CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_post_user ON public.post_likes(post_id, user_id);

-- ─── 4. get_feed RPC — single round trip, server-shaped read ────────
-- Returns exactly the columns the client maps 1:1 (see fetchFeedPage in
-- src/hooks/queries/useFeedQueries.ts). Uses the trigger-maintained
-- counters instead of COUNT(*) subqueries, and a single join per related
-- entity instead of N+1 round trips.
--
-- IMPORTANT: the previously-deployed get_feed was broken — its is_liked
-- check referenced post_likes.id, but post_likes has no id column (its PK is
-- (post_id, user_id)). It therefore threw 42703 on every call, forcing the
-- client onto its slow 3-round-trip fallback for every feed load. We DROP
-- first because CREATE OR REPLACE cannot change an existing function's
-- return type if the old signature's RETURNS TABLE shape differs.
DROP FUNCTION IF EXISTS public.get_feed(uuid, integer, integer);

CREATE FUNCTION public.get_feed(p_user_id uuid, p_limit integer, p_offset integer)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  content text,
  media_entry_id uuid,
  image_url text,
  created_at timestamptz,
  updated_at timestamptz,
  username text,
  avatar_url text,
  avatar_crop jsonb,
  media_title text,
  media_type text,
  media_rating numeric,
  media_cover_url text,
  likes_count bigint,
  comments_count bigint,
  is_liked boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH followed AS (
    SELECT following_id AS id FROM public.follows WHERE follower_id = p_user_id
    UNION
    SELECT p_user_id
  )
  SELECT
    p.id,
    p.user_id,
    p.content,
    p.media_entry_id,
    p.image_url,
    p.created_at,
    p.updated_at,
    pr.username,
    pr.avatar_url,
    pr.avatar_crop,
    me.title        AS media_title,
    me.media_type::text AS media_type,
    me.rating       AS media_rating,
    me.cover_image_url AS media_cover_url,
    p.likes_count::bigint    AS likes_count,
    p.comments_count::bigint AS comments_count,
    EXISTS (
      SELECT 1 FROM public.post_likes pl
      WHERE pl.post_id = p.id AND pl.user_id = p_user_id
    ) AS is_liked
  FROM public.posts p
  JOIN followed f ON f.id = p.user_id
  JOIN public.profiles pr ON pr.id = p.user_id
  LEFT JOIN public.media_entries me ON me.id = p.media_entry_id
  ORDER BY p.created_at DESC
  LIMIT p_limit OFFSET p_offset;
$$;

GRANT EXECUTE ON FUNCTION public.get_feed(uuid, integer, integer) TO authenticated;

-- ─── 5. Realtime: publication + REPLICA IDENTITY FULL ───────────────
-- Consolidates fix-realtime-migration.sql / replica-identity-migration.sql.
-- FULL replica identity means DELETE payloads carry the complete old row
-- (post_id, user_id, etc.), so the client can apply targeted cache updates
-- instead of falling back to a full feed invalidation.
-- Add each table independently: if they were batched into one ADD TABLE and
-- any single table were already a member, the whole statement would raise
-- duplicate_object and the genuinely-missing tables would silently never be
-- added. Per-table loop makes each membership idempotent on its own.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'posts', 'post_likes', 'post_comments', 'follows', 'notifications'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;

ALTER TABLE public.posts          REPLICA IDENTITY FULL;
ALTER TABLE public.post_likes     REPLICA IDENTITY FULL;
ALTER TABLE public.post_comments  REPLICA IDENTITY FULL;
ALTER TABLE public.follows        REPLICA IDENTITY FULL;
ALTER TABLE public.notifications  REPLICA IDENTITY FULL;

ANALYZE public.posts;
ANALYZE public.post_likes;
ANALYZE public.post_comments;
ANALYZE public.follows;

-- ================================================================
-- DONE — get_feed() now does one round trip with trigger-maintained
-- counters, indexes match its access pattern, and realtime DELETE
-- payloads carry full rows for cheap client-side updates.
-- ================================================================

-- ─── Verification (run these by hand after applying) ────────────────
-- 1. get_feed returns rows without error (replace the uuid with a real
--    user id; it should return that user's feed, not raise 42703):
--      SELECT id, username, likes_count, comments_count, is_liked
--      FROM public.get_feed('<your-user-id>'::uuid, 5, 0);
--
-- 2. All five tables are in the realtime publication (expect 5 rows):
--      SELECT tablename FROM pg_publication_tables
--      WHERE pubname = 'supabase_realtime' AND schemaname = 'public'
--        AND tablename IN
--          ('posts','post_likes','post_comments','follows','notifications');
--
-- 3. Those tables have REPLICA IDENTITY FULL (relreplident should be 'f'):
--      SELECT relname, relreplident FROM pg_class
--      WHERE relname IN
--        ('posts','post_likes','post_comments','follows','notifications');
--
-- 4. Counter triggers are installed (expect 4 rows):
--      SELECT tgname FROM pg_trigger
--      WHERE tgname LIKE 'trg_post_%_count_%';
