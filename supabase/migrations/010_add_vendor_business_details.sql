-- Add new vendor business detail fields for enhanced evaluation

-- Social media links
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS social_instagram TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS social_facebook TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS social_linkedin TEXT;

-- Business details
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS employee_count TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS emergency_services BOOLEAN DEFAULT false;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS job_size_range TEXT[];

-- Service hours
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS service_hours_weekdays BOOLEAN DEFAULT false;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS service_hours_weekends BOOLEAN DEFAULT false;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS service_hours_24_7 BOOLEAN DEFAULT false;

-- Payment and referral
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS accepted_payments TEXT[];
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS referral_source TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS referral_source_name TEXT;

-- Add comments for documentation
COMMENT ON COLUMN vendors.social_instagram IS 'Instagram handle/URL';
COMMENT ON COLUMN vendors.social_facebook IS 'Facebook page URL';
COMMENT ON COLUMN vendors.social_linkedin IS 'LinkedIn profile/company URL';
COMMENT ON COLUMN vendors.employee_count IS 'Number of employees range';
COMMENT ON COLUMN vendors.emergency_services IS 'Whether vendor offers emergency services';
COMMENT ON COLUMN vendors.job_size_range IS 'Array of typical job size ranges';
COMMENT ON COLUMN vendors.service_hours_weekdays IS 'Available on weekdays';
COMMENT ON COLUMN vendors.service_hours_weekends IS 'Available on weekends';
COMMENT ON COLUMN vendors.service_hours_24_7 IS 'Available 24/7 for emergencies';
COMMENT ON COLUMN vendors.accepted_payments IS 'Array of accepted payment methods';
COMMENT ON COLUMN vendors.referral_source IS 'How vendor heard about us';
COMMENT ON COLUMN vendors.referral_source_name IS 'Name of referrer if applicable';
