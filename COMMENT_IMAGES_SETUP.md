# Comment Images Feature Setup

## Database Migration Required

To enable image uploads in comments, you need to run the SQL migration.

### Steps:

1. **Open your Supabase project dashboard**
2. **Go to SQL Editor**
3. **Run the migration file**: `add-comment-images-migration.sql`

The migration adds:
- `image_url` column to `post_comments` table
- Index for better performance when querying comments with images

### What's New:

✅ Users can now upload images or GIFs to comments
✅ Users can paste image URLs directly
✅ Images display inline with comments
✅ Works for both top-level comments and nested replies
✅ Image preview before posting

### Usage:

- Click the "Image" button to upload from your device
- Or paste an image/GIF URL in the input field
- Images will display in the comment after posting
