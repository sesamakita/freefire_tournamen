// src/lib/ai/config.ts
import fs from "fs";
import path from "path";
import { createAdminClient } from "@/lib/supabase/admin";

export type AIProviderType = "gemini" | "openai_compatible";

export type AIPreset =
  | "gemini"
  | "openai"
  | "groq"
  | "openrouter"
  | "deepseek"
  | "ollama"
  | "custom";

export interface AIVisionConfig {
  provider: AIProviderType;
  preset: AIPreset;
  baseUrl?: string;
  apiKey?: string;
  model: string;
  temperature?: number;
  updatedAt?: string;
  updatedBy?: string;
}

export const PRESET_DEFAULTS: Record<
  AIPreset,
  {
    name: string;
    provider: AIProviderType;
    baseUrl: string;
    model: string;
    description: string;
    needsApiKey: boolean;
  }
> = {
  gemini: {
    name: "Google Gemini (Bawaan)",
    provider: "gemini",
    baseUrl: "",
    model: "gemini-2.0-flash",
    description: "Model multimodal resmi dari Google, cepat dan akurat untuk membaca papan skor.",
    needsApiKey: true,
  },
  openai: {
    name: "OpenAI GPT-4o / GPT-4o-mini",
    provider: "openai_compatible",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    description: "Model Vision OpenAI standar industri dengan presisi tinggi.",
    needsApiKey: true,
  },
  groq: {
    name: "Groq Cloud (Ultra Fast LPU)",
    provider: "openai_compatible",
    baseUrl: "https://api.groq.com/openai/v1",
    model: "llama-3.2-11b-vision-preview",
    description: "Inference super cepat menggunakan LPU hardware Groq.",
    needsApiKey: true,
  },
  openrouter: {
    name: "OpenRouter (Multi-Model Gateway)",
    provider: "openai_compatible",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "google/gemini-2.0-flash-001",
    description: "Satu API Key untuk akses ratusan model Vision di dunia.",
    needsApiKey: true,
  },
  deepseek: {
    name: "DeepSeek / Custom Gateway",
    provider: "openai_compatible",
    baseUrl: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
    description: "Penyedia OpenAI compatible pilihan Anda sendiri.",
    needsApiKey: true,
  },
  ollama: {
    name: "Ollama Local (Offline / Tanpa Kuota)",
    provider: "openai_compatible",
    baseUrl: "http://localhost:11434/v1",
    model: "llama3.2-vision",
    description: "Jalankan model Vision lokal di komputer Anda tanpa perlu internet atau biaya API.",
    needsApiKey: false,
  },
  custom: {
    name: "Custom OpenAI-Compatible Endpoint",
    provider: "openai_compatible",
    baseUrl: "https://api.example.com/v1",
    model: "custom-vision-model",
    description: "Bebas atur Base URL, API Key, dan nama model vision apapun.",
    needsApiKey: true,
  },
};

const CONFIG_FALLBACK_FILE = path.join(process.cwd(), "src", "data", "ai-config.json");

/**
 * Mask API key for UI safety: 'sk-1234567890abcdef' -> 'sk-1234...cdef'
 */
export function maskApiKey(key?: string): string {
  if (!key) return "";
  const trimmed = key.trim();
  if (trimmed.length <= 8) return "********";
  return `${trimmed.slice(0, 4)}...${trimmed.slice(-4)}`;
}

/**
 * Ambil konfigurasi default awal dari environment variable jika belum ada di database
 */
function getInitialDefaultConfig(): AIVisionConfig {
  const envGemini = process.env.GEMINI_API_KEY;
  return {
    provider: "gemini",
    preset: "gemini",
    baseUrl: "",
    apiKey: envGemini || "",
    model: "gemini-2.0-flash",
    temperature: 0.1,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Baca konfigurasi aktif dari tabel database Supabase 'app_settings',
 * dengan fallback ke file 'src/data/ai-config.json' dan default environment.
 */
export async function getAIVisionConfig(): Promise<AIVisionConfig> {
  try {
    const admin = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = admin as any;

    const { data, error } = await db
      .from("app_settings")
      .select("value")
      .eq("key", "ai_vision_config")
      .maybeSingle();

    if (!error && data?.value) {
      return {
        ...getInitialDefaultConfig(),
        ...data.value,
      };
    }
  } catch {
    // Database table maybe not created yet, continue to file fallback
  }

  // Fallback 1: File Storage
  try {
    if (fs.existsSync(CONFIG_FALLBACK_FILE)) {
      const raw = fs.readFileSync(CONFIG_FALLBACK_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      return {
        ...getInitialDefaultConfig(),
        ...parsed,
      };
    }
  } catch (err) {
    console.error("Failed to read fallback ai-config.json:", err);
  }

  // Fallback 2: Environment variables
  return getInitialDefaultConfig();
}

/**
 * Ambil konfigurasi publik yang aman untuk ditampilkan pada antarmuka admin UI
 */
export async function getPublicAIVisionConfig(): Promise<AIVisionConfig & { maskedApiKey: string; hasApiKey: boolean }> {
  const config = await getAIVisionConfig();
  return {
    ...config,
    apiKey: undefined, // Hapus raw key demi keamanan transfer jaringan ke client
    maskedApiKey: maskApiKey(config.apiKey),
    hasApiKey: Boolean(config.apiKey && config.apiKey.trim().length > 0),
  };
}

/**
 * Simpan konfigurasi baru ke database Supabase dan cadangan file lokal
 */
export async function saveAIVisionConfig(
  newConfig: Partial<AIVisionConfig>,
  userId?: string
): Promise<AIVisionConfig> {
  const current = await getAIVisionConfig();

  // Pertahankan API Key lama jika input dikosongkan (artinya pengguna tidak mengubah key)
  const finalApiKey =
    newConfig.apiKey !== undefined && newConfig.apiKey.trim() !== ""
      ? newConfig.apiKey.trim()
      : current.apiKey;

  const merged: AIVisionConfig = {
    ...current,
    ...newConfig,
    apiKey: finalApiKey,
    updatedAt: new Date().toISOString(),
    updatedBy: userId || current.updatedBy,
  };

  // 1. Simpan ke Database Supabase jika tabel tersedia
  try {
    const admin = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = admin as any;

    await db.from("app_settings").upsert({
      key: "ai_vision_config",
      value: merged,
      description: "Konfigurasi aktif penyedia AI Vision untuk membaca papan skor",
      updated_at: merged.updatedAt,
      updated_by: userId || null,
    });
  } catch (dbErr) {
    console.warn("Could not save to Supabase app_settings table, saving to fallback file:", dbErr);
  }

  // 2. Simpan cadangan ke file src/data/ai-config.json
  try {
    const dir = path.dirname(CONFIG_FALLBACK_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CONFIG_FALLBACK_FILE, JSON.stringify(merged, null, 2), "utf-8");
  } catch (fileErr) {
    console.error("Failed to save fallback ai-config.json:", fileErr);
  }

  return merged;
}
