-- Add 'failed' status to request_status enum
-- Used when a match was attempted but didn't work out (vendor unresponsive, job fell through, etc.)
-- Distinct from 'cancelled' which is a landlord-initiated withdrawal
ALTER TYPE request_status ADD VALUE 'failed';
