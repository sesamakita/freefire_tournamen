import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { setRoomSchema } from "@/lib/validations/match";
import { apiError, apiSuccess, ERROR_CODES } from "@/types";
import { writeAuditLog, getRequestMeta } from "@/lib/audit";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; matchId: string }> }
) {
  try {
    const { id: tournamentId, matchId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return apiError(ERROR_CODES.FORBIDDEN_ROLE, "Silakan login terlebih dahulu untuk mengakses Room ID.", 401);
    }

    const admin = createAdminClient();

    // 1. Ambil data match
    const { data: match, error: matchError } = await admin
      .from("matches")
      .select("id, tournament_id, nama, jadwal, status, room_id, room_pass")
      .eq("id", matchId)
      .eq("tournament_id", tournamentId)
      .single();

    if (matchError || !match) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, "Match tidak ditemukan.", 404);
    }

    // 2. Cek apakah user adalah staff turnamen (Owner / Admin / Panitia)
    const { data: staff } = await admin
      .from("tournament_staff")
      .select("role")
      .eq("tournament_id", tournamentId)
      .eq("user_id", user.id)
      .maybeSingle();

    const isStaff = !!staff;

    // 3. Jika bukan staff, cek apakah user adalah kapten/anggota tim peserta match ini (BR-ROOM-04)
    if (!isStaff) {
      // Cari tim peserta di match ini
      const { data: matchTeams } = await admin
        .from("match_teams")
        .select("team_id")
        .eq("match_id", matchId);

      const teamIds = (matchTeams || []).map((mt) => mt.team_id);

      if (teamIds.length === 0) {
        return apiError(
          ERROR_CODES.ROOM_NOT_PARTICIPANT,
          "Tim Anda tidak terdaftar sebagai peserta pada match ini.",
          403
        );
      }

      // Cek apakah user adalah kapten dari salah satu tim peserta
      const { data: captainTeam } = await admin
        .from("teams")
        .select("id")
        .in("id", teamIds)
        .eq("kapten_user_id", user.id)
        .maybeSingle();

      // Cek apakah user adalah anggota salah satu tim peserta
      const { data: memberTeam } = await admin
        .from("team_members")
        .select("id")
        .in("team_id", teamIds)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!captainTeam && !memberTeam) {
        return apiError(
          ERROR_CODES.ROOM_NOT_PARTICIPANT,
          "Akses ditolak. Anda bukan kapten atau anggota tim yang bertanding di match ini.",
          403
        );
      }

      // 4. Time-gating: T-15 Menit sebelum jadwal match (BR-ROOM-05)
      const now = Date.now();
      const matchScheduleTime = new Date(match.jadwal).getTime();
      const tMinus15Minutes = matchScheduleTime - 15 * 60 * 1000;

      if (now < tMinus15Minutes) {
        const secondsRemaining = Math.ceil((tMinus15Minutes - now) / 1000);
        return apiError(
          ERROR_CODES.ROOM_NOT_YET_AVAILABLE,
          "Room ID dan Password baru dibuka tepat 15 menit sebelum pertandingan dimulai.",
          403,
          {
            opens_at: new Date(tMinus15Minutes).toISOString(),
            seconds_remaining: secondsRemaining,
          }
        );
      }
    }

    // 5. Cek apakah panitia sudah mengisi Room ID
    if (!match.room_id || !match.room_pass) {
      return apiError(
        ERROR_CODES.INTERNAL_ERROR,
        "Panitia belum membuat Room ID untuk match ini. Silakan tunggu update panitia.",
        404
      );
    }

    // 6. Catat setiap akses Room ID ke audit log (BR-ROOM-07)
    const meta = getRequestMeta(request);
    await writeAuditLog({
      tournamentId,
      actorId: user.id,
      action: "room.view",
      entity: "room",
      entityId: match.id,
      reason: isStaff ? "Staff membuka Room ID" : "Peserta match mengakses Room ID",
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return apiSuccess({
      room_id: match.room_id,
      room_pass: match.room_pass,
      match_nama: match.nama,
      jadwal: match.jadwal,
    });
  } catch (err: unknown) {
    console.error("GET /room error:", err);
    return apiError(ERROR_CODES.INTERNAL_ERROR, "Terjadi kesalahan server saat mengambil Room ID.", 500);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; matchId: string }> }
) {
  try {
    const { id: tournamentId, matchId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return apiError(ERROR_CODES.FORBIDDEN_ROLE, "Silakan login terlebih dahulu.", 401);
    }

    const admin = createAdminClient();

    // Verifikasi peran staff
    const { data: staff } = await admin
      .from("tournament_staff")
      .select("role")
      .eq("tournament_id", tournamentId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!staff) {
      return apiError(ERROR_CODES.FORBIDDEN_ROLE, "Hanya panitia yang berhak mengatur Room ID.", 403);
    }

    const body = await request.json();
    const parseResult = setRoomSchema.safeParse(body);

    if (!parseResult.success) {
      return apiError(
        ERROR_CODES.INTERNAL_ERROR,
        parseResult.error.issues[0]?.message || "Validasi Room ID gagal.",
        422
      );
    }

    const data = parseResult.data;

    // Ambil data match lama untuk audit log
    const { data: oldMatch } = await admin
      .from("matches")
      .select("room_id, room_pass, status")
      .eq("id", matchId)
      .single();

    const isRotation = !!oldMatch?.room_id;

    // Update Room ID
    const { error: updateError } = await admin
      .from("matches")
      .update({
        room_id: data.room_id,
        room_pass: data.room_pass,
      })
      .eq("id", matchId);

    if (updateError) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, updateError.message, 500);
    }

    // Catat rotasi / pengisian room di audit log
    const meta = getRequestMeta(request);
    await writeAuditLog({
      tournamentId,
      actorId: user.id,
      action: isRotation ? "room.rotate" : "room.set",
      entity: "room",
      entityId: matchId,
      before: { room_id: oldMatch?.room_id ? "***" : null },
      after: { room_id: "***" },
      reason: data.rotasi_alasan || (isRotation ? "Panitia melakukan rotasi Room ID" : "Panitia mengisi Room ID pertama kali"),
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return apiSuccess({
      message: isRotation ? "Room ID berhasil dirotasi!" : "Room ID berhasil disimpan!",
    });
  } catch (err: unknown) {
    console.error("PATCH /room error:", err);
    return apiError(ERROR_CODES.INTERNAL_ERROR, "Terjadi kesalahan server saat memperbarui Room ID.", 500);
  }
}
