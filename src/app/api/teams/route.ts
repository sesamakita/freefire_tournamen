import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createTeamSchema } from "@/lib/validations/team";
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
    const parseResult = createTeamSchema.safeParse(body);

    if (!parseResult.success) {
      return apiError(
        ERROR_CODES.INTERNAL_ERROR,
        parseResult.error.issues[0]?.message || "Validasi data tim gagal.",
        422
      );
    }

    const data = parseResult.data;
    const admin = createAdminClient();

    // 1. Cek turnamen berstatus 'open' (BR-TEAM-01)
    const { data: tournament, error: tournError } = await admin
      .from("tournaments")
      .select("id, nama, status, entry_fee, max_teams")
      .eq("id", data.tournament_id)
      .single();

    if (tournError || !tournament) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, "Turnamen tidak ditemukan.", 404);
    }

    if (tournament.status !== "open") {
      return apiError(
        ERROR_CODES.TEAM_NOT_OPEN,
        "Pendaftaran turnamen ini belum dibuka atau sudah ditutup.",
        409
      );
    }

    // 2. Cek apakah user sudah jadi kapten di turnamen ini (BR-TEAM-03)
    const { data: existingCaptain } = await admin
      .from("teams")
      .select("id, nama")
      .eq("tournament_id", data.tournament_id)
      .eq("kapten_user_id", user.id)
      .maybeSingle();

    if (existingCaptain) {
      return apiError(
        ERROR_CODES.TEAM_ALREADY_CAPTAIN,
        `Anda sudah terdaftar sebagai kapten tim "${existingCaptain.nama}" di turnamen ini.`,
        409
      );
    }

    // 3. Cek apakah nama tim sudah dipakai di turnamen ini (BR-TEAM-02)
    const { data: existingName } = await admin
      .from("teams")
      .select("id")
      .eq("tournament_id", data.tournament_id)
      .ilike("nama", data.nama.trim())
      .maybeSingle();

    if (existingName) {
      return apiError(
        ERROR_CODES.TEAM_NAME_TAKEN,
        "Nama tim ini sudah dipakai oleh tim lain di turnamen ini. Silakan pilih nama lain.",
        409
      );
    }

    // 4. Cek apakah UID game kapten sudah terdaftar di tim lain dalam turnamen ini (BR-ROST-03)
    const { data: existingUID } = await admin
      .from("team_members")
      .select(`
        id,
        teams:team_id (nama, tournament_id)
      `)
      .eq("uid_game", data.kapten_uid)
      .maybeSingle();

    // @ts-expect-error Supabase nested relation
    if (existingUID && existingUID.teams?.tournament_id === data.tournament_id) {
      return apiError(
        ERROR_CODES.ROSTER_UID_DUPLICATE,
        // @ts-expect-error Supabase nested relation
        `UID ${data.kapten_uid} sudah terdaftar di tim "${existingUID.teams?.nama}" pada turnamen ini.`,
        409
      );
    }

    // 5. Tentukan status pembayaran awal (BR-PAY-05)
    // Jika entry_fee = 0 (turnamen gratis), payment_status langsung 'verified'
    const initialPaymentStatus = tournament.entry_fee === 0 ? "verified" : "unpaid";

    // 6. Buat Tim
    const { data: team, error: teamError } = await admin
      .from("teams")
      .insert({
        tournament_id: data.tournament_id,
        kapten_user_id: user.id,
        nama: data.nama.trim(),
        logo_url: data.logo_url || null,
        payment_status: initialPaymentStatus,
        verification_status: "draft",
      })
      .select()
      .single();

    if (teamError || !team) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, teamError?.message || "Gagal membuat tim.", 500);
    }

    // 7. Otomatis daftarkan Kapten ke team_members sebagai anggota inti pertama
    const { error: memberError } = await admin.from("team_members").insert({
      team_id: team.id,
      user_id: user.id,
      ign: data.kapten_ign.trim(),
      uid_game: data.kapten_uid.trim(),
      role_tim: data.kapten_role,
      is_substitute: false,
    });

    if (memberError) {
      console.error("Failed to add captain to team_members:", memberError);
    }

    // 8. Tulis jejak audit
    const meta = getRequestMeta(request);
    await writeAuditLog({
      tournamentId: data.tournament_id,
      actorId: user.id,
      action: "roster.update",
      entity: "team",
      entityId: team.id,
      after: { team, kapten_ign: data.kapten_ign, kapten_uid: data.kapten_uid },
      reason: "Pendaftaran tim baru dan penambahan kapten ke roster",
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return apiSuccess({ team_id: team.id, nama: team.nama }, 201);
  } catch (err: unknown) {
    console.error("POST /api/teams error:", err);
    return apiError(ERROR_CODES.INTERNAL_ERROR, "Terjadi kesalahan server saat mendaftarkan tim.", 500);
  }
}
