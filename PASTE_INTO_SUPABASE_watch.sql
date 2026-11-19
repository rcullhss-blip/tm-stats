-- TM Stats: Apple Watch pairing (November 2026)
-- Run once in Supabase: SQL Editor > New query > paste > Run. Safe to run more than once.
-- A watch shows a 6 digit code; the golfer types it in Profile; the watch gets its own
-- sign-in token (only a hash is stored). Deleting the account removes both.
CREATE TABLE IF NOT EXISTS public.device_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT 'Apple Watch',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.watch_pairings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  secret_hash TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  token TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.watch_pairings ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS device_tokens_user_idx ON public.device_tokens (user_id);
