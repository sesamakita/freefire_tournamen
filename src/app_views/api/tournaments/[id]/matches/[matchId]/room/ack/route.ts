import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ackRoomSchema } from "@/lib/validations/match";
import { apiError, apiSuccess, ERROR_CODES } from "@/types";
import { writeAuditLog, getRequestMeta } from "@/lib/audit";

export async function POST(
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
      return apiError(
        ERROR_CODES.FORBIDDEN_ROLE,
        "Silakan login terlebih dahulu untuk mengonfirmasi akses room.",
        401
      );
    }

    const body = await request.json().catch(() => ({}));
    const parseResult = ackRoomSchema.safeParse(body);

    if (!parseResult.success) {
      return apiError(
        ERROR_CODES.INTERNAL_ERROR,
        parseResult.error.issues[0]?.message || "Format request tidak valid.",
        422
      );
    }

    const { action } = parseResult.data;
    const admin = createAdminClient();

    // 1. Ambil data match untuk validasi jadwal dan status
    const { data: match, error: matchError } = await admin
      .from("matches")
      .select("id, tournament_id, nama, jadwal, status")
      .eq("id", matchId)
      .eq("tournament_id", tournamentId)
      .single();

    if (matchError || !match) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, "Match tidak ditemukan.", 404);
    }

    // 2. Cek apakah user adalah kapten/anggota tim peserta match ini
    const { data: matchTeams } = await admin
      .from("match_teams")
      .select("id, team_id, slot, room_viewed_at, room_copied_at")
      .eq("match_id", matchId);

    const teamIds = (matchTeams || []).map((mt) => mt.team_id);

    if (teamIds.length === 0) {
      return apiError(
        ERROR_CODES.ROOM_NOT_PARTICIPANT,
        "Tim Anda tidak terdaftar pada match ini.",
        403
      );
    }

    // Cek kapten tim
    const { data: captainTeam } = await admin
      .from("teams")
      .select("id, nama")
      .in("id", teamIds)
      .eq("kapten_user_id", user.id)
      .maybeSingle();

    // Cek anggota tim jika bukan kapten
    const { data: memberTeam } = await admin
      .from("team_members")
      .select("id, team_id")
      .in("team_id", teamIds)
      .eq("user_id", user.id)
      .maybeSingle();

    const participantTeamId = captainTeam?.id || memberTeam?.team_id;

    if (!participantTeamId) {
      return apiError(
        ERROR_CODES.ROOM_NOT_PARTICIPANT,
        "Akses ditolak. Anda bukan kapten atau anggota tim yang bertanding di match ini.",
        403
      );
    }

    // 3. Time-gating: T-15 Menit
    const now = Date.now();
    const matchScheduleTime = new Date(match.jadwal).getTime();
    const tMinus15Minutes = matchScheduleTime - 15 * 60 * 1000;

    if (now < tMinus15Minutes) {
      return apiError(
        ERROR_CODES.ROOM_NOT_YET_AVAILABLE,
        "Room ID belum dibuka. Tanda terima hanya dapat dikirim setelah gerbang T-15 terbuka.",
        403
      );
    }

    // 4. Update data tanda terima (Read Receipt / Ack) pada match_teams
    const timestampNow = new Date().toISOString();
    const currentSlot = matchTeams?.find((mt) => mt.team_id === participantTeamId);

    const updatePayload: {
      room_ack_by: string;
      room_viewed_at?: string;
      room_copied_at?: string;
    } = {
      room_ack_by: user.id,
      room_viewed_at: currentSlot?.room_viewed_at || timestampNow,
    };

    if (action === "copy") {
      updatePayload.room_copied_at = timestampNow;
    }

    const { error: updateError } = await admin
      .from("match_teams")
      .update(updatePayload)
      .eq("match_id", matchId)
      .eq("team_id", participantTeamId);

    if (updateError) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, "Gagal memperbarui status tanda terima room.", 500);
    }

    // 5. Audit log
    const meta = getRequestMeta(request);
    await writeAuditLog({
      tournamentId,
      actorId: user.id,
      action: action === "copy" ? "room.copy" : "room.view",
      entity: "room",
      entityId: matchId,
      reason:
        action === "copy"
          ? `Tim ${captainTeam?.nama || participantTeamId} menyalin Room ID & Password`
          : `Tim ${captainTeam?.nama || participantTeamId} membuka Room ID`,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return apiSuccess({
      success: true,
      match_id: matchId,
      team_id: participantTeamId,
      action,
      room_viewed_at: updatePayload.room_viewed_at,
      room_copied_at: updatePayload.room_copied_at || currentSlot?.room_copied_at,
    });
  } catch (err: unknown) {
    console.error("POST /room/ack error:", err);
    return apiError(ERROR_CODES.INTERNAL_ERROR, "Terjadi kesalahan server saat memproses tanda terima room.", 500);
  }
}
