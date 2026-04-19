-- TM Stats — Supabase schema
-- Run this in the Supabase SQL editor after creating your project

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  handicap NUMERIC(4,1),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  subscription_status TEXT DEFAULT 'free' CHECK (subscription_status IN ('free', 'pro', 'team')),
  feedback_level TEXT DEFAULT 'intermediate' CHECK (feedback_level IN ('simple', 'intermediate', 'advanced')),
  coach_persona TEXT DEFAULT 'club_pro'
);

-- Rounds table
CREATE TABLE public.rounds (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  course_name TEXT NOT NULL,
  holes INTEGER NOT NULL CHECK (holes IN (9, 18)),
  round_type TEXT NOT NULL CHECK (round_type IN ('practice', 'tournament', 'competition')),
  input_mode TEXT DEFAULT 'quick' CHECK (input_mode IN ('quick', 'full')),
  par_total INTEGER,
  score_total INTEGER,
  notes TEXT,
  notes_updated_at TIMESTAMPTZ,
  mood TEXT CHECK (mood IN ('tough', 'average', 'good', 'great')),
  conditions TEXT,  -- comma-separated: 'sunny,windy'
  energy_level TEXT CHECK (energy_level IN ('fresh', 'normal', 'tired', 'niggly')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Holes table
CREATE TABLE public.holes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  round_id UUID REFERENCES public.rounds(id) ON DELETE CASCADE NOT NULL,
  hole_number INTEGER NOT NULL CHECK (hole_number BETWEEN 1 AND 18),
  par INTEGER NOT NULL CHECK (par IN (3, 4, 5)),
  score INTEGER NOT NULL CHECK (score > 0),
  fir BOOLEAN,          -- NULL on par 3s (non-applicable), not false
  gir BOOLEAN,
  putts INTEGER CHECK (putts >= 0),
  up_and_down BOOLEAN,
  sand_save BOOLEAN,
  distance_to_pin_yards INTEGER,
  lie_type TEXT,
  hole_note TEXT,
  shots JSONB           -- shot-by-shot array for full tracking mode
);

-- Teams table
CREATE TABLE public.teams (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  coach_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  join_code VARCHAR(8) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team members
CREATE TABLE public.team_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- Coach AI challenges
CREATE TABLE public.coach_ai_challenges (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  round_id UUID REFERENCES public.rounds(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  coach_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  original_ai_feedback TEXT,
  coach_context TEXT,
  revised_ai_feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security — CRITICAL: users can only see their own data
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users read own rounds" ON public.rounds
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own rounds" ON public.rounds
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own rounds" ON public.rounds
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users delete own rounds" ON public.rounds
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users read own holes" ON public.holes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.rounds WHERE id = holes.round_id AND user_id = auth.uid())
  );

CREATE POLICY "Users insert own holes" ON public.holes
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.rounds WHERE id = holes.round_id AND user_id = auth.uid())
  );

CREATE POLICY "Users update own holes" ON public.holes
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.rounds WHERE id = holes.round_id AND user_id = auth.uid())
  );

CREATE POLICY "Users delete own holes" ON public.holes
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.rounds WHERE id = holes.round_id AND user_id = auth.uid())
  );

-- Note: user profile row is created by the app on signup (no trigger needed)
y