import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createTournamentSchema } from "@/lib/validations/tournament";
import { apiError, apiSuccess, ERROR_CODES } from "@/types";
import { writeAuditLog, getRequestMeta } from "@/lib/audit";

export async function GET() {
  const supabase = await createClient();
  const { data: tournaments, error } = await supabase
    .from("tournaments")
    .select("id, nama, slug, entry_fee, max_teams, format, max_rounds, status, tgl_mulai, tgl_selesai, logo_url")
    .neq("status", "draft")
    .order("created_at", { ascending: false });

  if (error) {
    return apiError(ERROR_CODES.INTERNAL_ERROR, error.message, 500);
  }

  return apiSuccess(tournaments);
}

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
    const parseResult = createTournamentSchema.safeParse(body);

    if (!parseResult.success) {
      return apiError(
        ERROR_CODES.INTERNAL_ERROR,
        parseResult.error.issues[0]?.message || "Validasi gagal.",
        422
      );
    }

    const data = parseResult.data;
    const admin = createAdminClient();

    // 0. Pastikan profil user tersinkronisasi di public.users (Self-healing jika database di-reset)
    await admin.from("users").upsert(
      {
        id: user.id,
        email: user.email || `${user.id}@arenatempur.id`,
        nama: user.user_metadata?.nama || user.email?.split("@")[0] || "Penyelenggara",
        no_wa: user.user_metadata?.no_wa || "081234567890",
        email_verified_at: user.email_confirmed_at || new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    // 1. Buat turnamen dengan status 'open' langsung agar bisa langsung menerima pendaftaran tim
    const { data: tournament, error: insertError } = await admin
      .from("tournaments")
      .insert({
        organizer_id: user.id,
        nama: data.nama,
        slug: data.slug,
        deskripsi: data.deskripsi || null,
        entry_fee: data.entry_fee,
        max_teams: data.max_teams,
        format: data.format || "battle_royale",
        max_rounds: data.max_rounds || 5,
        tgl_mulai: data.tgl_mulai,
        tgl_selesai: data.tgl_selesai,
        status: "open", // Langsung dibuka
        is_public: true,
        tier: data.tier || "free",
        direct_payment_info: data.direct_payment_info || { bank_name: "", account_number: "", account_holder: "", qris_image_url: "" },
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.message.includes("unique") || insertError.code === "23505") {
        return apiError(
          ERROR_CODES.INTERNAL_ERROR,
          "Slug turnamen sudah digunakan. Silakan pilih slug lain.",
          409
        );
      }
      return apiError(ERROR_CODES.INTERNAL_ERROR, insertError.message, 500);
    }

    // 2. Daftarkan pembuat turnamen sebagai 'owner' di tournament_staff
    await admin.from("tournament_staff").insert({
      tournament_id: tournament.id,
      user_id: user.id,
      role: "owner",
    });

    // 3. Catat di audit log
    const meta = getRequestMeta(request);
    await writeAuditLog({
      tournamentId: tournament.id,
      actorId: user.id,
      action: "tournament.status_change",
      entity: "tournament",
      entityId: tournament.id,
      after: tournament,
      reason: "Pembuatan turnamen baru oleh penyelenggara",
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return apiSuccess(tournament, 201);
  } catch (err: unknown) {
    console.error("POST /api/tournaments error:", err);
    return apiError(ERROR_CODES.INTERNAL_ERROR, "Terjadi kesalahan server.", 500);
  }
}
