-- Add licensed_areas column to vendors table
-- This replaces the simple boolean 'licensed' with a list of locations where the vendor is licensed

ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS licensed_areas TEXT[] DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN vendors.licensed_areas IS 'Array of zip codes/locations where vendor holds a license';
