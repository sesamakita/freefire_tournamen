-- ==============================================================================
-- MIGRATION: ADD CLOUD STREAMING VPS CONFIGURATION TO TOURNAMENTS
-- Tanggal: 2026-10-30
-- ==============================================================================

-- 1. Tambah kolom cloud_stream_config pada tabel tournaments
ALTER TABLE public.tournaments
ADD COLUMN IF NOT EXISTS cloud_stream_config JSONB DEFAULT '{
  "enabled": false,
  "vps_server_url": "rtmp://vps.arenatarung.com:1935/live",
  "ingest_key": "",
  "dest_platform": "youtube",
  "dest_rtmp_url": "rtmp://a.rtmp.youtube.com/live2",
  "dest_stream_key": "",
  "status": "idle",
  "active_scene": "gameplay"
}'::jsonb;

-- 2. Index untuk pencarian turnamen dengan live streaming VPS aktif
CREATE INDEX IF NOT EXISTS idx_tournaments_cloud_stream ON public.tournaments ((cloud_stream_config->>'enabled'));
