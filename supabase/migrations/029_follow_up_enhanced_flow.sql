-- Migration 029: Enhanced follow-up flow
-- Adds new stages, invoice_value, and cancellation_reason columns
-- Supports: Step 0 (Day 0 landlord msg), Step 1.1 (timeline), Step 5A (invoice),
-- Step 5C (cancellation reason), dynamic completion timing

-- Add new enum values for the enhanced flow stages
ALTER TYPE followup_stage ADD VALUE IF NOT EXISTS 'intro_sent' AFTER 'pending';
ALTER TYPE followup_stage ADD VALUE IF NOT EXISTS 'timeline_requested' AFTER 'vendor_booked';
ALTER TYPE followup_stage ADD VALUE IF NOT EXISTS 'invoice_requested' AFTER 'job_completed';
ALTER TYPE followup_stage ADD VALUE IF NOT EXISTS 'cancellation_reason_requested' AFTER 'job_cancelled';
ALTER TYPE followup_stage ADD VALUE IF NOT EXISTS 'feedback_requested' AFTER 'invoice_requested';

-- Add new columns to match_followups
ALTER TABLE match_followups
  ADD COLUMN IF NOT EXISTS invoice_value NUMERIC,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- Update the DB trigger to set next_action_at to now() for immediate Day 0 message
-- (instead of 3 days from now — the processor will send Day 0 msg then schedule Day 3)
CREATE OR REPLACE FUNCTION create_followup_on_intro_sent()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.intro_sent = true AND (OLD.intro_sent = false OR OLD.intro_sent IS NULL) THEN
    INSERT INTO match_followups (match_id, request_id, stage, next_action_at)
    VALUES (NEW.id, NEW.request_id, 'pending', now())
    ON CONFLICT (match_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
