-- TM Stats Elite tier (November 2026)
-- Run once in Supabase: SQL Editor > New query > paste > Run.
-- Lets an account be set to 'elite'. Nothing else changes; existing accounts keep their plan.

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_subscription_status_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_subscription_status_check
  CHECK (subscription_status IN ('free', 'pro', 'elite', 'team'));
