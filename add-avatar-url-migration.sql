-- Add avatar_url column to profiles table (if it doesn't exist)
-- Run this in your Supabase SQL Editor

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Optional: Add a comment to describe the column
COMMENT ON COLUMN public.profiles.avatar_url IS 'URL or base64 data for user profile picture/avatar (supports images and GIFs)';
