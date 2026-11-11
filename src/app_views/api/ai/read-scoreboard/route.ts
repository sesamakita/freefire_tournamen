// src/app/api/ai/read-scoreboard/route.ts
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, apiSuccess, ERROR_CODES } from "@/types";
import { extractScoreboardUniversal } from "@/lib/ai/universal";
import { validasiHasilAI, MatchRegisteredTeam } from "@/lib/ai/validate";
import { writeAuditLog, getRequestMeta } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return apiError(ERROR_CODES.FORBIDDEN_ROLE, "Silakan login terlebih dahulu.", 401);
    }

    const body = await request.json();
    const { tournament_id, match_id, image_base64, image_url, mime_type = "image/jpeg" } = body;

    if (!tournament_id || !match_id) {
      return apiError(ERROR_CODES.BAD_REQUEST, "tournament_id dan match_id wajib disertakan.", 400);
    }

    const admin = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = admin as any;

    // 1. Verifikasi peran staff
    const { data: staff } = await db
      .from("tournament_staff")
      .select("role")
      .eq("tournament_id", tournament_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!staff) {
      return apiError(ERROR_CODES.FORBIDDEN_ROLE, "Hanya panitia/admin yang dapat menggunakan pembaca AI.", 403);
    }

    // 2. Ambil daftar tim yang terdaftar di match ini
    const { data: matchTeams, error: matchTeamsErr } = await db
      .from("match_teams")
      .select(`
        team_id,
        teams:team_id (
          id,
          nama
        )
      `)
      .eq("match_id", match_id);

    if (matchTeamsErr) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, "Gagal mengambil daftar tim di match.", 500);
    }

    const registeredTeams: MatchRegisteredTeam[] = (matchTeams || []).map((mt: any) => ({
      team_id: mt.team_id,
      team_name: mt.teams?.nama || `Tim ${mt.team_id.slice(0, 5)}`,
    }));

    if (registeredTeams.length === 0) {
      return apiError(
        ERROR_CODES.BAD_REQUEST,
        "Belum ada tim yang di-plot pada match ini. Plot slot tim terlebih dahulu.",
        400
      );
    }

    // 3. Persiapkan Base64 gambar
    let base64Data = image_base64 || "";
    let resolvedMime = mime_type;

    if (!base64Data && image_url) {
      try {
        const imgRes = await fetch(image_url);
        if (!imgRes.ok) throw new Error("Gagal mengunduh gambar dari URL");
        const arrayBuf = await imgRes.arrayBuffer();
        base64Data = Buffer.from(arrayBuf).toString("base64");
        resolvedMime = imgRes.headers.get("content-type") || mime_type;
      } catch (err: any) {
        return apiError(
          ERROR_CODES.BAD_REQUEST,
          `Gagal mengambil gambar dari screenshot_url: ${err.message}`,
          400
        );
      }
    }

    // Jika base64 mengandung prefix data URL "data:image/png;base64,...", bersihkan
    if (base64Data.includes(";base64,")) {
      const parts = base64Data.split(";base64,");
      resolvedMime = parts[0].replace("data:", "");
      base64Data = parts[1];
    }

    // 4. Ekstrak dengan Universal AI Vision Engine (Gemini / OpenAI Compatible)
    const rawAiOutput = await extractScoreboardUniversal({
      imageBase64: base64Data,
      mimeType: resolvedMime,
      registeredTeams,
    });

    // 5. Validasi silang
    const validationSummary = validasiHasilAI(rawAiOutput, registeredTeams);

    // 6. Audit log (Non-blocking)
    const meta = getRequestMeta(request);
    writeAuditLog({
      tournamentId: tournament_id,
      actorId: user.id,
      action: "ai.scoreboard_scan",
      entity: "matches",
      entityId: match_id,
      after: {
        total_teams_registered: registeredTeams.length,
        ai_detected_teams: rawAiOutput.teams.length,
        is_valid: validationSummary.isValid,
        confidence: validationSummary.overallConfidence,
        is_mock: !process.env.GEMINI_API_KEY,
      },
      ...meta,
    }).catch((err) => console.error("Audit log failed:", err));

    return apiSuccess({
      validation: validationSummary,
      isMock: !process.env.GEMINI_API_KEY,
      raw: rawAiOutput,
    });
  } catch (error: any) {
    console.error("API read-scoreboard error:", error);
    return apiError(
      ERROR_CODES.INTERNAL_ERROR,
      error.message || "Terjadi kesalahan saat memproses pembacaan AI.",
      500
    );
  }
}
