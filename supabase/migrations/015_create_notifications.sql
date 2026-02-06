-- Create notifications table for in-app notification system
-- Phase 1: Admin notifications

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Recipient targeting
  user_type TEXT NOT NULL CHECK (user_type IN ('admin', 'vendor', 'landlord')),
  user_id UUID,                    -- vendor.id or landlord.id (null for broadcast to all admins)

  -- Content
  type TEXT NOT NULL,              -- e.g., 'new_request', 'vendor_accepted', 'emergency_request'
  title TEXT NOT NULL,
  message TEXT NOT NULL,

  -- Related entities (for deep linking and context)
  request_id UUID REFERENCES service_requests(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
  match_id UUID REFERENCES request_vendor_matches(id) ON DELETE CASCADE,

  -- State
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  dismissed BOOLEAN DEFAULT FALSE,
  action_url TEXT,                 -- Deep link path e.g., '/requests?view=uuid'
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),

  -- Metadata
  metadata JSONB DEFAULT '{}',     -- Additional context data
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ           -- Optional: auto-dismiss old notifications
);

-- Indexes for efficient queries
CREATE INDEX idx_notifications_admin_unread
  ON notifications(user_type, read, created_at DESC)
  WHERE user_type = 'admin';

CREATE INDEX idx_notifications_vendor
  ON notifications(user_type, user_id, read, created_at DESC)
  WHERE user_type = 'vendor';

CREATE INDEX idx_notifications_landlord
  ON notifications(user_type, user_id, read, created_at DESC)
  WHERE user_type = 'landlord';

CREATE INDEX idx_notifications_request
  ON notifications(request_id)
  WHERE request_id IS NOT NULL;

CREATE INDEX idx_notifications_vendor_ref
  ON notifications(vendor_id)
  WHERE vendor_id IS NOT NULL;

-- RLS Policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Admins can see all admin notifications
CREATE POLICY "Admins can view admin notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (
    user_type = 'admin'
    AND EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = auth.uid()
    )
  );

-- Admins can update (mark read) admin notifications
CREATE POLICY "Admins can update admin notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (
    user_type = 'admin'
    AND EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = auth.uid()
    )
  );

-- Vendors can see their own notifications
CREATE POLICY "Vendors can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (
    user_type = 'vendor'
    AND user_id = (
      SELECT id FROM vendors
      WHERE vendors.auth_user_id = auth.uid()
    )
  );

-- Vendors can update their own notifications
CREATE POLICY "Vendors can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (
    user_type = 'vendor'
    AND user_id = (
      SELECT id FROM vendors
      WHERE vendors.auth_user_id = auth.uid()
    )
  );

-- Landlords can see their own notifications
CREATE POLICY "Landlords can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (
    user_type = 'landlord'
    AND user_id = (
      SELECT id FROM landlords
      WHERE landlords.auth_user_id = auth.uid()
    )
  );

-- Landlords can update their own notifications
CREATE POLICY "Landlords can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (
    user_type = 'landlord'
    AND user_id = (
      SELECT id FROM landlords
      WHERE landlords.auth_user_id = auth.uid()
    )
  );

-- Service role can do everything (for API routes)
CREATE POLICY "Service role full access"
  ON notifications FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add comment for documentation
COMMENT ON TABLE notifications IS 'In-app notifications for admins, vendors, and landlords';
COMMENT ON COLUMN notifications.type IS 'Notification type: new_request, emergency_request, stale_request, new_application, vendor_accepted, vendor_declined, new_review, negative_review, etc.';
COMMENT ON COLUMN notifications.priority IS 'Display priority: low (green), medium (yellow), high (red)';
