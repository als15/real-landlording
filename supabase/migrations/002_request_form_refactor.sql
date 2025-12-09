-- Migration: Service Request Form Refactor
-- Adds new fields for the 3-step form: finish_level, is_owner, business_name, media_urls, first_name, last_name

-- ===========================================
-- Add new columns to service_requests table
-- ===========================================

-- Add finish_level column
ALTER TABLE service_requests
ADD COLUMN IF NOT EXISTS finish_level VARCHAR(20);

-- Add is_owner boolean (defaults to true for existing records)
ALTER TABLE service_requests
ADD COLUMN IF NOT EXISTS is_owner BOOLEAN DEFAULT true;

-- Add business_name for non-owner submissions
ALTER TABLE service_requests
ADD COLUMN IF NOT EXISTS business_name VARCHAR(255);

-- Add media_urls array for uploaded photos/videos
ALTER TABLE service_requests
ADD COLUMN IF NOT EXISTS media_urls TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Add split name fields
ALTER TABLE service_requests
ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);

ALTER TABLE service_requests
ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);

-- ===========================================
-- Add new columns to landlords table
-- ===========================================

ALTER TABLE landlords
ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);

ALTER TABLE landlords
ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);

-- ===========================================
-- Create index for media_urls if needed
-- ===========================================

CREATE INDEX IF NOT EXISTS idx_requests_has_media
ON service_requests ((media_urls IS NOT NULL AND array_length(media_urls, 1) > 0));
