import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, apiSuccess, ERROR_CODES } from "@/types";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await params;
    const admin = createAdminClient();

    // Query on-the-fly SQL View: public.standings (BR-CLS-01)
    const { data: standings, error } = await admin
      .from("standings")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("rank", { ascending: true });

    if (error) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, error.message, 500);
    }

    return apiSuccess(standings || []);
  } catch (err: unknown) {
    console.error("GET standings error:", err);
    return apiError(ERROR_CODES.INTERNAL_ERROR, "Gagal memuat klasemen.", 500);
  }
}
