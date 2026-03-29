-- Migration 022: Vendor Referral Terms
-- Adds comprehensive per-vendor referral fee configuration to the vendors table.
-- These fields are separate from the legacy default_fee_* columns (migration 013),
-- which are used by the CRM for individual match payments.

-- Fee structure
ALTER TABLE vendors
  ADD COLUMN referral_fee_type VARCHAR(30) NOT NULL DEFAULT 'percentage',
  ADD COLUMN referral_fee_percentage DECIMAL(5,2) NOT NULL DEFAULT 5.00,
  ADD COLUMN referral_fee_flat_amount DECIMAL(10,2) DEFAULT NULL,
  ADD COLUMN referral_calculation_basis VARCHAR(30) NOT NULL DEFAULT 'gross_invoice',
  ADD COLUMN referral_fee_trigger VARCHAR(30) NOT NULL DEFAULT 'upon_vendor_paid';

-- Payment timing
ALTER TABLE vendors
  ADD COLUMN referral_payment_due_days INTEGER NOT NULL DEFAULT 7;

-- Late fee policy
ALTER TABLE vendors
  ADD COLUMN referral_late_fee_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN referral_late_fee_rate_type VARCHAR(30) NOT NULL DEFAULT 'percentage_per_month',
  ADD COLUMN referral_late_fee_rate_value DECIMAL(10,2) NOT NULL DEFAULT 1.50,
  ADD COLUMN referral_late_fee_grace_period_days INTEGER NOT NULL DEFAULT 0;

-- Repeat business terms
ALTER TABLE vendors
  ADD COLUMN referral_repeat_fee_modifier DECIMAL(5,2) NOT NULL DEFAULT 50.00,
  ADD COLUMN referral_repeat_fee_window_months INTEGER NOT NULL DEFAULT 24;

-- Versioning and notes
ALTER TABLE vendors
  ADD COLUMN referral_terms_effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN referral_terms_version VARCHAR(20) NOT NULL DEFAULT 'v1.0',
  ADD COLUMN referral_custom_terms_notes TEXT DEFAULT NULL;

-- CHECK constraints for enum values
ALTER TABLE vendors
  ADD CONSTRAINT chk_referral_fee_type
    CHECK (referral_fee_type IN ('percentage', 'flat_fee', 'percentage_plus_flat')),
  ADD CONSTRAINT chk_referral_calculation_basis
    CHECK (referral_calculation_basis IN ('gross_invoice', 'net_invoice', 'per_referral', 'matched_only')),
  ADD CONSTRAINT chk_referral_fee_trigger
    CHECK (referral_fee_trigger IN ('upon_vendor_paid', 'upon_match', 'upon_invoice_issued', 'custom')),
  ADD CONSTRAINT chk_referral_late_fee_rate_type
    CHECK (referral_late_fee_rate_type IN ('percentage_per_month', 'flat_amount', 'none'));

-- Range and non-negative constraints
ALTER TABLE vendors
  ADD CONSTRAINT chk_referral_fee_percentage_range
    CHECK (referral_fee_percentage >= 0 AND referral_fee_percentage <= 100),
  ADD CONSTRAINT chk_referral_fee_flat_amount_nonneg
    CHECK (referral_fee_flat_amount IS NULL OR referral_fee_flat_amount >= 0),
  ADD CONSTRAINT chk_referral_payment_due_days_nonneg
    CHECK (referral_payment_due_days >= 0),
  ADD CONSTRAINT chk_referral_late_fee_rate_value_nonneg
    CHECK (referral_late_fee_rate_value >= 0),
  ADD CONSTRAINT chk_referral_late_fee_grace_period_nonneg
    CHECK (referral_late_fee_grace_period_days >= 0),
  ADD CONSTRAINT chk_referral_repeat_fee_modifier_range
    CHECK (referral_repeat_fee_modifier >= 0 AND referral_repeat_fee_modifier <= 100),
  ADD CONSTRAINT chk_referral_repeat_fee_window_nonneg
    CHECK (referral_repeat_fee_window_months >= 0);

-- Column comments for documentation
COMMENT ON COLUMN vendors.referral_fee_type IS 'Fee structure type: percentage, flat_fee, or percentage_plus_flat';
COMMENT ON COLUMN vendors.referral_fee_percentage IS 'Percentage fee (0-100). Used when fee_type includes percentage.';
COMMENT ON COLUMN vendors.referral_fee_flat_amount IS 'Flat fee dollar amount. Used when fee_type includes flat_fee.';
COMMENT ON COLUMN vendors.referral_calculation_basis IS 'What the fee percentage is calculated against: gross_invoice, net_invoice, per_referral, matched_only';
COMMENT ON COLUMN vendors.referral_fee_trigger IS 'When the referral fee becomes due: upon_vendor_paid, upon_match, upon_invoice_issued, custom';
COMMENT ON COLUMN vendors.referral_payment_due_days IS 'Number of days after the trigger event that payment is due';
COMMENT ON COLUMN vendors.referral_late_fee_enabled IS 'Whether late fees apply to overdue referral payments';
COMMENT ON COLUMN vendors.referral_late_fee_rate_type IS 'How the late fee is calculated: percentage_per_month, flat_amount, or none';
COMMENT ON COLUMN vendors.referral_late_fee_rate_value IS 'Late fee rate value (percentage or dollar amount depending on rate_type)';
COMMENT ON COLUMN vendors.referral_late_fee_grace_period_days IS 'Grace period in days before late fees start accruing';
COMMENT ON COLUMN vendors.referral_repeat_fee_modifier IS 'Percentage of the original referral fee charged for repeat business (0-100)';
COMMENT ON COLUMN vendors.referral_repeat_fee_window_months IS 'Months within which a returning landlord-vendor pair is considered repeat business';
COMMENT ON COLUMN vendors.referral_terms_effective_date IS 'Date when the current referral terms take effect';
COMMENT ON COLUMN vendors.referral_terms_version IS 'Version label for the referral terms (e.g., v1.0, v2.0)';
COMMENT ON COLUMN vendors.referral_custom_terms_notes IS 'Free-text notes for custom terms. Required when referral_fee_trigger = custom.';
