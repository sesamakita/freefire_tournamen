import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, apiSuccess, ERROR_CODES } from "@/types";
import { z } from "zod";

const createSponsorSchema = z.object({
  name: z.string().trim().min(2, "Nama sponsor minimal 2 karakter.").max(100),
  logo_url: z.string().url("URL logo sponsor harus berupa link valid."),
  banner_url: z.string().url("URL banner iklan harus berupa link valid.").optional().nullable(),
  tier: z.enum(["title", "main", "supporter", "media_partner"]).default("supporter"),
  external_url: z.string().url().optional().nullable(),
  display_order: z.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/tournaments/[id]/sponsors
 * Mengambil daftar sponsor turnamen
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id: tournamentId } = await params;
    if (!tournamentId) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, "ID turnamen tidak valid.", 400);
    }

    const admin = createAdminClient();
    const db = admin as any;

    const { data: sponsors, error } = await db
      .from("tournament_sponsors")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, "Gagal mengambil daftar sponsor.", 500);
    }

    return apiSuccess(sponsors || []);
  } catch (err: any) {
    return apiError(ERROR_CODES.INTERNAL_ERROR, err.message || "Terjadi kesalahan server.", 500);
  }
}

/**
 * POST /api/tournaments/[id]/sponsors
 * Menambahkan sponsor baru untuk turnamen (Hanya Organizer/Staff)
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id: tournamentId } = await params;
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
      return apiError(ERROR_CODES.FORBIDDEN_ROLE, "Hanya panitia yang berhak menambahkan sponsor.", 403);
    }

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      return apiError(ERROR_CODES.INTERNAL_ERROR, "Format JSON tidak valid.", 400);
    }

    const parsed = createSponsorSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        ERROR_CODES.INTERNAL_ERROR,
        parsed.error.issues?.[0]?.message || "Data sponsor tidak valid.",
        400
      );
    }

    const newSponsorData = {
      ...parsed.data,
      tournament_id: tournamentId,
    };

    const { data: createdSponsor, error: insertErr } = await db
      .from("tournament_sponsors")
      .insert(newSponsorData)
      .select()
      .single();

    if (insertErr) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, "Gagal menyimpan sponsor baru.", 500);
    }

    return apiSuccess(createdSponsor, 201);
  } catch (err: any) {
    return apiError(ERROR_CODES.INTERNAL_ERROR, err.message || "Terjadi kesalahan server.", 500);
  }
}
