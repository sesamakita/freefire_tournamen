# TDD — Platform Lomba Free Fire (ArenaKu)

| Field | Isi |
|---|---|
| **Nama Dokumen** | Technical Design Document (TDD) |
| **Versi** | 1.0 (Draft) |
| **Tanggal** | 2026-10-18 |
| **Referensi Induk** | `PRD_PLATFORM_LOMBA_FREEFIRE.md` v1.0 · `FSD_PLATFORM_LOMBA_FREEFIRE.md` v1.0 |
| **Status** | Draft |
| **Audiens** | Engineer, DevOps, Tech Lead |

---

## 0. Hierarki Dokumen

| Dokumen | Menjawab |
|---|---|
| PRD | Mengapa & Apa |
| FSD | Bagaimana perilakunya |
| **TDD ← dokumen ini** | **Bagaimana dibangun** |
| API Spec | Kontrak data (request/response detail) |

---

## 1. Stack Decisions

### 1.1 Stack MVP

| Layer | Teknologi | Versi | Alasan |
|---|---|---|---|
| **Framework** | Next.js (App Router) | 14+ | SSR untuk halaman publik (SEO + performa 3G), RSC untuk data fetching efisien, API Routes untuk backend |
| **Language** | TypeScript | 5+ | Type safety, autocompletion, refactor aman |
| **Database** | Supabase (PostgreSQL 15) | — | Managed Postgres + Auth + Storage + RLS; tidak perlu manage server sendiri di MVP |
| **Auth** | Supabase Auth | — | Built-in session management, email OTP, JWT; tidak perlu implement dari nol |
| **File Storage** | Supabase Storage | — | Object storage terkelola; tidak simpan file di disk |
| **Styling** | Tailwind CSS + shadcn/ui | 3+ | Utility-first, mobile-first, komponen siap pakai |
| **Validasi** | Zod | 3+ | Schema validation di server & client, integrasi react-hook-form |
| **Form** | React Hook Form | 7+ | Performa, uncontrolled, integrasi Zod |
| **Email** | Resend | — | Transactional email; gratis s/d 3.000/bulan |
| **Deployment** | Vercel | — | Zero-config Next.js, CDN global, preview deploys per PR |
| **VCS** | GitHub | — | CI/CD via Vercel-GitHub integration |

### 1.2 Keputusan Arsitektur Kunci

| Keputusan | Pilihan | Alasan |
|---|---|---|
| **Monorepo vs polyrepo** | Monorepo (satu repo) | MVP; tidak perlu overhead tooling |
| **ORM vs raw SQL** | Supabase client (PostgREST) + `supabase.rpc()` | Cukup untuk MVP; hindari ORM tambahan |
| **State management** | React built-in (useState, Server Components) | Tidak perlu Redux/Zustand di MVP |
| **Klasemen** | Dihitung on-the-fly di DB (SQL view) | FSD BR-CLS-01; satu sumber kebenaran |
| **Real-time** | Supabase Realtime | Sudah tersedia; pakai untuk klasemen & notifikasi in-app |
| **Upload** | Client → Supabase Storage (signed URL) | Bypass server; lebih cepat, tidak membebani Vercel |
| **Session** | Supabase Auth cookie-based via `@supabase/ssr` | httpOnly cookie, sesuai NFR keamanan |

### 1.3 Fase VPS (pasca-MVP)

Ketika migrasi ke VPS:
- Supabase self-hosted (Docker Compose) atau tetap Supabase cloud
- Next.js di-deploy via Docker atau PM2
- Nginx sebagai reverse proxy + SSL (Let's Encrypt)

---

## 2. Arsitektur Overview

```
┌─────────────────────────────────────────────────────┐
│                    Browser (HP/Desktop)              │
│           Next.js App (SSR + Client Components)      │
└────────────────────────┬────────────────────────────┘
                         │ HTTPS
              ┌──────────▼──────────┐
              │       Vercel         │
              │  (Next.js + Edge)    │
              │  /app/** (pages)     │
              │  /api/** (routes)    │
              └──────────┬──────────┘
                         │
              ┌──────────▼──────────┐
              │      Supabase        │
              │  ┌───────────────┐  │
              │  │  PostgreSQL   │  │  ← DB + RLS
              │  ├───────────────┤  │
              │  │  Auth         │  │  ← Session, JWT
              │  ├───────────────┤  │
              │  │  Storage      │  │  ← File uploads
              │  ├───────────────┤  │
              │  │  Realtime     │  │  ← Live updates
              │  └───────────────┘  │
              └─────────────────────┘
                         │
              ┌──────────▼──────────┐
              │       Resend         │  ← Email transaksional
              └─────────────────────┘
```

---

## 3. Struktur Folder

```
ff_tournamen/
├── docs/
│   ├── PRD_PLATFORM_LOMBA_FREEFIRE.md
│   ├── FSD_PLATFORM_LOMBA_FREEFIRE.md
│   └── TDD_PLATFORM_LOMBA_FREEFIRE.md
│
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   │   ├── 20260218000000_initial_schema.sql
│   │   ├── 20260218000001_rls_policies.sql
│   │   └── 20260218000002_functions_triggers.sql
│   └── seed.sql
│
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx               # SCR-A01
│   │   │   ├── register/page.tsx            # SCR-A02
│   │   │   └── lupa-password/page.tsx       # SCR-A03
│   │   │
│   │   ├── (public)/
│   │   │   └── t/[slug]/
│   │   │       ├── page.tsx                 # SCR-P03
│   │   │       ├── klasemen/page.tsx        # SCR-P01
│   │   │       └── jadwal/page.tsx          # SCR-P02
│   │   │
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx                   # Auth guard + sidebar
│   │   │   ├── dashboard/page.tsx           # SCR-D01 / SCR-D02
│   │   │   ├── tim/
│   │   │   │   ├── buat/page.tsx            # SCR-T01
│   │   │   │   ├── [teamId]/
│   │   │   │   │   ├── roster/page.tsx      # SCR-T02
│   │   │   │   │   ├── bayar/page.tsx       # SCR-T03
│   │   │   │   │   ├── status/page.tsx      # SCR-T04
│   │   │   │   │   ├── jadwal/page.tsx      # SCR-T05
│   │   │   │   │   ├── dispute/page.tsx     # SCR-T06
│   │   │   │   │   └── undang/page.tsx      # SCR-T07 (BARU)
│   │   │   │   └── bergabung/[token]/page.tsx # SCR-T08 (BARU)
│   │   │   └── admin/
│   │   │       └── [tournamentId]/
│   │   │           ├── verifikasi/page.tsx  # SCR-V01
│   │   │           ├── match/page.tsx       # SCR-M01
│   │   │           ├── room/page.tsx        # SCR-M02
│   │   │           ├── skor/
│   │   │           │   ├── input/page.tsx   # SCR-S01
│   │   │           │   └── approve/page.tsx # SCR-S02
│   │   │           ├── dispute/page.tsx     # SCR-S03
│   │   │           └── audit/page.tsx       # SCR-AUD01
│   │   │
│   │   ├── api/
│   │   │   ├── auth/[...]/route.ts
│   │   │   ├── tournaments/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts
│   │   │   │       ├── status/route.ts
│   │   │   │       ├── teams/
│   │   │   │       │   ├── route.ts
│   │   │   │       │   └── [teamId]/
│   │   │   │       │       ├── route.ts
│   │   │   │       │       ├── verify/route.ts
│   │   │   │       │       ├── payment/route.ts
│   │   │   │       │       └── members/route.ts
│   │   │   │       ├── matches/
│   │   │   │       │   ├── route.ts
│   │   │   │       │   └── [matchId]/
│   │   │   │       │       ├── route.ts
│   │   │   │       │       ├── room/route.ts
│   │   │   │       │       ├── status/route.ts
│   │   │   │       │       └── results/
│   │   │   │       │           ├── route.ts
│   │   │   │       │           └── [resultId]/
│   │   │   │       │               ├── approve/route.ts
│   │   │   │       │               └── reject/route.ts
│   │   │   │       ├── standings/route.ts
│   │   │   │       └── audit/route.ts
│   │   │   ├── invitations/
│   │   │   │   ├── route.ts
│   │   │   │   └── [token]/
│   │   │   │       ├── accept/route.ts
│   │   │   │       └── decline/route.ts
│   │   │   ├── disputes/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/decide/route.ts
│   │   │   └── upload/route.ts
│   │   │
│   │   ├── layout.tsx
│   │   └── page.tsx
│   │
│   ├── components/
│   │   ├── ui/                              # shadcn/ui
│   │   ├── auth/
│   │   ├── tournament/
│   │   ├── team/
│   │   ├── match/
│   │   └── score/
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts                    # Browser client
│   │   │   ├── server.ts                    # Server component client
│   │   │   └── admin.ts                     # Service role (audit, triggers)
│   │   ├── validations/
│   │   │   ├── auth.ts
│   │   │   ├── team.ts
│   │   │   ├── match.ts
│   │   │   ├── score.ts
│   │   │   └── dispute.ts
│   │   ├── audit.ts                         # Helper: tulis ke audit_log
│   │   ├── points.ts                        # Helper: hitung poin
│   │   ├── permissions.ts                   # Helper: cek RBAC
│   │   └── utils.ts
│   │
│   ├── types/
│   │   ├── database.types.ts                # Generate dari Supabase CLI
│   │   └── index.ts
│   │
│   └── middleware.ts                        # Auth guard
│
├── .env.local.example
├── .env.local                               # gitignored
├── next.config.ts
├── tailwind.config.ts
├── components.json                          # shadcn/ui config
└── package.json
```

---

## 4. Database Schema (Full SQL)

### 4.1 Extensions & Enums

```sql
-- supabase/migrations/20260218000000_initial_schema.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE tournament_status   AS ENUM ('draft', 'open', 'closed', 'running', 'done');
CREATE TYPE staff_role          AS ENUM ('owner', 'admin', 'panitia');
CREATE TYPE payment_status      AS ENUM ('unpaid', 'submitted', 'verified', 'rejected');
CREATE TYPE verification_status AS ENUM ('draft', 'pending', 'approved', 'rejected');
CREATE TYPE invite_status       AS ENUM ('pending', 'accepted', 'declined', 'expired');
CREATE TYPE role_tim            AS ENUM ('rusher', 'sniper', 'support', 'igl', 'cadangan');
CREATE TYPE match_status        AS ENUM ('scheduled', 'ongoing', 'selesai', 'dibatalkan');
CREATE TYPE result_status       AS ENUM ('draft', 'pending', 'approved', 'rejected', 'disputed');
CREATE TYPE dispute_status      AS ENUM ('open', 'upheld', 'rejected');
```

### 4.2 Users

```sql
CREATE TABLE public.users (
  id                UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email             TEXT        NOT NULL UNIQUE,
  nama              TEXT        NOT NULL CHECK (LENGTH(TRIM(nama)) BETWEEN 2 AND 60),
  no_wa             TEXT        NOT NULL CHECK (no_wa ~ '^(08|62)[0-9]{8,13}$'),
  email_verified_at TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 4.3 Tournaments

```sql
CREATE TABLE public.tournaments (
  id                  UUID              PRIMARY KEY DEFAULT uuid_generate_v4(),
  organizer_id        UUID              NOT NULL REFERENCES public.users(id),
  nama                TEXT              NOT NULL CHECK (LENGTH(TRIM(nama)) BETWEEN 3 AND 100),
  slug                TEXT              NOT NULL UNIQUE
                                        CHECK (slug ~ '^[a-z0-9-]{3,60}$'),
  deskripsi           TEXT,
  logo_url            TEXT,
  banner_url          TEXT,
  entry_fee           INTEGER           NOT NULL DEFAULT 0 CHECK (entry_fee >= 0),
  qris_image_url      TEXT,             -- Gambar QRIS untuk panduan pembayaran MVP
  point_config        JSONB             NOT NULL DEFAULT
                                        '{"placement_points":{"1":12,"2":9,"3":8,"4":7,
                                          "5":6,"6":5,"7":4,"8":3,"9":2,"10":1},
                                          "kill_point":1}',
  point_config_locked BOOLEAN           NOT NULL DEFAULT FALSE,
  max_teams           INTEGER           NOT NULL DEFAULT 32 CHECK (max_teams BETWEEN 2 AND 64),
  tgl_mulai           DATE              NOT NULL,
  tgl_selesai         DATE              NOT NULL CHECK (tgl_selesai >= tgl_mulai),
  status              tournament_status NOT NULL DEFAULT 'draft',
  is_public           BOOLEAN           NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

CREATE TRIGGER tournaments_updated_at
  BEFORE UPDATE ON public.tournaments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX tournaments_status_idx    ON public.tournaments (status, is_public);
CREATE INDEX tournaments_organizer_idx ON public.tournaments (organizer_id);
```

### 4.4 Tournament Staff

```sql
CREATE TABLE public.tournament_staff (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID        NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  user_id       UUID        NOT NULL REFERENCES public.users(id),
  role          staff_role  NOT NULL,
  invited_by    UUID        REFERENCES public.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tournament_id, user_id)
);

CREATE INDEX tournament_staff_user_idx ON public.tournament_staff (user_id);
```

### 4.5 Teams

```sql
CREATE TABLE public.teams (
  id                  UUID                NOT NULL DEFAULT uuid_generate_v4(),
  tournament_id       UUID                NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  kapten_user_id      UUID                NOT NULL REFERENCES public.users(id),
  nama                TEXT                NOT NULL
                                          CHECK (LENGTH(TRIM(nama)) BETWEEN 3 AND 30
                                            AND nama ~ '^[a-zA-Z0-9 _\-]+$'),
  logo_url            TEXT,
  payment_status      payment_status      NOT NULL DEFAULT 'unpaid',
  payment_proof_url   TEXT,
  verification_status verification_status NOT NULL DEFAULT 'draft',
  rejection_reason    TEXT,
  verified_by         UUID                REFERENCES public.users(id),
  verified_at         TIMESTAMPTZ,
  is_manual           BOOLEAN             NOT NULL DEFAULT FALSE,  -- F4: dibuat admin
  created_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id),
  UNIQUE(tournament_id, kapten_user_id)   -- BR-TEAM-03: satu kapten satu tim
);

-- Case-insensitive unique nama tim per turnamen (BR-TEAM-02)
CREATE UNIQUE INDEX teams_tournament_nama_ci_idx
  ON public.teams (tournament_id, LOWER(TRIM(nama)));

CREATE INDEX teams_tournament_status_idx
  ON public.teams (tournament_id, verification_status);

CREATE TRIGGER teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 4.6 Team Invitations (Baru — Keputusan F1/Q2)

```sql
CREATE TABLE public.team_invitations (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id         UUID          NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  invited_by      UUID          NOT NULL REFERENCES public.users(id),
  invited_email   TEXT          NOT NULL,
  invited_user_id UUID          REFERENCES public.users(id),  -- NULL sampai user register
  token           TEXT          NOT NULL UNIQUE
                                DEFAULT encode(gen_random_bytes(32), 'hex'),
  ign             TEXT          NOT NULL CHECK (LENGTH(ign) BETWEEN 3 AND 20),
  uid_game        TEXT          NOT NULL CHECK (uid_game ~ '^[0-9]{8,12}$'),
  role_tim        role_tim      NOT NULL DEFAULT 'rusher',
  is_substitute   BOOLEAN       NOT NULL DEFAULT FALSE,
  status          invite_status NOT NULL DEFAULT 'pending',
  expires_at      TIMESTAMPTZ   NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX team_invitations_team_idx  ON public.team_invitations (team_id, status);
CREATE INDEX team_invitations_email_idx ON public.team_invitations (invited_email);
CREATE INDEX team_invitations_user_idx  ON public.team_invitations (invited_user_id);
```

### 4.7 Team Members

```sql
CREATE TABLE public.team_members (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id       UUID        NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id       UUID        NOT NULL REFERENCES public.users(id),  -- NOT NULL (Q2/F1)
  ign           TEXT        NOT NULL CHECK (LENGTH(ign) BETWEEN 3 AND 20),
  uid_game      TEXT        NOT NULL CHECK (uid_game ~ '^[0-9]{8,12}$'),
  role_tim      role_tim    NOT NULL DEFAULT 'rusher',
  is_substitute BOOLEAN     NOT NULL DEFAULT FALSE,
  invitation_id UUID        REFERENCES public.team_invitations(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(team_id, user_id),
  UNIQUE(team_id, uid_game)
);

-- UID unik per turnamen enforced via trigger (lihat §4.13)
CREATE INDEX team_members_user_idx ON public.team_members (user_id);
```

### 4.8 Matches

```sql
CREATE TABLE public.matches (
  id            UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID         NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  nama          TEXT         NOT NULL,
  round         INTEGER      NOT NULL DEFAULT 1 CHECK (round > 0),
  grup          TEXT,
  jadwal        TIMESTAMPTZ  NOT NULL,
  room_id       TEXT,        -- TIDAK pernah expose ke publik
  room_pass     TEXT,
  status        match_status NOT NULL DEFAULT 'scheduled',
  published_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX matches_tournament_status_idx ON public.matches (tournament_id, status);
CREATE INDEX matches_tournament_jadwal_idx ON public.matches (tournament_id, jadwal);

CREATE TRIGGER matches_updated_at
  BEFORE UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 4.9 Match Teams

```sql
CREATE TABLE public.match_teams (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id   UUID        NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  team_id    UUID        NOT NULL REFERENCES public.teams(id),
  slot       INTEGER     NOT NULL CHECK (slot > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(match_id, team_id),
  UNIQUE(match_id, slot)
);
```

### 4.10 Results

```sql
CREATE TABLE public.results (
  id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id         UUID          NOT NULL REFERENCES public.matches(id),
  team_id          UUID          NOT NULL REFERENCES public.teams(id),
  placement        INTEGER       NOT NULL CHECK (placement BETWEEN 1 AND 25),
  kills            INTEGER       NOT NULL CHECK (kills BETWEEN 0 AND 40),
  points           INTEGER       NOT NULL DEFAULT 0,  -- Selalu dihitung via trigger
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

-- Placement unik untuk hasil aktif (BR-SCR-02)
CREATE UNIQUE INDEX results_match_placement_active_idx
  ON public.results (match_id, placement)
  WHERE status NOT IN ('rejected', 'draft');

CREATE INDEX results_match_status_idx ON public.results (match_id, status);
CREATE INDEX results_team_idx         ON public.results (team_id);

CREATE TRIGGER results_updated_at
  BEFORE UPDATE ON public.results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 4.11 Disputes

```sql
CREATE TABLE public.disputes (
  id              UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  result_id       UUID           NOT NULL REFERENCES public.results(id),
  team_id         UUID           NOT NULL REFERENCES public.teams(id),
  submitted_by    UUID           NOT NULL REFERENCES public.users(id),
  alasan          TEXT           NOT NULL CHECK (LENGTH(alasan) >= 50),
  bukti_urls      TEXT[]         DEFAULT '{}',  -- Maks 3 URL (BR-DSP-05)
  status          dispute_status NOT NULL DEFAULT 'open',
  decided_by      UUID           REFERENCES public.users(id),
  decision_reason TEXT,
  decided_at      TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ    NOT NULL,      -- 24 jam setelah result.verified_at
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  UNIQUE(result_id, team_id)                    -- BR-DSP-04: maks 1 dispute per match per tim
);

CREATE INDEX disputes_result_idx ON public.disputes (result_id);
CREATE INDEX disputes_team_idx   ON public.disputes (team_id);
```

### 4.12 Audit Log (Append-Only)

```sql
CREATE TABLE public.audit_log (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID        REFERENCES public.tournaments(id),
  actor_id      UUID        REFERENCES public.users(id),
  action        TEXT        NOT NULL,  -- 'score.approve', 'team.reject', 'room.view', dll.
  entity        TEXT        NOT NULL,  -- 'tournament', 'team', 'result', 'room', dll.
  entity_id     UUID        NOT NULL,
  before_data   JSONB,
  after_data    JSONB,
  reason        TEXT,
  ip            TEXT,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- Tidak ada updated_at — tabel append-only
);

CREATE INDEX audit_log_tournament_idx ON public.audit_log (tournament_id, created_at DESC);
CREATE INDEX audit_log_entity_idx     ON public.audit_log (entity, entity_id, created_at DESC);
CREATE INDEX audit_log_actor_idx      ON public.audit_log (actor_id, created_at DESC);
```

### 4.13 Triggers Penting

```sql
-- supabase/migrations/20260218000002_functions_triggers.sql

-- 1. Hitung poin server-side (BR-SCR-11)
CREATE OR REPLACE FUNCTION calculate_points()
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

CREATE TRIGGER results_calculate_points
  BEFORE INSERT OR UPDATE OF placement, kills ON public.results
  FOR EACH ROW EXECUTE FUNCTION calculate_points();

-- 2. Cegah UID ganda lintas tim dalam satu turnamen (BR-ROST-03)
CREATE OR REPLACE FUNCTION check_uid_unique_in_tournament()
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
    RAISE EXCEPTION 'ROSTER_UID_DUPLICATE:%', conflict_team;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER team_members_uid_check
  BEFORE INSERT OR UPDATE OF uid_game ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION check_uid_unique_in_tournament();

-- 3. Lock point_config setelah ada 1 hasil approved (BR-SCR-13)
CREATE OR REPLACE FUNCTION lock_point_config()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
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

CREATE TRIGGER results_lock_point_config
  AFTER UPDATE OF status ON public.results
  FOR EACH ROW EXECUTE FUNCTION lock_point_config();

-- 4. Auto-reject tim pending saat turnamen ditutup (PRD §7.1)
CREATE OR REPLACE FUNCTION auto_reject_pending_teams()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'closed' AND OLD.status = 'open' THEN
    UPDATE public.teams
    SET verification_status = 'rejected',
        rejection_reason    = 'Pendaftaran otomatis ditolak karena turnamen telah ditutup.'
    WHERE tournament_id = NEW.id
      AND verification_status = 'pending';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tournaments_auto_reject
  AFTER UPDATE OF status ON public.tournaments
  FOR EACH ROW EXECUTE FUNCTION auto_reject_pending_teams();
```

### 4.14 View: Klasemen (On-the-Fly)

```sql
-- Dihitung ulang setiap request — tidak disimpan (BR-CLS-01)
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
      COALESCE(SUM(r.kills), 0)   DESC,   -- urutan 2
      MIN(r.placement)            ASC,    -- urutan 3
      MIN(r.submitted_at)         ASC     -- urutan 4
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
-- Tim tanpa match tetap muncul dengan 0 poin (BR-CLS-05)
```

---

## 5. Row Level Security (RLS)

```sql
-- supabase/migrations/20260218000001_rls_policies.sql

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

-- Helper functions
CREATE OR REPLACE FUNCTION is_tournament_staff(tid UUID, roles staff_role[])
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tournament_staff
    WHERE tournament_id = tid
      AND user_id = auth.uid()
      AND role = ANY(roles)
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Tournaments: publik bisa baca yang sudah open & public
CREATE POLICY "tournaments_public_read" ON public.tournaments
  FOR SELECT USING (is_public = TRUE AND status != 'draft');

CREATE POLICY "tournaments_staff_all" ON public.tournaments
  FOR ALL USING (
    organizer_id = auth.uid() OR
    is_tournament_staff(id, ARRAY['owner','admin','panitia']::staff_role[])
  );

-- Matches: publik bisa baca (room_id difilter di API layer, bukan RLS)
CREATE POLICY "matches_public_read" ON public.matches
  FOR SELECT USING (
    published_at IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_id
        AND t.is_public = TRUE AND t.status != 'draft'
    )
  );

-- Audit log: append-only — tidak ada UPDATE/DELETE policy
CREATE POLICY "audit_log_admin_read" ON public.audit_log
  FOR SELECT USING (
    is_tournament_staff(tournament_id, ARRAY['owner','admin']::staff_role[])
  );
```

> **Catatan penting:** Room ID difilter di **API layer** karena butuh logika waktu (T-15 menit) dan pencatatan audit setiap akses. RLS tidak cukup ekspresif untuk BR-ROOM-05.

---

## 6. API Endpoints

Semua endpoint membutuhkan Supabase session cookie kecuali yang ditandai `[publik]`.

### 6.1 Auth

| Method | Endpoint | Deskripsi |
|---|---|---|
| POST | `/api/auth/register` | Buat akun + insert ke `public.users` |
| POST | `/api/auth/login` | signInWithPassword |
| POST | `/api/auth/logout` | Invalidate session |
| POST | `/api/auth/forgot-password` | Kirim reset email via Resend |

### 6.2 Tournaments

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| GET | `/api/tournaments` | `[publik]` | List turnamen publik aktif |
| POST | `/api/tournaments` | owner/admin | Buat turnamen |
| GET | `/api/tournaments/[id]` | `[publik]` | Detail turnamen |
| PATCH | `/api/tournaments/[id]` | admin/owner | Update info |
| PATCH | `/api/tournaments/[id]/status` | admin/owner | Transisi status |
| GET | `/api/tournaments/[id]/standings` | `[publik]` | Klasemen (tanpa data pribadi) |
| GET | `/api/tournaments/[id]/audit` | admin/owner | Audit log |

### 6.3 Teams

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| GET | `/api/tournaments/[id]/teams` | admin/panitia | List semua tim |
| POST | `/api/tournaments/[id]/teams` | kapten / admin (manual F4) | Buat tim |
| GET | `/api/tournaments/[id]/teams/[teamId]` | kapten / admin | Detail tim |
| PATCH | `/api/tournaments/[id]/teams/[teamId]` | kapten / admin | Update tim |
| PATCH | `/api/tournaments/[id]/teams/[teamId]/verify` | admin/owner | Approve/reject |
| POST | `/api/tournaments/[id]/teams/[teamId]/payment` | kapten | Upload bukti QRIS |

### 6.4 Roster & Invitations

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| GET | `/api/tournaments/[id]/teams/[teamId]/members` | kapten/admin | List anggota |
| DELETE | `.../members/[mId]` | kapten/admin | Hapus anggota |
| POST | `/api/invitations` | kapten | Kirim undangan (email + IGN/UID) |
| GET | `/api/invitations/[token]` | `[publik]` | Preview undangan |
| POST | `/api/invitations/[token]/accept` | user login | Terima → masuk roster |
| POST | `/api/invitations/[token]/decline` | user login | Tolak undangan |

### 6.5 Matches

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| GET | `/api/tournaments/[id]/matches` | `[publik]` (tanpa room_id) | List match & jadwal |
| POST | `/api/tournaments/[id]/matches` | admin/panitia | Buat match |
| PATCH | `.../matches/[matchId]` | admin/panitia | Update match |
| PATCH | `.../matches/[matchId]/status` | admin/panitia | Ubah status |
| GET | `.../matches/[matchId]/room` | **kapten/peserta (gated)** | Room ID — BR-ROOM-04..07 |
| PATCH | `.../matches/[matchId]/room` | admin | Isi/rotasi Room ID |

### 6.6 Results

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| GET | `.../matches/[matchId]/results` | admin/panitia | List hasil |
| POST | `.../matches/[matchId]/results` | panitia/admin | Submit hasil (poin server-side) |
| PATCH | `.../results/[rId]/approve` | **admin (bukan submitter)** | Approve — BR-SCR-07 |
| PATCH | `.../results/[rId]/reject` | admin | Reject + alasan |
| PATCH | `.../results/[rId]/recalculate` | admin/owner | Recalculate + audit |

### 6.7 Disputes

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| POST | `/api/disputes` | kapten peserta | Ajukan dispute (dalam 24 jam) |
| GET | `/api/disputes/[id]` | kapten/admin | Detail dispute |
| PATCH | `/api/disputes/[id]/decide` | admin | Putuskan: upheld/rejected |

### 6.8 Upload

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| POST | `/api/upload` | user login | Signed URL → client upload langsung ke Storage |

**Supabase Storage Buckets:**

| Bucket | Akses | Konten |
|---|---|---|
| `logos` | Publik | Logo tim & turnamen |
| `banners` | Publik | Banner turnamen |
| `qris` | Publik | Gambar QRIS penyelenggara |
| `payments` | Private | Bukti bayar QRIS |
| `screenshots` | Private | Screenshot scoreboard |
| `disputes` | Private | Bukti dispute |

---

## 7. Pola API Response

```typescript
// Sukses
{ "success": true, "data": { ... } }

// Error
{
  "success": false,
  "error": {
    "code": "SCORE_SELF_APPROVAL",
    "message": "Anda tidak bisa menyetujui hasil yang Anda input sendiri.",
    "details": {}
  }
}
```

---

## 8. Environment Variables

```bash
# .env.local.example

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...    # Server-side only — JANGAN expose ke client

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Email (Resend)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@arenaku.id

# Upload
NEXT_PUBLIC_MAX_UPLOAD_SIZE=5242880     # 5 MB dalam bytes
```

---

## 9. Deployment — Vercel + GitHub

### Setup

1. Push repo ke GitHub
2. Connect ke Vercel → auto-detect Next.js
3. Set environment variables di Vercel dashboard
4. Setiap push ke `main` → auto-deploy production

### Branch Strategy

| Branch | Environment | Auto-deploy |
|---|---|---|
| `main` | Production | ✅ |
| `develop` | Staging | ✅ |
| `feature/*` | Preview per PR | ✅ |

```json
// vercel.json
{
  "functions": {
    "src/app/api/**/*.ts": { "maxDuration": 30 }
  }
}
```

---

## 10. Keamanan Checklist

| Item | Implementasi |
|---|---|
| Password hashing | Supabase Auth (Argon2id built-in) |
| Session | httpOnly cookie via `@supabase/ssr` |
| Rate limit login | Supabase Auth + middleware (BR-AUTH-03) |
| Upload validation | Magic bytes check di `/api/upload` sebelum signed URL |
| Room ID | Tidak pernah di HTML; hanya via gated endpoint + audit log |
| SQL injection | Supabase parameterized queries |
| RLS | Aktif di semua tabel |
| Audit log | Append-only (no UPDATE/DELETE policy) |
| UID & WA privacy | Tidak pernah masuk API response publik |

---

## 11. Dependencies (package.json)

```json
{
  "dependencies": {
    "next": "^14",
    "react": "^18",
    "react-dom": "^18",
    "@supabase/supabase-js": "^2",
    "@supabase/ssr": "^0.5",
    "zod": "^3",
    "react-hook-form": "^7",
    "@hookform/resolvers": "^3",
    "resend": "^3",
    "date-fns": "^3",
    "clsx": "^2",
    "tailwind-merge": "^2",
    "lucide-react": "^0.400",
    "sonner": "^1"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/node": "^20",
    "@types/react": "^18",
    "tailwindcss": "^3",
    "eslint": "^8",
    "eslint-config-next": "^14",
    "supabase": "^1"
  }
}
```

---

## 12. Change Log

| Versi | Tanggal | Perubahan |
|---|---|---|
| 1.0 | 2026-10-18 | Draft awal berdasarkan PRD v1.0 + FSD v1.0 + keputusan Q2, Q5, F1, F4 |

---

_TDD mendefinisikan BAGAIMANA DIBANGUN. Setiap perubahan arsitektur atau stack wajib diupdate di sini sebelum diimplementasi._
