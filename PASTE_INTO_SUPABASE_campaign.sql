-- TM Stats — add campaign tracking to the outreach pipeline.
-- Run this once in the Supabase SQL editor before deploying the campaign feature.

ALTER TABLE marketing_contacts ADD COLUMN IF NOT EXISTS campaign TEXT;

-- Optional: speed up per-campaign queries on larger lists.
CREATE INDEX IF NOT EXISTS idx_marketing_contacts_campaign ON marketing_contacts (campaign);
