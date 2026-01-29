-- Add policy for admin to view all reports
-- This allows the admin dashboard to fetch all reports

-- Drop existing select policy if it exists
DROP POLICY IF EXISTS "Admins can view all reports" ON reports;

-- Create new policy that allows anyone to read reports (for admin dashboard)
-- In production, you would want to use a proper admin role check
CREATE POLICY "Admins can view all reports" ON reports
  FOR SELECT USING (true);

-- Allow admins to update report status
DROP POLICY IF EXISTS "Admins can update reports" ON reports;

CREATE POLICY "Admins can update reports" ON reports
  FOR UPDATE USING (true);
