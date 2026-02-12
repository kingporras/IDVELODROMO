
-- 1) match_stats table for goals, assists, cards per player per match
CREATE TABLE public.match_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  goals integer NOT NULL DEFAULT 0,
  assists integer NOT NULL DEFAULT 0,
  yellow_cards integer NOT NULL DEFAULT 0,
  red_cards integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(match_id, user_id)
);

ALTER TABLE public.match_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manages match_stats" ON public.match_stats FOR ALL USING (is_admin());
CREATE POLICY "Authenticated read match_stats" ON public.match_stats FOR SELECT USING (true);

-- 2) videos table for Vimeo links
CREATE TABLE public.videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  vimeo_url text NOT NULL,
  match_id uuid REFERENCES public.matches(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manages videos" ON public.videos FOR ALL USING (is_admin());
CREATE POLICY "Authenticated read videos" ON public.videos FOR SELECT USING (true);

-- 3) payment_cycles table
CREATE TABLE public.payment_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month_key text NOT NULL UNIQUE,
  amount integer NOT NULL DEFAULT 25,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manages payment_cycles" ON public.payment_cycles FOR ALL USING (is_admin());
CREATE POLICY "Authenticated read payment_cycles" ON public.payment_cycles FOR SELECT USING (true);

-- 4) Add cycle_id to payments (nullable for backward compat)
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS cycle_id uuid REFERENCES public.payment_cycles(id) ON DELETE CASCADE;

-- Add unique constraint for cycle payments
ALTER TABLE public.payments ADD CONSTRAINT payments_cycle_user_unique UNIQUE (cycle_id, user_id);

-- 5) Add new columns to matches
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS result_text text;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS highlights_note text;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS formation text DEFAULT '2-3-1';

-- 6) Enable realtime for match_stats for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.match_stats;
