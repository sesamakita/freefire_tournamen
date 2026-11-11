import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, apiSuccess, ERROR_CODES } from "@/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id: tournamentId } = await params;
    const admin = createAdminClient();
    const db = admin as any;

    const { data: teams, error } = await db
      .from("teams")
      .select(`
        id,
        nama,
        logo_url,
        payment_status,
        verification_status,
        rejection_reason,
        created_at,
        users:kapten_user_id (nama, email, no_wa),
        team_members (id, ign, uid_game, role_tim, is_substitute)
      `)
      .eq("tournament_id", tournamentId)
      .order("created_at", { ascending: true });

    if (error) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, error.message, 500);
    }

    return apiSuccess(teams || []);
  } catch (err: unknown) {
    console.error("GET /api/tournaments/[id]/teams error:", err);
    return apiError(ERROR_CODES.INTERNAL_ERROR, "Gagal mengambil data tim turnamen.", 500);
  }
}
