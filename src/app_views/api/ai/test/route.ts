// src/app/api/ai/test/route.ts
import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess, ERROR_CODES } from "@/types";
import { getAIVisionConfig, AIVisionConfig } from "@/lib/ai/config";
import { testAIProviderConnection } from "@/lib/ai/universal";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return apiError(ERROR_CODES.FORBIDDEN_ROLE, "Silakan login terlebih dahulu.", 401);
    }

    const body = (await request.json()) as Partial<AIVisionConfig>;
    const activeConfig = await getAIVisionConfig();

    // Gunakan apiKey dari input atau jika kosong/placeholder, gunakan yang tersimpan di server
    const apiKeyToTest =
      body.apiKey && body.apiKey.trim() !== "" ? body.apiKey.trim() : activeConfig.apiKey;

    const testConfig: AIVisionConfig = {
      provider: body.provider || activeConfig.provider,
      preset: body.preset || activeConfig.preset,
      baseUrl: body.baseUrl || activeConfig.baseUrl,
      apiKey: apiKeyToTest,
      model: body.model || activeConfig.model,
      temperature: body.temperature ?? activeConfig.temperature ?? 0.1,
    };

    const result = await testAIProviderConnection(testConfig);

    return apiSuccess({
      ...result,
      provider: testConfig.provider,
      testedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("POST /api/ai/test error:", error);
    return apiError(
      ERROR_CODES.INTERNAL_ERROR,
      error.message || "Gagal melakukan uji koneksi AI.",
      500
    );
  }
}
