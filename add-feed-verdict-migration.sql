-- Carry the Dumpster flag and the house through the feed.
--
-- get_feed already returns a post's media rating so the card can show a
-- verdict, but a Dumpster is a flag rather than a rating (see
-- src/features/verdict/verdictModel.ts). Without it the feed cannot tell
-- "refused to rate" apart from "not rated yet", and a dumpstered post shows
-- no verdict at all.
--
-- The author's house rides along for the same reason: the avatar ring needs
-- it, and fetching it per post would be one request per card.
--
-- Depends on add-dumpster-migration.sql and add-house-migration.sql.
-- Run this in the Supabase SQL editor. Safe to run more than once.

-- Postgres will not change a function's RETURNS TABLE shape in place.
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
  house text,
  media_title text,
  media_type text,
  media_rating numeric,
  media_dumpstered boolean,
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
    pr.house,
    me.title        AS media_title,
    me.media_type::text AS media_type,
    me.rating       AS media_rating,
    coalesce(me.dumpstered, false) AS media_dumpstered,
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
