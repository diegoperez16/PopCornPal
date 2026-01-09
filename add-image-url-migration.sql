-- Add image_url column to posts table
-- Run this in your Supabase SQL Editor

ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS image_url TEXT;
