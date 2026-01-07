-- Add SLA (Service Level Agreement) tracking fields for DocuSign integration

-- SLA tracking fields
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS sla_envelope_id TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS sla_status TEXT DEFAULT 'not_sent';
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS sla_sent_at TIMESTAMPTZ;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS sla_signed_at TIMESTAMPTZ;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS sla_document_url TEXT;

-- Index for efficient webhook lookups by envelope ID
CREATE INDEX IF NOT EXISTS idx_vendors_sla_envelope_id ON vendors(sla_envelope_id) WHERE sla_envelope_id IS NOT NULL;

-- Comments for documentation
COMMENT ON COLUMN vendors.sla_envelope_id IS 'DocuSign envelope ID for tracking the SLA document';
COMMENT ON COLUMN vendors.sla_status IS 'SLA signing status: not_sent, sent, delivered, viewed, signed, declined, voided';
COMMENT ON COLUMN vendors.sla_sent_at IS 'Timestamp when SLA was sent to vendor';
COMMENT ON COLUMN vendors.sla_signed_at IS 'Timestamp when vendor signed the SLA';
COMMENT ON COLUMN vendors.sla_document_url IS 'URL to download the signed SLA document';
