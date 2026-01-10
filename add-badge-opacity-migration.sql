-- ================================================================
-- ADD OPACITY COLUMN TO BADGES TABLE
-- ================================================================
-- This migration adds opacity control to the badge system
-- Run this if you already have the badges table created
-- ================================================================

-- Add opacity column with default 80%
ALTER TABLE badges 
ADD COLUMN IF NOT EXISTS opacity INTEGER DEFAULT 80;

-- Update existing badges to have 80% opacity
UPDATE badges 
SET opacity = 80 
WHERE opacity IS NULL;

-- ================================================================
-- DONE! Badge opacity is now configurable in admin panel
-- ================================================================
