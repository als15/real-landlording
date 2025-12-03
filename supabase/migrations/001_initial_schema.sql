-- Real Landlording Platform - Initial Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================================
-- ENUMS
-- ===========================================

CREATE TYPE vendor_status AS ENUM ('active', 'inactive', 'pending_review', 'rejected');
CREATE TYPE request_status AS ENUM ('new', 'matching', 'matched', 'completed', 'cancelled');
CREATE TYPE urgency_level AS ENUM ('low', 'medium', 'high', 'emergency');
CREATE TYPE service_type AS ENUM (
  'clean_out',
  'lead_testing',
  'training',
  'locksmith_security',
  'compliance_legal_tax',
  'maintenance',
  'electrician',
  'move_ins',
  'exterior_contractor',
  'painter',
  'general_contractor',
  'pest_control',
  'handyman',
  'plumber',
  'hvac',
  'roofer',
  'windows_doors'
);

-- ===========================================
-- LANDLORDS TABLE
-- ===========================================

CREATE TABLE landlords (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255),
  phone VARCHAR(50),
  properties TEXT[], -- Array of addresses or zip codes
  subscription_tier VARCHAR(50) DEFAULT 'basic',
  request_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_landlords_email ON landlords(email);
CREATE INDEX idx_landlords_auth_user ON landlords(auth_user_id);

-- ===========================================
-- VENDORS TABLE
-- ===========================================

CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status vendor_status DEFAULT 'pending_review',

  -- Contact info
  contact_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(50),

  -- Business info
  business_name VARCHAR(255) NOT NULL,
  website VARCHAR(500),
  location VARCHAR(255),

  -- Services (array of service types)
  services service_type[] NOT NULL,
  services_other TEXT, -- Free text for "other" services

  -- Qualifications
  qualifications TEXT,
  licensed BOOLEAN DEFAULT false,
  insured BOOLEAN DEFAULT false,
  rental_experience BOOLEAN DEFAULT false,

  -- Service areas (zip codes)
  service_areas TEXT[] NOT NULL,

  -- Preferences
  call_preferences TEXT,

  -- Portfolio
  portfolio_media TEXT[], -- URLs to uploaded media

  -- Performance
  performance_score DECIMAL(3,2) DEFAULT 0.00,
  total_reviews INTEGER DEFAULT 0,

  -- Admin
  admin_notes TEXT,
  terms_accepted BOOLEAN DEFAULT false,
  terms_accepted_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_vendors_status ON vendors(status);
CREATE INDEX idx_vendors_services ON vendors USING GIN(services);
CREATE INDEX idx_vendors_service_areas ON vendors USING GIN(service_areas);

-- ===========================================
-- SERVICE REQUESTS TABLE
-- ===========================================

CREATE TABLE service_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Landlord (can be linked or just email)
  landlord_id UUID REFERENCES landlords(id) ON DELETE SET NULL,
  landlord_email VARCHAR(255) NOT NULL,
  landlord_name VARCHAR(255),
  landlord_phone VARCHAR(50),

  -- Request details
  service_type service_type NOT NULL,
  property_location VARCHAR(255) NOT NULL, -- Zip code or address
  job_description TEXT NOT NULL,
  urgency urgency_level DEFAULT 'medium',
  budget_min DECIMAL(10,2),
  budget_max DECIMAL(10,2),

  -- Status
  status request_status DEFAULT 'new',

  -- Matching
  intro_sent_at TIMESTAMP WITH TIME ZONE,

  -- Follow-up
  followup_sent_at TIMESTAMP WITH TIME ZONE,
  followup_response TEXT,

  -- Admin
  admin_notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_requests_status ON service_requests(status);
CREATE INDEX idx_requests_service_type ON service_requests(service_type);
CREATE INDEX idx_requests_landlord ON service_requests(landlord_id);
CREATE INDEX idx_requests_created ON service_requests(created_at DESC);

-- ===========================================
-- REQUEST-VENDOR MATCHES (Junction Table)
-- ===========================================

CREATE TABLE request_vendor_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,

  -- Match status
  intro_sent BOOLEAN DEFAULT false,
  intro_sent_at TIMESTAMP WITH TIME ZONE,

  -- Vendor response
  vendor_accepted BOOLEAN,
  vendor_responded_at TIMESTAMP WITH TIME ZONE,

  -- Outcome
  job_completed BOOLEAN,

  -- Review from landlord
  review_rating INTEGER CHECK (review_rating >= 1 AND review_rating <= 5),
  review_text TEXT,
  review_submitted_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(request_id, vendor_id)
);

-- Indexes
CREATE INDEX idx_matches_request ON request_vendor_matches(request_id);
CREATE INDEX idx_matches_vendor ON request_vendor_matches(vendor_id);

-- ===========================================
-- ADMIN USERS TABLE
-- ===========================================

CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_admin_auth_user ON admin_users(auth_user_id);

-- ===========================================
-- ROW LEVEL SECURITY POLICIES
-- ===========================================

-- Enable RLS on all tables
ALTER TABLE landlords ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_vendor_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Admin can do everything
CREATE POLICY "Admins have full access to landlords" ON landlords
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Admins have full access to vendors" ON vendors
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Admins have full access to requests" ON service_requests
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Admins have full access to matches" ON request_vendor_matches
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Admins can view admin_users" ON admin_users
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM admin_users WHERE auth_user_id = auth.uid())
  );

-- Landlords can view and update their own data
CREATE POLICY "Landlords can view own data" ON landlords
  FOR SELECT USING (auth_user_id = auth.uid());

CREATE POLICY "Landlords can update own data" ON landlords
  FOR UPDATE USING (auth_user_id = auth.uid());

-- Landlords can view their own requests
CREATE POLICY "Landlords can view own requests" ON service_requests
  FOR SELECT USING (landlord_id IN (SELECT id FROM landlords WHERE auth_user_id = auth.uid()));

-- Vendors can view and update their own data
CREATE POLICY "Vendors can view own data" ON vendors
  FOR SELECT USING (auth_user_id = auth.uid());

CREATE POLICY "Vendors can update own data" ON vendors
  FOR UPDATE USING (auth_user_id = auth.uid());

-- Vendors can view matches assigned to them
CREATE POLICY "Vendors can view own matches" ON request_vendor_matches
  FOR SELECT USING (vendor_id IN (SELECT id FROM vendors WHERE auth_user_id = auth.uid()));

-- Public can insert service requests (no auth required for form submission)
CREATE POLICY "Anyone can submit service requests" ON service_requests
  FOR INSERT WITH CHECK (true);

-- Public can insert landlords (for signup)
CREATE POLICY "Anyone can create landlord profile" ON landlords
  FOR INSERT WITH CHECK (true);

-- ===========================================
-- FUNCTIONS
-- ===========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_landlords_updated_at
  BEFORE UPDATE ON landlords
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_vendors_updated_at
  BEFORE UPDATE ON vendors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_requests_updated_at
  BEFORE UPDATE ON service_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to increment landlord request count
CREATE OR REPLACE FUNCTION increment_landlord_request_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.landlord_id IS NOT NULL THEN
    UPDATE landlords SET request_count = request_count + 1 WHERE id = NEW.landlord_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_request_count
  AFTER INSERT ON service_requests
  FOR EACH ROW EXECUTE FUNCTION increment_landlord_request_count();

-- Function to update vendor performance score
CREATE OR REPLACE FUNCTION update_vendor_performance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.review_rating IS NOT NULL THEN
    UPDATE vendors
    SET
      performance_score = (
        SELECT AVG(review_rating)::DECIMAL(3,2)
        FROM request_vendor_matches
        WHERE vendor_id = NEW.vendor_id AND review_rating IS NOT NULL
      ),
      total_reviews = (
        SELECT COUNT(*)
        FROM request_vendor_matches
        WHERE vendor_id = NEW.vendor_id AND review_rating IS NOT NULL
      )
    WHERE id = NEW.vendor_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_vendor_score
  AFTER INSERT OR UPDATE OF review_rating ON request_vendor_matches
  FOR EACH ROW EXECUTE FUNCTION update_vendor_performance();
