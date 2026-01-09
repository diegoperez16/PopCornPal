-- Migration: Add badges field to profiles table
-- This allows users to display custom badges/labels on their profile

-- Add badges column (array of text) to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS badges TEXT[] DEFAULT '{}';

-- Optional: Add a check constraint to limit badge count
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS badges_max_count;

ALTER TABLE profiles 
ADD CONSTRAINT badges_max_count CHECK (array_length(badges, 1) IS NULL OR array_length(badges, 1) <= 5);

-- Note: Existing profiles will have an empty badges array by default
