-- Add profile background fields to profiles table
ALTER TABLE profiles
ADD COLUMN bg_url TEXT,
ADD COLUMN bg_opacity INTEGER DEFAULT 80;

-- To rollback:
-- ALTER TABLE profiles DROP COLUMN bg_url;
-- ALTER TABLE profiles DROP COLUMN bg_opacity;
