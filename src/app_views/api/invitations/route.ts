import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { inviteMemberSchema } from "@/lib/validations/team";
import { apiError, apiSuccess, ERROR_CODES } from "@/types";
import { writeAuditLog, getRequestMeta } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return apiError(ERROR_CODES.FORBIDDEN_ROLE, "Silakan masuk terlebih dahulu.", 401);
    }

    const body = await request.json();
    const teamId = body.team_id;

    if (!teamId) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, "Team ID wajib disertakan.", 400);
    }

    const parseResult = inviteMemberSchema.safeParse(body);
    if (!parseResult.success) {
      return apiError(
        ERROR_CODES.INTERNAL_ERROR,
        parseResult.error.issues[0]?.message || "Validasi data pemain gagal.",
        422
      );
    }

    const data = parseResult.data;
    const admin = createAdminClient();

    // 1. Verifikasi kepemilikan tim (hanya kapten atau admin)
    const { data: team, error: teamErr } = await admin
      .from("teams")
      .select("id, nama, tournament_id, kapten_user_id, verification_status")
      .eq("id", teamId)
      .single();

    if (teamErr || !team) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, "Tim tidak ditemukan.", 404);
    }

    if (team.kapten_user_id !== user.id) {
      return apiError(
        ERROR_CODES.FORBIDDEN_ROLE,
        "Hanya kapten yang berhak mengundang anggota ke tim ini.",
        403
      );
    }

    // 2. Cek status turnamen (roster locked jika turnamen sudah closed/running)
    const { data: tournament } = await admin
      .from("tournaments")
      .select("id, status")
      .eq("id", team.tournament_id)
      .single();

    if (tournament && (tournament.status === "closed" || tournament.status === "running" || tournament.status === "done")) {
      return apiError(
        ERROR_CODES.ROSTER_LOCKED,
        "Roster turnamen sudah dikunci. Hubungi panitia untuk perubahan.",
        409
      );
    }

    // 3. Cek jumlah anggota saat ini (BR-ROST-01: Maksimal 6)
    const { count: memberCount } = await admin
      .from("team_members")
      .select("*", { count: "exact", head: true })
      .eq("team_id", teamId);

    const { count: pendingInviteCount } = await admin
      .from("team_invitations")
      .select("*", { count: "exact", head: true })
      .eq("team_id", teamId)
      .eq("status", "pending");

    const totalActiveSlots = (memberCount || 0) + (pendingInviteCount || 0);
    if (totalActiveSlots >= 6) {
      return apiError(
        ERROR_CODES.INTERNAL_ERROR,
        "Roster tim sudah mencapai batas maksimal 6 pemain (termasuk undangan pending).",
        422
      );
    }

    // 4. Cek batas pemain cadangan (BR-ROST-04: Maksimal 2 cadangan)
    if (data.is_substitute) {
      const { count: subCount } = await admin
        .from("team_members")
        .select("*", { count: "exact", head: true })
        .eq("team_id", teamId)
        .eq("is_substitute", true);

      const { count: pendingSubCount } = await admin
        .from("team_invitations")
        .select("*", { count: "exact", head: true })
        .eq("team_id", teamId)
        .eq("status", "pending")
        .eq("is_substitute", true);

      if ((subCount || 0) + (pendingSubCount || 0) >= 2) {
        return apiError(
          ERROR_CODES.INTERNAL_ERROR,
          "Tim sudah memiliki maksimal 2 pemain cadangan.",
          422
        );
      }
    }

    // 5. Cek UID Free Fire tidak boleh ganda di turnamen ini (BR-ROST-03)
    const { data: duplicateUID } = await admin
      .from("team_members")
      .select(`
        id,
        teams:team_id (nama, tournament_id)
      `)
      .eq("uid_game", data.uid_game)
      .maybeSingle();

    // @ts-expect-error Supabase relation
    if (duplicateUID && duplicateUID.teams?.tournament_id === team.tournament_id) {
      return apiError(
        ERROR_CODES.ROSTER_UID_DUPLICATE,
        // @ts-expect-error Supabase relation
        `UID ${data.uid_game} sudah terdaftar di tim "${duplicateUID.teams?.nama}" pada turnamen ini.`,
        409
      );
    }

    // 6. Buat Undangan dengan Token
    const { data: invitation, error: invError } = await admin
      .from("team_invitations")
      .insert({
        team_id: team.id,
        invited_by: user.id,
        invited_email: data.invited_email,
        ign: data.ign,
        uid_game: data.uid_game,
        role_tim: data.role_tim,
        is_substitute: data.is_substitute,
        status: "pending",
      })
      .select()
      .single();

    if (invError || !invitation) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, invError?.message || "Gagal membuat undangan.", 500);
    }

    // 7. Catat di audit log
    const meta = getRequestMeta(request);
    await writeAuditLog({
      tournamentId: team.tournament_id,
      actorId: user.id,
      action: "roster.update",
      entity: "team",
      entityId: team.id,
      after: { invitation_id: invitation.id, invited_email: data.invited_email, ign: data.ign },
      reason: `Kapten mengirim undangan pemain baru (${data.ign})`,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const inviteUrl = `${appUrl}/tim/bergabung/${invitation.token}`;

    return apiSuccess({
      invitation_id: invitation.id,
      token: invitation.token,
      invite_url: inviteUrl,
    }, 201);
  } catch (err: unknown) {
    console.error("POST /api/invitations error:", err);
    return apiError(ERROR_CODES.INTERNAL_ERROR, "Terjadi kesalahan server saat mengundang pemain.", 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return apiError(ERROR_CODES.FORBIDDEN_ROLE, "Silakan masuk terlebih dahulu.", 401);
    }

    const { searchParams } = new URL(request.url);
    const invitationId = searchParams.get("invitationId");

    if (!invitationId) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, "invitationId wajib disertakan.", 400);
    }

    const admin = createAdminClient();

    // 1. Ambil data undangan
    const { data: invitation, error: invErr } = await admin
      .from("team_invitations")
      .select("id, team_id, ign, uid_game, invited_email, status")
      .eq("id", invitationId)
      .single();

    if (invErr || !invitation) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, "Undangan tidak ditemukan.", 404);
    }

    const { data: team, error: teamErr } = await admin
      .from("teams")
      .select("id, nama, kapten_user_id, tournament_id")
      .eq("id", invitation.team_id)
      .single();

    if (teamErr || !team) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, "Tim tidak ditemukan.", 404);
    }

    // 2. Cek otorisasi: kapten tim atau panitia
    const isCaptain = team.kapten_user_id === user.id;
    const { data: staffRole } = await admin
      .from("tournament_staff")
      .select("role")
      .eq("tournament_id", team.tournament_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!isCaptain && !staffRole) {
      return apiError(
        ERROR_CODES.FORBIDDEN_ROLE,
        "Hanya kapten atau panitia yang dapat membatalkan undangan.",
        403
      );
    }


    // 3. Hapus undangan
    const { error: delErr } = await admin
      .from("team_invitations")
      .delete()
      .eq("id", invitationId);

    if (delErr) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, delErr.message || "Gagal membatalkan undangan.", 500);
    }

    // 4. Audit log
    const meta = getRequestMeta(request);
    await writeAuditLog({
      tournamentId: team.tournament_id,
      actorId: user.id,
      action: "roster.update",
      entity: "team",
      entityId: team.id,
      before: invitation,
      reason: `Undangan untuk ${invitation.ign} (${invitation.invited_email}) dibatalkan`,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return apiSuccess({
      message: `Undangan untuk ${invitation.ign} berhasil dibatalkan.`,
    });
  } catch (err: unknown) {
    console.error("DELETE /api/invitations error:", err);
    return apiError(ERROR_CODES.INTERNAL_ERROR, "Terjadi kesalahan internal server.", 500);
  }
}

