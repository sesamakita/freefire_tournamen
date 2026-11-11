import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, apiSuccess, ERROR_CODES } from "@/types";
import { writeAuditLog, getRequestMeta } from "@/lib/audit";

const updateTeamSchema = z.object({
  nama: z
    .string()
    .trim()
    .min(3, "Nama tim minimal 3 karakter.")
    .max(30, "Nama tim maksimal 30 karakter.")
    .regex(
      /^[a-zA-Z0-9 _\-\.\'\#]+$/,
      "Nama tim mengandung karakter yang tidak diizinkan."
    ),
  logo_url: z.string().url("URL logo tidak valid.").optional().or(z.literal("")),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await params;
    const admin = createAdminClient();

    const { data: team, error } = await admin
      .from("teams")
      .select(`
        *,
        tournaments:tournament_id (id, nama, status, format, entry_fee, slug),
        users:kapten_user_id (id, nama, email, no_wa)
      `)
      .eq("id", teamId)
      .single();

    if (error || !team) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, "Tim tidak ditemukan.", 404);
    }

    return apiSuccess(team);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Terjadi kesalahan server";
    return apiError(ERROR_CODES.INTERNAL_ERROR, msg, 500);
  }
}

export async function PATCH(
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
      return apiError(ERROR_CODES.FORBIDDEN_ROLE, "Silakan masuk terlebih dahulu.", 401);
    }

    const body = await request.json();
    const parseResult = updateTeamSchema.safeParse(body);
    if (!parseResult.success) {
      return apiError(
        ERROR_CODES.INTERNAL_ERROR,
        parseResult.error.issues[0]?.message || "Validasi data tim gagal.",
        422
      );
    }

    const data = parseResult.data;
    const admin = createAdminClient();

    // 1. Ambil data tim
    const { data: team, error: teamErr } = await admin
      .from("teams")
      .select("id, nama, tournament_id, kapten_user_id, logo_url")
      .eq("id", teamId)
      .single();

    if (teamErr || !team) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, "Tim tidak ditemukan.", 404);
    }

    // 2. Cek status turnamen dan organizer
    const { data: tournament } = await admin
      .from("tournaments")
      .select("id, status, organizer_id")
      .eq("id", team.tournament_id)
      .single();

    // 3. Cek otorisasi: kapten tim, panitia, atau pemilik turnamen
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
        "Hanya kapten atau panitia yang dapat mengubah data tim.",
        403
      );
    }

    // 4. Cek apakah turnamen sudah berjalan
    if ((tournament?.status === "running" || tournament?.status === "done") && !isStaff) {
      return apiError(
        ERROR_CODES.ROSTER_LOCKED,
        "Nama tim tidak dapat diubah karena pertandingan sedang atau telah berlangsung.",
        409
      );
    }

    // 5. Cek apakah nama tim baru sudah dipakai oleh tim lain di turnamen yang sama
    if (data.nama.toLowerCase() !== team.nama.toLowerCase()) {
      const { data: existingName } = await admin
        .from("teams")
        .select("id")
        .eq("tournament_id", team.tournament_id)
        .neq("id", teamId)
        .ilike("nama", data.nama.trim())
        .maybeSingle();

      if (existingName) {
        return apiError(
          ERROR_CODES.TEAM_NAME_TAKEN,
          `Nama tim "${data.nama}" sudah terdaftar di turnamen ini. Silakan gunakan nama lain.`,
          409
        );
      }
    }

    // 6. Update data tim
    const { data: updatedTeam, error: updateErr } = await admin
      .from("teams")
      .update({
        nama: data.nama.trim(),
        logo_url: data.logo_url || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", teamId)
      .select()
      .single();

    if (updateErr || !updatedTeam) {
      return apiError(
        ERROR_CODES.INTERNAL_ERROR,
        updateErr?.message || "Gagal memperbarui data tim.",
        500
      );
    }

    // 7. Audit log
    const meta = getRequestMeta(request);
    await writeAuditLog({
      tournamentId: team.tournament_id,
      actorId: user.id,
      action: "roster.update",
      entity: "team",
      entityId: team.id,
      before: team,
      after: updatedTeam,
      reason: `Profil tim diperbarui: nama="${data.nama}"`,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return apiSuccess({
      team: updatedTeam,
      message: `Profil tim "${updatedTeam.nama}" berhasil diperbarui!`,
    });
  } catch (err: unknown) {
    console.error("PATCH /api/teams/[teamId] error:", err);
    const msg = err instanceof Error ? err.message : "Terjadi kesalahan internal server.";
    return apiError(ERROR_CODES.INTERNAL_ERROR, msg, 500);
  }
}

export async function DELETE(
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
      return apiError(ERROR_CODES.FORBIDDEN_ROLE, "Silakan masuk terlebih dahulu.", 401);
    }

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
      .select("id, status, organizer_id")
      .eq("id", team.tournament_id)
      .single();

    // 3. Cek otorisasi
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
        "Hanya kapten atau panitia yang dapat membubarkan atau menghapus tim.",
        403
      );
    }

    // 4. Cek status turnamen
    if ((tournament?.status === "running" || tournament?.status === "done") && !isStaff) {
      return apiError(
        ERROR_CODES.ROSTER_LOCKED,
        "Tim tidak dapat dihapus karena turnamen sedang atau telah berlangsung. Hubungi panitia.",
        409
      );
    }

    // 5. Hapus tim (otomatis cascade ke team_members & team_invitations)
    const { error: deleteErr } = await admin
      .from("teams")
      .delete()
      .eq("id", teamId);

    if (deleteErr) {
      return apiError(
        ERROR_CODES.INTERNAL_ERROR,
        deleteErr.message || "Gagal menghapus tim.",
        500
      );
    }

    // 6. Audit log
    const meta = getRequestMeta(request);
    await writeAuditLog({
      tournamentId: team.tournament_id,
      actorId: user.id,
      action: "roster.update",
      entity: "team",
      entityId: team.id,
      before: team,
      reason: `Tim "${team.nama}" (${team.id}) dihapus/dibubarkan`,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return apiSuccess({
      message: `Tim "${team.nama}" berhasil dihapus / dibubarkan.`,
    });
  } catch (err: unknown) {
    console.error("DELETE /api/teams/[teamId] error:", err);
    const msg = err instanceof Error ? err.message : "Terjadi kesalahan internal server.";
    return apiError(ERROR_CODES.INTERNAL_ERROR, msg, 500);
  }
}
