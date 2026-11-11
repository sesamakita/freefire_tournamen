-- ==============================================================================
-- MIGRATION: 20261102_room_read_receipts.sql
-- TUJUAN: Menambahkan sistem Read Receipt / Tanda Terima Akses Room ID
-- Memungkinkan panitia dan wasit memantau kesiapan tim (kapan Room dibuka/disalin)
-- secara realtime di dashboard.
-- ==============================================================================

-- 1. Tambah kolom pelacak status akses Room pada match_teams
ALTER TABLE public.match_teams 
  ADD COLUMN IF NOT EXISTS room_viewed_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS room_copied_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS room_ack_by UUID REFERENCES public.users(id) ON DELETE SET NULL DEFAULT NULL;

-- Berikan indeks agar query filter status kesiapan efisien
CREATE INDEX IF NOT EXISTS idx_match_teams_room_ack 
  ON public.match_teams(match_id, room_copied_at);

-- 2. Update fungsi RPC get_match_room_secure agar otomatis menandai room_viewed_at
-- saat peserta berhasil meminta Room ID & Password setelah gerbang T-15
CREATE OR REPLACE FUNCTION public.get_match_room_secure(p_match_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_match          RECORD;
  v_user_id        UUID := auth.uid();
  v_is_staff       BOOLEAN;
  v_participant_team_id UUID;
  v_now_ms         BIGINT;
  v_sched_ms       BIGINT;
  v_t15_ms         BIGINT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Silakan login terlebih dahulu';
  END IF;

  -- Ambil jadwal dan data match
  SELECT id, tournament_id, jadwal, room_id, room_pass, status
  INTO v_match
  FROM public.matches
  WHERE id = p_match_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'MATCH_NOT_FOUND: Pertandingan tidak ditemukan';
  END IF;

  -- Cek staf turnamen
  SELECT EXISTS (
    SELECT 1 FROM public.tournament_staff
    WHERE tournament_id = v_match.tournament_id AND user_id = v_user_id
  ) INTO v_is_staff;

  IF v_is_staff THEN
    RETURN jsonb_build_object(
      'room_id', v_match.room_id,
      'room_pass', v_match.room_pass,
      'is_staff', TRUE
    );
  END IF;

  -- Cek kepesertaan (kapten atau anggota tim di match ini)
  SELECT mt.team_id
  INTO v_participant_team_id
  FROM public.match_teams mt
  JOIN public.teams t ON t.id = mt.team_id
  LEFT JOIN public.team_members tm ON tm.team_id = t.id
  WHERE mt.match_id = p_match_id
    AND (t.kapten_user_id = v_user_id OR tm.user_id = v_user_id)
  LIMIT 1;

  IF v_participant_team_id IS NULL THEN
    RAISE EXCEPTION 'NOT_PARTICIPANT: Anda bukan peserta yang bertanding pada match ini';
  END IF;

  -- Cek time-gating T-15 (15 menit = 900 detik)
  v_now_ms   := (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT;
  v_sched_ms := (EXTRACT(EPOCH FROM v_match.jadwal) * 1000)::BIGINT;
  v_t15_ms   := v_sched_ms - (15 * 60 * 1000);

  IF v_now_ms < v_t15_ms THEN
    RAISE EXCEPTION 'ROOM_TIMELOCKED: Room ID baru dibuka tepat 15 menit sebelum kickoff. Dibuka pada %',
      to_char(v_match.jadwal - INTERVAL '15 minutes', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
  END IF;

  -- Otomatis tandai room_viewed_at jika belum ada
  UPDATE public.match_teams
  SET room_viewed_at = COALESCE(room_viewed_at, NOW()),
      room_ack_by = COALESCE(room_ack_by, v_user_id)
  WHERE match_id = p_match_id 
    AND team_id = v_participant_team_id;

  RETURN jsonb_build_object(
    'room_id', v_match.room_id,
    'room_pass', v_match.room_pass,
    'is_staff', FALSE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Fungsi RPC Khusus untuk Konfirmasi / Acknowledgment Salin Room ID (Read Receipt)
CREATE OR REPLACE FUNCTION public.ack_match_room(
  p_match_id UUID,
  p_action TEXT DEFAULT 'copy'
)
RETURNS JSONB AS $$
DECLARE
  v_match          RECORD;
  v_user_id        UUID := auth.uid();
  v_team_id        UUID;
  v_now_ms         BIGINT;
  v_sched_ms       BIGINT;
  v_t15_ms         BIGINT;
  v_updated_at     TIMESTAMPTZ := NOW();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Silakan login terlebih dahulu';
  END IF;

  -- Ambil jadwal pertandingan
  SELECT id, tournament_id, jadwal, status
  INTO v_match
  FROM public.matches
  WHERE id = p_match_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'MATCH_NOT_FOUND: Pertandingan tidak ditemukan';
  END IF;

  -- Validasi kepesertaan
  SELECT mt.team_id
  INTO v_team_id
  FROM public.match_teams mt
  JOIN public.teams t ON t.id = mt.team_id
  LEFT JOIN public.team_members tm ON tm.team_id = t.id
  WHERE mt.match_id = p_match_id
    AND (t.kapten_user_id = v_user_id OR tm.user_id = v_user_id)
  LIMIT 1;

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'NOT_PARTICIPANT: Anda bukan peserta pada match ini';
  END IF;

  -- Validasi gerbang T-15
  v_now_ms   := (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT;
  v_sched_ms := (EXTRACT(EPOCH FROM v_match.jadwal) * 1000)::BIGINT;
  v_t15_ms   := v_sched_ms - (15 * 60 * 1000);

  IF v_now_ms < v_t15_ms THEN
    RAISE EXCEPTION 'ROOM_TIMELOCKED: Room ID belum dibuka';
  END IF;

  -- Update acknowledgment berdasarkan aksi ('view' atau 'copy')
  IF p_action = 'copy' THEN
    UPDATE public.match_teams
    SET room_copied_at = v_updated_at,
        room_viewed_at = COALESCE(room_viewed_at, v_updated_at),
        room_ack_by = v_user_id
    WHERE match_id = p_match_id AND team_id = v_team_id;
  ELSE
    UPDATE public.match_teams
    SET room_viewed_at = COALESCE(room_viewed_at, v_updated_at),
        room_ack_by = COALESCE(room_ack_by, v_user_id)
    WHERE match_id = p_match_id AND team_id = v_team_id;
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'match_id', p_match_id,
    'team_id', v_team_id,
    'action', p_action,
    'timestamp', to_char(v_updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Berikan izin akses RPC ke authenticated user
GRANT EXECUTE ON FUNCTION public.ack_match_room(UUID, TEXT) TO authenticated;
