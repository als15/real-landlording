-- Migration 026: Follow-up messaging system
-- Adds match_followups and followup_events tables for multi-stage vendor/landlord follow-up tracking

-- Create the followup_stage enum
CREATE TYPE followup_stage AS ENUM (
  'pending',
  'vendor_check_sent',
  'vendor_booked',
  'vendor_discussing',
  'vendor_cant_reach',
  'vendor_no_deal',
  'day7_recheck_sent',
  'landlord_check_sent',
  'landlord_contact_ok',
  'needs_rematch',
  'awaiting_completion',
  'completion_check_sent',
  'job_completed',
  'job_in_progress',
  'job_cancelled',
  'closed'
);

-- Main follow-up tracking table (one per match)
CREATE TABLE match_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL UNIQUE REFERENCES request_vendor_matches(id) ON DELETE CASCADE,
  request_id UUID NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  stage followup_stage NOT NULL DEFAULT 'pending',
  next_action_at TIMESTAMPTZ,
  vendor_response_token TEXT,
  landlord_response_token TEXT,
  expected_completion_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for cron query performance
CREATE INDEX idx_match_followups_next_action ON match_followups (next_action_at)
  WHERE next_action_at IS NOT NULL AND stage NOT IN ('closed', 'needs_rematch');
CREATE INDEX idx_match_followups_stage ON match_followups (stage);
CREATE INDEX idx_match_followups_match_id ON match_followups (match_id);

-- Audit trail for all follow-up events
CREATE TABLE followup_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  followup_id UUID NOT NULL REFERENCES match_followups(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'email_sent', 'sms_sent', 'response_received', 'admin_override', 'stage_changed'
  from_stage followup_stage,
  to_stage followup_stage,
  channel TEXT, -- 'email', 'sms', 'admin', 'system'
  response_value TEXT, -- e.g. 'booked', 'no_deal', 'cant_reach'
  notes TEXT,
  created_by UUID, -- null for automated, admin user_id for manual
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_followup_events_followup_id ON followup_events (followup_id);

-- Trigger: auto-create match_followups row when intro_sent is set to true
CREATE OR REPLACE FUNCTION create_followup_on_intro_sent()
RETURNS TRIGGER AS $$
BEGIN
  -- Only fire when intro_sent changes from false to true
  IF NEW.intro_sent = true AND (OLD.intro_sent = false OR OLD.intro_sent IS NULL) THEN
    INSERT INTO match_followups (match_id, request_id, stage, next_action_at)
    VALUES (NEW.id, NEW.request_id, 'pending', now() + INTERVAL '3 days')
    ON CONFLICT (match_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_create_followup_on_intro_sent
  AFTER UPDATE OF intro_sent ON request_vendor_matches
  FOR EACH ROW
  EXECUTE FUNCTION create_followup_on_intro_sent();

-- Auto-update updated_at on match_followups
CREATE OR REPLACE FUNCTION update_match_followups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_match_followups_updated_at
  BEFORE UPDATE ON match_followups
  FOR EACH ROW
  EXECUTE FUNCTION update_match_followups_updated_at();

-- Add follow_up_rematch to admin notification type enum if it exists
DO $$
BEGIN
  -- Check if the enum type exists and add the value
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'admin_notification_type') THEN
    ALTER TYPE admin_notification_type ADD VALUE IF NOT EXISTS 'follow_up_rematch';
  END IF;
EXCEPTION
  WHEN others THEN
    -- Enum may not exist, which is fine — notifications use text column
    NULL;
END $$;

-- RLS policies: match_followups and followup_events are admin-only
-- API routes use createAdminClient() which bypasses RLS, so we just
-- deny public access and allow service_role full access.
ALTER TABLE match_followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE followup_events ENABLE ROW LEVEL SECURITY;

-- Service role (used by API routes) gets full access
CREATE POLICY "Service role full access on match_followups"
  ON match_followups
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access on followup_events"
  ON followup_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
