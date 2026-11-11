import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, apiSuccess, ERROR_CODES } from "@/types";
import { writeAuditLog, getRequestMeta } from "@/lib/audit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return apiError(ERROR_CODES.FORBIDDEN_ROLE, "Silakan login terlebih dahulu.", 401);
    }

    const body = await request.json();
    const proofUrl = body.payment_proof_url;

    if (!proofUrl) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, "Bukti pembayaran wajib diunggah.", 400);
    }

    const admin = createAdminClient();

    // 1. Ambil data tim
    const { data: team, error: teamErr } = await admin
      .from("teams")
      .select("id, nama, kapten_user_id, tournament_id, verification_status")
      .eq("id", teamId)
      .single();

    if (teamErr || !team) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, "Tim tidak ditemukan.", 404);
    }

    if (team.kapten_user_id !== user.id) {
      return apiError(
        ERROR_CODES.FORBIDDEN_ROLE,
        "Hanya kapten yang berhak mengunggah bukti pembayaran.",
        403
      );
    }

    // 2. Pastikan roster sudah minimal 4 orang inti (BR-ROST-01)
    const { count: coreCount } = await admin
      .from("team_members")
      .select("*", { count: "exact", head: true })
      .eq("team_id", teamId)
      .eq("is_substitute", false);

    if ((coreCount || 0) < 4) {
      return apiError(
        ERROR_CODES.ROSTER_MIN_MEMBERS,
        "Minimal 4 anggota inti wajib terdaftar sebelum submit pembayaran.",
        422
      );
    }

    // 3. Update status tim
    const { error: updateErr } = await admin
      .from("teams")
      .update({
        payment_proof_url: proofUrl,
        payment_status: "submitted",
        verification_status: "pending", // Masuk antrean verifikasi panitia
      })
      .eq("id", teamId);

    if (updateErr) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, updateErr.message, 500);
    }

    // 4. Catat di audit log
    const meta = getRequestMeta(request);
    await writeAuditLog({
      tournamentId: team.tournament_id,
      actorId: user.id,
      action: "payment.verify",
      entity: "team",
      entityId: team.id,
      after: { payment_proof_url: proofUrl, status: "pending" },
      reason: "Kapten mengunggah bukti pembayaran transfer QRIS",
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return apiSuccess({
      message: "Bukti pembayaran berhasil diserahkan. Tim Anda kini dalam antrean verifikasi.",
    });
  } catch (err: unknown) {
    console.error("Payment submission error:", err);
    return apiError(ERROR_CODES.INTERNAL_ERROR, "Terjadi kesalahan server.", 500);
  }
}
