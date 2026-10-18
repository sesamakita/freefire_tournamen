import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, apiSuccess, ERROR_CODES } from "@/types";
import { writeAuditLog, getRequestMeta } from "@/lib/audit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return apiError(ERROR_CODES.FORBIDDEN_ROLE, "Silakan login terlebih dahulu.", 401);
    }

    const admin = createAdminClient();

    const { data: invitation, error } = await admin
      .from("team_invitations")
      .select("id, team_id, status")
      .eq("token", token)
      .single();

    if (error || !invitation) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, "Undangan tidak ditemukan.", 404);
    }

    if (invitation.status !== "pending") {
      return apiError(
        ERROR_CODES.INTERNAL_ERROR,
        `Undangan sudah berstatus ${invitation.status}.`,
        409
      );
    }

    await admin
      .from("team_invitations")
      .update({
        status: "declined",
        invited_user_id: user.id,
      })
      .eq("id", invitation.id);

    const meta = getRequestMeta(request);
    await writeAuditLog({
      actorId: user.id,
      action: "member.removed",
      entity: "team",
      entityId: invitation.team_id,
      reason: "Pemain menolak undangan tim",
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return apiSuccess({ message: "Undangan telah ditolak." });
  } catch (err: unknown) {
    console.error("POST /api/invitations/[token]/decline error:", err);
    return apiError(ERROR_CODES.INTERNAL_ERROR, "Terjadi kesalahan server.", 500);
  }
}
