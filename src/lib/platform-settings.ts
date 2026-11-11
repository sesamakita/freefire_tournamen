// src/lib/platform-settings.ts
import { createAdminClient } from "@/lib/supabase/admin";

export interface PaymentGatewayConfig {
  is_production: boolean;
  client_key: string;
  server_key: string;
  has_server_key: boolean;
  masked_server_key: string;
  platform_fee_type: "fixed" | "percent";
  platform_fee_amount: number;
  master_bank_name: string;
  master_account_number: string;
  master_account_name: string;
  qris_image_url: string;
}

export interface CloudVpsDefaultConfig {
  default_rtmp_url: string;
  default_hls_url: string;
  obs_web_port: number;
  auto_reconnect: boolean;
}

export interface MaintenanceConfig {
  is_active: boolean;
  message: string;
}

export interface SystemDiagnostics {
  database: { ok: boolean; latencyMs: number; error?: string };
  storage: { ok: boolean; message: string };
  aiEngine: { ok: boolean; model: string; hasKey: boolean };
  midtrans: { ok: boolean; mode: string };
  timestamp: string;
}

// 1. Ambil Payment Config
export async function getPaymentGatewayConfig(): Promise<PaymentGatewayConfig> {
  const envServerKey = process.env.MIDTRANS_SERVER_KEY || "";
  const envClientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || "";

  let config: any = {
    is_production: false,
    client_key: envClientKey,
    server_key: envServerKey,
    platform_fee_type: "fixed",
    platform_fee_amount: 2500,
    master_bank_name: "BCA",
    master_account_number: "0123456789",
    master_account_name: "Arena Tempur Official Escrow",
    qris_image_url: "",
  };

  try {
    const admin = createAdminClient();
    const { data } = await (admin as any)
      .from("app_settings")
      .select("value")
      .eq("key", "payment_gateway")
      .maybeSingle();

    if (data?.value) {
      config = { ...config, ...data.value };
    }
  } catch (err) {
    console.error("Error reading payment_gateway from app_settings:", err);
  }

  const sKey = config.server_key || envServerKey;
  const masked =
    sKey && sKey.length > 8 ? `${sKey.slice(0, 5)}...${sKey.slice(-4)}` : sKey ? "********" : "";

  return {
    ...config,
    server_key: "", // Jangan expose server_key utuh ke frontend
    has_server_key: Boolean(sKey),
    masked_server_key: masked,
  };
}

// 2. Ambil Default Cloud VPS Config
export async function getCloudVpsDefaultConfig(): Promise<CloudVpsDefaultConfig> {
  let config: CloudVpsDefaultConfig = {
    default_rtmp_url: "rtmp://vps.arenatempur.com:1935/live",
    default_hls_url: "http://vps.arenatempur.com:8888/live",
    obs_web_port: 8080,
    auto_reconnect: true,
  };

  try {
    const admin = createAdminClient();
    const { data } = await (admin as any)
      .from("app_settings")
      .select("value")
      .eq("key", "cloud_vps_default")
      .maybeSingle();

    if (data?.value) {
      config = { ...config, ...data.value };
    }
  } catch (err) {
    console.error("Error reading cloud_vps_default:", err);
  }

  return config;
}

// 3. Simpan App Setting
export async function saveAppSetting(key: string, value: Record<string, any>) {
  const admin = createAdminClient();
  const { error } = await (admin as any)
    .from("app_settings")
    .upsert({
      key,
      value,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    throw error;
  }
  return true;
}

// 4. Jalankan Diagnostik Sistem (Health Check Radar)
export async function runSystemDiagnostics(): Promise<SystemDiagnostics> {
  const startTime = Date.now();
  let dbOk = false;
  let dbLatency = 0;
  let dbErr: string | undefined;

  const admin = createAdminClient();
  try {
    const { error } = await (admin as any).from("tournaments").select("id").limit(1);
    dbLatency = Date.now() - startTime;
    dbOk = !error;
    if (error) dbErr = error.message;
  } catch (e: any) {
    dbLatency = Date.now() - startTime;
    dbOk = false;
    dbErr = e.message;
  }

  // Storage check
  let storageOk = true;
  let storageMsg = "Supabase Storage Siap (Bucket tournaments, payments)";
  try {
    const { error } = await admin.storage.listBuckets();
    if (error) {
      storageOk = false;
      storageMsg = error.message;
    }
  } catch (e: any) {
    storageOk = false;
    storageMsg = e.message;
  }

  // AI Engine Check
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY);

  // Midtrans Check
  const hasMidtrans = Boolean(process.env.MIDTRANS_SERVER_KEY);

  return {
    database: {
      ok: dbOk,
      latencyMs: dbLatency,
      error: dbErr,
    },
    storage: {
      ok: storageOk,
      message: storageMsg,
    },
    aiEngine: {
      ok: hasGeminiKey,
      model: "gemini-2.0-flash",
      hasKey: hasGeminiKey,
    },
    midtrans: {
      ok: hasMidtrans,
      mode: process.env.MIDTRANS_IS_PRODUCTION === "true" ? "Production" : "Sandbox",
    },
    timestamp: new Date().toISOString(),
  };
}

// 5. Bersihkan Data Dummy Sandbox
export async function cleanSandboxTournaments(): Promise<number> {
  const admin = createAdminClient();
  const db = admin as any;

  // Cari turnamen yang dibuat oleh developer test (slug diawali 'test-byone-' atau nama mengandung 'Test King of By One')
  const { data: testTournaments, error } = await db
    .from("tournaments")
    .select("id")
    .or("slug.ilike.test-byone-%,nama.ilike.%Dev Studio%");

  if (error || !testTournaments || testTournaments.length === 0) {
    return 0;
  }

  const ids = testTournaments.map((t: any) => t.id);
  const { error: delErr } = await db.from("tournaments").delete().in("id", ids);

  if (delErr) {
    throw delErr;
  }

  return ids.length;
}
