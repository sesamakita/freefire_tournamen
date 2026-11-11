import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, apiSuccess, ERROR_CODES } from "@/types";
import { writeAuditLog, getRequestMeta } from "@/lib/audit";

const updateMemberSchema = z.object({
  ign: z
    .string()
    .trim()
    .min(3, "IGN minimal 3 karakter.")
    .max(20, "IGN maksimal 20 karakter."),
  uid_game: z
    .string()
    .trim()
    .regex(/^[0-9]{8,12}$/, "UID Free Fire harus 8–12 digit angka."),
  role_tim: z.enum(["rusher", "sniper", "support", "igl", "cadangan"], {
    message: "Pilih peran tim yang valid.",
  }),
  is_substitute: z.boolean(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ teamId: string; memberId: string }> }
) {
  try {
    const { teamId, memberId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return apiError(ERROR_CODES.FORBIDDEN_ROLE, "Silakan masuk terlebih dahulu.", 401);
    }

    const body = await request.json();
    const parseResult = updateMemberSchema.safeParse(body);
    if (!parseResult.success) {
      return apiError(
        ERROR_CODES.INTERNAL_ERROR,
        parseResult.error.issues[0]?.message || "Validasi data pemain gagal.",
        422
      );
    }

    const data = parseResult.data;
    const admin = createAdminClient();

    // 1. Ambil data tim
    const { data: team, error: teamErr } = await admin
      .from("teams")
      .select("id, nama, tournament_id, kapten_user_id, verification_status")
      .eq("id", teamId)
      .single();

    if (teamErr || !team) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, "Tim tidak ditemukan.", 404);
    }

    // 2. Ambil data turnamen
    const { data: tournament } = await admin
      .from("tournaments")
      .select("id, status, format, organizer_id")
      .eq("id", team.tournament_id)
      .single();

    // 3. Ambil data member yang ingin diedit
    const { data: member, error: memberErr } = await admin
      .from("team_members")
      .select("id, team_id, user_id, ign, uid_game, role_tim, is_substitute")
      .eq("id", memberId)
      .eq("team_id", teamId)
      .single();

    if (memberErr || !member) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, "Pemain tidak ditemukan dalam tim ini.", 404);
    }

    // 4. Cek hak akses
    const isCaptain = team.kapten_user_id === user.id;
    const isSelf = member.user_id === user.id;
    const isOrganizer = tournament?.organizer_id === user.id;

    const { data: staffRole } = await admin
      .from("tournament_staff")
      .select("role")
      .eq("tournament_id", team.tournament_id)
      .eq("user_id", user.id)
      .maybeSingle();

    const isStaff = Boolean(staffRole) || isOrganizer;

    if (!isCaptain && !isSelf && !isStaff) {
      return apiError(
        ERROR_CODES.FORBIDDEN_ROLE,
        "Anda tidak memiliki izin untuk mengubah data pemain ini.",
        403
      );
    }

    // 5. Cek status turnamen (Roster Lock)
    const isLocked =
      tournament?.status === "closed" ||
      tournament?.status === "running" ||
      tournament?.status === "done";

    if (isLocked && !isStaff) {
      return apiError(
        ERROR_CODES.ROSTER_LOCKED,
        "Roster turnamen sudah dikunci. Hubungi panitia untuk melakukan perubahan.",
        409
      );
    }

    // 6. Kapten tidak boleh diset sebagai cadangan
    const isCaptainMember = member.user_id === team.kapten_user_id;
    if (isCaptainMember && data.is_substitute) {
      return apiError(
        ERROR_CODES.INTERNAL_ERROR,
        "Kapten tim tidak dapat dijadikan pemain cadangan.",
        422
      );
    }

    // 7. Cek batas pemain cadangan jika diubah menjadi cadangan
    if (data.is_substitute && !member.is_substitute) {
      const { count: subCount } = await admin
        .from("team_members")
        .select("*", { count: "exact", head: true })
        .eq("team_id", teamId)
        .eq("is_substitute", true);

      if ((subCount || 0) >= 2) {
        return apiError(
          ERROR_CODES.INTERNAL_ERROR,
          "Tim sudah mencapai batas maksimal 2 pemain cadangan.",
          422
        );
      }
    }

    // 8. Cek apakah UID Free Fire bentrok dengan peserta lain di turnamen ini (BR-ROST-03)
    if (data.uid_game !== member.uid_game) {
      const { data: otherMembers } = await admin
        .from("team_members")
        .select("id, team_id")
        .eq("uid_game", data.uid_game)
        .neq("id", memberId);

      if (otherMembers && otherMembers.length > 0) {
        const otherTeamIds = otherMembers.map((m: { id: string; team_id: string }) => m.team_id);
        const { data: conflictTeam } = await admin
          .from("teams")
          .select("nama")
          .in("id", otherTeamIds)
          .eq("tournament_id", team.tournament_id)
          .maybeSingle();

        if (conflictTeam) {
          return apiError(
            ERROR_CODES.ROSTER_UID_DUPLICATE,
            `UID ${data.uid_game} sudah terdaftar di tim "${conflictTeam.nama}" pada turnamen ini.`,
            409
          );
        }
      }
    }

    // 9. Lakukan update data anggota
    const { data: updatedMember, error: updateErr } = await admin
      .from("team_members")
      .update({
        ign: data.ign,
        uid_game: data.uid_game,
        role_tim: data.role_tim,
        is_substitute: data.is_substitute,
      })
      .eq("id", memberId)
      .select()
      .single();

    if (updateErr || !updatedMember) {
      return apiError(
        ERROR_CODES.INTERNAL_ERROR,
        updateErr?.message || "Gagal memperbarui data pemain.",
        500
      );
    }

    // 10. Audit log
    const meta = getRequestMeta(request);
    await writeAuditLog({
      tournamentId: team.tournament_id,
      actorId: user.id,
      action: "roster.update",
      entity: "team",
      entityId: team.id,
      before: member,
      after: updatedMember,
      reason: `Data pemain ${data.ign} (${memberId}) diperbarui`,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return apiSuccess({
      member: updatedMember,
      message: `Data pemain ${data.ign} berhasil diperbarui!`,
    });
  } catch (err: unknown) {
    console.error("PATCH /api/teams/[teamId]/members/[memberId] error:", err);
    const msg = err instanceof Error ? err.message : "Terjadi kesalahan internal server.";
    return apiError(ERROR_CODES.INTERNAL_ERROR, msg, 500);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ teamId: string; memberId: string }> }
) {
  try {
    const { teamId, memberId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return apiError(ERROR_CODES.FORBIDDEN_ROLE, "Silakan masuk terlebih dahulu.", 401);
    }

    const admin = createAdminClient();

    // 1. Ambil data tim
    const { data: team, error: teamErr } = await admin
      .from("teams")
      .select("id, nama, tournament_id, kapten_user_id")
      .eq("id", teamId)
      .single();

    if (teamErr || !team) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, "Tim tidak ditemukan.", 404);
    }

    // 2. Ambil data turnamen
    const { data: tournament } = await admin
      .from("tournaments")
      .select("id, status, organizer_id")
      .eq("id", team.tournament_id)
      .single();

    // 3. Ambil data member yang ingin dihapus
    const { data: member, error: memberErr } = await admin
      .from("team_members")
      .select("id, team_id, user_id, ign, uid_game, role_tim")
      .eq("id", memberId)
      .eq("team_id", teamId)
      .single();

    if (memberErr || !member) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, "Pemain tidak ditemukan dalam tim ini.", 404);
    }

    // 4. Kapten tidak boleh menghapus dirinya sendiri dari roster
    if (member.user_id === team.kapten_user_id) {
      return apiError(
        ERROR_CODES.INTERNAL_ERROR,
        "Kapten tim tidak dapat dikeluarkan dari roster.",
        400
      );
    }

    // 5. Cek otorisasi: Hanya kapten atau panitia yang boleh mengeluarkan
    const isCaptain = team.kapten_user_id === user.id;
    const isOrganizer = tournament?.organizer_id === user.id;

    const { data: staffRole } = await admin
      .from("tournament_staff")
      .select("role")
      .eq("tournament_id", team.tournament_id)
      .eq("user_id", user.id)
      .maybeSingle();

    const isStaff = Boolean(staffRole) || isOrganizer;

    if (!isCaptain && !isStaff) {
      return apiError(
        ERROR_CODES.FORBIDDEN_ROLE,
        "Hanya kapten atau panitia yang dapat mengeluarkan pemain dari tim.",
        403
      );
    }

    // 6. Cek Roster Lock
    const isLocked =
      tournament?.status === "closed" ||
      tournament?.status === "running" ||
      tournament?.status === "done";

    if (isLocked && !isStaff) {
      return apiError(
        ERROR_CODES.ROSTER_LOCKED,
        "Roster turnamen sudah dikunci. Hubungi panitia untuk melakukan perubahan.",
        409
      );
    }

    // 7. Hapus member dari database
    const { error: deleteErr } = await admin
      .from("team_members")
      .delete()
      .eq("id", memberId);

    if (deleteErr) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, deleteErr.message || "Gagal menghapus pemain.", 500);
    }

    // 8. Audit log
    const meta = getRequestMeta(request);
    await writeAuditLog({
      tournamentId: team.tournament_id,
      actorId: user.id,
      action: "roster.update",
      entity: "team",
      entityId: team.id,
      before: member,
      reason: `Pemain ${member.ign} (${member.uid_game}) dikeluarkan dari tim`,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return apiSuccess({
      message: `Pemain ${member.ign} berhasil dikeluarkan dari tim.`,
    });
  } catch (err: unknown) {
    console.error("DELETE /api/teams/[teamId]/members/[memberId] error:", err);
    const msg = err instanceof Error ? err.message : "Terjadi kesalahan internal server.";
    return apiError(ERROR_CODES.INTERNAL_ERROR, msg, 500);
  }
}
