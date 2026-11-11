// app/routes/api.ai.config.ts
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { createWebClient } from "@/lib/supabase/web";
import { apiError, apiSuccess, ERROR_CODES } from "@/types";
import {
  getPublicAIVisionConfig,
  saveAIVisionConfig,
  PRESET_DEFAULTS,
  type AIVisionConfig,
} from "@/lib/ai/config";
import { isDevAuthenticated } from "@/lib/dev-auth";

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const isDev = isDevAuthenticated(request);
    const { client: supabase } = createWebClient(request);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user && !isDev) {
      return apiError(ERROR_CODES.FORBIDDEN_ROLE, "Silakan login terlebih dahulu.", 401);
    }

    const config = await getPublicAIVisionConfig();

    return apiSuccess({
      config,
      presets: PRESET_DEFAULTS,
    });
  } catch (error: any) {
    console.error("GET /api/ai/config error:", error);
    return apiError(
      ERROR_CODES.INTERNAL_ERROR,
      error.message || "Gagal memuat konfigurasi AI.",
      500
    );
  }
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return apiError(ERROR_CODES.BAD_REQUEST, "Metode HTTP tidak didukung.", 405);
  }

  try {
    const isDev = isDevAuthenticated(request);
    const { client: supabase } = createWebClient(request);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user && !isDev) {
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
        apiKey: undefined,
        hasApiKey: Boolean(saved.apiKey && saved.apiKey.trim().length > 0),
      },
    });
  } catch (error: any) {
    console.error("POST /api/ai/config error:", error);
    return apiError(
      ERROR_CODES.INTERNAL_ERROR,
      error.message || "Gagal menyimpan konfigurasi AI.",
      500
    );
  }
}
