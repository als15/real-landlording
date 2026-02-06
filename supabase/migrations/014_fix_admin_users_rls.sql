-- Fix admin_users RLS to allow users to check their own admin status
-- This resolves the circular dependency where you need to be an admin to check if you're an admin

-- Add policy that allows any authenticated user to check if they are an admin
-- This is safe because they can only see their OWN record (via auth.uid() match)
CREATE POLICY "Users can check own admin status"
ON admin_users FOR SELECT
USING (auth_user_id = auth.uid());
