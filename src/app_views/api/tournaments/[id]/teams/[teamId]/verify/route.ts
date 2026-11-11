import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, apiSuccess, ERROR_CODES } from "@/types";
import { writeAuditLog, getRequestMeta } from "@/lib/audit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; teamId: string }> }
) {
  try {
    const { id: tournamentId, teamId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return apiError(ERROR_CODES.FORBIDDEN_ROLE, "Silakan login terlebih dahulu.", 401);
    }

    const admin = createAdminClient();

    // 1. Cek apakah user adalah staff turnamen (owner, admin, atau panitia)
    const { data: staff, error: staffErr } = await admin
      .from("tournament_staff")
      .select("role")
      .eq("tournament_id", tournamentId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (staffErr || !staff) {
      return apiError(
        ERROR_CODES.FORBIDDEN_ROLE,
        "Hanya panitia atau admin yang berhak memverifikasi tim.",
        403
      );
    }

    const body = await request.json();
    const { action, reason } = body; // action: 'approve' | 'reject'

    if (action !== "approve" && action !== "reject") {
      return apiError(ERROR_CODES.INTERNAL_ERROR, "Aksi harus 'approve' atau 'reject'.", 400);
    }

    if (action === "reject" && (!reason || reason.trim().length < 10)) {
      return apiError(
        ERROR_CODES.INTERNAL_ERROR,
        "Alasan penolakan wajib diisi minimal 10 karakter.",
        422
      );
    }

    // 2. Ambil data tim
    const { data: team, error: teamErr } = await admin
      .from("teams")
      .select("id, nama, tournament_id, verification_status, payment_status")
      .eq("id", teamId)
      .single();

    if (teamErr || !team) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, "Tim tidak ditemukan.", 404);
    }

    const now = new Date().toISOString();

    if (action === "approve") {
      const { error: updErr } = await admin
        .from("teams")
        .update({
          verification_status: "approved",
          payment_status: "verified",
          verified_by: user.id,
          verified_at: now,
          rejection_reason: null,
        })
        .eq("id", teamId);

      if (updErr) return apiError(ERROR_CODES.INTERNAL_ERROR, updErr.message, 500);

      const meta = getRequestMeta(request);
      await writeAuditLog({
        tournamentId,
        actorId: user.id,
        action: "team.approve",
        entity: "team",
        entityId: teamId,
        before: { verification_status: team.verification_status },
        after: { verification_status: "approved" },
        reason: "Panitia menyetujui pendaftaran dan bukti pembayaran tim",
        ip: meta.ip,
        userAgent: meta.userAgent,
      });

      return apiSuccess({ message: `Tim "${team.nama}" berhasil disetujui!` });
    } else {
      const { error: updErr } = await admin
        .from("teams")
        .update({
          verification_status: "rejected",
          payment_status: "rejected",
          verified_by: user.id,
          verified_at: now,
          rejection_reason: reason.trim(),
        })
        .eq("id", teamId);

      if (updErr) return apiError(ERROR_CODES.INTERNAL_ERROR, updErr.message, 500);

      const meta = getRequestMeta(request);
      await writeAuditLog({
        tournamentId,
        actorId: user.id,
        action: "team.reject",
        entity: "team",
        entityId: teamId,
        before: { verification_status: team.verification_status },
        after: { verification_status: "rejected", rejection_reason: reason.trim() },
        reason: reason.trim(),
        ip: meta.ip,
        userAgent: meta.userAgent,
      });

      return apiSuccess({ message: `Tim "${team.nama}" telah ditolak.` });
    }
  } catch (err: unknown) {
    console.error("Verification API error:", err);
    return apiError(ERROR_CODES.INTERNAL_ERROR, "Terjadi kesalahan server saat memproses verifikasi.", 500);
  }
}
