-- Add license status columns to vendors table
ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS license_not_required boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS not_currently_licensed boolean DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN vendors.license_not_required IS 'Vendor indicated licensing is not required for their services';
COMMENT ON COLUMN vendors.not_currently_licensed IS 'Vendor indicated they are not currently licensed';
