-- Add service_specialties column to vendors table
-- This stores equipment types/specialties per service category
-- Format: { "hvac": ["Gas Furnace", "Central AC"], "plumber_sewer": ["Water Heater", "Main Line"] }

ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS service_specialties JSONB DEFAULT '{}';

-- Add index for efficient querying
CREATE INDEX IF NOT EXISTS idx_vendors_service_specialties ON vendors USING GIN(service_specialties);

-- Add comment for documentation
COMMENT ON COLUMN vendors.service_specialties IS 'Equipment types/specialties per service category. Format: { service_category: [specialty1, specialty2, ...] }';
