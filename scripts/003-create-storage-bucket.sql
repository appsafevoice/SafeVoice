-- Create storage bucket for report attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('report-attachments', 'report-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to the bucket
CREATE POLICY "Authenticated users can upload report attachments" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'report-attachments');

-- Allow public read access to attachments
CREATE POLICY "Public can view report attachments" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'report-attachments');

-- Allow users to delete their own attachments
CREATE POLICY "Users can delete own attachments" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'report-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
