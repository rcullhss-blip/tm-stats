-- TM Stats — real delivery tracking for outreach (delivered / opened).
-- Run once in the Supabase SQL editor. Safe to re-run.

ALTER TABLE marketing_contacts ADD COLUMN IF NOT EXISTS delivered    BOOLEAN;
ALTER TABLE marketing_contacts ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE marketing_contacts ADD COLUMN IF NOT EXISTS opened       BOOLEAN;
ALTER TABLE marketing_contacts ADD COLUMN IF NOT EXISTS opened_at    TIMESTAMPTZ;
