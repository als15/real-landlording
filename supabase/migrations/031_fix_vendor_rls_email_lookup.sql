-- Fix: Allow authenticated users to find their vendor record by email
-- This is needed because the middleware uses the anon key (RLS-protected)
-- and the existing policy only matches on auth_user_id.
-- When auth_user_id is NULL (first login, or linking failed), the vendor
-- row is invisible and the user gets "not a vendor" error despite being active.
--
-- Uses case-insensitive email comparison because Supabase Auth normalizes
-- emails to lowercase but vendor records may store original casing.

CREATE POLICY "Authenticated users can find vendor by email" ON vendors
  FOR SELECT
  TO authenticated
  USING (
    lower(email) = lower(auth.jwt() ->> 'email')
  );
