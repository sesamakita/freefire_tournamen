// src/lib/ai/gemini.ts
import { GoogleGenAI } from "@google/genai";
import { AIRawOutput, MatchRegisteredTeam } from "./validate";

const SCOREBOARD_SYSTEM_INSTRUCTION = `
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
- Wajib mengembalikan JSON valid sesuai schema yang diminta.
`;

/**
 * Intelligent Mock Engine for testing without GEMINI_API_KEY
 */
export function generateMockScoreboardAI(registeredTeams: MatchRegisteredTeam[]): AIRawOutput {
  const teamsCount = registeredTeams.length > 0 ? registeredTeams.length : 12;

  // Sample plausible Free Fire kill distribution
  const killsDistribution = [9, 7, 5, 4, 3, 2, 2, 1, 1, 0, 0, 0];

  const teams = registeredTeams.map((team, idx) => {
    const rank = idx + 1;
    const kills = killsDistribution[idx % killsDistribution.length];
    // Give 1 row a simulated uncertain flag to demonstrate UI warning
    const isUncertain = idx === 2;

    return {
      rank,
      nama_tim: team.team_name,
      kills,
      terbaca: !isUncertain,
      catatan: isUncertain ? "Angka kill agak buram pada screenshot demo (disarankan periksa kembali)" : undefined,
    };
  });

  return {
    confidence: 0.92,
    teams,
    catatan: "Hasil diproses menggunakan mode Demo / Simulasi AI (GEMINI_API_KEY belum disetel).",
  };
}

/**
 * Main service to extract scoreboard using Google Gemini Vision
 */
export async function extractScoreboardWithGemini(params: {
  imageBase64: string;
  mimeType: string;
  registeredTeams: MatchRegisteredTeam[];
}): Promise<AIRawOutput> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim() === "" || apiKey === "your-gemini-api-key-here") {
    // Graceful fallback to mock demo
    return generateMockScoreboardAI(params.registeredTeams);
  }

  const ai = new GoogleGenAI({ apiKey });

  const knownTeamsList = params.registeredTeams.map((t) => t.team_name).join(", ");
  const userPrompt = `
Bacalah gambar papan skor Free Fire ini.
Daftar tim yang seharusnya bertanding di match ini: [${knownTeamsList}].
Total tim yang bertanding: ${params.registeredTeams.length}.

Format output HARUS berupa JSON murni dengan format:
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

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
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
        temperature: 0.1, // Low temperature for high accuracy OCR
      },
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("Model Gemini tidak mengembalikan teks respons.");
    }

    const parsedJson: AIRawOutput = JSON.parse(responseText);
    return parsedJson;
  } catch (error: any) {
    console.error("Gemini Vision Error:", error);
    throw new Error(`Gagal membaca screenshot dengan AI: ${error.message || "Unknown error"}`);
  }
}
