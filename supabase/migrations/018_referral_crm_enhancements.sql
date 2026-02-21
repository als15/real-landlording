-- Migration: Referral CRM Enhancements
-- Adds: estimate_sent status, expected_due_date, admin_notes on matches

-- =============================================
-- ADD estimate_sent TO match_status ENUM
-- =============================================

ALTER TYPE match_status ADD VALUE IF NOT EXISTS 'estimate_sent' AFTER 'intro_sent';

-- =============================================
-- NEW COLUMNS ON request_vendor_matches
-- =============================================

ALTER TABLE request_vendor_matches ADD COLUMN IF NOT EXISTS expected_due_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE request_vendor_matches ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_matches_expected_due_date
  ON request_vendor_matches(expected_due_date)
  WHERE expected_due_date IS NOT NULL;
