-- Fix Supabase Realtime: ensure all tables are published and DELETE payloads include full rows

-- 1. Add all realtime tables to the publication (idempotent)
ALTER PUBLICATION supabase_realtime ADD TABLE
  posts,
  post_likes,
  post_comments,
  follows,
  notifications;

-- 2. REPLICA IDENTITY FULL so DELETE events include the full old row.
--    Without this, payload.old only contains the PK (id), which breaks
--    handlers that need post_id, following_id, etc.
ALTER TABLE post_likes     REPLICA IDENTITY FULL;
ALTER TABLE follows        REPLICA IDENTITY FULL;
ALTER TABLE post_comments  REPLICA IDENTITY FULL;
ALTER TABLE notifications  REPLICA IDENTITY FULL;
