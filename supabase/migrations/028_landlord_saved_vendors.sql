-- Landlord Saved Vendors
-- Allows landlords to save/favorite vendors for future use

CREATE TABLE IF NOT EXISTS landlord_saved_vendors (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  landlord_id uuid NOT NULL REFERENCES landlords(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  notes text,
  source_request_id uuid REFERENCES service_requests(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,

  CONSTRAINT unique_landlord_vendor UNIQUE (landlord_id, vendor_id)
);

-- Indexes
CREATE INDEX idx_saved_vendors_landlord ON landlord_saved_vendors(landlord_id);
CREATE INDEX idx_saved_vendors_vendor ON landlord_saved_vendors(vendor_id);

-- RLS
ALTER TABLE landlord_saved_vendors ENABLE ROW LEVEL SECURITY;

-- Landlords can view their own saved vendors
CREATE POLICY "landlords_select_own_saved_vendors"
  ON landlord_saved_vendors FOR SELECT
  USING (landlord_id IN (
    SELECT id FROM landlords WHERE auth_user_id = auth.uid()
  ));

-- Landlords can save vendors
CREATE POLICY "landlords_insert_own_saved_vendors"
  ON landlord_saved_vendors FOR INSERT
  WITH CHECK (landlord_id IN (
    SELECT id FROM landlords WHERE auth_user_id = auth.uid()
  ));

-- Landlords can remove their own saved vendors
CREATE POLICY "landlords_delete_own_saved_vendors"
  ON landlord_saved_vendors FOR DELETE
  USING (landlord_id IN (
    SELECT id FROM landlords WHERE auth_user_id = auth.uid()
  ));

-- Landlords can update notes on their own saved vendors
CREATE POLICY "landlords_update_own_saved_vendors"
  ON landlord_saved_vendors FOR UPDATE
  USING (landlord_id IN (
    SELECT id FROM landlords WHERE auth_user_id = auth.uid()
  ));

-- Service role has full access (for API routes using adminClient)
CREATE POLICY "service_role_full_access_saved_vendors"
  ON landlord_saved_vendors FOR ALL
  USING (auth.role() = 'service_role');
