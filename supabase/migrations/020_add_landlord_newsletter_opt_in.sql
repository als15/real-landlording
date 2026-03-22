-- Add newsletter opt-in column to landlords table
ALTER TABLE landlords
  ADD COLUMN IF NOT EXISTS newsletter_opt_in boolean DEFAULT false;

COMMENT ON COLUMN landlords.newsletter_opt_in IS 'Landlord opted in to receive tips and vendor recommendations (Mailchimp newsletter)';
