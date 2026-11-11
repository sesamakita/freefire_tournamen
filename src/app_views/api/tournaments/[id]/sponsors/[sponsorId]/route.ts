import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, apiSuccess, ERROR_CODES } from "@/types";
import { z } from "zod";

const updateSponsorSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  logo_url: z.string().url().optional(),
  banner_url: z.string().url().optional().nullable(),
  tier: z.enum(["title", "main", "supporter", "media_partner"]).optional(),
  external_url: z.string().url().optional().nullable(),
  display_order: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
});

interface RouteParams {
  params: Promise<{ id: string; sponsorId: string }>;
}

/**
 * PATCH /api/tournaments/[id]/sponsors/[sponsorId]
 * Update data sponsor turnamen
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id: tournamentId, sponsorId } = await params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return apiError(ERROR_CODES.FORBIDDEN_ROLE, "Silakan login terlebih dahulu.", 401);
    }

    const admin = createAdminClient();
    const db = admin as any;

    // Cek turnamen & hak akses
    const { data: tournament } = await db
      .from("tournaments")
      .select("id, organizer_id")
      .eq("id", tournamentId)
      .maybeSingle();

    if (!tournament) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, "Turnamen tidak ditemukan.", 404);
    }

    const isOrganizer = tournament.organizer_id === user.id;
    let isStaff = false;

    if (!isOrganizer) {
      const { data: staff } = await db
        .from("tournament_staff")
        .select("role")
        .eq("tournament_id", tournamentId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (staff && (staff.role === "owner" || staff.role === "admin")) {
        isStaff = true;
      }
    }

    if (!isOrganizer && !isStaff) {
      return apiError(ERROR_CODES.FORBIDDEN_ROLE, "Hanya panitia yang berhak mengubah sponsor.", 403);
    }

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      return apiError(ERROR_CODES.INTERNAL_ERROR, "Format JSON tidak valid.", 400);
    }

    const parsed = updateSponsorSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        ERROR_CODES.INTERNAL_ERROR,
        parsed.error.issues?.[0]?.message || "Data perubahan tidak valid.",
        400
      );
    }

    const { data: updatedSponsor, error: updateErr } = await db
      .from("tournament_sponsors")
      .update(parsed.data)
      .eq("id", sponsorId)
      .eq("tournament_id", tournamentId)
      .select()
      .single();

    if (updateErr) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, "Gagal mengupdate sponsor.", 500);
    }

    return apiSuccess(updatedSponsor);
  } catch (err: any) {
    return apiError(ERROR_CODES.INTERNAL_ERROR, err.message || "Terjadi kesalahan server.", 500);
  }
}

/**
 * DELETE /api/tournaments/[id]/sponsors/[sponsorId]
 * Hapus sponsor turnamen
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id: tournamentId, sponsorId } = await params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return apiError(ERROR_CODES.FORBIDDEN_ROLE, "Silakan login terlebih dahulu.", 401);
    }

    const admin = createAdminClient();
    const db = admin as any;

    // Cek turnamen & hak akses
    const { data: tournament } = await db
      .from("tournaments")
      .select("id, organizer_id")
      .eq("id", tournamentId)
      .maybeSingle();

    if (!tournament) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, "Turnamen tidak ditemukan.", 404);
    }

    const isOrganizer = tournament.organizer_id === user.id;
    let isStaff = false;

    if (!isOrganizer) {
      const { data: staff } = await db
        .from("tournament_staff")
        .select("role")
        .eq("tournament_id", tournamentId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (staff && (staff.role === "owner" || staff.role === "admin")) {
        isStaff = true;
      }
    }

    if (!isOrganizer && !isStaff) {
      return apiError(ERROR_CODES.FORBIDDEN_ROLE, "Hanya panitia yang berhak menghapus sponsor.", 403);
    }

    const { error: deleteErr } = await db
      .from("tournament_sponsors")
      .delete()
      .eq("id", sponsorId)
      .eq("tournament_id", tournamentId);

    if (deleteErr) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, "Gagal menghapus sponsor.", 500);
    }

    return apiSuccess({ deleted: true });
  } catch (err: any) {
    return apiError(ERROR_CODES.INTERNAL_ERROR, err.message || "Terjadi kesalahan server.", 500);
  }
}
