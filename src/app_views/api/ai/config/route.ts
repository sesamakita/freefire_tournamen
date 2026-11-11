// src/app/api/ai/config/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess, ERROR_CODES } from "@/types";
import {
  getPublicAIVisionConfig,
  saveAIVisionConfig,
  PRESET_DEFAULTS,
  AIVisionConfig,
} from "@/lib/ai/config";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return apiError(ERROR_CODES.FORBIDDEN_ROLE, "Silakan login terlebih dahulu.", 401);
    }

    const config = await getPublicAIVisionConfig();

    return apiSuccess({
      config,
      presets: PRESET_DEFAULTS,
    });
  } catch (error: any) {
    console.error("GET /api/ai/config error:", error);
    return apiError(ERROR_CODES.INTERNAL_ERROR, error.message || "Gagal memuat konfigurasi AI.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return apiError(ERROR_CODES.FORBIDDEN_ROLE, "Silakan login terlebih dahulu.", 401);
    }

    // Verifikasi user adalah panitia/admin pada setidaknya 1 turnamen
    const { data: staffRecords } = await supabase
      .from("tournament_staff")
      .select("role")
      .eq("user_id", user.id)
      .limit(1);

    if (!staffRecords || staffRecords.length === 0) {
      return apiError(
        ERROR_CODES.FORBIDDEN_ROLE,
        "Hanya panitia atau admin turnamen yang dapat mengubah konfigurasi AI.",
        403
      );
    }

    const body = (await request.json()) as Partial<AIVisionConfig>;

    if (!body.provider || !body.model) {
      return apiError(
        ERROR_CODES.BAD_REQUEST,
        "Parameter 'provider' dan 'model' wajib disertakan.",
        400
      );
    }

    if (body.provider === "openai_compatible" && !body.baseUrl) {
      return apiError(
        ERROR_CODES.BAD_REQUEST,
        "Base URL wajib diisi jika menggunakan OpenAI Compatible.",
        400
      );
    }

    const saved = await saveAIVisionConfig(body, user.id);

    return apiSuccess({
      message: "Konfigurasi AI berhasil disimpan dan aktif.",
      config: {
        ...saved,
        apiKey: undefined, // jangan kembalikan raw key
        hasApiKey: Boolean(saved.apiKey && saved.apiKey.trim().length > 0),
      },
    });
  } catch (error: any) {
    console.error("POST /api/ai/config error:", error);
    return apiError(ERROR_CODES.INTERNAL_ERROR, error.message || "Gagal menyimpan konfigurasi AI.", 500);
  }
}
