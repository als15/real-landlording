-- Fix overly permissive RLS policies on landlords table
-- Migration 005 added SELECT/UPDATE policies with USING (true) for anon+authenticated,
-- which exposes all landlord PII to unauthenticated users.
--
-- The proper policies from 001 already exist:
--   "Landlords can view own data" (auth_user_id = auth.uid())
--   "Landlords can update own data" (auth_user_id = auth.uid())
--   "Admins have full access to landlords" (admin role check)
--   "Anyone can create landlord profile" (INSERT for public form)
--
-- API routes use createAdminClient() (service_role) which bypasses RLS,
-- so the anon SELECT/UPDATE policies are unnecessary.

-- Remove dangerous policies that expose all landlord data
DROP POLICY IF EXISTS "Anyone can check landlord email" ON landlords;
DROP POLICY IF EXISTS "Anyone can update landlord from API" ON landlords;

-- Revoke direct anon UPDATE access (INSERT is still needed for public form)
REVOKE UPDATE ON landlords FROM anon;
-- Keep: GRANT SELECT, INSERT ON landlords TO anon
-- SELECT is still granted to anon but now restricted by remaining RLS policies
-- (only the INSERT policy applies to anon since view/update require auth.uid())
