-- TM Stats — paste this WHOLE file into the Supabase SQL editor and click Run.
-- Fully idempotent: safe to run again even if parts ran before.

-- ============ 9. Blog posts (public SEO pages) ============

CREATE TABLE IF NOT EXISTS public.blog_posts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  excerpt TEXT,
  meta_title TEXT,
  meta_desc TEXT,
  keyword TEXT,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read blog posts" ON public.blog_posts;
CREATE POLICY "Public read blog posts" ON public.blog_posts FOR SELECT USING (true);

-- ============ 10. Practice sessions (practice log) ============

CREATE TABLE IF NOT EXISTS public.practice_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  focus VARCHAR(20) NOT NULL,
  duration_minutes INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own practice" ON public.practice_sessions;
CREATE POLICY "Users manage own practice" ON public.practice_sessions FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS practice_sessions_user_id_idx ON public.practice_sessions(user_id);

-- ============ 11. Marketing & growth automation ============

-- Lifecycle email log: one row per user per email type (prevents duplicates)
CREATE TABLE IF NOT EXISTS public.email_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  email_type VARCHAR(40) NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, email_type)
);
ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;

-- Email opt-out flag
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email_opt_out BOOLEAN NOT NULL DEFAULT false;

-- Referral codes: ties a promo code to the user who shares it
ALTER TABLE public.promo_codes ADD COLUMN IF NOT EXISTS referrer_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- Newsletter subscribers (homepage/blog footer capture)
CREATE TABLE IF NOT EXISTS public.subscribers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  source VARCHAR(40),
  unsubscribed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

-- Marketing contacts (scraper output + outreach drip state machine)
CREATE TABLE IF NOT EXISTS public.marketing_contacts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  organisation TEXT,
  website TEXT,
  type VARCHAR(20) NOT NULL DEFAULT 'GOLF_CLUB',
  region TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'found',
  contacted_at TIMESTAMPTZ,
  followed_up_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.marketing_contacts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS marketing_contacts_status_idx ON public.marketing_contacts(status);

-- Crawl queue for the two-stage scraper
CREATE TABLE IF NOT EXISTS public.crawl_queue (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  url TEXT NOT NULL UNIQUE,
  kind VARCHAR(20) NOT NULL DEFAULT 'club_site',
  organisation TEXT,
  type VARCHAR(20) NOT NULL DEFAULT 'GOLF_CLUB',
  region TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.crawl_queue ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS crawl_queue_status_idx ON public.crawl_queue(status);

-- Auto-blog keyword queue (seeded — add more any time)
CREATE TABLE IF NOT EXISTS public.blog_keywords (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  keyword TEXT NOT NULL UNIQUE,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.blog_keywords ENABLE ROW LEVEL SECURITY;

INSERT INTO public.blog_keywords (keyword) VALUES
  ('what is strokes gained in golf'),
  ('how to break 80 in golf'),
  ('how to break 90 in golf'),
  ('how to break 100 in golf'),
  ('golf stats tracker app — what to look for'),
  ('strokes gained for amateur golfers'),
  ('average putts per round by handicap'),
  ('how to practise golf with limited time'),
  ('golf pre-shot routine that holds up under pressure'),
  ('how to lower your golf handicap fast'),
  ('greens in regulation by handicap explained'),
  ('golf course management tips that save shots'),
  ('mental game of golf — commitment over outcome'),
  ('best golf drills for approach play'),
  ('sand save percentage — what is good for amateurs'),
  ('why your golf practice is not lowering your scores'),
  ('fairways in regulation — does driving accuracy matter'),
  ('three putting — how to stop it'),
  ('what golf stats should i track'),
  ('how golf coaches use strokes gained with students')
ON CONFLICT DO NOTHING;
