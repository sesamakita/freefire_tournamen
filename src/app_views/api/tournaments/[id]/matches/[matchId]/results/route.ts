import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { submitScoresSchema } from "@/lib/validations/score";
import { apiError, apiSuccess, ERROR_CODES } from "@/types";
import { writeAuditLog, getRequestMeta } from "@/lib/audit";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; matchId: string }> }
) {
  try {
    const { matchId } = await params;
    const admin = createAdminClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = admin as any;
    const { data: results, error } = await db
      .from("results")
      .select(`
        id,
        match_id,
        team_id,
        placement,
        kills,
        points,
        screenshot_url,
        status,
        submitted_by,
        submitted_at,
        verified_by,
        verified_at,
        rejection_reason,
        teams:team_id (id, nama, logo_url),
        submitter:submitted_by (nama, email),
        verifier:verified_by (nama, email)
      `)
      .eq("match_id", matchId)
      .order("placement", { ascending: true });

    if (error) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, error.message, 500);
    }

    return apiSuccess(results || []);
  } catch (err: unknown) {
    console.error("GET results error:", err);
    return apiError(ERROR_CODES.INTERNAL_ERROR, "Gagal memuat hasil pertandingan.", 500);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; matchId: string }> }
) {
  try {
    const { id: tournamentId, matchId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return apiError(ERROR_CODES.FORBIDDEN_ROLE, "Silakan login terlebih dahulu.", 401);
    }

    const admin = createAdminClient();

    // 1. Verifikasi peran staff
    const { data: staff } = await admin
      .from("tournament_staff")
      .select("role")
      .eq("tournament_id", tournamentId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!staff) {
      return apiError(ERROR_CODES.FORBIDDEN_ROLE, "Hanya panitia/admin yang berhak menginput skor.", 403);
    }

    const body = await request.json();
    const parseResult = submitScoresSchema.safeParse(body);

    if (!parseResult.success) {
      return apiError(
        ERROR_CODES.INTERNAL_ERROR,
        parseResult.error.issues[0]?.message || "Validasi hasil skor gagal.",
        422
      );
    }

    const data = parseResult.data;

    // 2. Cek apakah hasil untuk match ini sudah disetujui sebelumnya (BR-SCR-06)
    const { data: existingApproved } = await admin
      .from("results")
      .select("id")
      .eq("match_id", matchId)
      .eq("status", "approved")
      .limit(1);

    if (existingApproved && existingApproved.length > 0) {
      return apiError(
        ERROR_CODES.SCORE_ALREADY_APPROVED,
        "Skor untuk match ini sudah disetujui (Approved) dan tidak dapat ditimpa langsung.",
        409
      );
    }

    // 3. Hapus draft / pending hasil sebelumnya untuk match ini
    await admin.from("results").delete().eq("match_id", matchId).neq("status", "approved");

    // 4. Siapkan baris insert. Poin dihitung otomatis oleh trigger calculate_points() di Postgres!
    const rowsToInsert = data.results.map((r) => ({
      match_id: matchId,
      team_id: r.team_id,
      placement: r.placement,
      kills: r.kills,
      screenshot_url: data.screenshot_url,
      submitted_by: user.id,
      status: "pending" as const,
    }));

    const { error: insertError } = await admin.from("results").insert(rowsToInsert);

    if (insertError) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, insertError.message, 500);
    }

    // 5. Update status match menjadi 'ongoing'
    await admin
      .from("matches")
      .update({ status: "ongoing" })
      .eq("id", matchId);

    // 6. Catat di audit log
    const meta = getRequestMeta(request);
    await writeAuditLog({
      tournamentId,
      actorId: user.id,
      action: "score.submit",
      entity: "result",
      entityId: matchId,
      after: { team_count: data.results.length, screenshot_url: data.screenshot_url },
      reason: `Panitia menginput skor match (${data.results.length} tim)`,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return apiSuccess({
      message: "Skor berhasil disubmit dan menunggu verifikasi admin (Dual Approval).",
    }, 201);
  } catch (err: unknown) {
    console.error("POST results error:", err);
    return apiError(ERROR_CODES.INTERNAL_ERROR, "Terjadi kesalahan server saat submit skor.", 500);
  }
}
