-- TM Stats: groups submit their cards at the end of a qualifying round.
-- Adds two columns to the qualifying cards; nothing existing changes.
ALTER TABLE public.qualifier_scores ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE public.qualifier_scores ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.qualifiers ADD COLUMN IF NOT EXISTS groups JSONB NOT NULL DEFAULT '{}'::jsonb;
