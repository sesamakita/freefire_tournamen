// app/routes/api.ai.test.ts
import type { ActionFunctionArgs } from "react-router";
import { createWebClient } from "@/lib/supabase/web";
import { apiError, apiSuccess, ERROR_CODES } from "@/types";
import { getAIVisionConfig, type AIVisionConfig } from "@/lib/ai/config";
import { testAIProviderConnection } from "@/lib/ai/universal";
import { isDevAuthenticated } from "@/lib/dev-auth";

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

    const body = (await request.json()) as Partial<AIVisionConfig>;
    const activeConfig = await getAIVisionConfig();

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
