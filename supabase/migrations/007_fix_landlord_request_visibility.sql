-- Fix RLS policy for landlords viewing their own requests
-- The current policy only checks landlord_id, but requests submitted before signup
-- may have landlord_id = NULL or point to a landlord without auth_user_id set.
-- This allows landlords to see requests by matching their email address.

-- Drop the existing policy
DROP POLICY IF EXISTS "Landlords can view own requests" ON service_requests;

-- Create a new policy that checks both landlord_id AND email
CREATE POLICY "Landlords can view own requests" ON service_requests
  FOR SELECT USING (
    -- Match by landlord_id (linked requests)
    landlord_id IN (SELECT id FROM landlords WHERE auth_user_id = auth.uid())
    OR
    -- Match by email (for requests submitted before signup)
    landlord_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );
