import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { plotMatchTeamsSchema } from "@/lib/validations/match";
import { apiError, apiSuccess, ERROR_CODES } from "@/types";
import { writeAuditLog, getRequestMeta } from "@/lib/audit";

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

    // Verifikasi peran staff
    const { data: staff } = await admin
      .from("tournament_staff")
      .select("role")
      .eq("tournament_id", tournamentId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!staff) {
      return apiError(ERROR_CODES.FORBIDDEN_ROLE, "Hanya panitia yang berhak mengatur slot tim.", 403);
    }

    const body = await request.json();
    const parseResult = plotMatchTeamsSchema.safeParse(body);

    if (!parseResult.success) {
      return apiError(
        ERROR_CODES.INTERNAL_ERROR,
        parseResult.error.issues[0]?.message || "Validasi slotting tim gagal.",
        422
      );
    }

    const { slots } = parseResult.data;

    // 1. Hapus slotting lama pada match ini
    await admin.from("match_teams").delete().eq("match_id", matchId);

    // 2. Insert slotting baru
    const rowsToInsert = slots.map((s) => ({
      match_id: matchId,
      team_id: s.team_id,
      slot: s.slot,
    }));

    const { error: insertError } = await admin.from("match_teams").insert(rowsToInsert);

    if (insertError) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, insertError.message, 500);
    }

    const meta = getRequestMeta(request);
    await writeAuditLog({
      tournamentId,
      actorId: user.id,
      action: "match.update",
      entity: "match",
      entityId: matchId,
      reason: `Panitia mengatur slot peserta match (${slots.length} tim di-plot)`,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return apiSuccess({ message: `Berhasil mengatur ${slots.length} tim ke dalam slot match.` });
  } catch (err: unknown) {
    console.error("POST /slots error:", err);
    return apiError(ERROR_CODES.INTERNAL_ERROR, "Terjadi kesalahan server.", 500);
  }
}
