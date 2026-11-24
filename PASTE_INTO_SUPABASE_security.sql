-- TM Stats security lock, 24 Nov 2026
-- Paste the whole file into the Supabase SQL editor and press Run. Safe to run twice.
--
-- What it does: a signed-in user can still edit their own profile (name,
-- handicap, coach voice, leaderboard settings and so on), but can no longer
-- change the columns that decide what they have paid for or who they are:
-- email, subscription_status, promo_expires_at, stripe_customer_id.
-- Those can now only be changed by the server (payments, promo codes, admin
-- page, coach approval), which uses the service role.
--
-- Deploy the matching app code BEFORE running this.

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

CREATE OR REPLACE FUNCTION public.protect_user_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Server (service role) and the SQL editor are not restricted.
  IF coalesce(auth.role(), '') NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.subscription_status := 'free';
    NEW.promo_expires_at := NULL;
    NEW.stripe_customer_id := NULL;
    -- The profile email is always the email the account signed up with.
    NEW.email := coalesce((SELECT u.email FROM auth.users u WHERE u.id = NEW.id), NEW.email);
  ELSE
    NEW.id := OLD.id;
    NEW.email := OLD.email;
    NEW.subscription_status := OLD.subscription_status;
    NEW.promo_expires_at := OLD.promo_expires_at;
    NEW.stripe_customer_id := OLD.stripe_customer_id;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_user_columns() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS protect_user_columns ON public.users;
CREATE TRIGGER protect_user_columns
  BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.protect_user_columns();

-- Check 1: should return one row named protect_user_columns.
SELECT tgname FROM pg_trigger
WHERE tgrelid = 'public.users'::regclass AND NOT tgisinternal;

-- Check 2: anyone whose profile email does not match their sign-in email.
-- Should return no rows. If it returns any, tell Claude before doing anything.
SELECT p.id, p.email AS profile_email, a.email AS signin_email, p.subscription_status
FROM public.users p JOIN auth.users a ON a.id = p.id
WHERE lower(p.email) <> lower(a.email);


-- ─────────────────────────────────────────────────────────────────────────
-- Part 2: daily allowance for the AI features (coaching, mental game chat,
-- scorecard photos, voice entry, result uploads). One row per account, per
-- day, per feature. Only the server can read or write it.
CREATE TABLE IF NOT EXISTS public.ai_usage (
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  kind TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day, kind)
);
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_usage FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.bump_ai_usage(p_user UUID, p_kind TEXT, p_limit INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n INTEGER;
BEGIN
  INSERT INTO public.ai_usage (user_id, day, kind, count)
  VALUES (p_user, (now() AT TIME ZONE 'Europe/London')::date, p_kind, 1)
  ON CONFLICT (user_id, day, kind) DO UPDATE SET count = public.ai_usage.count + 1
  RETURNING count INTO n;
  RETURN n <= p_limit;
END;
$$;
REVOKE ALL ON FUNCTION public.bump_ai_usage(UUID, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bump_ai_usage(UUID, TEXT, INTEGER) TO service_role;


-- ─────────────────────────────────────────────────────────────────────────
-- Part 3: daily limit for the public forms (contact, newsletter, watch
-- pairing), so a bot cannot flood them. Keys are hashed, no raw IP is stored.
CREATE TABLE IF NOT EXISTS public.rate_limits (
  key TEXT NOT NULL,
  day DATE NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (key, day)
);
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rate_limits FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.bump_rate(p_key TEXT, p_limit INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n INTEGER;
BEGIN
  DELETE FROM public.rate_limits WHERE day < current_date - 2;
  INSERT INTO public.rate_limits (key, day, count)
  VALUES (p_key, current_date, 1)
  ON CONFLICT (key, day) DO UPDATE SET count = public.rate_limits.count + 1
  RETURNING count INTO n;
  RETURN n <= p_limit;
END;
$$;
REVOKE ALL ON FUNCTION public.bump_rate(TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bump_rate(TEXT, INTEGER) TO service_role;

-- Check 3: should list ai_usage and rate_limits.
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('ai_usage', 'rate_limits');


-- ─────────────────────────────────────────────────────────────────────────
-- Part 4: site error log. When a page or action fails for someone it is
-- recorded here, and the 9am daily job emails Rob a summary if there were any.
CREATE TABLE IF NOT EXISTS public.error_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  message TEXT,
  route TEXT,
  path TEXT,
  method TEXT,
  kind TEXT,
  stack TEXT
);
CREATE INDEX IF NOT EXISTS error_log_created_at ON public.error_log (created_at DESC);
ALTER TABLE public.error_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.error_log FROM anon, authenticated;

-- Check 4: should list ai_usage, error_log and rate_limits.
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('ai_usage', 'rate_limits', 'error_log');

-- Final check (this is the result you will see). Expected: 1, 0, 3.
SELECT
  (SELECT count(*) FROM pg_trigger WHERE tgrelid = 'public.users'::regclass AND tgname = 'protect_user_columns') AS lock_installed,
  (SELECT count(*) FROM public.users p JOIN auth.users a ON a.id = p.id WHERE lower(p.email) <> lower(a.email)) AS emails_not_matching,
  (SELECT count(*) FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('ai_usage', 'rate_limits', 'error_log')) AS new_tables;
