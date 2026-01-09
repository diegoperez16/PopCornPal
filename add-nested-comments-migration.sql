-- Add parent_comment_id column to post_comments for nested replies
-- Run this in your Supabase SQL Editor

ALTER TABLE public.post_comments 
ADD COLUMN IF NOT EXISTS parent_comment_id UUID REFERENCES public.post_comments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_post_comments_parent_id ON public.post_comments(parent_comment_id);
