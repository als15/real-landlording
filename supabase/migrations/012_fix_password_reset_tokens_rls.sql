-- Enable RLS on password_reset_tokens table
-- This table should only be accessed by server-side code using the admin client,
-- not through direct PostgREST API calls

-- Enable RLS
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- No permissive policies are created intentionally.
-- This table contains sensitive tokens and should ONLY be accessed via:
-- - Server-side API routes using createAdminClient() which bypasses RLS
--
-- By enabling RLS with no policies, we effectively block all direct API access
-- while still allowing admin client operations.
