-- ================================================================
-- COMMENT LIKES REALTIME
-- ================================================================
-- Enables live updates for likes on comments/replies (feature #2). The
-- feed-architecture migration already wired posts/post_likes/post_comments/
-- follows/notifications into realtime, but comment_likes was missing — so
-- likes on a comment never appeared live for other viewers.
--
-- comment_likes has a composite PK (comment_id, user_id) and no `id` column,
-- so REPLICA IDENTITY FULL is required for DELETE (unlike) events to carry
-- comment_id + user_id to the client.
--
-- Idempotent — safe to run multiple times.
-- ================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'comment_likes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.comment_likes;
  END IF;
END $$;

ALTER TABLE public.comment_likes REPLICA IDENTITY FULL;

ANALYZE public.comment_likes;

-- Verification:
--   SELECT 1 FROM pg_publication_tables
--   WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='comment_likes';
--
--   SELECT relreplident FROM pg_class WHERE relname='comment_likes'; -- expect 'f'
