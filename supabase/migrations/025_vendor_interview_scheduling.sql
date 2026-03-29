-- Migration 025: Add interview scheduling fields to vendors table
-- Tracks when an admin sends a Calendly interview link to a vendor applicant

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendors' AND column_name = 'interview_scheduled_at'
  ) THEN
    ALTER TABLE vendors ADD COLUMN interview_scheduled_at TIMESTAMPTZ DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendors' AND column_name = 'interview_scheduled_count'
  ) THEN
    ALTER TABLE vendors ADD COLUMN interview_scheduled_count INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;
