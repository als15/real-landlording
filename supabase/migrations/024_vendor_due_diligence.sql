-- Vendor Due Diligence Analysis
-- Stores OpenAI-powered vendor research reports

CREATE TABLE vendor_due_diligence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  results JSONB,
  raw_response TEXT,
  model_used VARCHAR(50),
  tokens_used INTEGER,
  search_queries_used INTEGER,
  error_message TEXT,
  triggered_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fetching reports by vendor
CREATE INDEX idx_vendor_due_diligence_vendor_id ON vendor_due_diligence(vendor_id);

-- Reuse the update_updated_at() trigger from migration 001
CREATE TRIGGER update_vendor_due_diligence_updated_at
  BEFORE UPDATE ON vendor_due_diligence
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- RLS: admin-only access
ALTER TABLE vendor_due_diligence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to vendor_due_diligence"
  ON vendor_due_diligence
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = auth.uid()
    )
  );
