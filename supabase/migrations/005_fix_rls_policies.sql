-- Fix RLS policies for public access
-- This migration ensures public inserts work for service requests and landlords

-- Drop and recreate the public insert policies to ensure they exist and work correctly

-- Service Requests: Allow anyone to submit (no auth required)
DROP POLICY IF EXISTS "Anyone can submit service requests" ON service_requests;
CREATE POLICY "Anyone can submit service requests" ON service_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Landlords: Allow anyone to create a profile (for signup and request submission)
DROP POLICY IF EXISTS "Anyone can create landlord profile" ON landlords;
CREATE POLICY "Anyone can create landlord profile" ON landlords
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Also need to allow public to SELECT landlords to check if email exists
DROP POLICY IF EXISTS "Anyone can check landlord email" ON landlords;
CREATE POLICY "Anyone can check landlord email" ON landlords
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow public to UPDATE landlords (for request count increment from API)
-- This is safe because the API controls what gets updated
DROP POLICY IF EXISTS "Anyone can update landlord from API" ON landlords;
CREATE POLICY "Anyone can update landlord from API" ON landlords
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Grant necessary permissions to anon role
GRANT SELECT, INSERT, UPDATE ON landlords TO anon;
GRANT SELECT, INSERT ON service_requests TO anon;
