import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createMatchSchema } from "@/lib/validations/match";
import { apiError, apiSuccess, ERROR_CODES } from "@/types";
import { writeAuditLog, getRequestMeta } from "@/lib/audit";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const admin = createAdminClient();

    // Cek apakah requester adalah staff turnamen
    let isStaff = false;
    if (user) {
      const { data: staff } = await admin
        .from("tournament_staff")
        .select("role")
        .eq("tournament_id", tournamentId)
        .eq("user_id", user.id)
        .maybeSingle();

      isStaff = !!staff;
    }

    // Ambil list match
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = admin as any;
    const { data: matches, error } = await db
      .from("matches")
      .select(`
        id,
        tournament_id,
        nama,
        round,
        grup,
        jadwal,
        status,
        published_at,
        created_at,
        room_id,
        room_pass,
        match_teams (
          id,
          slot,
          team_id,
          teams:team_id (id, nama, logo_url)
        )
      `)
      .eq("tournament_id", tournamentId)
      .order("round", { ascending: true })
      .order("jadwal", { ascending: true });

    if (error) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, error.message, 500);
    }

    // Proteksi: Jika bukan staff, buang room_id & room_pass dari response! (BR-ROOM-06)
    const sanitizedMatches = (matches || []).map((m: any) => {
      if (!isStaff) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { room_id, room_pass, ...rest } = m;
        return rest;
      }
      return m;
    });

    return apiSuccess(sanitizedMatches);
  } catch (err: unknown) {
    console.error("GET /api/tournaments/[id]/matches error:", err);
    return apiError(ERROR_CODES.INTERNAL_ERROR, "Gagal memuat jadwal match.", 500);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return apiError(ERROR_CODES.FORBIDDEN_ROLE, "Silakan login terlebih dahulu.", 401);
    }

    const admin = createAdminClient();

    // Verifikasi peran staff
    const { data: staff } = await admin
      .from("tournament_staff")
      .select("role")
      .eq("tournament_id", tournamentId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!staff) {
      return apiError(ERROR_CODES.FORBIDDEN_ROLE, "Hanya panitia yang berhak membuat match.", 403);
    }

    const body = await request.json();
    const parseResult = createMatchSchema.safeParse(body);

    if (!parseResult.success) {
      return apiError(
        ERROR_CODES.INTERNAL_ERROR,
        parseResult.error.issues[0]?.message || "Validasi match gagal.",
        422
      );
    }

    const data = parseResult.data;

    const { data: match, error: insertError } = await admin
      .from("matches")
      .insert({
        tournament_id: tournamentId,
        nama: data.nama,
        round: data.round,
        grup: data.grup || null,
        jadwal: data.jadwal,
        status: "scheduled",
        published_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError || !match) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, insertError?.message || "Gagal membuat match.", 500);
    }

    const meta = getRequestMeta(request);
    await writeAuditLog({
      tournamentId,
      actorId: user.id,
      action: "match.create",
      entity: "match",
      entityId: match.id,
      after: match,
      reason: `Panitia membuat match baru "${match.nama}" Round ${match.round}`,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return apiSuccess(match, 201);
  } catch (err: unknown) {
    console.error("POST /api/tournaments/[id]/matches error:", err);
    return apiError(ERROR_CODES.INTERNAL_ERROR, "Terjadi kesalahan server.", 500);
  }
}
