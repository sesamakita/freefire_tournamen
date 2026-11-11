// src/lib/cloud-stream.ts

export interface CloudStreamConfig {
  enabled: boolean;
  vps_server_url: string;
  ingest_key: string;
  dest_platform: "youtube" | "tiktok" | "facebook" | "custom";
  dest_rtmp_url: string;
  dest_stream_key: string;
  status: "idle" | "live" | "paused" | "error";
  active_scene: "gameplay" | "intermission" | "standby" | "bracket";
  last_started_at?: string | null;
  server_ip?: string | null;
}

export const DEFAULT_CLOUD_STREAM_CONFIG: CloudStreamConfig = {
  enabled: false,
  vps_server_url: "rtmp://vps.arenatempur.com:1935/live",
  ingest_key: "",
  dest_platform: "youtube",
  dest_rtmp_url: "rtmp://a.rtmp.youtube.com/live2",
  dest_stream_key: "",
  status: "idle",
  active_scene: "gameplay",
  last_started_at: null,
  server_ip: null,
};

/**
 * Membaca konfigurasi cloud stream dari objek turnamen.
 * Mendukung pembacaan dari kolom cloud_stream_config (jika ada)
 * atau fallback ke dalam direct_payment_info.cloud_stream.
 */
export function getCloudStreamConfig(tournament: any): CloudStreamConfig {
  if (!tournament) return DEFAULT_CLOUD_STREAM_CONFIG;

  // 1. Coba baca dari kolom cloud_stream_config jika ada
  if (tournament.cloud_stream_config && typeof tournament.cloud_stream_config === "object") {
    return {
      ...DEFAULT_CLOUD_STREAM_CONFIG,
      ...tournament.cloud_stream_config,
      ingest_key: tournament.cloud_stream_config.ingest_key || tournament.id?.slice(0, 8) || "stream-1",
    };
  }

  // 2. Fallback baca dari direct_payment_info.cloud_stream
  if (tournament.direct_payment_info?.cloud_stream) {
    return {
      ...DEFAULT_CLOUD_STREAM_CONFIG,
      ...tournament.direct_payment_info.cloud_stream,
      ingest_key:
        tournament.direct_payment_info.cloud_stream.ingest_key ||
        tournament.id?.slice(0, 8) ||
        "stream-1",
    };
  }

  // 3. Fallback default dengan stream key unik dari tournament id
  return {
    ...DEFAULT_CLOUD_STREAM_CONFIG,
    ingest_key: tournament.id ? tournament.id.slice(0, 8) : "stream-1",
  };
}
