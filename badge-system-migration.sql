-- ================================================================
-- BADGE SYSTEM WITH ADMIN-ONLY BADGES
-- ================================================================
-- This migration creates a comprehensive badge system where:
-- 1. Badges are stored in a central table with metadata
-- 2. Some badges can only be given by admins
-- 3. Badges support custom colors and GIF backgrounds
-- 4. Admin status is tracked in profiles table
-- ================================================================

-- Add admin flag to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Set enigma as admin (update this to your actual username)
UPDATE profiles 
SET is_admin = TRUE 
WHERE username = 'enigma';

-- Create badges table
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  color TEXT NOT NULL, -- Tailwind color class like 'purple-500'
  gif_url TEXT, -- Optional animated GIF background
  opacity INTEGER DEFAULT 80, -- Opacity percentage (10-100)
  admin_only BOOLEAN DEFAULT FALSE, -- Only admins can assign these
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on badges table
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;

-- Everyone can view badges
CREATE POLICY "Anyone can view badges"
  ON badges FOR SELECT
  USING (true);

-- Only admins can insert/update/delete badges
CREATE POLICY "Only admins can manage badges"
  ON badges FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = TRUE
    )
  );

-- Create user_badges junction table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  given_by UUID REFERENCES profiles(id), -- Track who gave the badge
  given_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

-- Enable RLS on user_badges
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- Anyone can view user badges
CREATE POLICY "Anyone can view user badges"
  ON user_badges FOR SELECT
  USING (true);

-- Users can add non-admin badges to themselves
CREATE POLICY "Users can add non-admin badges to themselves"
  ON user_badges FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND badge_id IN (
      SELECT id FROM badges WHERE admin_only = FALSE
    )
  );

-- Admins can add any badge to anyone
CREATE POLICY "Admins can add any badge to anyone"
  ON user_badges FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = TRUE
    )
  );

-- Users can only remove their own non-admin badges
CREATE POLICY "Users can remove their own non-admin badges"
  ON user_badges FOR DELETE
  USING (
    user_id = auth.uid()
    AND badge_id IN (
      SELECT id FROM badges WHERE admin_only = FALSE
    )
  );

-- Admins can remove any badge from anyone
CREATE POLICY "Admins can remove any badge from anyone"
  ON user_badges FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = TRUE
    )
  );

-- ================================================================
-- SEED INITIAL BADGES
-- ================================================================

-- Public badges (anyone can select)
INSERT INTO badges (name, description, color, admin_only) VALUES
  ('Alpha Tester', 'Early adopter of PopcornPal', 'blue-500', FALSE),
  ('Reader', 'Book enthusiast', 'green-500', FALSE),
  ('Star Wars Fan', 'May the Force be with you', 'yellow-500', FALSE),
  ('Anime Fan', 'Anime and manga lover', 'pink-500', FALSE),
  ('Gamer', 'Video game enthusiast', 'indigo-500', FALSE),
  ('Cinephile', 'Movie lover', 'red-500', FALSE),
  ('Binge Watcher', 'TV series addict', 'red-400', FALSE),
  ('Bookworm', 'Avid reader', 'green-600', FALSE),
  ('Marvel Fan', 'Marvel Universe enthusiast', 'red-600', FALSE),
  ('DC Fan', 'DC Comics fan', 'blue-600', FALSE)
ON CONFLICT (name) DO NOTHING;

-- Admin-only badges (only enigma can give these)
INSERT INTO badges (name, description, color, admin_only) VALUES
  ('Creator', 'Creator of PopcornPal', 'purple-500', TRUE),
  ('OG', 'Original member', 'orange-500', TRUE),
  ('TheGreatest', 'The greatest of all time', 'gold-500', TRUE),
  ('Creator''s Wife', 'Creator''s significant other', 'rose-500', TRUE),
  ('BigBruddah', 'Big brother vibes', 'cyan-500', TRUE),
  ('Furry', 'Furry community member', 'lime-500', TRUE),
  ('R6', 'Rainbow Six player', 'slate-500', TRUE)
ON CONFLICT (name) DO NOTHING;

-- ================================================================
-- MIGRATION NOTE:
-- After running this migration, existing users with badges in the
-- old profiles.badges array will need their data migrated.
-- Run the following to migrate existing badges:
-- ================================================================

-- Migrate existing badges from profiles.badges array to user_badges table
DO $$
DECLARE
  profile_record RECORD;
  badge_name TEXT;
  badge_record RECORD;
BEGIN
  FOR profile_record IN SELECT id, badges FROM profiles WHERE badges IS NOT NULL AND array_length(badges, 1) > 0
  LOOP
    FOREACH badge_name IN ARRAY profile_record.badges
    LOOP
      -- Find matching badge in badges table
      SELECT * INTO badge_record FROM badges WHERE name = badge_name;
      
      IF FOUND THEN
        -- Insert into user_badges if not exists
        INSERT INTO user_badges (user_id, badge_id, given_by)
        VALUES (profile_record.id, badge_record.id, profile_record.id)
        ON CONFLICT (user_id, badge_id) DO NOTHING;
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- Optional: Drop old badges column after confirming migration worked
-- ALTER TABLE profiles DROP COLUMN IF EXISTS badges;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge_id ON user_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_badges_admin_only ON badges(admin_only);
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin);

-- ================================================================
-- DONE! Your admin panel can now:
-- 1. View all badges
-- 2. Create new badges with GIF backgrounds
-- 3. Give admin-only badges to specific users
-- 4. Regular users can only select non-admin badges
-- ================================================================
