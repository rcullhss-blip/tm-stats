-- TM Stats: travel team selection (November 2026)
-- Run once in Supabase: SQL Editor > New query > paste > Run. Safe to run more than once.
-- Stores the coach's picks for each team: rounds left out, the travel squad, notes per player.
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS selection JSONB;
