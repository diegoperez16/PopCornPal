-- Stop a comment or a like from marking a post "(edited)", and count each
-- comment and like once.
--
-- Two pieces of dashboard-only state had drifted from what this repo says:
--
--  1. A second pair of counter triggers, trg_post_comments_counter_insdel and
--     trg_post_likes_counter_insdel (functions post_comments_counter_trg and
--     post_likes_counter_trg), sat next to the ones feed-architecture-
--     migration.sql installs. Every comment and like bumped its counter twice,
--     so a post showed one comment more than it had.
--
--  2. set_posts_updated_at (social-schema.sql) fires on every UPDATE of posts,
--     including the counter bumps, so commenting on or liking a post stamped
--     updated_at = now() and the feed showed "(edited)" (wasEdited in
--     src/components/feed/feedTypes.ts compares updated_at to created_at).
--
-- Run this in the Supabase SQL editor. Safe to run more than once.

-- ─── 1. One counter trigger per table ────────────────────────────────
DROP TRIGGER IF EXISTS trg_post_comments_counter_insdel ON public.post_comments;
DROP TRIGGER IF EXISTS trg_post_likes_counter_insdel ON public.post_likes;
DROP FUNCTION IF EXISTS public.post_comments_counter_trg();
DROP FUNCTION IF EXISTS public.post_likes_counter_trg();

-- ─── 2. updated_at moves only when the post itself changes ───────────
DROP TRIGGER IF EXISTS set_posts_updated_at ON public.posts;
CREATE TRIGGER set_posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW
  WHEN (OLD.content IS DISTINCT FROM NEW.content
     OR OLD.image_url IS DISTINCT FROM NEW.image_url
     OR OLD.media_entry_id IS DISTINCT FROM NEW.media_entry_id)
  EXECUTE FUNCTION public.handle_updated_at();

-- ─── 3. Repair the rows the two bugs already touched ─────────────────
-- Counters: recount from the source tables (as feed-architecture-migration.sql does).
UPDATE public.posts p
SET likes_count = c.real_likes,
    comments_count = c.real_comments
FROM (
  SELECT p2.id,
         (SELECT COUNT(*) FROM public.post_likes l WHERE l.post_id = p2.id)    AS real_likes,
         (SELECT COUNT(*) FROM public.post_comments k WHERE k.post_id = p2.id) AS real_comments
  FROM public.posts p2
) c
WHERE c.id = p.id
  AND (p.likes_count IS DISTINCT FROM c.real_likes
       OR p.comments_count IS DISTINCT FROM c.real_comments);

-- updated_at: the app cannot edit a post (src/lib/userMutations.ts only inserts
-- and deletes posts), so every stamp that differs from created_at came from a
-- counter bump. Runs after step 2, so this UPDATE does not re-stamp them.
UPDATE public.posts SET updated_at = created_at WHERE updated_at <> created_at;

-- ─── Verification ────────────────────────────────────────────────────
-- Expect exactly four counter triggers and no *_counter_insdel ones:
--   SELECT tgname FROM pg_trigger WHERE tgname LIKE 'trg_post_%';
-- Expect 0 rows:
--   SELECT id FROM public.posts p
--   WHERE p.comments_count <> (SELECT count(*) FROM public.post_comments k WHERE k.post_id = p.id)
--      OR p.updated_at <> p.created_at;
