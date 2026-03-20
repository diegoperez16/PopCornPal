-- Add likes support for comments/replies
CREATE TABLE IF NOT EXISTS public.comment_likes (
    comment_id UUID REFERENCES public.post_comments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (comment_id, user_id)
);

-- Index for fast lookup by comment
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON public.comment_likes(comment_id);

-- Rollback:
-- DROP TABLE IF EXISTS public.comment_likes;
