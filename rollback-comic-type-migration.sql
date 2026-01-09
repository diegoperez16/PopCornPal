-- Rollback: Remove 'comic' from media_type enum
-- Run this in your Supabase SQL Editor

-- First, delete any existing comic entries
DELETE FROM public.media_entries WHERE media_type = 'comic';

-- Then restore the constraint to the original 4 media types
ALTER TABLE public.media_entries 
DROP CONSTRAINT IF EXISTS media_entries_media_type_check;

ALTER TABLE public.media_entries
ADD CONSTRAINT media_entries_media_type_check 
CHECK (media_type IN ('movie', 'show', 'game', 'book'));
