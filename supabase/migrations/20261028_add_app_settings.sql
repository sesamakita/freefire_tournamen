-- Migration: 20261028_add_app_settings.sql
-- Description: Tabel penyimpanan konfigurasi dinamis aplikasi (AI Vision Provider, System Settings)

CREATE TABLE IF NOT EXISTS public.app_settings (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by  UUID REFERENCES public.users(id) ON DELETE SET NULL
);

-- RLS: Hanya staff / admin yang bisa membaca & mengedit pengaturan sensitif
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin & Staff can read app_settings"
  ON public.app_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tournament_staff
      WHERE public.tournament_staff.user_id = auth.uid()
        AND public.tournament_staff.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Admin & Staff can update app_settings"
  ON public.app_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tournament_staff
      WHERE public.tournament_staff.user_id = auth.uid()
        AND public.tournament_staff.role IN ('owner', 'admin')
    )
  );
