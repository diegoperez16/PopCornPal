-- =============================================
-- PopcornPal Database Schema for Supabase
-- =============================================
-- Run this SQL in your Supabase SQL Editor
-- (https://app.supabase.com/project/_/sql/new)

-- =============================================
-- PROFILES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    CONSTRAINT username_length CHECK (char_length(username) >= 3 AND char_length(username) <= 30),
    CONSTRAINT username_format CHECK (username ~* '^[a-z0-9_]+$')
);

-- Create index for faster username lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Public profiles are viewable by everyone" 
    ON public.profiles FOR SELECT 
    USING (true);

CREATE POLICY "Users can insert their own profile" 
    ON public.profiles FOR INSERT 
    WITH CHECK (true);  -- Allow all authenticated users to insert

CREATE POLICY "Users can update their own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

-- =============================================
-- MEDIA ENTRIES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.media_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    media_type TEXT NOT NULL CHECK (media_type IN ('movie', 'show', 'game', 'book')),
    title TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'in-progress', 'planned')),
    completed_date DATE,
    notes TEXT,
    genre TEXT,
    year INTEGER,
    cover_image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_media_entries_user_id ON public.media_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_media_entries_media_type ON public.media_entries(media_type);
CREATE INDEX IF NOT EXISTS idx_media_entries_created_at ON public.media_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_entries_rating ON public.media_entries(rating);

-- Enable Row Level Security
ALTER TABLE public.media_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for media_entries
CREATE POLICY "Media entries are viewable by everyone" 
    ON public.media_entries FOR SELECT 
    USING (true);

CREATE POLICY "Users can insert their own media entries" 
    ON public.media_entries FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own media entries" 
    ON public.media_entries FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own media entries" 
    ON public.media_entries FOR DELETE 
    USING (auth.uid() = user_id);

-- =============================================
-- FOLLOWS TABLE (for social features)
-- =============================================
CREATE TABLE IF NOT EXISTS public.follows (
    follower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    following_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    PRIMARY KEY (follower_id, following_id),
    CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON public.follows(following_id);

-- Enable Row Level Security
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- RLS Policies for follows
CREATE POLICY "Follows are viewable by everyone" 
    ON public.follows FOR SELECT 
    USING (true);

CREATE POLICY "Users can follow others" 
    ON public.follows FOR INSERT 
    WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow others" 
    ON public.follows FOR DELETE 
    USING (auth.uid() = follower_id);

-- =============================================
-- FUNCTIONS & TRIGGERS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profiles
CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Trigger for media_entries
CREATE TRIGGER set_media_entries_updated_at
    BEFORE UPDATE ON public.media_entries
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- =============================================
-- HELPER VIEWS
-- =============================================

-- View for user statistics
CREATE OR REPLACE VIEW public.user_stats AS
SELECT 
    p.id,
    p.username,
    COUNT(CASE WHEN m.media_type = 'movie' THEN 1 END) as movies_count,
    COUNT(CASE WHEN m.media_type = 'show' THEN 1 END) as shows_count,
    COUNT(CASE WHEN m.media_type = 'game' THEN 1 END) as games_count,
    COUNT(CASE WHEN m.media_type = 'book' THEN 1 END) as books_count,
    COUNT(*) as total_entries,
    AVG(m.rating) as avg_rating,
    (SELECT COUNT(*) FROM public.follows WHERE follower_id = p.id) as following_count,
    (SELECT COUNT(*) FROM public.follows WHERE following_id = p.id) as followers_count
FROM public.profiles p
LEFT JOIN public.media_entries m ON p.id = m.user_id
GROUP BY p.id, p.username;

-- =============================================
-- SEED DATA (Optional - for testing)
-- =============================================

-- Example: Insert a test profile
-- Note: Replace 'USER_UUID' with actual auth.users UUID after signup
/*
INSERT INTO public.profiles (id, username, full_name, bio)
VALUES 
    ('USER_UUID', 'testuser', 'Test User', 'Just testing PopcornPal!');
*/

-- =============================================
-- DONE! 
-- =============================================
-- Your database is ready. Next steps:
-- 1. Copy your Supabase URL and anon key to .env file
-- 2. Create a new user via the app
-- 3. Start adding media entries!
