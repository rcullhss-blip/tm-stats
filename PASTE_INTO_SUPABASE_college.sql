-- TM Stats: college release (November 2026)
-- Squad benchmarks, qualifying and live scoring, leaderboards, recruiting profile, SG goal.
-- Run once in Supabase: SQL Editor > New query > paste > Run.
-- Safe to run more than once. Only adds columns and tables; nothing existing is changed.

-- ── Teams ────────────────────────────────────────────────────────────────────
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS benchmark TEXT;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS players_see_leaderboard BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS on_college_board BOOLEAN NOT NULL DEFAULT TRUE;

-- ── Users ────────────────────────────────────────────────────────────────────
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS region TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS leaderboard_opt_in BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS sg_goal JSONB;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS profile_slug TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS profile_public BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS profile_info JSONB;
CREATE UNIQUE INDEX IF NOT EXISTS users_profile_slug_key ON public.users (profile_slug) WHERE profile_slug IS NOT NULL;

-- ── Rounds ───────────────────────────────────────────────────────────────────
-- stats_pending: the scores came from qualifying or an uploaded result and the
-- golfer still has to add their stats.
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS stats_pending BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS qualifier_id UUID;

-- ── Qualifying and uploaded results ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.qualifiers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  kind VARCHAR(20) NOT NULL DEFAULT 'qualifying',   -- 'qualifying' | 'tournament'
  name TEXT NOT NULL,
  course_name TEXT NOT NULL,
  holes INTEGER NOT NULL DEFAULT 18,
  pars JSONB NOT NULL,                              -- [4,3,5,...] one per hole
  round_count INTEGER NOT NULL DEFAULT 1,
  round_dates JSONB NOT NULL DEFAULT '[]'::jsonb,   -- ["2026-11-20", ...] one per round
  rounds_finished INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.qualifiers ENABLE ROW LEVEL SECURITY;
-- server only via service role

CREATE TABLE IF NOT EXISTS public.qualifier_scores (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  qualifier_id UUID REFERENCES public.qualifiers(id) ON DELETE CASCADE NOT NULL,
  round_no INTEGER NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  scores JSONB NOT NULL DEFAULT '[]'::jsonb,        -- [4,null,5,...] null = not played yet
  round_id UUID REFERENCES public.rounds(id) ON DELETE SET NULL,  -- the golfer's round, once the qualifying round is finished
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (qualifier_id, round_no, user_id)
);
ALTER TABLE public.qualifier_scores ENABLE ROW LEVEL SECURITY;
-- server only via service role

CREATE INDEX IF NOT EXISTS qualifier_scores_qualifier_idx ON public.qualifier_scores (qualifier_id);
CREATE INDEX IF NOT EXISTS qualifiers_team_idx ON public.qualifiers (team_id);
