-- Add image_url column to post_comments table to support image/gif uploads in comments
ALTER TABLE public.post_comments 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add index for faster queries when filtering by images
CREATE INDEX IF NOT EXISTS idx_post_comments_image_url ON public.post_comments(image_url) 
WHERE image_url IS NOT NULL;
