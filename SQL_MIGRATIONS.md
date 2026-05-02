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
