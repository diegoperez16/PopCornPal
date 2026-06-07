-- ================================================================
-- STORAGE SETUP — buckets + RLS policies for user-uploaded images
-- ================================================================
-- The project originally had NO storage buckets, so every image upload
-- fell back to base64 inlined in database columns (posts.image_url,
-- profiles.avatar_url, profiles.bg_url) — tens of MB that shipped inside
-- feed/profile JSON on every load. The buckets below are where uploads
-- belong; the policies let authenticated users write only into their own
-- "<user-id>/..." folder, matching the path convention used by
-- src/lib/postImages.ts and src/lib/profileImages.ts.
--
-- Idempotent — safe to run multiple times. (The buckets may already exist
-- if they were created via the dashboard/API; this reconciles them.)
-- ================================================================

-- ─── 1. Buckets (public-read) ───────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('post-images', 'post-images', true),
  ('avatars',     'avatars',     true),
  ('backgrounds', 'backgrounds', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- ─── 2. RLS policies on storage.objects ─────────────────────────────
-- RLS is already enabled on storage.objects in Supabase; we just add policies.
-- A public bucket already serves reads over its public CDN URL, but we add an
-- explicit SELECT policy so authenticated SDK reads behave consistently too.

DROP POLICY IF EXISTS "media public read" ON storage.objects;
CREATE POLICY "media public read"
  ON storage.objects FOR SELECT
  USING (bucket_id IN ('post-images', 'avatars', 'backgrounds'));

-- Upload: authenticated users may insert only into their own top-level folder,
-- i.e. the object name must start with "<their-uid>/". This is what lets
-- uploadPostImage / persistProfileImage work from the client.
DROP POLICY IF EXISTS "media user insert own" ON storage.objects;
CREATE POLICY "media user insert own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id IN ('post-images', 'avatars', 'backgrounds')
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Update/replace own files (e.g. overwriting on re-upload).
DROP POLICY IF EXISTS "media user update own" ON storage.objects;
CREATE POLICY "media user update own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id IN ('post-images', 'avatars', 'backgrounds')
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Delete own files (e.g. removing an avatar/background).
DROP POLICY IF EXISTS "media user delete own" ON storage.objects;
CREATE POLICY "media user delete own"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id IN ('post-images', 'avatars', 'backgrounds')
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ================================================================
-- DONE — authenticated users can now upload into their own folder in
-- post-images / avatars / backgrounds, and everyone can read the public
-- URLs. Client uploads (uploadPostImage, persistProfileImage) work, and
-- new images are stored as URLs instead of base64.
-- ================================================================

-- Verification:
--   SELECT id, public FROM storage.buckets
--   WHERE id IN ('post-images','avatars','backgrounds');
--
--   SELECT policyname, cmd FROM pg_policies
--   WHERE schemaname = 'storage' AND tablename = 'objects'
--     AND policyname LIKE 'media %';
