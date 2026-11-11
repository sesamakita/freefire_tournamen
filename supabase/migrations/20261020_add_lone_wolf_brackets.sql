-- ==============================================================================
-- ARENAKU MIGRATION: LONE WOLF (1v1 BY ONE) & TOURNAMENT BRACKET SYSTEM
-- ==============================================================================

-- 1. Tambahkan kolom format & max_rounds ke tabel tournaments
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS format TEXT NOT NULL DEFAULT 'battle_royale'
  CHECK (format IN ('battle_royale', 'lone_wolf_1v1', 'clash_squad'));

ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS max_rounds INTEGER NOT NULL DEFAULT 5;

-- 2. Buat tabel brackets untuk turnamen sistem gugur (Single Elimination Tree)
CREATE TABLE IF NOT EXISTS public.brackets (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id   UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  round_number    INTEGER NOT NULL,       -- 1: 32 Besar, 2: 16 Besar, 3: Perempat Final, 4: Semifinal, 5: Grand Final
  match_number    INTEGER NOT NULL,       -- Urutan pertandingan dalam ronde (1..16, 1..8, 1..4, dst)
  round_name      TEXT NOT NULL,          -- Label: 'Babak 32 Besar', 'Babak 16 Besar', 'Perempat Final', 'Semifinal', 'Grand Final'
  player1_id      UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  player2_id      UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  score_p1        INTEGER NOT NULL DEFAULT 0 CHECK (score_p1 >= 0),
  score_p2        INTEGER NOT NULL DEFAULT 0 CHECK (score_p2 >= 0),
  winner_id       UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  next_bracket_id UUID REFERENCES public.brackets(id) ON DELETE SET NULL,
  next_slot       INTEGER CHECK (next_slot IN (1, 2)), -- 1 = player1 di next bracket, 2 = player2
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'ongoing', 'completed')),
  room_id         TEXT,
  room_pass       TEXT,
  screenshot_url  TEXT,
  jadwal          TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tournament_id, round_number, match_number)
);

-- Indexing
CREATE INDEX IF NOT EXISTS idx_brackets_tourn_round ON public.brackets (tournament_id, round_number);
CREATE INDEX IF NOT EXISTS idx_brackets_player1 ON public.brackets (player1_id);
CREATE INDEX IF NOT EXISTS idx_brackets_player2 ON public.brackets (player2_id);

-- Auto updated_at trigger
DROP TRIGGER IF EXISTS trg_brackets_updated_at ON public.brackets;
CREATE TRIGGER trg_brackets_updated_at
  BEFORE UPDATE ON public.brackets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS untuk tabel brackets
ALTER TABLE public.brackets ENABLE ROW LEVEL SECURITY;

-- Siapa saja bisa melihat bracket turnamen yang publik
CREATE POLICY "brackets_public_read" ON public.brackets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_id AND t.is_public = TRUE AND t.status != 'draft'
    )
  );

-- Staff turnamen (owner/admin/panitia) memiliki kontrol penuh mengelola bracket
CREATE POLICY "brackets_staff_manage" ON public.brackets
  FOR ALL USING (
    is_tournament_staff(tournament_id, ARRAY['owner','admin','panitia']::staff_role[])
  );
