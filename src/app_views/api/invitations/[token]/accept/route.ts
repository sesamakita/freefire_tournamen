import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, apiSuccess, ERROR_CODES } from "@/types";
import { writeAuditLog, getRequestMeta } from "@/lib/audit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return apiError(ERROR_CODES.FORBIDDEN_ROLE, "Silakan login terlebih dahulu untuk menerima undangan.", 401);
    }

    const admin = createAdminClient();

    // 1. Ambil data undangan berdasarkan token
    const { data: invitation, error: invError } = await admin
      .from("team_invitations")
      .select(`
        *,
        teams:team_id (id, nama, tournament_id, verification_status)
      `)
      .eq("token", token)
      .single();

    if (invError || !invitation) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, "Undangan tidak ditemukan atau sudah tidak valid.", 404);
    }

    // 2. Validasi status undangan
    if (invitation.status !== "pending") {
      return apiError(
        ERROR_CODES.INTERNAL_ERROR,
        `Undangan ini sudah berstatus ${invitation.status}.`,
        409
      );
    }

    // 3. Validasi masa berlaku (7 hari)
    if (new Date(invitation.expires_at) < new Date()) {
      await admin
        .from("team_invitations")
        .update({ status: "expired" })
        .eq("id", invitation.id);

      return apiError(
        ERROR_CODES.INTERNAL_ERROR,
        "Undangan ini sudah kadaluarsa (melewati batas 7 hari). Silakan minta kapten kirim ulang.",
        409
      );
    }

    // 4. Cek apakah user sudah terdaftar di tim ini
    const { data: alreadyInTeam } = await admin
      .from("team_members")
      .select("id")
      .eq("team_id", invitation.team_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (alreadyInTeam) {
      return apiError(
        ERROR_CODES.INTERNAL_ERROR,
        "Anda sudah resmi terdaftar sebagai anggota di tim ini.",
        409
      );
    }

    // 5. Cek batas maksimal anggota tim (< 6)
    const { count: memberCount } = await admin
      .from("team_members")
      .select("*", { count: "exact", head: true })
      .eq("team_id", invitation.team_id);

    if ((memberCount || 0) >= 6) {
      return apiError(
        ERROR_CODES.INTERNAL_ERROR,
        "Roster tim ini sudah penuh (maksimal 6 pemain).",
        422
      );
    }

    // 6. Cek UID Free Fire tidak boleh ganda di turnamen yang sama (race condition check)
    // @ts-expect-error Supabase relation
    const tournamentId = invitation.teams?.tournament_id;
    const { data: duplicateUID } = await admin
      .from("team_members")
      .select(`
        id,
        teams:team_id (nama, tournament_id)
      `)
      .eq("uid_game", invitation.uid_game)
      .maybeSingle();

    // @ts-expect-error Supabase relation
    if (duplicateUID && duplicateUID.teams?.tournament_id === tournamentId) {
      return apiError(
        ERROR_CODES.ROSTER_UID_DUPLICATE,
        // @ts-expect-error Supabase relation
        `UID ${invitation.uid_game} sudah terdaftar di tim "${duplicateUID.teams?.nama}" pada turnamen ini.`,
        409
      );
    }

    // 7. Masukkan pemain ke team_members
    const { error: insertError } = await admin.from("team_members").insert({
      team_id: invitation.team_id,
      user_id: user.id,
      ign: invitation.ign,
      uid_game: invitation.uid_game,
      role_tim: invitation.role_tim,
      is_substitute: invitation.is_substitute,
      invitation_id: invitation.id,
    });

    if (insertError) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, insertError.message, 500);
    }

    // 8. Update status undangan menjadi accepted
    await admin
      .from("team_invitations")
      .update({
        status: "accepted",
        invited_user_id: user.id,
      })
      .eq("id", invitation.id);

    // 9. Catat di audit log
    const meta = getRequestMeta(request);
    await writeAuditLog({
      tournamentId: tournamentId,
      actorId: user.id,
      action: "member.joined",
      entity: "team",
      entityId: invitation.team_id,
      after: {
        invitation_id: invitation.id,
        user_id: user.id,
        ign: invitation.ign,
      },
      reason: `Pemain menerima undangan dan resmi bergabung (${invitation.ign})`,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return apiSuccess({
      message: "Berhasil bergabung ke dalam tim!",
      team_id: invitation.team_id,
      // @ts-expect-error Supabase relation
      team_nama: invitation.teams?.nama,
    });
  } catch (err: unknown) {
    console.error("POST /api/invitations/[token]/accept error:", err);
    return apiError(ERROR_CODES.INTERNAL_ERROR, "Terjadi kesalahan server saat memproses undangan.", 500);
  }
}
