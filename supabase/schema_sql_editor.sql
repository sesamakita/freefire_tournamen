-- ==============================================================================
-- ARENAKU — FREE FIRE TOURNAMENT MANAGEMENT PLATFORM
-- FULL DATABASE SCHEMA FOR SUPABASE SQL EDITOR
-- ==============================================================================
-- Cara pakai:
-- 1. Buka Supabase Dashboard: https://supabase.com/dashboard/project/wjeihkfdcoppnxlnoumj
-- 2. Masuk ke menu "SQL Editor" di sidebar kiri
-- 3. Klik "New query"
-- 4. Copy-paste seluruh isi file ini ke editor
-- 5. Klik "Run" (atau tekan Ctrl + Enter)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. EXTENSIONS
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 2. DROP EXISTING OBJECTS (Untuk memastikan clean installation jika dijalankan ulang)
-- ------------------------------------------------------------------------------
DROP VIEW IF EXISTS public.standings CASCADE;

DROP TABLE IF EXISTS public.disputes CASCADE;
DROP TABLE IF EXISTS public.results CASCADE;
DROP TABLE IF EXISTS public.match_teams CASCADE;
DROP TABLE IF EXISTS public.matches CASCADE;
DROP TABLE IF EXISTS public.team_members CASCADE;
DROP TABLE IF EXISTS public.team_invitations CASCADE;
DROP TABLE IF EXISTS public.teams CASCADE;
DROP TABLE IF EXISTS public.tournament_staff CASCADE;
DROP TABLE IF EXISTS public.tournaments CASCADE;
DROP TABLE IF EXISTS public.audit_log CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

DROP TYPE IF EXISTS dispute_status CASCADE;
DROP TYPE IF EXISTS result_status CASCADE;
DROP TYPE IF EXISTS match_status CASCADE;
DROP TYPE IF EXISTS role_tim CASCADE;
DROP TYPE IF EXISTS invite_status CASCADE;
DROP TYPE IF EXISTS verification_status CASCADE;
DROP TYPE IF EXISTS payment_status CASCADE;
DROP TYPE IF EXISTS staff_role CASCADE;
DROP TYPE IF EXISTS tournament_status CASCADE;

-- ------------------------------------------------------------------------------
-- 3. ENUMS
-- ------------------------------------------------------------------------------
CREATE TYPE tournament_status   AS ENUM ('draft', 'open', 'closed', 'running', 'done');
CREATE TYPE staff_role          AS ENUM ('owner', 'admin', 'panitia');
CREATE TYPE payment_status      AS ENUM ('unpaid', 'submitted', 'verified', 'rejected');
CREATE TYPE verification_status AS ENUM ('draft', 'pending', 'approved', 'rejected');
CREATE TYPE invite_status       AS ENUM ('pending', 'accepted', 'declined', 'expired');
CREATE TYPE role_tim            AS ENUM ('rusher', 'sniper', 'support', 'igl', 'cadangan');
CREATE TYPE match_status        AS ENUM ('scheduled', 'ongoing', 'selesai', 'dibatalkan');
CREATE TYPE result_status       AS ENUM ('draft', 'pending', 'approved', 'rejected', 'disputed');
CREATE TYPE dispute_status      AS ENUM ('open', 'upheld', 'rejected');

-- ------------------------------------------------------------------------------
-- 4. TABLES
-- ------------------------------------------------------------------------------

-- 4.1 USERS (Profil aplikasi yang terhubung ke auth.users Supabase)
CREATE TABLE public.users (
  id                UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email             TEXT        NOT NULL UNIQUE,
  nama              TEXT        NOT NULL CHECK (LENGTH(TRIM(nama)) BETWEEN 2 AND 60),
  no_wa             TEXT        NOT NULL CHECK (no_wa ~ '^(08|62)[0-9]{8,13}$'),
  email_verified_at TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.2 TOURNAMENTS
CREATE TABLE public.tournaments (
  id                  UUID              PRIMARY KEY DEFAULT uuid_generate_v4(),
  organizer_id        UUID              NOT NULL REFERENCES public.users(id),
  nama                TEXT              NOT NULL CHECK (LENGTH(TRIM(nama)) BETWEEN 3 AND 100),
  slug                TEXT              NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]{3,60}$'),
  deskripsi           TEXT,
  logo_url            TEXT,
  banner_url          TEXT,
  entry_fee           INTEGER           NOT NULL DEFAULT 0 CHECK (entry_fee >= 0),
  qris_image_url      TEXT,             -- Panduan pembayaran transfer manual QRIS
  point_config        JSONB             NOT NULL DEFAULT '{"placement_points":{"1":12,"2":9,"3":8,"4":7,"5":6,"6":5,"7":4,"8":3,"9":2,"10":1},"kill_point":1}',
  point_config_locked BOOLEAN           NOT NULL DEFAULT FALSE,
  max_teams           INTEGER           NOT NULL DEFAULT 32 CHECK (max_teams BETWEEN 2 AND 64),
  tgl_mulai           DATE              NOT NULL,
  tgl_selesai         DATE              NOT NULL CHECK (tgl_selesai >= tgl_mulai),
  status              tournament_status NOT NULL DEFAULT 'draft',
  is_public           BOOLEAN           NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

-- 4.3 TOURNAMENT STAFF
CREATE TABLE public.tournament_staff (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID        NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  user_id       UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role          staff_role  NOT NULL,
  invited_by    UUID        REFERENCES public.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tournament_id, user_id)
);

-- 4.4 TEAMS
CREATE TABLE public.teams (
  id                  UUID                PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id       UUID                NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  kapten_user_id      UUID                NOT NULL REFERENCES public.users(id),
  nama                TEXT                NOT NULL CHECK (LENGTH(TRIM(nama)) BETWEEN 3 AND 30 AND nama ~ '^[a-zA-Z0-9 _\-]+$'),
  logo_url            TEXT,
  payment_status      payment_status      NOT NULL DEFAULT 'unpaid',
  payment_proof_url   TEXT,
  verification_status verification_status NOT NULL DEFAULT 'draft',
  rejection_reason    TEXT,
  verified_by         UUID                REFERENCES public.users(id),
  verified_at         TIMESTAMPTZ,
  is_manual           BOOLEAN             NOT NULL DEFAULT FALSE,  -- F4: Dibuat manual oleh admin
  created_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  UNIQUE(tournament_id, kapten_user_id)   -- 1 kapten hanya boleh punya 1 tim per turnamen
);

CREATE UNIQUE INDEX teams_tournament_nama_ci_idx
  ON public.teams (tournament_id, LOWER(TRIM(nama)));

-- 4.5 TEAM INVITATIONS (Alur Undangan Anggota: Keputusan F1 & Q2)
CREATE TABLE public.team_invitations (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id         UUID          NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  invited_by      UUID          NOT NULL REFERENCES public.users(id),
  invited_email   TEXT          NOT NULL,
  invited_user_id UUID          REFERENCES public.users(id),
  token           TEXT          NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  ign             TEXT          NOT NULL CHECK (LENGTH(ign) BETWEEN 3 AND 20),
  uid_game        TEXT          NOT NULL CHECK (uid_game ~ '^[0-9]{8,12}$'),
  role_tim        role_tim      NOT NULL DEFAULT 'rusher',
  is_substitute   BOOLEAN       NOT NULL DEFAULT FALSE,
  status          invite_status NOT NULL DEFAULT 'pending',
  expires_at      TIMESTAMPTZ   NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- 4.6 TEAM MEMBERS (Semua pemain wajib punya akun: user_id NOT NULL)
CREATE TABLE public.team_members (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id       UUID        NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id       UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  ign           TEXT        NOT NULL CHECK (LENGTH(ign) BETWEEN 3 AND 20),
  uid_game      TEXT        NOT NULL CHECK (uid_game ~ '^[0-9]{8,12}$'),
  role_tim      role_tim    NOT NULL DEFAULT 'rusher',
  is_substitute BOOLEAN     NOT NULL DEFAULT FALSE,
  invitation_id UUID        REFERENCES public.team_invitations(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(team_id, user_id),
  UNIQUE(team_id, uid_game)
);

-- 4.7 MATCHES
CREATE TABLE public.matches (
  id            UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID         NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  nama          TEXT         NOT NULL,
  round         INTEGER      NOT NULL DEFAULT 1 CHECK (round > 0),
  grup          TEXT,
  jadwal        TIMESTAMPTZ  NOT NULL,
  room_id       TEXT,        -- Sensitif: Hanya bisa diakses melalui endpoint terproteksi
  room_pass     TEXT,
  status        match_status NOT NULL DEFAULT 'scheduled',
  published_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 4.8 MATCH TEAMS (Slot turnamen)
CREATE TABLE public.match_teams (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id   UUID        NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  team_id    UUID        NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  slot       INTEGER     NOT NULL CHECK (slot > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(match_id, team_id),
  UNIQUE(match_id, slot)
);

-- 4.9 RESULTS
CREATE TABLE public.results (
  id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id         UUID          NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  team_id          UUID          NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  placement        INTEGER       NOT NULL CHECK (placement BETWEEN 1 AND 25),
  kills            INTEGER       NOT NULL CHECK (kills BETWEEN 0 AND 40),
  points           INTEGER       NOT NULL DEFAULT 0,
  screenshot_url   TEXT          NOT NULL,
  submitted_by     UUID          NOT NULL REFERENCES public.users(id),
  submitted_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  verified_by      UUID          REFERENCES public.users(id),
  verified_at      TIMESTAMPTZ,
  status           result_status NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  is_recalculated  BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE(match_id, team_id)
);

CREATE UNIQUE INDEX results_match_placement_active_idx
  ON public.results (match_id, placement)
  WHERE status NOT IN ('rejected', 'draft');

-- 4.10 DISPUTES
CREATE TABLE public.disputes (
  id              UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  result_id       UUID           NOT NULL REFERENCES public.results(id) ON DELETE CASCADE,
  team_id         UUID           NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  submitted_by    UUID           NOT NULL REFERENCES public.users(id),
  alasan          TEXT           NOT NULL CHECK (LENGTH(alasan) >= 50),
  bukti_urls      TEXT[]         DEFAULT '{}',
  status          dispute_status NOT NULL DEFAULT 'open',
  decided_by      UUID           REFERENCES public.users(id),
  decision_reason TEXT,
  decided_at      TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ    NOT NULL,
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  UNIQUE(result_id, team_id)
);

-- 4.11 AUDIT LOG (Immutable / Append-only)
CREATE TABLE public.audit_log (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID        REFERENCES public.tournaments(id) ON DELETE SET NULL,
  actor_id      UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  action        TEXT        NOT NULL,
  entity        TEXT        NOT NULL,
  entity_id     UUID        NOT NULL,
  before_data   JSONB,
  after_data    JSONB,
  reason        TEXT,
  ip            TEXT,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 5. INDEXES
-- ------------------------------------------------------------------------------
CREATE INDEX idx_tournaments_status_pub ON public.tournaments (status, is_public);
CREATE INDEX idx_tournaments_organizer  ON public.tournaments (organizer_id);

CREATE INDEX idx_teams_tourn_status     ON public.teams (tournament_id, verification_status);
CREATE INDEX idx_team_inv_status        ON public.team_invitations (team_id, status);
CREATE INDEX idx_team_inv_email         ON public.team_invitations (invited_email);
CREATE INDEX idx_team_members_user      ON public.team_members (user_id);

CREATE INDEX idx_matches_tourn_status   ON public.matches (tournament_id, status);
CREATE INDEX idx_matches_tourn_jadwal   ON public.matches (tournament_id, jadwal);

CREATE INDEX idx_results_match_status   ON public.results (match_id, status);
CREATE INDEX idx_results_team           ON public.results (team_id);

CREATE INDEX idx_audit_log_tourn        ON public.audit_log (tournament_id, created_at DESC);
CREATE INDEX idx_audit_log_entity       ON public.audit_log (entity, entity_id, created_at DESC);

-- ------------------------------------------------------------------------------
-- 6. FUNCTIONS & TRIGGERS
-- ------------------------------------------------------------------------------

-- 6.1 Auto Updated_At
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_tournaments_updated_at
  BEFORE UPDATE ON public.tournaments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_matches_updated_at
  BEFORE UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_results_updated_at
  BEFORE UPDATE ON public.results
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6.2 Auto-sync User Baru dari Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, nama, no_wa, email_verified_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nama', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'no_wa', '081234567890'),
    NEW.email_confirmed_at
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      email_verified_at = EXCLUDED.email_verified_at;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- 6.3 Server-Side Points Calculation (BR-SCR-11)
CREATE OR REPLACE FUNCTION public.calculate_points()
RETURNS TRIGGER AS $$
DECLARE
  config        JSONB;
  placement_pts INTEGER;
  kill_pt       INTEGER;
BEGIN
  SELECT t.point_config INTO config
  FROM public.matches m
  JOIN public.tournaments t ON t.id = m.tournament_id
  WHERE m.id = NEW.match_id;

  placement_pts := COALESCE(
    (config->'placement_points'->>NEW.placement::TEXT)::INTEGER, 0
  );
  kill_pt := COALESCE((config->>'kill_point')::INTEGER, 1);
  NEW.points := placement_pts + (NEW.kills * kill_pt);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_results_calculate_points
  BEFORE INSERT OR UPDATE OF placement, kills ON public.results
  FOR EACH ROW EXECUTE FUNCTION public.calculate_points();

-- 6.4 Prevent Duplicate UID in Tournament (BR-ROST-03)
CREATE OR REPLACE FUNCTION public.check_uid_unique_in_tournament()
RETURNS TRIGGER AS $$
DECLARE
  v_tournament_id UUID;
  conflict_team   TEXT;
BEGIN
  SELECT t.tournament_id INTO v_tournament_id
  FROM public.teams t WHERE t.id = NEW.team_id;

  SELECT t.nama INTO conflict_team
  FROM public.team_members tm
  JOIN public.teams t ON t.id = tm.team_id
  WHERE t.tournament_id = v_tournament_id
    AND tm.uid_game = NEW.uid_game
    AND tm.id != NEW.id
  LIMIT 1;

  IF conflict_team IS NOT NULL THEN
    RAISE EXCEPTION 'ROSTER_UID_DUPLICATE: UID game sudah terdaftar di tim %', conflict_team;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_team_members_uid_check
  BEFORE INSERT OR UPDATE OF uid_game ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.check_uid_unique_in_tournament();

-- 6.5 Lock Point Config on First Approved Result (BR-SCR-13)
CREATE OR REPLACE FUNCTION public.lock_point_config()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD IS NULL OR OLD.status != 'approved') THEN
    UPDATE public.tournaments t
    SET point_config_locked = TRUE
    FROM public.matches m
    WHERE m.id = NEW.match_id
      AND t.id = m.tournament_id
      AND t.point_config_locked = FALSE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_results_lock_point_config
  AFTER INSERT OR UPDATE OF status ON public.results
  FOR EACH ROW EXECUTE FUNCTION public.lock_point_config();

-- 6.6 Auto-reject Pending Teams when Tournament Closed (PRD §7.1)
CREATE OR REPLACE FUNCTION public.auto_reject_pending_teams()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'closed' AND OLD.status = 'open' THEN
    UPDATE public.teams
    SET verification_status = 'rejected',
        rejection_reason    = 'Pendaftaran otomatis ditolak karena periode pendaftaran turnamen telah ditutup.'
    WHERE tournament_id = NEW.id
      AND verification_status = 'pending';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_tournaments_auto_reject
  AFTER UPDATE OF status ON public.tournaments
  FOR EACH ROW EXECUTE FUNCTION public.auto_reject_pending_teams();

-- ------------------------------------------------------------------------------
-- 7. STANDINGS VIEW (Dihitung On-The-Fly, BR-CLS-01)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.standings AS
SELECT
  t.id                                        AS team_id,
  t.tournament_id,
  t.nama                                      AS team_nama,
  t.logo_url,
  COUNT(r.id)                                 AS matches_played,
  COALESCE(SUM(r.kills), 0)                   AS total_kills,
  COALESCE(SUM(r.points), 0)                  AS total_points,
  MIN(r.placement)                            AS best_placement,
  MIN(r.submitted_at)                         AS earliest_submit,
  RANK() OVER (
    PARTITION BY t.tournament_id
    ORDER BY
      COALESCE(SUM(r.points), 0)  DESC,   -- BR-CLS-03 urutan 1
      COALESCE(SUM(r.kills), 0)   DESC,   -- urutan 2: total kills
      MIN(r.placement)            ASC,    -- urutan 3: best placement
      MIN(r.submitted_at)         ASC     -- urutan 4: earliest submit
  )                                           AS rank
FROM public.teams t
LEFT JOIN public.results r
  ON  r.team_id  = t.id
  AND r.status   = 'approved'
  AND EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = r.match_id AND m.status = 'selesai'
  )
WHERE t.verification_status = 'approved'
GROUP BY t.id, t.tournament_id, t.nama, t.logo_url;

-- ------------------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_teams      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.results          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log        ENABLE ROW LEVEL SECURITY;

-- Helper Staff Check
CREATE OR REPLACE FUNCTION public.is_tournament_staff(tid UUID, roles staff_role[])
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tournament_staff
    WHERE tournament_id = tid
      AND user_id = auth.uid()
      AND role = ANY(roles)
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 8.1 Users
CREATE POLICY "users_read_all" ON public.users
  FOR SELECT USING (TRUE);

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- 8.2 Tournaments
CREATE POLICY "tournaments_public_read" ON public.tournaments
  FOR SELECT USING (is_public = TRUE AND status != 'draft');

CREATE POLICY "tournaments_staff_all" ON public.tournaments
  FOR ALL USING (
    organizer_id = auth.uid() OR
    is_tournament_staff(id, ARRAY['owner','admin','panitia']::staff_role[])
  );

-- 8.3 Tournament Staff
CREATE POLICY "staff_read" ON public.tournament_staff
  FOR SELECT USING (
    user_id = auth.uid() OR
    is_tournament_staff(tournament_id, ARRAY['owner','admin']::staff_role[])
  );

CREATE POLICY "staff_manage_admin" ON public.tournament_staff
  FOR ALL USING (
    is_tournament_staff(tournament_id, ARRAY['owner','admin']::staff_role[])
  );

-- 8.4 Teams
CREATE POLICY "teams_public_read" ON public.teams
  FOR SELECT USING (verification_status = 'approved');

CREATE POLICY "teams_captain_access" ON public.teams
  FOR ALL USING (kapten_user_id = auth.uid());

CREATE POLICY "teams_staff_access" ON public.teams
  FOR ALL USING (
    is_tournament_staff(tournament_id, ARRAY['owner','admin','panitia']::staff_role[])
  );

-- 8.5 Team Members & Invitations
CREATE POLICY "team_members_read" ON public.team_members
  FOR SELECT USING (TRUE);

CREATE POLICY "team_members_captain_admin" ON public.team_members
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.kapten_user_id = auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_id AND is_tournament_staff(t.tournament_id, ARRAY['owner','admin']::staff_role[])
    )
  );

CREATE POLICY "team_invitations_access" ON public.team_invitations
  FOR ALL USING (
    invited_by = auth.uid() OR
    invited_email = (SELECT email FROM public.users WHERE id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.kapten_user_id = auth.uid())
  );

-- 8.6 Matches & Match Teams
CREATE POLICY "matches_read" ON public.matches
  FOR SELECT USING (
    published_at IS NOT NULL AND
    EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = tournament_id AND t.is_public = TRUE AND t.status != 'draft')
  );

CREATE POLICY "matches_staff_manage" ON public.matches
  FOR ALL USING (
    is_tournament_staff(tournament_id, ARRAY['owner','admin','panitia']::staff_role[])
  );

CREATE POLICY "match_teams_read" ON public.match_teams
  FOR SELECT USING (TRUE);

CREATE POLICY "match_teams_staff_manage" ON public.match_teams
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id AND is_tournament_staff(m.tournament_id, ARRAY['owner','admin','panitia']::staff_role[])
    )
  );

-- 8.7 Results & Disputes
CREATE POLICY "results_read_approved" ON public.results
  FOR SELECT USING (status = 'approved');

CREATE POLICY "results_staff_manage" ON public.results
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id AND is_tournament_staff(m.tournament_id, ARRAY['owner','admin','panitia']::staff_role[])
    )
  );

CREATE POLICY "disputes_access" ON public.disputes
  FOR ALL USING (
    submitted_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.results r
      JOIN public.matches m ON m.id = r.match_id
      WHERE r.id = result_id AND is_tournament_staff(m.tournament_id, ARRAY['owner','admin']::staff_role[])
    )
  );

-- 8.8 Audit Log (Append-Only)
CREATE POLICY "audit_log_admin_read" ON public.audit_log
  FOR SELECT USING (
    is_tournament_staff(tournament_id, ARRAY['owner','admin']::staff_role[])
  );

CREATE POLICY "audit_log_insert" ON public.audit_log
  FOR INSERT WITH CHECK (TRUE);

-- ------------------------------------------------------------------------------
-- 9. SUPABASE STORAGE BUCKETS SETUP
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('logos', 'logos', true),
  ('banners', 'banners', true),
  ('qris', 'qris', true),
  ('payments', 'payments', false),
  ('screenshots', 'screenshots', false),
  ('disputes', 'disputes', false)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- Policy Storage: Publik untuk logo, banner, qris
CREATE POLICY "Public Access for logos, banners, qris"
ON storage.objects FOR SELECT
USING (bucket_id IN ('logos', 'banners', 'qris'));

-- Policy Storage: Upload autentikasi
CREATE POLICY "Authenticated Users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id IN ('logos', 'banners', 'qris', 'payments', 'screenshots', 'disputes'));

CREATE POLICY "Users can read own uploaded files or staff"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id IN ('payments', 'screenshots', 'disputes'));

-- ==============================================================================
-- SELESAI. Database ArenaKu siap digunakan!
-- ==============================================================================
