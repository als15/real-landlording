-- Add budget_range column to service_requests table
-- This column was defined in TypeScript types but never added to the database

ALTER TABLE service_requests
ADD COLUMN IF NOT EXISTS budget_range VARCHAR(20);

-- Add a comment explaining the column
COMMENT ON COLUMN service_requests.budget_range IS 'Budget range for the service request: under_500, 500_1000, 1000_2500, 2500_5000, 5000_10000, 10000_25000, 25000_50000, 50000_100000, over_100000, not_sure';
