# SQL Migrations — Run in Supabase

Run these in the Supabase SQL editor. Safe to run multiple times (uses IF NOT EXISTS).

---

## 1. Handicap history (from previous sprint — run if not already done)

```sql
CREATE TABLE IF NOT EXISTS public.handicap_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  handicap NUMERIC(4,1) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.handicap_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own handicap history" ON public.handicap_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own handicap history" ON public.handicap_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own handicap history" ON public.handicap_history FOR DELETE USING (auth.uid() = user_id);
```

---

## 2. Teams

```sql
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  coach_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  join_code VARCHAR(8) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coaches manage own teams" ON public.teams FOR ALL USING (auth.uid() = coach_user_id);
CREATE POLICY "Members read their team" ON public.teams FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.team_members WHERE team_id = id AND user_id = auth.uid())
);
```

---

## 3. Team members

```sql
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coaches read team members" ON public.team_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND coach_user_id = auth.uid())
);
CREATE POLICY "Members read own membership" ON public.team_members FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Members join team" ON public.team_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Members leave team" ON public.team_members FOR DELETE USING (auth.uid() = user_id);
```

---

## 4. Coach AI challenges

```sql
CREATE TABLE IF NOT EXISTS public.coach_ai_challenges (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  round_id UUID REFERENCES public.rounds(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  coach_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  original_ai_feedback TEXT NOT NULL,
  coach_context TEXT NOT NULL,
  revised_ai_feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.coach_ai_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coaches manage own challenges" ON public.coach_ai_challenges FOR ALL USING (auth.uid() = coach_id);
CREATE POLICY "Players read own challenges" ON public.coach_ai_challenges FOR SELECT USING (auth.uid() = player_id);
```

---

## 5. Promo codes

```sql
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  duration_months INTEGER NOT NULL DEFAULT 3,
  max_uses INTEGER,
  use_count INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
-- No user-facing RLS — admin only via service role key

CREATE TABLE IF NOT EXISTS public.promo_redemptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code_id UUID REFERENCES public.promo_codes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  redeemed_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE(code_id, user_id)
);
ALTER TABLE public.promo_redemptions ENABLE ROW LEVEL SECURITY;
-- No user-facing RLS — server only
```

---

## 6. Add promo_expires_at to users

```sql
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS promo_expires_at TIMESTAMPTZ;
```

---

## 7. Add SUPABASE_SERVICE_ROLE_KEY to .env.local

Get the service role key from Supabase Dashboard → Project Settings → API → service_role key.

Add to `.env.local`:
```
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

The admin panel, promo system, and coach team management all require this key.

---

## 8. Mental Game sessions

```sql
CREATE TABLE IF NOT EXISTS public.mental_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL DEFAULT 'Chat',
  messages JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.mental_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own mental sessions" ON public.mental_sessions FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS mental_sessions_user_id_idx ON public.mental_sessions(user_id);
```

---

## 9. Blog posts (public SEO pages)

```sql
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
-- Anyone can read published posts (public blog)
CREATE POLICY "Public read blog posts" ON public.blog_posts FOR SELECT USING (true);
-- Only service role can insert/update (admin publishes via API)
```

---

## 10. Practice sessions (practice log)

```sql
CREATE TABLE IF NOT EXISTS public.practice_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  focus VARCHAR(20) NOT NULL,            -- driving | approach | short_game | putting | mental
  duration_minutes INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own practice" ON public.practice_sessions FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS practice_sessions_user_id_idx ON public.practice_sessions(user_id);
```

---

## 11. Marketing & growth automation (June 2026)

```sql
-- Lifecycle email log: one row per user per email type (prevents duplicates)
CREATE TABLE IF NOT EXISTS public.email_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  email_type VARCHAR(40) NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, email_type)
);
ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;
-- server only via service role

-- Email opt-out flag
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email_opt_out BOOLEAN NOT NULL DEFAULT false;

-- Referral codes: ties a promo code to the user who shares it
ALTER TABLE public.promo_codes ADD COLUMN IF NOT EXISTS referrer_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- Newsletter subscribers (homepage/blog capture)
CREATE TABLE IF NOT EXISTS public.subscribers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  source VARCHAR(40),
  unsubscribed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;
-- server only via service role

-- Marketing contacts (scraper v2 output + outreach drip state machine)
CREATE TABLE IF NOT EXISTS public.marketing_contacts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  organisation TEXT,
  website TEXT,
  type VARCHAR(20) NOT NULL DEFAULT 'GOLF_CLUB',   -- GOLF_CLUB | NCAA_D1 | NCAA_D2 | NCAA_D3 | CREATOR
  region TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'found',     -- found | verified | contacted | followed_up | replied | bounced | unsubscribed
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
  kind VARCHAR(20) NOT NULL DEFAULT 'club_site',   -- directory | wiki_article | club_site
  organisation TEXT,
  type VARCHAR(20) NOT NULL DEFAULT 'GOLF_CLUB',
  region TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',   -- pending | done | failed
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
```
