-- ==============================================================================
-- MIGRATION: 20261028_secure_room_credentials.sql
-- TUJUAN: Hardening keamanan kredensial Room ID & Room Password (T-15 Protocol)
-- Menjamin room_id & room_pass TIDAK DAPAT dibaca langsung oleh public / player
-- melalui SDK Supabase sebelum diverifikasi dan melewati gerbang T-15.
-- ==============================================================================

-- 1. Cabut akses SELECT langsung pada kolom sensitif room_id & room_pass
-- dari role publik (anon) dan pengguna terautentikasi (authenticated)
REVOKE SELECT (room_id, room_pass) ON public.matches FROM anon;
REVOKE SELECT (room_id, room_pass) ON public.matches FROM authenticated;

-- Pastikan service_role (backend API) memiliki akses penuh
GRANT SELECT (room_id, room_pass) ON public.matches TO service_role;

-- 2. Fungsi RPC Terproteksi untuk Akses Room ID Terverifikasi
-- Fungsi ini mengecek kepesertaan, peran staf, dan time-lock T-15 secara atomik di database
CREATE OR REPLACE FUNCTION public.get_match_room_secure(p_match_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_match       RECORD;
  v_user_id     UUID := auth.uid();
  v_is_staff    BOOLEAN;
  v_is_participant BOOLEAN;
  v_now_ms      BIGINT;
  v_sched_ms    BIGINT;
  v_t15_ms      BIGINT;
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
  SELECT EXISTS (
    SELECT 1 
    FROM public.match_teams mt
    JOIN public.teams t ON t.id = mt.team_id
    LEFT JOIN public.team_members tm ON tm.team_id = t.id
    WHERE mt.match_id = p_match_id
      AND (t.kapten_user_id = v_user_id OR tm.user_id = v_user_id)
  ) INTO v_is_participant;

  IF NOT v_is_participant THEN
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

  RETURN jsonb_build_object(
    'room_id', v_match.room_id,
    'room_pass', v_match.room_pass,
    'is_staff', FALSE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Berikan izin eksekusi RPC hanya untuk authenticated user
GRANT EXECUTE ON FUNCTION public.get_match_room_secure(UUID) TO authenticated;
