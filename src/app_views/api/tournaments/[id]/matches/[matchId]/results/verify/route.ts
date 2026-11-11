import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyScoreSchema } from "@/lib/validations/score";
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
      return apiError(ERROR_CODES.FORBIDDEN_ROLE, "Silakan login terlebih dahulu.", 401);
    }

    const admin = createAdminClient();

    // 1. Verifikasi peran staff (wajib owner atau admin untuk persetujuan)
    const { data: staff } = await admin
      .from("tournament_staff")
      .select("role")
      .eq("tournament_id", tournamentId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!staff || (staff.role !== "owner" && staff.role !== "admin")) {
      return apiError(
        ERROR_CODES.FORBIDDEN_ROLE,
        "Hanya Admin atau Owner turnamen yang berhak menyetujui skor pertandingan.",
        403
      );
    }

    const body = await request.json();
    const parseResult = verifyScoreSchema.safeParse(body);

    if (!parseResult.success) {
      return apiError(
        ERROR_CODES.INTERNAL_ERROR,
        parseResult.error.issues[0]?.message || "Validasi gagal.",
        422
      );
    }

    const { action, reason } = parseResult.data;

    // 2. Ambil data hasil match yang pending
    const { data: results, error: fetchError } = await admin
      .from("results")
      .select("id, submitted_by, status")
      .eq("match_id", matchId)
      .eq("status", "pending");

    if (fetchError || !results || results.length === 0) {
      return apiError(
        ERROR_CODES.INTERNAL_ERROR,
        "Tidak ada hasil skor dengan status pending pada match ini.",
        404
      );
    }

    // 3. SEGREGATION OF DUTIES (P0) — BR-SCR-07: Submitter tidak boleh approve sendiri!
    const isSelfApproval = results.some((r) => r.submitted_by === user.id);
    if (isSelfApproval) {
      return apiError(
        ERROR_CODES.SCORE_SELF_APPROVAL,
        "Anda tidak bisa menyetujui hasil yang Anda input sendiri. Persetujuan harus dilakukan oleh Admin berbeda (Prinsip Dual Control).",
        403
      );
    }

    const now = new Date().toISOString();

    if (action === "approve") {
      // 4. Update status seluruh hasil menjadi 'approved'
      const { error: updError } = await admin
        .from("results")
        .update({
          status: "approved",
          verified_by: user.id,
          verified_at: now,
          rejection_reason: null,
        })
        .eq("match_id", matchId)
        .eq("status", "pending");

      if (updError) {
        return apiError(ERROR_CODES.INTERNAL_ERROR, updError.message, 500);
      }

      // 5. Update status match menjadi 'selesai'
      await admin
        .from("matches")
        .update({ status: "selesai" })
        .eq("id", matchId);

      // 6. Catat persetujuan di audit log
      const meta = getRequestMeta(request);
      await writeAuditLog({
        tournamentId,
        actorId: user.id,
        action: "score.approve",
        entity: "result",
        entityId: matchId,
        after: { status: "approved", verified_by: user.id },
        reason: "Admin menyetujui skor pertandingan setelah verifikasi screenshot",
        ip: meta.ip,
        userAgent: meta.userAgent,
      });

      return apiSuccess({
        message: "Skor pertandingan resmi disetujui! Klasemen turnamen otomatis diperbarui.",
      });
    } else {
      // Penolakan skor
      if (!reason || reason.trim().length < 10) {
        return apiError(
          ERROR_CODES.INTERNAL_ERROR,
          "Alasan penolakan skor wajib diisi minimal 10 karakter.",
          422
        );
      }

      const { error: updError } = await admin
        .from("results")
        .update({
          status: "rejected",
          verified_by: user.id,
          verified_at: now,
          rejection_reason: reason.trim(),
        })
        .eq("match_id", matchId)
        .eq("status", "pending");

      if (updError) {
        return apiError(ERROR_CODES.INTERNAL_ERROR, updError.message, 500);
      }

      const meta = getRequestMeta(request);
      await writeAuditLog({
        tournamentId,
        actorId: user.id,
        action: "score.reject",
        entity: "result",
        entityId: matchId,
        after: { status: "rejected", rejection_reason: reason.trim() },
        reason: reason.trim(),
        ip: meta.ip,
        userAgent: meta.userAgent,
      });

      return apiSuccess({
        message: "Skor pertandingan telah ditolak. Panitia dapat menginput ulang perbaikan.",
      });
    }
  } catch (err: unknown) {
    console.error("Score verify error:", err);
    return apiError(ERROR_CODES.INTERNAL_ERROR, "Terjadi kesalahan server saat memproses verifikasi skor.", 500);
  }
}
