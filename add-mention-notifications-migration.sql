-- Migration: Add mention notification support
-- The notifications table already has an open INSERT policy (WITH CHECK (true))
-- and type TEXT NOT NULL with no enum constraint, so 'mention' inserts work.
-- This migration is a no-op for DB schema — it documents the feature addition.

-- Verify the INSERT policy allows mention inserts
-- (run this query to confirm: SELECT * FROM pg_policies WHERE tablename = 'notifications';)

-- Optional: add an index on (user_id, read) for faster unread count queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications(user_id, read)
  WHERE read = false;
