-- TM Stats: practice tests (scores you try to beat). One new table; nothing existing changes.
-- Run in Supabase on 19 Nov 2026.
CREATE TABLE IF NOT EXISTS public.practice_test_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  test_key TEXT NOT NULL,
  score NUMERIC NOT NULL,
  detail JSONB,
  taken_on DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.practice_test_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own test results" ON public.practice_test_results;
CREATE POLICY "Users manage own test results" ON public.practice_test_results FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS practice_test_results_user_idx ON public.practice_test_results (user_id, test_key, taken_on);
