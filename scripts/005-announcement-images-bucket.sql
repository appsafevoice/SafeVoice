-- Create storage bucket for announcement images
INSERT INTO storage.buckets (id, name, public)
VALUES ('announcement-images', 'announcement-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to the bucket
CREATE POLICY "Authenticated users can upload announcement images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'announcement-images');

-- Allow public read access to announcement images
CREATE POLICY "Public can view announcement images" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'announcement-images');

-- Allow authenticated users to delete announcement images
CREATE POLICY "Authenticated users can delete announcement images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'announcement-images');

-- Allow authenticated users to update announcement images
CREATE POLICY "Authenticated users can update announcement images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'announcement-images');
