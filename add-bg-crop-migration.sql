-- Add crop metadata for profile backgrounds
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS bg_crop JSONB;

-- Rollback:
-- ALTER TABLE profiles DROP COLUMN bg_crop;
