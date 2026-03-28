-- Enable REPLICA IDENTITY FULL on post_comments so that DELETE events
-- received via Supabase Realtime include the full old row (including post_id).
--
-- Without this, Supabase only sends the PK (id) on DELETE, so the frontend
-- can't find which post to decrement the comment count on and falls back to
-- a full feed invalidation (expensive).
--
-- Run this once in the Supabase SQL editor or via migrations.

ALTER TABLE post_comments REPLICA IDENTITY FULL;
