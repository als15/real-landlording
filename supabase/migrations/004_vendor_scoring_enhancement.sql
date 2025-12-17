-- Migration: Vendor Scoring Enhancement
-- Adds support for: vetting scores, response time tracking, multi-dimensional reviews,
-- match status tracking, and auto-suspension

-- =============================================
-- VENDOR TABLE ENHANCEMENTS
-- =============================================

-- Vetting score fields
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS years_in_business INTEGER;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS vetting_score INTEGER;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS vetting_admin_adjustment INTEGER DEFAULT 0;

-- Auto-suspend tracking
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS suspension_reason TEXT;

-- Constraints for vetting fields
ALTER TABLE vendors ADD CONSTRAINT chk_years_in_business
  CHECK (years_in_business IS NULL OR years_in_business >= 0);

ALTER TABLE vendors ADD CONSTRAINT chk_vetting_score_range
  CHECK (vetting_score IS NULL OR (vetting_score >= 0 AND vetting_score <= 75));

ALTER TABLE vendors ADD CONSTRAINT chk_vetting_admin_adjustment_range
  CHECK (vetting_admin_adjustment >= -10 AND vetting_admin_adjustment <= 10);

-- =============================================
-- MATCH STATUS ENUM
-- =============================================

DO $$ BEGIN
  CREATE TYPE match_status AS ENUM (
    'pending',
    'intro_sent',
    'vendor_accepted',
    'vendor_declined',
    'no_response',
    'in_progress',
    'completed',
    'cancelled',
    'no_show'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =============================================
-- REQUEST VENDOR MATCHES ENHANCEMENTS
-- =============================================

-- Match status tracking
ALTER TABLE request_vendor_matches ADD COLUMN IF NOT EXISTS status match_status DEFAULT 'pending';

-- Response time tracking (in seconds)
ALTER TABLE request_vendor_matches ADD COLUMN IF NOT EXISTS response_time_seconds INTEGER;

-- Decline after accept tracking
ALTER TABLE request_vendor_matches ADD COLUMN IF NOT EXISTS declined_after_accept BOOLEAN DEFAULT false;

-- Multi-dimensional reviews
ALTER TABLE request_vendor_matches ADD COLUMN IF NOT EXISTS review_quality INTEGER;
ALTER TABLE request_vendor_matches ADD COLUMN IF NOT EXISTS review_price INTEGER;
ALTER TABLE request_vendor_matches ADD COLUMN IF NOT EXISTS review_timeline INTEGER;
ALTER TABLE request_vendor_matches ADD COLUMN IF NOT EXISTS review_treatment INTEGER;

-- Constraints for review dimensions
ALTER TABLE request_vendor_matches ADD CONSTRAINT chk_review_quality_range
  CHECK (review_quality IS NULL OR (review_quality >= 1 AND review_quality <= 5));

ALTER TABLE request_vendor_matches ADD CONSTRAINT chk_review_price_range
  CHECK (review_price IS NULL OR (review_price >= 1 AND review_price <= 5));

ALTER TABLE request_vendor_matches ADD CONSTRAINT chk_review_timeline_range
  CHECK (review_timeline IS NULL OR (review_timeline >= 1 AND review_timeline <= 5));

ALTER TABLE request_vendor_matches ADD CONSTRAINT chk_review_treatment_range
  CHECK (review_treatment IS NULL OR (review_treatment >= 1 AND review_treatment <= 5));

ALTER TABLE request_vendor_matches ADD CONSTRAINT chk_response_time_positive
  CHECK (response_time_seconds IS NULL OR response_time_seconds >= 0);

-- =============================================
-- TRIGGERS
-- =============================================

-- Auto-calculate response time when vendor responds
CREATE OR REPLACE FUNCTION calculate_response_time()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.vendor_responded_at IS NOT NULL AND NEW.intro_sent_at IS NOT NULL THEN
    NEW.response_time_seconds = EXTRACT(EPOCH FROM (NEW.vendor_responded_at - NEW.intro_sent_at))::INTEGER;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calculate_response_time ON request_vendor_matches;
CREATE TRIGGER trg_calculate_response_time
  BEFORE INSERT OR UPDATE OF vendor_responded_at ON request_vendor_matches
  FOR EACH ROW EXECUTE FUNCTION calculate_response_time();

-- Auto-update match status based on field changes
CREATE OR REPLACE FUNCTION update_match_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Set intro_sent status
  IF NEW.intro_sent = true AND (OLD.intro_sent IS NULL OR OLD.intro_sent = false) THEN
    NEW.status = 'intro_sent';
  END IF;

  -- Set vendor_accepted status
  IF NEW.vendor_accepted = true AND (OLD.vendor_accepted IS NULL OR OLD.vendor_accepted = false) THEN
    NEW.status = 'vendor_accepted';
  END IF;

  -- Set vendor_declined status (explicit decline after intro)
  IF NEW.vendor_accepted = false AND OLD.vendor_accepted IS NULL AND NEW.vendor_responded_at IS NOT NULL THEN
    NEW.status = 'vendor_declined';
  END IF;

  -- Detect decline after accept
  IF NEW.vendor_accepted = false AND OLD.vendor_accepted = true THEN
    NEW.declined_after_accept = true;
    NEW.status = 'vendor_declined';
  END IF;

  -- Set completed status
  IF NEW.job_completed = true AND (OLD.job_completed IS NULL OR OLD.job_completed = false) THEN
    NEW.status = 'completed';
  END IF;

  -- Detect no-show (accepted but explicitly not completed)
  IF NEW.job_completed = false AND OLD.job_completed IS NULL AND NEW.vendor_accepted = true THEN
    NEW.status = 'no_show';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_match_status ON request_vendor_matches;
CREATE TRIGGER trg_update_match_status
  BEFORE UPDATE ON request_vendor_matches
  FOR EACH ROW EXECUTE FUNCTION update_match_status();

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_vendors_vetting_score ON vendors(vetting_score);
CREATE INDEX IF NOT EXISTS idx_vendors_suspended_at ON vendors(suspended_at) WHERE suspended_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_matches_status ON request_vendor_matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_response_time ON request_vendor_matches(response_time_seconds) WHERE response_time_seconds IS NOT NULL;

-- =============================================
-- BACKFILL EXISTING DATA
-- =============================================

-- Calculate response_time_seconds for historical records
UPDATE request_vendor_matches
SET response_time_seconds = EXTRACT(EPOCH FROM (vendor_responded_at - intro_sent_at))::INTEGER
WHERE intro_sent_at IS NOT NULL
  AND vendor_responded_at IS NOT NULL
  AND response_time_seconds IS NULL;

-- Infer match status from existing boolean fields
UPDATE request_vendor_matches
SET status = CASE
  WHEN job_completed = true THEN 'completed'::match_status
  WHEN vendor_accepted = true AND job_completed = false THEN 'no_show'::match_status
  WHEN vendor_accepted = true AND job_completed IS NULL THEN 'in_progress'::match_status
  WHEN vendor_accepted = false AND vendor_responded_at IS NOT NULL THEN 'vendor_declined'::match_status
  WHEN vendor_accepted IS NULL AND intro_sent = true THEN 'intro_sent'::match_status
  ELSE 'pending'::match_status
END
WHERE status IS NULL OR status = 'pending';
