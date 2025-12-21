-- Enable RLS on storage.objects (usually enabled by default, but good to be safe)
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 1. Ensure the bucket 'Listening Audio' exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('Listening Audio', 'Listening Audio', true)
ON CONFLICT (id) DO UPDATE
SET public = true;

-- 2. Drop existing policies to avoid conflicts (optional, but cleaner for a fix script)
DROP POLICY IF EXISTS "Public Access Listening Audio" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload Listening Audio" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update Listening Audio" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete Listening Audio" ON storage.objects;

-- 3. Create Policies

-- Allow public read access (Anyone can listen)
CREATE POLICY "Public Access Listening Audio"
ON storage.objects FOR SELECT
USING ( bucket_id = 'Listening Audio' );

-- Allow authenticated users to upload (INSERT)
-- RESTRICTION: bucket_id must match.
CREATE POLICY "Authenticated Upload Listening Audio"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'Listening Audio' AND auth.role() = 'authenticated' );

-- Allow authenticated users to update (UPDATE)
CREATE POLICY "Authenticated Update Listening Audio"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'Listening Audio' AND auth.role() = 'authenticated' );

-- Allow authenticated users to delete (DELETE)
CREATE POLICY "Authenticated Delete Listening Audio"
ON storage.objects FOR DELETE
USING ( bucket_id = 'Listening Audio' AND auth.role() = 'authenticated' );
