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

-- Backfill from current state (safe to re-run; recomputes from source of truth)
UPDATE public.posts p
SET likes_count = COALESCE((SELECT COUNT(*) FROM public.post_likes l WHERE l.post_id = p.id), 0),
    comments_count = COALESCE((SELECT COUNT(*) FROM public.post_comments c WHERE c.post_id = p.id), 0);

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
-- counters instead of COUNT(*) subqueries, and a single LATERAL join
-- per related entity instead of N+1 round trips.
CREATE OR REPLACE FUNCTION public.get_feed(p_user_id uuid, p_limit integer, p_offset integer)
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
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE
      public.posts, public.post_likes, public.post_comments, public.follows, public.notifications;
  EXCEPTION WHEN duplicate_object THEN
    NULL; -- already added
  END;
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
