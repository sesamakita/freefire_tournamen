-- ==============================================================================
-- MIGRATION: ADD TOURNAMENT SPONSORS, INTERMISSION & TIER SUPPORT
-- Tanggal: 2026-10-29
-- ==============================================================================

-- 1. Tambah kolom tier, direct_payment_info & intermission pada tabel tournaments
ALTER TABLE public.tournaments
ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'enterprise')),
ADD COLUMN IF NOT EXISTS tier_paid_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS direct_payment_info JSONB DEFAULT '{"bank_name": "", "account_number": "", "account_holder": "", "qris_image_url": ""}'::jsonb,
ADD COLUMN IF NOT EXISTS intermission_active BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS intermission_target_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS intermission_title TEXT DEFAULT 'MATCH BERIKUTNYA SEGERA DIMULAI',
ADD COLUMN IF NOT EXISTS intermission_match_number INT DEFAULT 1;

-- 2. Buat tabel tournament_sponsors
CREATE TABLE IF NOT EXISTS public.tournament_sponsors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    logo_url TEXT NOT NULL,
    banner_url TEXT,
    tier TEXT NOT NULL DEFAULT 'supporter' CHECK (tier IN ('title', 'main', 'supporter', 'media_partner')),
    external_url TEXT,
    display_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_tournament_sponsors_tourn_id ON public.tournament_sponsors(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_sponsors_order ON public.tournament_sponsors(display_order);

-- 4. Aktifkan Row Level Security (RLS)
ALTER TABLE public.tournament_sponsors ENABLE ROW LEVEL SECURITY;

-- 5. Policies RLS
-- Siapapun (publik) bisa melihat sponsor yang aktif
CREATE POLICY "Public can view active tournament sponsors"
ON public.tournament_sponsors
FOR SELECT
USING (is_active = true);

-- Organizer & Staff bisa mengelola (ALL) sponsor turnamen mereka
CREATE POLICY "Staff can manage tournament sponsors"
ON public.tournament_sponsors
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.tournaments t
        WHERE t.id = tournament_sponsors.tournament_id
        AND (
            t.organizer_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.tournament_staff s
                WHERE s.tournament_id = t.id
                AND s.user_id = auth.uid()
                AND s.role IN ('owner', 'admin')
            )
        )
    )
);

-- Komentar dokumentasi
COMMENT ON TABLE public.tournament_sponsors IS 'Daftar sponsor lokal yang didaftarkan panitia dan tayang di overlay live stream';
COMMENT ON COLUMN public.tournaments.intermission_active IS 'Apakah siaran sedang berada di layar jeda/iklan pertandingan';
COMMENT ON COLUMN public.tournaments.intermission_target_time IS 'Waktu target hitung mundur match berikutnya selesai';
