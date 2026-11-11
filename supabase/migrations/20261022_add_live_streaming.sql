-- ==============================================================================
-- MIGRATION: ADD LIVE STREAMING & OBS OVERLAYS SUPPORT TO TOURNAMENTS
-- Tanggal: 2026-10-22
-- ==============================================================================

-- 1. Tambah kolom live streaming pada tabel tournaments
ALTER TABLE public.tournaments
ADD COLUMN IF NOT EXISTS is_live BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS live_platform TEXT DEFAULT 'youtube' CHECK (live_platform IN ('youtube', 'tiktok', 'facebook', 'custom')),
ADD COLUMN IF NOT EXISTS live_stream_url TEXT,
ADD COLUMN IF NOT EXISTS live_title TEXT,
ADD COLUMN IF NOT EXISTS obs_token UUID DEFAULT uuid_generate_v4();

-- 2. Index untuk mempercepat query turnamen yang sedang siaran langsung
CREATE INDEX IF NOT EXISTS idx_tournaments_is_live ON public.tournaments(is_live);

-- 3. Komentar kolom untuk dokumentasi schema
COMMENT ON COLUMN public.tournaments.is_live IS 'Menandakan apakah turnamen saat ini sedang dalam status siaran langsung (Live Stream)';
COMMENT ON COLUMN public.tournaments.live_platform IS 'Platform utama siaran: youtube, tiktok, facebook, atau custom';
COMMENT ON COLUMN public.tournaments.live_stream_url IS 'URL siaran langsung (misal: YouTube Live URL, TikTok Live link, FB Gaming)';
COMMENT ON COLUMN public.tournaments.live_title IS 'Judul sesi siaran langsung yang sedang aktif (contoh: Grand Final Match 4)';
COMMENT ON COLUMN public.tournaments.obs_token IS 'Token unik pengaman untuk URL OBS Browser Source';
