-- TM Stats: course library (free, built up from the rounds golfers save).
-- Two new tables plus a one-off fill from rounds already saved. Nothing existing changes.
-- Safe to run more than once. Paste the whole file into the Supabase SQL editor and press Run.
--
-- What it stores: course name, and per tee the par / yardage / stroke index for each hole.
-- It never stores who added anything.

-- 1. Matching key for course names. Must match courseNameKey() in src/lib/course-library.ts:
--    lower case, "&" to "and", dots and apostrophes dropped, other punctuation to spaces,
--    a leading "the" and trailing Golf / Club / GC / Course / CC / Country / And words removed.
CREATE OR REPLACE FUNCTION public.course_name_key(n TEXT) RETURNS TEXT
LANGUAGE sql IMMUTABLE AS $$
  SELECT COALESCE(NULLIF(btrim(regexp_replace(' ' || regexp_replace(cleaned, '^the ', ''), '( (golf|club|gc|course|cc|country|and))+$', '')), ''), cleaned)
  FROM (
    SELECT btrim(regexp_replace(regexp_replace(replace(lower(COALESCE(n, '')), '&', ' and '), '[.''’]', '', 'g'), '[^a-z0-9]+', ' ', 'g')) AS cleaned
  ) c
$$;

-- 2. Courses
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_key TEXT NOT NULL UNIQUE,
  holes SMALLINT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tee cards: one row per course and tee. Arrays hold holes 1 to 18 (blank = not known yet).
--    tee_key '' means "tee not given".
CREATE TABLE IF NOT EXISTS public.course_tees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  tee TEXT NOT NULL DEFAULT '',
  tee_key TEXT NOT NULL DEFAULT '',
  pars SMALLINT[],
  yards SMALLINT[],
  stroke_index SMALLINT[],
  rounds_seen INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (course_id, tee_key)
);

-- 4. Signed-in golfers can read the library. Nobody can write to it from the app directly:
--    saves go through the server (/api/courses/contribute), which uses the service key.
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_tees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Signed-in users read courses" ON public.courses;
CREATE POLICY "Signed-in users read courses" ON public.courses FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Signed-in users read course tees" ON public.course_tees;
CREATE POLICY "Signed-in users read course tees" ON public.course_tees FOR SELECT TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS course_tees_course_idx ON public.course_tees (course_id);

-- 5. One-off fill from rounds already saved. Old rounds have no tee, so they go on the
--    "tee not given" card. Newest round wins for each hole. Re-running adds nothing twice.
--    The course's display name is the spelling golfers used most often.
INSERT INTO public.courses (name, name_key, holes)
SELECT DISTINCT ON (k) nm, k, max_holes
FROM (
  SELECT btrim(r.course_name) AS nm, public.course_name_key(r.course_name) AS k,
    COUNT(*) AS uses, MAX(r.date) AS last_played,
    MAX(r.holes) OVER (PARTITION BY public.course_name_key(r.course_name)) AS max_holes
  FROM public.rounds r
  WHERE btrim(COALESCE(r.course_name, '')) <> ''
  GROUP BY btrim(r.course_name), public.course_name_key(r.course_name), r.holes
) x
WHERE k <> ''
ORDER BY k, uses DESC, last_played DESC
ON CONFLICT (name_key) DO NOTHING;

WITH h AS (
  SELECT public.course_name_key(r.course_name) AS k, r.id AS round_id, ho.hole_number, ho.par,
    CASE WHEN ho.shots->0->>'lieType' = 'tee' AND (ho.shots->0->>'distanceToPin') ~ '^[0-9]+(\.[0-9]+)?$'
         THEN round((ho.shots->0->>'distanceToPin')::numeric)::int END AS yds,
    r.date, r.created_at
  FROM public.rounds r
  JOIN public.holes ho ON ho.round_id = r.id
  WHERE ho.hole_number BETWEEN 1 AND 18
),
p AS (
  SELECT DISTINCT ON (k, hole_number) k, hole_number, par
  FROM h WHERE par BETWEEN 3 AND 5
  ORDER BY k, hole_number, date DESC, created_at DESC
),
y AS (
  SELECT DISTINCT ON (k, hole_number) k, hole_number, yds
  FROM h WHERE yds BETWEEN 50 AND 700
  ORDER BY k, hole_number, date DESC, created_at DESC
),
n AS (
  SELECT k, COUNT(DISTINCT round_id) AS rounds FROM h GROUP BY k
)
INSERT INTO public.course_tees (course_id, tee, tee_key, pars, yards, rounds_seen)
SELECT c.id, '', '',
  ARRAY(SELECT p.par FROM generate_series(1, 18) g LEFT JOIN p ON p.k = c.name_key AND p.hole_number = g ORDER BY g)::SMALLINT[],
  ARRAY(SELECT y.yds FROM generate_series(1, 18) g LEFT JOIN y ON y.k = c.name_key AND y.hole_number = g ORDER BY g)::SMALLINT[],
  n.rounds
FROM public.courses c
JOIN n ON n.k = c.name_key
WHERE EXISTS (SELECT 1 FROM p WHERE p.k = c.name_key)
ON CONFLICT (course_id, tee_key) DO NOTHING;

-- Check: how many courses and tee cards are in the library now
SELECT (SELECT COUNT(*) FROM public.courses) AS courses, (SELECT COUNT(*) FROM public.course_tees) AS tee_cards;
