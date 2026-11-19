-- TM Stats: push notifications for the iPhone and Android apps (November 2026)
-- One row per phone that has allowed notifications. Deleting the account removes them.
CREATE TABLE IF NOT EXISTS public.push_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS push_tokens_user_idx ON public.push_tokens (user_id);
