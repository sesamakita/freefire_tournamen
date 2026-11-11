import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { updateBracketRoomSchema } from "@/lib/validations/bracket";
import { apiError, apiSuccess, ERROR_CODES } from "@/types";
import { writeAuditLog, getRequestMeta } from "@/lib/audit";

interface RouteParams {
  params: Promise<{ id: string; bracketId: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id: tournamentId, bracketId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return apiError(ERROR_CODES.FORBIDDEN_ROLE, "Silakan login terlebih dahulu.", 401);
    }

    const admin = createAdminClient();

    // 1. Cek hak staf
    const { data: isStaff } = await admin
      .from("tournament_staff")
      .select("role")
      .eq("tournament_id", tournamentId)
      .eq("user_id", user.id)
      .maybeSingle();

    const { data: tournament } = await admin
      .from("tournaments")
      .select("organizer_id")
      .eq("id", tournamentId)
      .single();

    if (!tournament || (tournament.organizer_id !== user.id && !isStaff)) {
      return apiError(ERROR_CODES.FORBIDDEN_ROLE, "Hanya panitia yang berhak mengatur room pertandingan.", 403);
    }

    // 2. Parse payload
    const body = await request.json();
    const parseResult = updateBracketRoomSchema.safeParse(body);

    if (!parseResult.success) {
      return apiError(
        ERROR_CODES.INTERNAL_ERROR,
        parseResult.error.issues[0]?.message || "Validasi data room gagal.",
        422
      );
    }

    const { room_id, room_pass, jadwal } = parseResult.data;

    // 3. Update room credentials
    const { error: updateError } = await admin
      .from("brackets")
      .update({
        room_id,
        room_pass,
        jadwal: jadwal || new Date().toISOString(),
        status: "ongoing",
        updated_at: new Date().toISOString(),
      })
      .eq("id", bracketId)
      .eq("tournament_id", tournamentId);

    if (updateError) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, updateError.message, 500);
    }

    // 4. Catat audit
    const meta = getRequestMeta(request);
    await writeAuditLog({
      tournamentId,
      actorId: user.id,
      action: "bracket.room_assign",
      entity: "brackets",
      entityId: bracketId,
      after: { room_id, jadwal },
      reason: "Room ID & Password berhasil didistribusikan untuk duel 1v1",
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return apiSuccess({
      message: "Room pertandingan berhasil disimpan dan status match diubah menjadi bertanding (ongoing)!",
    });
  } catch (err: unknown) {
    console.error("POST /api/tournaments/[id]/bracket/[bracketId]/room error:", err);
    return apiError(ERROR_CODES.INTERNAL_ERROR, "Gagal mengatur room pertandingan.", 500);
  }
}
