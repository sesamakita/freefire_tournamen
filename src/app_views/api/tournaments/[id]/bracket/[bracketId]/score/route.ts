import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { updateBracketScoreSchema } from "@/lib/validations/bracket";
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
      .select("organizer_id, max_rounds")
      .eq("id", tournamentId)
      .single();

    if (!tournament || (tournament.organizer_id !== user.id && !isStaff)) {
      return apiError(ERROR_CODES.FORBIDDEN_ROLE, "Hanya panitia yang berhak menginput skor pertandingan.", 403);
    }

    // 2. Parse payload skor
    const body = await request.json();
    const parseResult = updateBracketScoreSchema.safeParse(body);

    if (!parseResult.success) {
      return apiError(
        ERROR_CODES.INTERNAL_ERROR,
        parseResult.error.issues[0]?.message || "Validasi skor gagal.",
        422
      );
    }

    const { score_p1, score_p2, screenshot_url } = parseResult.data;

    if (score_p1 === score_p2) {
      return apiError(
        ERROR_CODES.INTERNAL_ERROR,
        "Skor tidak boleh seri! Dalam mode Lone Wolf 1v1 harus ada 1 pemenang.",
        400
      );
    }

    // 3. Ambil node match saat ini
    const { data: currentMatch, error: matchError } = await admin
      .from("brackets")
      .select("*")
      .eq("id", bracketId)
      .eq("tournament_id", tournamentId)
      .single();

    if (matchError || !currentMatch) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, "Pertandingan tidak ditemukan.", 404);
    }

    if (!currentMatch.player1_id || !currentMatch.player2_id) {
      return apiError(
        ERROR_CODES.INTERNAL_ERROR,
        "Pertandingan belum lengkap pesertanya untuk dinilai.",
        400
      );
    }

    const winnerId = score_p1 > score_p2 ? currentMatch.player1_id : currentMatch.player2_id;

    // 4. Update match saat ini jadi completed
    const { error: updateError } = await admin
      .from("brackets")
      .update({
        score_p1,
        score_p2,
        winner_id: winnerId,
        screenshot_url: screenshot_url || null,
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", bracketId);

    if (updateError) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, updateError.message, 500);
    }

    // 5. Majukan pemenang ke babak berikutnya jika ada next_bracket_id
    if (currentMatch.next_bracket_id && currentMatch.next_slot) {
      const slotField = currentMatch.next_slot === 1 ? "player1_id" : "player2_id";
      const db = admin as any;

      // Update slot di bracket berikutnya
      await db
        .from("brackets")
        .update({
          [slotField]: winnerId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", currentMatch.next_bracket_id);

      // Cek apakah bracket berikutnya sekarang sudah lengkap 2 pemain
      const { data: nextMatch } = await db
        .from("brackets")
        .select("player1_id, player2_id")
        .eq("id", currentMatch.next_bracket_id)
        .single();

      if (nextMatch?.player1_id && nextMatch?.player2_id) {
        await db
          .from("brackets")
          .update({
            status: "ready",
            updated_at: new Date().toISOString(),
          })
          .eq("id", currentMatch.next_bracket_id);
      }
    }

    // 6. Catat audit log
    const meta = getRequestMeta(request);
    await writeAuditLog({
      tournamentId,
      actorId: user.id,
      action: "bracket.score_update",
      entity: "brackets",
      entityId: bracketId,
      after: { score_p1, score_p2, winnerId },
      reason: `Skor pertandingan berhasil diupdate: ${score_p1} - ${score_p2}`,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return apiSuccess({
      message: "Skor berhasil disimpan dan pemenang berhasil dimajukan ke babak berikutnya!",
      winner_id: winnerId,
    });
  } catch (err: unknown) {
    console.error("POST /api/tournaments/[id]/bracket/[bracketId]/score error:", err);
    return apiError(ERROR_CODES.INTERNAL_ERROR, "Terjadi kesalahan server saat memperbarui skor.", 500);
  }
}
