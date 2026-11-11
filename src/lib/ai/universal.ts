// src/lib/ai/universal.ts
import { GoogleGenAI } from "@google/genai";
import { AIRawOutput, MatchRegisteredTeam } from "./validate";
import { generateMockScoreboardAI } from "./gemini";
import { AIVisionConfig, getAIVisionConfig } from "./config";

export const SCOREBOARD_SYSTEM_INSTRUCTION = `
Kamu adalah sistem AI OCR presisi tinggi untuk membaca papan skor (scoreboard) akhir pertandingan game Free Fire (Battle Royale atau Custom Room).
Tugasmu adalah menganalisis gambar screenshot papan skor yang diberikan dan mengekstrak:
1. Urutan peringkat (Rank / Placement 1 sampai N).
2. Nama tim atau clan/guild yang tertera di setiap baris.
3. Jumlah kill yang diperoleh setiap tim.
4. Flag apakah teks pada baris tersebut terbaca jelas ('terbaca': true/false).
5. Catatan jika ada keraguan, teks buram, atau angka yang tertutup ikon.

Pedoman Penting:
- Placement biasanya berurutan dari 1, 2, 3...
- Free Fire biasanya memiliki maksimal 12 tim dalam 1 match Battle Royale (atau 2 tim dalam Lone Wolf/Clash Squad).
- Jika ada nama tim yang agak terpotong atau ada tag kurung siku seperti [EVOS], cantumkan nama selengkap yang terbaca.
- Wajib mengembalikan JSON valid persis sesuai schema yang diminta tanpa tambahan teks di luar JSON.
`;

function buildUserPrompt(registeredTeams: MatchRegisteredTeam[]): string {
  const knownTeamsList = registeredTeams.map((t) => t.team_name).join(", ");
  return `
Bacalah gambar papan skor Free Fire ini secara teliti.
Daftar tim resmi yang bertanding di match ini: [${knownTeamsList}].
Total tim yang bertanding: ${registeredTeams.length}.

Format output HARUS berupa JSON murni dengan format persis:
{
  "confidence": 0.95,
  "teams": [
    {
      "rank": 1,
      "nama_tim": "NAMA_TIM",
      "kills": 8,
      "terbaca": true,
      "catatan": ""
    }
  ],
  "catatan": "Catatan umum jika ada"
}
`;
}

/**
 * Membersihkan format teks JSON jika model menyertakan markdown block ```json ... ```
 */
function cleanJsonText(rawText: string): string {
  let text = rawText.trim();
  if (text.startsWith("```json")) {
    text = text.replace(/^```json/, "").replace(/```$/, "").trim();
  } else if (text.startsWith("```")) {
    text = text.replace(/^```/, "").replace(/```$/, "").trim();
  }
  return text;
}

/**
 * Ekstraksi Scoreboard menggunakan Universal Engine (Mendukung Gemini & Custom OpenAI-Compatible)
 */
export async function extractScoreboardUniversal(params: {
  imageBase64: string;
  mimeType: string;
  registeredTeams: MatchRegisteredTeam[];
  overrideConfig?: AIVisionConfig;
}): Promise<AIRawOutput> {
  const config = params.overrideConfig || (await getAIVisionConfig());

  // 1. Eksekusi menggunakan Google Gemini
  if (config.provider === "gemini") {
    const apiKey = config.apiKey || process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey.trim() === "" || apiKey === "your-gemini-api-key-here") {
      return generateMockScoreboardAI(params.registeredTeams);
    }

    const ai = new GoogleGenAI({ apiKey });
    const userPrompt = buildUserPrompt(params.registeredTeams);

    try {
      const response = await ai.models.generateContent({
        model: config.model || "gemini-2.0-flash",
        contents: [
          {
            role: "user",
            parts: [
              { text: userPrompt },
              {
                inlineData: {
                  data: params.imageBase64,
                  mimeType: params.mimeType,
                },
              },
            ],
          },
        ],
        config: {
          systemInstruction: SCOREBOARD_SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          temperature: config.temperature ?? 0.1,
        },
      });

      const responseText = response.text;
      if (!responseText) throw new Error("Model Gemini tidak mengembalikan respon.");
      const parsed: AIRawOutput = JSON.parse(cleanJsonText(responseText));
      return parsed;
    } catch (err: any) {
      console.error("Gemini Universal Error:", err);
      throw new Error(`Gagal memproses gambar dengan Gemini (${config.model}): ${err.message}`);
    }
  }

  // 2. Eksekusi menggunakan OpenAI-Compatible Vision Provider
  if (config.provider === "openai_compatible") {
    let baseUrl = (config.baseUrl || "https://api.openai.com/v1").trim().replace(/\/+$/, "");
    if (!baseUrl.endsWith("/chat/completions")) {
      baseUrl = `${baseUrl}/chat/completions`;
    }

    const apiKey = config.apiKey || "";
    const userPrompt = buildUserPrompt(params.registeredTeams);

    const dataUri = `data:${params.mimeType || "image/jpeg"};base64,${params.imageBase64}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const requestBody: any = {
      model: config.model,
      temperature: config.temperature ?? 0.1,
      messages: [
        {
          role: "system",
          content: SCOREBOARD_SYSTEM_INSTRUCTION,
        },
        {
          role: "user",
          content: [
            { type: "text", text: userPrompt },
            {
              type: "image_url",
              image_url: {
                url: dataUri,
              },
            },
          ],
        },
      ],
    };

    // Sertakan response_format json_object untuk provider yang mendukung
    if (!config.model.includes("ollama")) {
      requestBody.response_format = { type: "json_object" };
    }

    try {
      const res = await fetch(baseUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errorText.slice(0, 300)}`);
      }

      const json = await res.json();
      const content = json.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error("Provider AI tidak mengembalikan konten jawaban.");
      }

      const parsed: AIRawOutput = JSON.parse(cleanJsonText(content));
      return parsed;
    } catch (err: any) {
      console.error("OpenAI Compatible Error:", err);
      throw new Error(`Gagal memproses dengan ${config.model} (${baseUrl}): ${err.message}`);
    }
  }

  throw new Error(`Provider AI '${config.provider}' tidak dikenali.`);
}

/**
 * Uji koneksi API penyedia AI (Ping Test)
 */
export async function testAIProviderConnection(
  config: AIVisionConfig
): Promise<{ ok: boolean; latencyMs: number; message: string; model: string }> {
  const startTime = Date.now();

  try {
    if (config.provider === "gemini") {
      const apiKey = config.apiKey || process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey.trim() === "") {
        return {
          ok: false,
          latencyMs: 0,
          message: "API Key Gemini belum diisi.",
          model: config.model || "gemini-2.0-flash",
        };
      }

      const ai = new GoogleGenAI({ apiKey });
      const res = await ai.models.generateContent({
        model: config.model || "gemini-2.0-flash",
        contents: "Tes koneksi arena tempur. Balas satu kata: OK",
      });

      const text = res.text || "";
      const latencyMs = Date.now() - startTime;
      return {
        ok: true,
        latencyMs,
        message: `Terhubung sukses! Respon: ${text.trim().slice(0, 50)}`,
        model: config.model,
      };
    }

    if (config.provider === "openai_compatible") {
      let baseUrl = (config.baseUrl || "https://api.openai.com/v1").trim().replace(/\/+$/, "");
      if (!baseUrl.endsWith("/chat/completions")) {
        baseUrl = `${baseUrl}/chat/completions`;
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (config.apiKey) {
        headers["Authorization"] = `Bearer ${config.apiKey.trim()}`;
      }

      const res = await fetch(baseUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: config.model,
          messages: [{ role: "user", content: "Ping connection test. Reply with: OK" }],
          max_tokens: 15,
        }),
      });

      const latencyMs = Date.now() - startTime;

      if (!res.ok) {
        const errBody = await res.text();
        return {
          ok: false,
          latencyMs,
          message: `Gagal (HTTP ${res.status}): ${errBody.slice(0, 150)}`,
          model: config.model,
        };
      }

      const json = await res.json();
      const reply = json.choices?.[0]?.message?.content || "OK";

      return {
        ok: true,
        latencyMs,
        message: `Koneksi berhasil! Respon: ${reply.trim().slice(0, 50)}`,
        model: config.model,
      };
    }

    return {
      ok: false,
      latencyMs: 0,
      message: "Tipe provider tidak valid.",
      model: config.model,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    return {
      ok: false,
      latencyMs,
      message: `Koneksi gagal: ${err.message}`,
      model: config.model,
    };
  }
}
