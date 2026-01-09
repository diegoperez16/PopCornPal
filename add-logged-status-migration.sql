-- Migration: Add 'logged' status to media_entries
-- This allows users to track media they've consumed without specific dates

-- Update the check constraint to include 'logged' status
ALTER TABLE media_entries 
DROP CONSTRAINT IF EXISTS media_entries_status_check;

ALTER TABLE media_entries 
ADD CONSTRAINT media_entries_status_check 
CHECK (status IN ('completed', 'in-progress', 'planned', 'logged'));

-- Note: Existing entries are not affected, this just allows the new status going forward
