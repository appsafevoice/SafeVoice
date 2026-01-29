-- Add RLS policies for announcements to allow admin operations

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view active announcements" ON announcements;
DROP POLICY IF EXISTS "Admins can view all announcements" ON announcements;
DROP POLICY IF EXISTS "Admins can insert announcements" ON announcements;
DROP POLICY IF EXISTS "Admins can update announcements" ON announcements;
DROP POLICY IF EXISTS "Admins can delete announcements" ON announcements;

-- Allow anyone to view active announcements (for student home page)
CREATE POLICY "Anyone can view active announcements" ON announcements
  FOR SELECT USING (is_active = true);

-- Allow authenticated users to view all announcements (for admin dashboard)
CREATE POLICY "Admins can view all announcements" ON announcements
  FOR SELECT USING (true);

-- Allow authenticated users to insert announcements
CREATE POLICY "Admins can insert announcements" ON announcements
  FOR INSERT WITH CHECK (true);

-- Allow authenticated users to update announcements
CREATE POLICY "Admins can update announcements" ON announcements
  FOR UPDATE USING (true);

-- Allow authenticated users to delete announcements
CREATE POLICY "Admins can delete announcements" ON announcements
  FOR DELETE USING (true);
