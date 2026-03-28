-- Individual episode ratings for TV shows.
-- Run this once in the Supabase SQL editor.

CREATE TABLE IF NOT EXISTS episode_ratings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  show_title      TEXT NOT NULL,
  show_cover_url  TEXT,
  show_year       TEXT,
  season_number   INTEGER NOT NULL,
  episode_number  INTEGER NOT NULL,
  episode_title   TEXT,
  rating          NUMERIC(3,1),
  notes           TEXT,
  watched_at      TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT episode_ratings_unique UNIQUE (user_id, show_title, season_number, episode_number)
);

ALTER TABLE episode_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own episode ratings"
  ON episode_ratings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for fast lookups by user + show
CREATE INDEX IF NOT EXISTS episode_ratings_user_show_idx
  ON episode_ratings (user_id, show_title);
