-- Fix RLS policy for landlords to view and update matches for their requests
-- Currently only vendors and admins can access request_vendor_matches,
-- but landlords need access to submit reviews for their matched vendors.

-- Allow landlords to SELECT matches for their own requests
DROP POLICY IF EXISTS "Landlords can view own request matches" ON request_vendor_matches;
CREATE POLICY "Landlords can view own request matches" ON request_vendor_matches
  FOR SELECT USING (
    request_id IN (
      SELECT sr.id FROM service_requests sr
      LEFT JOIN landlords l ON sr.landlord_id = l.id
      WHERE
        -- Match by landlord_id (linked requests)
        l.auth_user_id = auth.uid()
        OR
        -- Match by email (for requests submitted before signup)
        sr.landlord_email = (auth.jwt() ->> 'email')
    )
  );

-- Allow landlords to UPDATE matches (for submitting reviews) for their own requests
DROP POLICY IF EXISTS "Landlords can update own request matches" ON request_vendor_matches;
CREATE POLICY "Landlords can update own request matches" ON request_vendor_matches
  FOR UPDATE USING (
    request_id IN (
      SELECT sr.id FROM service_requests sr
      LEFT JOIN landlords l ON sr.landlord_id = l.id
      WHERE
        l.auth_user_id = auth.uid()
        OR
        sr.landlord_email = (auth.jwt() ->> 'email')
    )
  )
  WITH CHECK (
    request_id IN (
      SELECT sr.id FROM service_requests sr
      LEFT JOIN landlords l ON sr.landlord_id = l.id
      WHERE
        l.auth_user_id = auth.uid()
        OR
        sr.landlord_email = (auth.jwt() ->> 'email')
    )
  );

-- Grant UPDATE permission on request_vendor_matches to authenticated users
-- (SELECT is already granted via existing vendor policies)
GRANT UPDATE ON request_vendor_matches TO authenticated;
