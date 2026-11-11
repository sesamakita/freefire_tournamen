import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, apiSuccess, ERROR_CODES } from "@/types";
import { z } from "zod";
import { writeAuditLog, getRequestMeta } from "@/lib/audit";

const updateTournamentSchema = z.object({
  nama: z
    .string()
    .trim()
    .min(3, "Nama turnamen minimal 3 karakter.")
    .max(100, "Nama turnamen maksimal 100 karakter.")
    .optional(),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]{3,60}$/, "Slug hanya boleh huruf kecil, angka, dan strip (-) 3–60 karakter.")
    .optional(),
  deskripsi: z.string().optional().nullable(),
  entry_fee: z.number().min(0, "Biaya pendaftaran tidak boleh negatif.").optional(),
  max_teams: z.number().min(2, "Minimal 2 tim/peserta.").max(64, "Maksimal 64 tim/peserta.").optional(),
  format: z.enum(["battle_royale", "lone_wolf_1v1", "clash_squad"]).optional(),
  max_rounds: z.number().min(1, "Minimal 1 ronde.").max(15, "Maksimal 15 ronde.").optional(),
  status: z.enum(["draft", "open", "closed", "running", "done"]).optional(),
  is_public: z.boolean().optional(),
  tgl_mulai: z.string().optional().nullable(),
  tgl_selesai: z.string().optional().nullable(),
  // Live Streaming & OBS Overlays Support
  is_live: z.boolean().optional(),
  live_platform: z.enum(["youtube", "tiktok", "facebook", "custom"]).optional(),
  live_stream_url: z.string().optional().nullable(),
  live_title: z.string().optional().nullable(),
  obs_token: z.string().optional().nullable(),
  // Intermission (Layar Jeda Iklan) & Sponsor Support
  intermission_active: z.boolean().optional(),
  intermission_target_time: z.string().optional().nullable(),
  intermission_title: z.string().optional().nullable(),
  intermission_match_number: z.number().min(1).max(20).optional().nullable(),
  tier: z.enum(["free", "pro", "enterprise"]).optional(),
  direct_payment_info: z.any().optional(),
  cloud_stream_config: z.any().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/tournaments/[id]
 * Mengambil detail data turnamen untuk diedit atau dilihat oleh panitia
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const resolvedParams = await params;
    const tournamentId = resolvedParams?.id;

    if (!tournamentId) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, "ID turnamen tidak valid.", 400);
    }

    const admin = createAdminClient();
    const db = admin as any;

    const { data: tournament, error } = await db
      .from("tournaments")
      .select(`
        id,
        nama,
        slug,
        deskripsi,
        entry_fee,
        max_teams,
        format,
        max_rounds,
        status,
        is_public,
        tgl_mulai,
        tgl_selesai,
        logo_url,
        banner_url,
        qris_image_url,
        organizer_id,
        is_live,
        live_platform,
        live_stream_url,
        live_title,
        obs_token,
        intermission_active,
        intermission_target_time,
        intermission_title,
        intermission_match_number,
        tier,
        direct_payment_info
      `)
      .eq("id", tournamentId)
      .maybeSingle();

    if (error || !tournament) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, "Turnamen tidak ditemukan.", 404);
    }

    return apiSuccess(tournament);
  } catch (err: any) {
    console.error("GET /api/tournaments/[id] error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return apiError(ERROR_CODES.INTERNAL_ERROR, `Gagal mengambil data turnamen: ${msg}`, 500);
  }
}

/**
 * PATCH /api/tournaments/[id]
 * Mengupdate data turnamen oleh Panitia / Penyelenggara (Owner / Admin)
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const resolvedParams = await params;
    const tournamentId = resolvedParams?.id;

    if (!tournamentId) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, "ID turnamen tidak valid.", 400);
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return apiError(ERROR_CODES.FORBIDDEN_ROLE, "Silakan login terlebih dahulu.", 401);
    }

    const admin = createAdminClient();
    const db = admin as any;

    // 1. Ambil data turnamen yang akan diedit
    const { data: currentTournament, error: fetchErr } = await db
      .from("tournaments")
      .select("*")
      .eq("id", tournamentId)
      .maybeSingle();

    if (fetchErr || !currentTournament) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, "Turnamen tidak ditemukan.", 404);
    }

    // 2. Otorisasi: Pastikan user adalah Organizer atau Staff (owner / admin)
    const isOrganizer = currentTournament.organizer_id === user.id;
    let isStaffAdmin = false;

    if (!isOrganizer) {
      const { data: staff } = await db
        .from("tournament_staff")
        .select("role")
        .eq("tournament_id", tournamentId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (staff && (staff.role === "owner" || staff.role === "admin")) {
        isStaffAdmin = true;
      }
    }

    if (!isOrganizer && !isStaffAdmin) {
      return apiError(
        ERROR_CODES.FORBIDDEN_ROLE,
        "Hanya penyelenggara (Owner/Admin) yang berhak mengubah data turnamen.",
        403
      );
    }

    // 3. Validasi Body Request
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      return apiError(ERROR_CODES.INTERNAL_ERROR, "Format data request tidak valid.", 400);
    }

    const parsed = updateTournamentSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        ERROR_CODES.INTERNAL_ERROR,
        parsed.error.issues?.[0]?.message || "Data turnamen tidak valid.",
        400
      );
    }

    const updateData: any = { ...parsed.data };

    // Simpan konfigurasi Cloud Stream ke JSONB direct_payment_info.cloud_stream agar kompatibel & aman
    if (updateData.cloud_stream_config) {
      const currentPaymentInfo = currentTournament.direct_payment_info || {};
      updateData.direct_payment_info = {
        ...currentPaymentInfo,
        cloud_stream: updateData.cloud_stream_config,
      };
      delete updateData.cloud_stream_config;
    }

    // 4. Jika slug diubah, pastikan tidak bentrok dengan turnamen lain
    if (updateData.slug && updateData.slug !== currentTournament.slug) {
      const { data: existingSlug } = await db
        .from("tournaments")
        .select("id")
        .eq("slug", updateData.slug)
        .neq("id", tournamentId)
        .maybeSingle();

      if (existingSlug) {
        return apiError(
          ERROR_CODES.INTERNAL_ERROR,
          "Slug turnamen ini sudah dipakai oleh turnamen lain. Silakan pilih slug yang berbeda.",
          409
        );
      }
    }

    // 5. Update data turnamen
    const { data: updatedTournament, error: updateErr } = await db
      .from("tournaments")
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", tournamentId)
      .select()
      .maybeSingle();

    if (updateErr) {
      return apiError(
        ERROR_CODES.INTERNAL_ERROR,
        updateErr.message || "Gagal memperbarui turnamen di database.",
        500
      );
    }

    if (!updatedTournament) {
      return apiError(
        ERROR_CODES.INTERNAL_ERROR,
        "Turnamen tidak ditemukan untuk diperbarui.",
        404
      );
    }

    // 6. Catat Audit Log (Non-blocking: kegagalan audit tidak membatalkan update)
    try {
      const { ip, userAgent } = getRequestMeta(request);
      await writeAuditLog({
        tournamentId,
        actorId: user.id,
        action: "tournament.update",
        entity: "tournaments",
        entityId: tournamentId,
        before: {
          nama: currentTournament.nama,
          slug: currentTournament.slug,
          status: currentTournament.status,
          entry_fee: currentTournament.entry_fee,
          max_teams: currentTournament.max_teams,
          format: currentTournament.format,
        },
        after: {
          nama: updatedTournament.nama,
          slug: updatedTournament.slug,
          status: updatedTournament.status,
          entry_fee: updatedTournament.entry_fee,
          max_teams: updatedTournament.max_teams,
          format: updatedTournament.format,
        },
        ip,
        userAgent,
      });
    } catch (auditErr) {
      console.error("[AUDIT] Error writing audit log for tournament update:", auditErr);
    }

    return apiSuccess(updatedTournament);
  } catch (err: any) {
    console.error("PATCH /api/tournaments/[id] error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return apiError(
      ERROR_CODES.INTERNAL_ERROR,
      `Gagal memperbarui turnamen: ${msg}`,
      500
    );
  }
}
