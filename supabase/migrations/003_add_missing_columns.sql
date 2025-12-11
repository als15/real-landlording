-- Migration: Add missing columns for service requests
-- These columns were added in the form refactor but not included in the migration

-- ===========================================
-- Add missing columns to service_requests table
-- ===========================================

-- Property details
ALTER TABLE service_requests
ADD COLUMN IF NOT EXISTS property_address TEXT;

ALTER TABLE service_requests
ADD COLUMN IF NOT EXISTS zip_code VARCHAR(10);

ALTER TABLE service_requests
ADD COLUMN IF NOT EXISTS property_type VARCHAR(50);

ALTER TABLE service_requests
ADD COLUMN IF NOT EXISTS unit_count VARCHAR(20);

ALTER TABLE service_requests
ADD COLUMN IF NOT EXISTS occupancy_status VARCHAR(20);

-- Geolocation
ALTER TABLE service_requests
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;

ALTER TABLE service_requests
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Service details JSON for dynamic form fields
ALTER TABLE service_requests
ADD COLUMN IF NOT EXISTS service_details JSONB;

-- Contact preference
ALTER TABLE service_requests
ADD COLUMN IF NOT EXISTS contact_preference VARCHAR(20);

-- ===========================================
-- Change service_type from enum to TEXT for flexibility
-- ===========================================

-- For service_requests table
ALTER TABLE service_requests
ALTER COLUMN service_type TYPE TEXT USING service_type::TEXT;

-- For vendors table - change services array to TEXT[]
ALTER TABLE vendors
ALTER COLUMN services TYPE TEXT[] USING services::TEXT[];

-- ===========================================
-- Create indexes for common queries
-- ===========================================

CREATE INDEX IF NOT EXISTS idx_requests_zip_code ON service_requests(zip_code);
CREATE INDEX IF NOT EXISTS idx_requests_property_type ON service_requests(property_type);
CREATE INDEX IF NOT EXISTS idx_requests_service_type ON service_requests(service_type);
