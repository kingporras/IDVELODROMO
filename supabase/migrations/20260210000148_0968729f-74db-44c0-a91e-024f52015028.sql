
-- 1. Role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'jugador');

-- 2. Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  dorsal INTEGER NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. User roles table (separate for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'jugador',
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Matches table
CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_date TIMESTAMPTZ NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  location_name TEXT NOT NULL DEFAULT 'Velòdrom F7',
  city TEXT NOT NULL DEFAULT 'Barcelona',
  league_name TEXT NOT NULL DEFAULT '2a Lliga Velòdrom F7',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- 5. Convocations table
CREATE TABLE public.convocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE UNIQUE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  capacity INTEGER NOT NULL DEFAULT 14,
  reset_at TIMESTAMPTZ,
  last_reminder_sent_at TIMESTAMPTZ,
  last_payment_email_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.convocations ENABLE ROW LEVEL SECURITY;

-- 6. Convocation responses
CREATE TABLE public.convocation_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  convocation_id UUID NOT NULL REFERENCES public.convocations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'yes', 'no', 'maybe')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(convocation_id, user_id)
);
ALTER TABLE public.convocation_responses ENABLE ROW LEVEL SECURITY;

-- 7. MVP votes
CREATE TABLE public.mvp_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  voter_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  voted_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(match_id, voter_user_id)
);
ALTER TABLE public.mvp_votes ENABLE ROW LEVEL SECURITY;

-- 8. Lineups
CREATE TABLE public.lineups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  position TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(match_id, user_id)
);
ALTER TABLE public.lineups ENABLE ROW LEVEL SECURITY;

-- 9. Payments
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('paid', 'pending')),
  paid_at TIMESTAMPTZ,
  note TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 10. App settings (singleton)
CREATE TABLE public.app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  default_capacity INTEGER NOT NULL DEFAULT 14,
  instagram_handle TEXT DEFAULT '@interdeverdunbcn',
  league_url TEXT DEFAULT 'https://apuntamelo.com/grupo/9/26/0/653/0/2795/0',
  team_url TEXT DEFAULT 'https://apuntamelo.com/equipo/9/26/0/653/0/2795/24169/0',
  payment_instructions TEXT DEFAULT 'Cuota mensual: 25€. Bizum al número del capitán.',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- 11. Helper function: has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 12. Helper: is_admin shortcut
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
$$;

-- 13. Trigger: auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, dorsal, display_name, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'username',
    (NEW.raw_user_meta_data->>'dorsal')::INTEGER,
    NEW.raw_user_meta_data->>'display_name',
    NEW.email
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'jugador')
  );
  
  INSERT INTO public.payments (user_id, status)
  VALUES (NEW.id, 'pending');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 14. RLS Policies

-- Profiles: everyone authenticated can read all profiles (needed for MVP votes, lineups display)
CREATE POLICY "Authenticated can read profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "Admin full access profiles" ON public.profiles
  FOR ALL TO authenticated USING (public.is_admin());

-- User roles: only admin
CREATE POLICY "Admin manages roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Users can read own role" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Matches: all authenticated read, admin write
CREATE POLICY "Authenticated read matches" ON public.matches
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manages matches" ON public.matches
  FOR ALL TO authenticated USING (public.is_admin());

-- Convocations: all authenticated read, admin write
CREATE POLICY "Authenticated read convocations" ON public.convocations
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manages convocations" ON public.convocations
  FOR ALL TO authenticated USING (public.is_admin());

-- Convocation responses: read all (for counters), write own
CREATE POLICY "Authenticated read responses" ON public.convocation_responses
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users manage own response" ON public.convocation_responses
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own response" ON public.convocation_responses
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admin manages responses" ON public.convocation_responses
  FOR ALL TO authenticated USING (public.is_admin());

-- MVP votes: read all (for results), insert own
CREATE POLICY "Authenticated read votes" ON public.mvp_votes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own vote" ON public.mvp_votes
  FOR INSERT TO authenticated WITH CHECK (voter_user_id = auth.uid());
CREATE POLICY "Admin manages votes" ON public.mvp_votes
  FOR ALL TO authenticated USING (public.is_admin());

-- Lineups: all read, admin write
CREATE POLICY "Authenticated read lineups" ON public.lineups
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manages lineups" ON public.lineups
  FOR ALL TO authenticated USING (public.is_admin());

-- Payments: admin only
CREATE POLICY "Admin manages payments" ON public.payments
  FOR ALL TO authenticated USING (public.is_admin());

-- App settings: all read, admin write
CREATE POLICY "Authenticated read settings" ON public.app_settings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manages settings" ON public.app_settings
  FOR ALL TO authenticated USING (public.is_admin());

-- 15. Seed app_settings
INSERT INTO public.app_settings (default_capacity, instagram_handle, league_url, team_url)
VALUES (14, '@interdeverdunbcn', 'https://apuntamelo.com/grupo/9/26/0/653/0/2795/0', 'https://apuntamelo.com/equipo/9/26/0/653/0/2795/24169/0');

-- 16. Seed matches (16 partidos)
INSERT INTO public.matches (match_date, home_team, away_team) VALUES
  ('2026-02-19T22:05:00+01:00', 'ONSE FC', 'EL INTER DE VERDUN'),
  ('2026-02-26T20:15:00+01:00', 'EL INTER DE VERDUN', 'Nacional'),
  ('2026-03-05T22:05:00+01:00', 'Sparta', 'EL INTER DE VERDUN'),
  ('2026-03-12T21:10:00+01:00', 'EL INTER DE VERDUN', 'Hulk City'),
  ('2026-03-19T23:00:00+01:00', 'Changos Camperos', 'EL INTER DE VERDUN'),
  ('2026-03-26T21:10:00+01:00', 'EL INTER DE VERDUN', 'Paella'),
  ('2026-04-09T20:15:00+02:00', 'MINGORRUBIO BALOMPIÉ', 'EL INTER DE VERDUN'),
  ('2026-04-16T22:05:00+02:00', 'EL INTER DE VERDUN', 'SMASH BROTHERS'),
  ('2026-04-30T21:10:00+02:00', 'ONSE FC', 'EL INTER DE VERDUN'),
  ('2026-05-07T22:05:00+02:00', 'EL INTER DE VERDUN', 'Nacional'),
  ('2026-05-14T21:10:00+02:00', 'Sparta', 'EL INTER DE VERDUN'),
  ('2026-05-21T20:15:00+02:00', 'EL INTER DE VERDUN', 'Hulk City'),
  ('2026-05-28T23:00:00+02:00', 'Changos Camperos', 'EL INTER DE VERDUN'),
  ('2026-06-04T20:15:00+02:00', 'EL INTER DE VERDUN', 'Paella'),
  ('2026-06-11T20:15:00+02:00', 'MINGORRUBIO BALOMPIÉ', 'EL INTER DE VERDUN'),
  ('2026-06-18T21:10:00+02:00', 'EL INTER DE VERDUN', 'SMASH BROTHERS');
