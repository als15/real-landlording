-- Migration: CRM Enhancements
-- Adds support for: job outcome tracking, payment tracking, and conversion analytics

-- =============================================
-- PAYMENT STATUS ENUM
-- =============================================

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM (
    'pending',
    'invoiced',
    'paid',
    'overdue',
    'waived',
    'refunded'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =============================================
-- REQUEST VENDOR MATCHES ENHANCEMENTS
-- =============================================

-- Job outcome tracking
ALTER TABLE request_vendor_matches ADD COLUMN IF NOT EXISTS job_won BOOLEAN;
ALTER TABLE request_vendor_matches ADD COLUMN IF NOT EXISTS job_won_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE request_vendor_matches ADD COLUMN IF NOT EXISTS job_completed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE request_vendor_matches ADD COLUMN IF NOT EXISTS job_outcome_reason VARCHAR(100);
-- Values: price_too_high, timing_issue, vendor_unresponsive, landlord_cancelled,
--         found_other_vendor, job_not_needed, completed_successfully, other
ALTER TABLE request_vendor_matches ADD COLUMN IF NOT EXISTS outcome_notes TEXT;

-- Review request tracking
ALTER TABLE request_vendor_matches ADD COLUMN IF NOT EXISTS review_requested_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE request_vendor_matches ADD COLUMN IF NOT EXISTS review_reminder_sent_at TIMESTAMP WITH TIME ZONE;

-- =============================================
-- REFERRAL PAYMENTS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS referral_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES request_vendor_matches(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  request_id UUID REFERENCES service_requests(id) ON DELETE SET NULL,

  -- Payment details
  amount DECIMAL(10, 2) NOT NULL,
  fee_type VARCHAR(20) DEFAULT 'fixed', -- 'fixed' | 'percentage'
  fee_percentage DECIMAL(5, 2), -- If percentage-based

  -- Job cost (what landlord paid vendor - optional tracking)
  job_cost DECIMAL(10, 2),

  -- Payment status
  status payment_status DEFAULT 'pending',

  -- Dates
  invoice_date TIMESTAMP WITH TIME ZONE,
  due_date TIMESTAMP WITH TIME ZONE,
  paid_date TIMESTAMP WITH TIME ZONE,

  -- Payment method
  payment_method VARCHAR(50), -- stripe | check | ach | venmo | cash | other
  payment_reference VARCHAR(255), -- Transaction ID / Check number

  -- Notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Constraints
ALTER TABLE referral_payments ADD CONSTRAINT chk_amount_positive
  CHECK (amount >= 0);

ALTER TABLE referral_payments ADD CONSTRAINT chk_fee_percentage_range
  CHECK (fee_percentage IS NULL OR (fee_percentage >= 0 AND fee_percentage <= 100));

ALTER TABLE referral_payments ADD CONSTRAINT chk_job_cost_positive
  CHECK (job_cost IS NULL OR job_cost >= 0);

-- =============================================
-- VENDOR FEE CONFIGURATION
-- =============================================

ALTER TABLE vendors ADD COLUMN IF NOT EXISTS default_fee_type VARCHAR(20) DEFAULT 'fixed';
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS default_fee_amount DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS default_fee_percentage DECIMAL(5, 2);

-- Constraints
ALTER TABLE vendors ADD CONSTRAINT chk_default_fee_amount_positive
  CHECK (default_fee_amount IS NULL OR default_fee_amount >= 0);

ALTER TABLE vendors ADD CONSTRAINT chk_default_fee_percentage_range
  CHECK (default_fee_percentage IS NULL OR (default_fee_percentage >= 0 AND default_fee_percentage <= 100));

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_matches_job_won ON request_vendor_matches(job_won) WHERE job_won IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_matches_job_completed_at ON request_vendor_matches(job_completed_at) WHERE job_completed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_vendor_id ON referral_payments(vendor_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON referral_payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_paid_date ON referral_payments(paid_date) WHERE paid_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_match_id ON referral_payments(match_id);

-- =============================================
-- TRIGGERS
-- =============================================

-- Auto-update match status when job_won changes
CREATE OR REPLACE FUNCTION update_match_on_job_won()
RETURNS TRIGGER AS $$
BEGIN
  -- When job is marked as won, set status to in_progress
  IF NEW.job_won = true AND (OLD.job_won IS NULL OR OLD.job_won = false) THEN
    NEW.job_won_at = COALESCE(NEW.job_won_at, NOW());
    NEW.status = 'in_progress';
  END IF;

  -- When job is completed, record timestamp
  IF NEW.job_completed = true AND (OLD.job_completed IS NULL OR OLD.job_completed = false) THEN
    NEW.job_completed_at = COALESCE(NEW.job_completed_at, NOW());
    IF NEW.job_won = true THEN
      NEW.job_outcome_reason = COALESCE(NEW.job_outcome_reason, 'completed_successfully');
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_match_on_job_won ON request_vendor_matches;
CREATE TRIGGER trg_update_match_on_job_won
  BEFORE UPDATE OF job_won, job_completed ON request_vendor_matches
  FOR EACH ROW EXECUTE FUNCTION update_match_on_job_won();

-- Auto-update updated_at on referral_payments
CREATE OR REPLACE FUNCTION update_payment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_payment_updated_at ON referral_payments;
CREATE TRIGGER trg_payment_updated_at
  BEFORE UPDATE ON referral_payments
  FOR EACH ROW EXECUTE FUNCTION update_payment_updated_at();

-- =============================================
-- RLS POLICIES FOR REFERRAL_PAYMENTS
-- =============================================

ALTER TABLE referral_payments ENABLE ROW LEVEL SECURITY;

-- Admins can do everything (using service role bypasses RLS anyway)
CREATE POLICY "Admins can manage payments" ON referral_payments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = auth.uid()
    )
  );

-- Vendors can view their own payment records
CREATE POLICY "Vendors can view own payments" ON referral_payments
  FOR SELECT
  TO authenticated
  USING (
    vendor_id IN (
      SELECT id FROM vendors
      WHERE vendors.auth_user_id = auth.uid()
    )
  );
