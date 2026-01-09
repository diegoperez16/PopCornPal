-- Add 'comic' to media_type enum
-- Run this in your Supabase SQL Editor

ALTER TABLE public.media_entries 
DROP CONSTRAINT IF EXISTS media_entries_media_type_check;

ALTER TABLE public.media_entries
ADD CONSTRAINT media_entries_media_type_check 
CHECK (media_type IN ('movie', 'show', 'game', 'book', 'comic'));
