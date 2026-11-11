"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Radio,
  Copy,
  Check,
  ExternalLink,
  Tv,
  Layers,
  Settings2,
  AlertCircle,
  HelpCircle,
  Play,
  Square,
  Sparkles,
  BarChart3,
  Trophy,
  ScrollText,
  Clock,
  Video,
  Globe,
  Share2,
  Megaphone,
  Plus,
  Trash2,
  Image as ImageIcon,
  ShieldCheck,
  Timer,
  Cloud,
  Server,
  Wifi,
  Cpu,
  Smartphone,
  RefreshCw,
  Send,
  CheckCircle2,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { type CloudStreamConfig, getCloudStreamConfig } from "@/lib/cloud-stream";

interface Sponsor {
  id: string;
  name: string;
  logo_url: string;
  banner_url?: string | null;
  tier: "title" | "main" | "supporter" | "media_partner";
  external_url?: string | null;
  display_order: number;
  is_active?: boolean;
}

interface TournamentData {
  id: string;
  nama: string;
  slug: string;
  format: string;
  status: string;
  is_live: boolean;
  live_platform: string;
  live_stream_url: string | null;
  live_title: string | null;
  obs_token?: string | null;
  intermission_active?: boolean;
  intermission_target_time?: string | null;
  intermission_title?: string | null;
  intermission_match_number?: number | null;
}

interface Props {
  tournament: TournamentData;
  initialSponsors?: Sponsor[];
}

export default function LiveControlClient({ tournament, initialSponsors = [] }: Props) {
  // Live Streaming States
  const [isLive, setIsLive] = useState<boolean>(tournament.is_live ?? false);
  const [platform, setPlatform] = useState<string>(tournament.live_platform || "youtube");
  const [streamUrl, setStreamUrl] = useState<string>(tournament.live_stream_url || "");
  const [liveTitle, setLiveTitle] = useState<string>(tournament.live_title || "");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [origin, setOrigin] = useState<string>("");

  // Intermission (Layar Jeda Iklan) States
  const [intermissionActive, setIntermissionActive] = useState<boolean>(tournament.intermission_active ?? false);
  const [intermissionTitle, setIntermissionTitle] = useState<string>(
    tournament.intermission_title || "MATCH BERIKUTNYA SEGERA DIMULAI"
  );
  const [intermissionMatchNum, setIntermissionMatchNum] = useState<number>(tournament.intermission_match_number || 2);
  const [isUpdatingIntermission, setIsUpdatingIntermission] = useState<boolean>(false);

  // Sponsor Management States
  const [sponsors, setSponsors] = useState<Sponsor[]>(initialSponsors);
  const [showAddSponsorModal, setShowAddSponsorModal] = useState<boolean>(false);
  const [isSubmittingSponsor, setIsSubmittingSponsor] = useState<boolean>(false);
  const [newSponsor, setNewSponsor] = useState<{
    name: string;
    logo_url: string;
    banner_url: string;
    tier: "title" | "main" | "supporter" | "media_partner";
    external_url: string;
  }>({
    name: "",
    logo_url: "",
    banner_url: "",
    tier: "supporter",
    external_url: "",
  });

  // Cloud VPS Streaming States
  const initialCloud = getCloudStreamConfig(tournament);
  const [cloudConfig, setCloudConfig] = useState<CloudStreamConfig>(initialCloud);
  const [broadcastMode, setBroadcastMode] = useState<"vps" | "local">("vps");
  const [isSavingCloud, setIsSavingCloud] = useState<boolean>(false);

  // Gladi Resik & Studio Simulation States
  const [monitorTab, setMonitorTab] = useState<"gladi" | "youtube">("gladi");
  const [gladiOverlay, setGladiOverlay] = useState<"ticker" | "intermission" | "bracket">("ticker");

  // Form input local state for Cloud VPS Settings
  const [vpsServerInput, setVpsServerInput] = useState<string>(
    cloudConfig.vps_server_url || "rtmp://vps.arenatempur.com:1935/live"
  );
  const [vpsIngestKeyInput, setVpsIngestKeyInput] = useState<string>(
    cloudConfig.ingest_key || tournament.id.slice(0, 8)
  );
  const [destPlatformInput, setDestPlatformInput] = useState<"youtube" | "tiktok" | "facebook" | "custom">(
    cloudConfig.dest_platform || "youtube"
  );
  const [destRtmpInput, setDestRtmpInput] = useState<string>(
    cloudConfig.dest_rtmp_url || "rtmp://a.rtmp.youtube.com/live2"
  );
  const [destStreamKeyInput, setDestStreamKeyInput] = useState<string>(
    cloudConfig.dest_stream_key || ""
  );

  const handleUpdateCloudConfig = async (partial: Partial<CloudStreamConfig>) => {
    try {
      setIsSavingCloud(true);
      const updated: CloudStreamConfig = {
        ...cloudConfig,
        vps_server_url: vpsServerInput.trim(),
        ingest_key: vpsIngestKeyInput.trim(),
        dest_platform: destPlatformInput,
        dest_rtmp_url: destRtmpInput.trim(),
        dest_stream_key: destStreamKeyInput.trim(),
        ...partial,
      };

      const res = await fetch(`/api/tournaments/${tournament.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cloud_stream_config: updated,
          is_live: updated.status === "live",
          live_platform: updated.dest_platform || "youtube",
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Gagal menyimpan konfigurasi Cloud VPS.");

      setCloudConfig(updated);
      if (partial.status) {
        setIsLive(partial.status === "live");
      }
      toast.success(
        partial.status === "live"
          ? "🔴 ENGINE CLOUD STREAMING AKTIF! Layar HP wasit kini dialirkan ke YouTube via VPS."
          : partial.status === "idle"
          ? "⏹️ Siaran Cloud VPS telah dihentikan."
          : "Konfigurasi Cloud VPS Streaming berhasil disimpan!"
      );
    } catch (err: any) {
      toast.error(err.message || "Gagal memperbarui Cloud VPS.");
    } finally {
      setIsSavingCloud(false);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  // Ekstrak ID Video YouTube dari berbagai format link
  const getYouTubeVideoId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const ytVideoId = platform === "youtube" ? getYouTubeVideoId(streamUrl) : null;

  // Handle Save Pengaturan Siaran
  const handleSave = async (overrideLiveStatus?: boolean) => {
    try {
      setIsSaving(true);
      const nextLiveStatus = overrideLiveStatus !== undefined ? overrideLiveStatus : isLive;

      const res = await fetch(`/api/tournaments/${tournament.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_live: nextLiveStatus,
          live_platform: platform,
          live_stream_url: streamUrl.trim() || null,
          live_title: liveTitle.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Gagal menyimpan pengaturan siaran.");
      }

      if (overrideLiveStatus !== undefined) {
        setIsLive(overrideLiveStatus);
      }

      toast.success(
        nextLiveStatus
          ? "🔴 SIARAN LANGSUNG AKTIF! Badge Live telah menyala di halaman publik."
          : "Status siaran berhasil diperbarui."
      );
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan saat menyimpan.");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Kontrol Layar Jeda (Intermission)
  const handleSetIntermission = async (active: boolean, durationMinutes?: number) => {
    try {
      setIsUpdatingIntermission(true);
      let targetTimeIso: string | null = null;

      if (active && durationMinutes) {
        const target = new Date(Date.now() + durationMinutes * 60 * 1000);
        targetTimeIso = target.toISOString();
      }

      const res = await fetch(`/api/tournaments/${tournament.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intermission_active: active,
          intermission_target_time: targetTimeIso,
          intermission_title: intermissionTitle.trim() || "MATCH BERIKUTNYA SEGERA DIMULAI",
          intermission_match_number: intermissionMatchNum,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Gagal mengubah mode jeda siaran.");
      }

      setIntermissionActive(active);
      toast.success(
        active
          ? `⏳ Layar Jeda Aktif (${durationMinutes || 0} menit). OBS Overlay otomatis memutar iklan sponsor & hitung mundur!`
          : "✅ Layar Jeda Selesai. Siaran kembali ke pertandingan!"
      );
    } catch (err: any) {
      toast.error(err.message || "Gagal mengubah status jeda.");
    } finally {
      setIsUpdatingIntermission(false);
    }
  };

  // Handle Tambah Sponsor
  const handleAddSponsor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSponsor.name.trim() || !newSponsor.logo_url.trim()) {
      toast.error("Nama sponsor dan URL logo wajib diisi.");
      return;
    }

    try {
      setIsSubmittingSponsor(true);
      const res = await fetch(`/api/tournaments/${tournament.id}/sponsors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSponsor.name.trim(),
          logo_url: newSponsor.logo_url.trim(),
          banner_url: newSponsor.banner_url.trim() || null,
          tier: newSponsor.tier,
          external_url: newSponsor.external_url.trim() || null,
          display_order: sponsors.length + 1,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Gagal menambahkan sponsor.");
      }

      setSponsors([...sponsors, data.data]);
      setNewSponsor({
        name: "",
        logo_url: "",
        banner_url: "",
        tier: "supporter",
        external_url: "",
      });
      setShowAddSponsorModal(false);
      toast.success("Sponsor berhasil ditambahkan ke rotasi overlay siaran!");
    } catch (err: any) {
      toast.error(err.message || "Gagal menambahkan sponsor.");
    } finally {
      setIsSubmittingSponsor(false);
    }
  };

  // Handle Hapus Sponsor
  const handleDeleteSponsor = async (sponsorId: string) => {
    if (!confirm("Hapus sponsor ini dari siaran turnamen?")) return;
    try {
      const res = await fetch(`/api/tournaments/${tournament.id}/sponsors/${sponsorId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Gagal menghapus sponsor.");

      setSponsors(sponsors.filter((s) => s.id !== sponsorId));
      toast.success("Sponsor berhasil dihapus.");
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus sponsor.");
    }
  };

  // Copy helper
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success("URL OBS berhasil disalin ke clipboard!");
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  const overlayBaseUrl = origin || "https://arenatempur.com";

  const overlayOptions = [
    {
      key: "intermission",
      title: "Commercial Break & Sponsor Intermission Screen",
      desc: "Layar jeda pertandingan dengan Countdown Timer real-time dan Slideshow Iklan / Banner Sponsor bergantian secara mulus.",
      recommendedRes: "1920 x 1080 (Full Screen 16:9)",
      url: `${overlayBaseUrl}/overlay/${tournament.id}/intermission`,
      icon: Megaphone,
      badge: "Sponsor & Jeda",
    },
    {
      key: "leaderboard",
      title: "Battle Royale Leaderboard HUD",
      desc: "Tabel klasemen transparan real-time dengan perolehan kill, poin penempatan, dan total skor tim. Auto-refresh saat skor masuk.",
      recommendedRes: "1920 x 1080 (Transparan Full Screen) atau 500 x 700 (Sidebar Widget)",
      url: `${overlayBaseUrl}/overlay/${tournament.id}/leaderboard`,
      icon: BarChart3,
      badge: "Battle Royale",
    },
    {
      key: "ticker",
      title: "Match Ticker & Lower Third Banner",
      desc: "Banner strip elegan di bagian bawah layar. Menampilkan nama match, room ID/pass, title sponsor, dan running text partner.",
      recommendedRes: "1920 x 160 (Banner Bawah)",
      url: `${overlayBaseUrl}/overlay/${tournament.id}/ticker`,
      icon: ScrollText,
      badge: "Semua Format",
    },
    {
      key: "bracket",
      title: "1v1 Lone Wolf Match Duel HUD",
      desc: "Kartu duel head-to-head untuk format By One: Nickname kedua pemain, skor ronde (FT5/FT7), dan status eliminasi.",
      recommendedRes: "1920 x 1080 (Transparan) atau 600 x 400 (Top Center HUD)",
      url: `${overlayBaseUrl}/overlay/${tournament.id}/bracket`,
      icon: Trophy,
      badge: "King of By One (1v1)",
      formatExclusive: "lone_wolf_1v1",
    },
    {
      key: "intro",
      title: "Starting Soon & Match Standby Screen",
      desc: "Layar transisi pra-pertandingan dengan hitung mundur, logo turnamen, daftar tim peserta, dan musik latar.",
      recommendedRes: "1920 x 1080 (Full Screen 16:9)",
      url: `${overlayBaseUrl}/overlay/${tournament.id}/intro`,
      icon: Clock,
      badge: "Transisi Layar",
    },
  ];

  return (
    <div className="space-y-8">
      {/* 0. SELECTOR ARSITEKTUR SIARAN (MODE CLOUD VPS VS OBS LOKAL) */}
      <div className="card-glow p-4 rounded-2xl bg-zinc-950/90 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setBroadcastMode("vps")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-2 cursor-pointer ${
              broadcastMode === "vps"
                ? "bg-gradient-to-r from-amber-500 to-amber-600 text-zinc-950 shadow-lg shadow-amber-500/25 font-black border border-amber-400"
                : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            <Cloud className="w-4 h-4" />
            <span>☁️ Engine Cloud VPS (Tanpa PC Wasit)</span>
            <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-zinc-950 text-amber-400 border border-amber-500/30">
              REKOMENDASI
            </span>
          </button>

          <button
            type="button"
            onClick={() => setBroadcastMode("local")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-2 cursor-pointer ${
              broadcastMode === "local"
                ? "bg-zinc-800 text-white border border-zinc-600 shadow-md"
                : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            <Tv className="w-4 h-4" />
            <span>🖥️ OBS Studio PC Lokal (Browser Source)</span>
          </button>
        </div>

        <div className="text-[11px] text-zinc-400 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>
            {broadcastMode === "vps"
              ? "Wasit cukup bawa HP ➔ Video dialirkan ke VPS ➔ YouTube Live"
              : "Wasit memasukkan link overlay ke software OBS di komputer lokal"}
          </span>
        </div>
      </div>

      {/* 0.1 KOKPIT KENDALI CLOUD VPS STREAMING ENGINE */}
      {broadcastMode === "vps" && (
        <div className="card-glow p-6 rounded-2xl bg-gradient-to-br from-zinc-900/90 via-zinc-950 to-zinc-900 border border-amber-500/40 space-y-6 shadow-2xl">
          {/* Header Kokpit VPS */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/10">
                <Cloud className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    Cloud Broadcast Engine
                  </span>
                  <span className="text-xs text-zinc-500">&bull;</span>
                  <span className="text-xs text-zinc-300 font-semibold flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        cloudConfig.status === "live"
                          ? "bg-red-500 animate-ping"
                          : "bg-emerald-400"
                      }`}
                    />
                    Status:{" "}
                    <b
                      className={
                        cloudConfig.status === "live"
                          ? "text-red-400 uppercase"
                          : "text-emerald-400 uppercase"
                      }
                    >
                      {cloudConfig.status === "live"
                        ? "Streaming Aktif ke YouTube"
                        : "Standby (Siap Menerima Feed HP)"}
                    </b>
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white tracking-tight">
                  Pusat Kendali Siaran Cloud VPS
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Layar HP wasit mengalir ke VPS. Server otomatis memasang banner sponsor dan merender siaran 1080p langsung ke YouTube.
                </p>
              </div>
            </div>

            {/* Tombol Utama Kontrol Siaran Cloud */}
            <div className="flex items-center gap-2.5 flex-wrap self-start md:self-auto">
              {cloudConfig.status === "live" ? (
                <button
                  type="button"
                  onClick={() => handleUpdateCloudConfig({ status: "idle" })}
                  disabled={isSavingCloud}
                  className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-red-400 hover:text-red-300 border border-red-500/30 font-bold text-xs inline-flex items-center gap-2 transition-all cursor-pointer shadow-lg disabled:opacity-50"
                >
                  <Square className="w-4 h-4 fill-red-400" />
                  <span>{isSavingCloud ? "Memproses..." : "Matikan Siaran VPS"}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleUpdateCloudConfig({ status: "live" })}
                  disabled={isSavingCloud}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs inline-flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-red-600/30 active:scale-95 disabled:opacity-50"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>{isSavingCloud ? "Menghubungkan..." : "🔴 Mulai Live Siaran Cloud"}</span>
                </button>
              )}
            </div>
          </div>

          {/* Grid Panel 1: Panduan HP Wasit vs Tujuan Siaran YouTube */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Kolom Kiri: Panduan & Ingest HP Wasit */}
            <div className="p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-amber-400" />
                  1. Alamat Ingest untuk HP Wasit (Spectator)
                </span>
                <span className="text-[10px] text-zinc-500">Protokol RTMP</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Di HP yang menonton pertandingan Free Fire, buka aplikasi <b>Larix Broadcaster</b> atau <b>Prism Live</b>, lalu masukkan alamat RTMP berikut:
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                    URL Server VPS (RTMP Ingest):
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={vpsServerInput}
                      onChange={(e) => setVpsServerInput(e.target.value)}
                      placeholder="rtmp://vps.arenatempur.com:1935/live"
                      className="flex-1 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-200 select-all focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopy(vpsServerInput, "vps_server")}
                      className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300 transition-colors inline-flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      {copiedKey === "vps_server" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>Salin</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                    Stream Key Unik Turnamen (HP Wasit):
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={vpsIngestKeyInput}
                      onChange={(e) => setVpsIngestKeyInput(e.target.value)}
                      placeholder="stream-turnamen-key"
                      className="flex-1 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-amber-400 font-bold select-all focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopy(vpsIngestKeyInput, "vps_key")}
                      className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300 transition-colors inline-flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      {copiedKey === "vps_key" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>Salin</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 text-[11px] text-zinc-400 space-y-1">
                <p className="font-semibold text-zinc-200">💡 Alur Wasit di HP:</p>
                <p>1. Buka game Free Fire, masuk ke Custom Room sebagai <b>Spectator</b>.</p>
                <p>2. Aktifkan broadcast layar di HP ke RTMP di atas (hanya kirim 1 stream 720p/1080p ringan).</p>
                <p>3. Di akhir match, gunakan <b>APK Arena Tempur</b> untuk screenshot skor (AI langsung hitung skor otomatis).</p>
              </div>
            </div>

            {/* Kolom Kanan: Tujuan Siaran YouTube Panitia */}
            <div className="p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Video className="w-4 h-4 text-red-400" />
                  2. Tujuan Siaran Publik (YouTube / TikTok Live)
                </span>
                <span className="text-[10px] text-zinc-500">Output Stream</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                VPS akan memancarkan hasil akhir siaran ke akun YouTube/TikTok turnamen Anda:
              </p>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                      Platform Siaran:
                    </label>
                    <select
                      value={destPlatformInput}
                      onChange={(e) => setDestPlatformInput(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-amber-500 font-medium"
                    >
                      <option value="youtube">YouTube Live</option>
                      <option value="tiktok">TikTok Live</option>
                      <option value="facebook">Facebook Live</option>
                      <option value="custom">Custom RTMP</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                      URL Server RTMP YouTube:
                    </label>
                    <input
                      type="text"
                      value={destRtmpInput}
                      onChange={(e) => setDestRtmpInput(e.target.value)}
                      placeholder="rtmp://a.rtmp.youtube.com/live2"
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                    YouTube Stream Key Panitia <span className="text-red-400">*</span>:
                  </label>
                  <input
                    type="password"
                    value={destStreamKeyInput}
                    onChange={(e) => setDestStreamKeyInput(e.target.value)}
                    placeholder="xxxx-xxxx-xxxx-xxxx-xxxx (dari YouTube Live Studio)"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-red-500"
                  />
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Salin Stream Key dari dashboard YouTube Live Studio saluran Anda.
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => handleUpdateCloudConfig({})}
                    disabled={isSavingCloud}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer border border-zinc-700"
                  >
                    <Save className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isSavingCloud ? "Menyimpan..." : "Simpan Kredensial YouTube"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Panel 2: Remote Switcher Scene Siaran (Gameplay / Jeda Sponsor / Standby) */}
          <div className="p-5 rounded-2xl bg-zinc-950/70 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                <Tv className="w-4 h-4 text-amber-400" />
                3. Remote Switcher Scene Siaran di VPS
              </span>
              <span className="text-[11px] text-zinc-400">
                Scene Aktif: <b className="text-amber-400 uppercase">{cloudConfig.active_scene}</b>
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Ganti tampilan siaran langsung di YouTube secara instan dari genggaman Anda tanpa perlu membuka OBS:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {/* Scene 1: Gameplay */}
              <button
                type="button"
                onClick={() => handleUpdateCloudConfig({ active_scene: "gameplay" })}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  cloudConfig.active_scene === "gameplay"
                    ? "bg-amber-500/15 border-amber-500/50 shadow-md shadow-amber-500/10"
                    : "bg-zinc-900/80 border-zinc-800 hover:border-zinc-700"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    🎮 Scene Gameplay
                  </span>
                  {cloudConfig.active_scene === "gameplay" && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                </div>
                <p className="text-[11px] text-zinc-400">
                  Layar Free Fire wasit + Running Ticker Sponsor di bagian bawah.
                </p>
              </button>

              {/* Scene 2: Layar Jeda Iklan */}
              <button
                type="button"
                onClick={() => {
                  handleUpdateCloudConfig({ active_scene: "intermission" });
                  handleSetIntermission(true, 5);
                }}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  cloudConfig.active_scene === "intermission"
                    ? "bg-amber-500/15 border-amber-500/50 shadow-md shadow-amber-500/10"
                    : "bg-zinc-900/80 border-zinc-800 hover:border-zinc-700"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    ⏳ Scene Jeda Iklan
                  </span>
                  {cloudConfig.active_scene === "intermission" && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  )}
                </div>
                <p className="text-[11px] text-zinc-400">
                  Countdown jeda 5 menit + Slideshow Banner Sponsor bergantian.
                </p>
              </button>

              {/* Scene 3: Standby / Intro */}
              <button
                type="button"
                onClick={() => handleUpdateCloudConfig({ active_scene: "standby" })}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  cloudConfig.active_scene === "standby"
                    ? "bg-amber-500/15 border-amber-500/50 shadow-md shadow-amber-500/10"
                    : "bg-zinc-900/80 border-zinc-800 hover:border-zinc-700"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    📺 Scene Standby / Intro
                  </span>
                  {cloudConfig.active_scene === "standby" && (
                    <span className="w-2 h-2 rounded-full bg-blue-400" />
                  )}
                </div>
                <p className="text-[11px] text-zinc-400">
                  Layar pembuka turnamen bertuliskan siaran segera dimulai.
                </p>
              </button>
            </div>
          </div>

          {/* Info Status Kesiapan Deployment VPS */}
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-dashed border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <span className="font-bold text-zinc-200 flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-amber-400" />
                Status Paket Siap Deploy VPS:
              </span>
              <p className="text-[11px] text-zinc-400">
                Skrip instalasi otomatis dan Docker Compose sudah dibuat di folder <code>deploy/vps</code>. Saat VPS siap, Anda cukup menjalankan <code>./setup.sh</code>.
              </p>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-zinc-800 text-[11px] font-mono text-zinc-300 shrink-0">
              Folder: /deploy/vps/setup.sh
            </div>
          </div>
        </div>
      )}

      {/* 1. Status Bar Siaran */}
      <div
        className={`p-6 rounded-2xl border transition-all ${
          isLive
            ? "bg-red-950/20 border-red-500/40 shadow-xl shadow-red-500/10"
            : "bg-zinc-900/40 border-zinc-800"
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                isLive
                  ? "bg-red-600 text-white shadow-lg shadow-red-600/40 animate-pulse"
                  : "bg-zinc-800 text-zinc-400"
              }`}
            >
              <Radio className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-bold tracking-wider uppercase ${
                    isLive
                      ? "bg-red-500 text-white animate-pulse"
                      : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                  }`}
                >
                  {isLive ? "🔴 SEDANG SIARAN LANGSUNG" : "⚪ STATUS: OFFLINE"}
                </span>
                <span className="text-xs text-zinc-400">
                  • Platform: <span className="font-semibold text-zinc-200 capitalize">{platform}</span>
                </span>
              </div>
              <h2 className="text-lg font-bold text-white mt-1">
                {liveTitle || tournament.nama}
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                {isLive
                  ? "Siaran live aktif. Halaman publik turnamen menampilkan badge Live dan pemutar video."
                  : "Nyalakan siaran langsung saat pertandingan dimulai agar penonton bisa menyaksikan secara realtime."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {isLive ? (
              <button
                type="button"
                onClick={() => handleSave(false)}
                disabled={isSaving}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white font-bold text-xs border border-zinc-700 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <Square className="w-4 h-4 fill-zinc-400 text-zinc-400" />
                <span>Akhiri Siaran (Stop Live)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSave(true)}
                disabled={isSaving}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs shadow-lg shadow-red-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Mulai Siaran (Go Live)</span>
              </button>
            )}

            <Link
              href={`/t/${tournament.slug}/live`}
              target="_blank"
              className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white font-bold text-xs transition-all flex items-center gap-1.5"
            >
              <span>Halaman Live Publik</span>
              <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
            </Link>
          </div>
        </div>
      </div>

      {/* 2. PUSAT KONTROL JEDA & IKLAN SPONSOR (INTERMISSION CONTROLLER) */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-zinc-900/90 via-zinc-900/50 to-amber-950/20 border border-amber-500/30 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Kontrol Layar Jeda & Iklan Sponsor (Intermission Studio)
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-500 text-zinc-950 uppercase">
                  OBS Auto-Sync
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Nyalakan jeda antar match. OBS Browser Source akan otomatis menampilkan hitung mundur dan memutar slide sponsor yang Anda pasang.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {intermissionActive ? (
              <button
                type="button"
                onClick={() => handleSetIntermission(false)}
                disabled={isUpdatingIntermission}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/30 transition-all flex items-center gap-2"
              >
                <Square className="w-3.5 h-3.5 fill-white" />
                <span>Hentikan Jeda (Kembali ke Match)</span>
              </button>
            ) : (
              <span className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 text-xs font-semibold border border-zinc-700">
                Mode Pertandingan Berlangsung
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Form Judul & Match Number */}
          <div className="md:col-span-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Judul Layar Jeda
              </label>
              <input
                type="text"
                value={intermissionTitle}
                onChange={(e) => setIntermissionTitle(e.target.value)}
                placeholder="Contoh: MATCH 2: PURGATORY SEGERA DIMULAI"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="w-1/3">
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Nomor Match Berikutnya
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={intermissionMatchNum}
                  onChange={(e) => setIntermissionMatchNum(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="w-2/3">
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Mulai Jeda Cepat (Quick Timer)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[3, 5, 10].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => handleSetIntermission(true, mins)}
                      disabled={isUpdatingIntermission}
                      className="px-2.5 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold transition-all flex items-center justify-center gap-1"
                    >
                      <Timer className="w-3.5 h-3.5" />
                      <span>{mins} Mnt</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Banner Status Jeda & Quick OBS Link */}
          <div className="md:col-span-6 flex flex-col justify-between p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  Link OBS Layar Jeda
                </span>
                <span className="text-[10px] text-amber-400 font-mono">1920 x 1080 Full Screen</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${overlayBaseUrl}/overlay/${tournament.id}/intermission`}
                  className="flex-1 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-400 select-all focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() =>
                    handleCopy(`${overlayBaseUrl}/overlay/${tournament.id}/intermission`, "intermission")
                  }
                  className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold border border-zinc-700 transition-all flex items-center gap-1 shrink-0"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin</span>
                </button>
                <Link
                  href={`/overlay/${tournament.id}/intermission`}
                  target="_blank"
                  className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white border border-zinc-700"
                >
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </div>
            </div>

            <p className="text-[11px] text-zinc-500 mt-3 leading-relaxed">
              💡 <em>Tips Pro Caster:</em> Masukkan link di atas sebagai Browser Source terpisah di OBS pada scene <strong>&quot;Intermission / Commercial Break&quot;</strong>. Saat match selesai, cukup ganti scene di OBS atau klik timer di atas.
            </p>
          </div>
        </div>
      </div>

      {/* 3. MANAJEMEN SPONSOR TURNAMEN (HYBRID SPONSORSHIP) */}
      <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold text-white uppercase tracking-wider">
                Daftar Sponsor & Iklan Turnamen
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-zinc-800 text-amber-400 text-xs font-bold border border-zinc-700">
                {sponsors.length} Sponsor Aktif
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Logo dan banner sponsor akan otomatis tayang di layar jeda siaran, HUD klasemen, dan lower-third ticker OBS.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
            <Link
              href={`/admin/${tournament.id}/sponsor`}
              className="px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 font-bold text-xs transition-all flex items-center gap-1.5"
            >
              <Megaphone className="w-3.5 h-3.5 text-amber-400" />
              <span>Buka Panel Lengkap Sponsor</span>
              <ExternalLink className="w-3 h-3 text-zinc-400" />
            </Link>

            <button
              type="button"
              onClick={() => setShowAddSponsorModal(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Tambah Sponsor Baru</span>
            </button>
          </div>
        </div>

        {/* Modal Tambah Sponsor */}
        {showAddSponsorModal && (
          <div className="p-5 rounded-2xl bg-zinc-950 border border-amber-500/40 space-y-4 shadow-2xl animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-400" />
                Formulir Pendaftaran Sponsor Baru
              </h4>
              <button
                type="button"
                onClick={() => setShowAddSponsorModal(false)}
                className="text-xs text-zinc-400 hover:text-white"
              >
                Batal
              </button>
            </div>

            <form onSubmit={handleAddSponsor} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Nama Sponsor / Brand *
                  </label>
                  <input
                    type="text"
                    required
                    value={newSponsor.name}
                    onChange={(e) => setNewSponsor({ ...newSponsor, name: e.target.value })}
                    placeholder="Contoh: Kopi Kapten Esports"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Tingkatan Sponsor (Tier)
                  </label>
                  <select
                    value={newSponsor.tier}
                    onChange={(e: any) => setNewSponsor({ ...newSponsor, tier: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="title">👑 Title Sponsor (Paling Utama / Watermark Atas)</option>
                    <option value="main">⭐ Main Partner</option>
                    <option value="supporter">🤝 Official Supporter / Sponsor Pendukung</option>
                    <option value="media_partner">🎙️ Official Media Partner</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    URL Logo Sponsor (Format PNG Transparan) *
                  </label>
                  <input
                    type="url"
                    required
                    value={newSponsor.logo_url}
                    onChange={(e) => setNewSponsor({ ...newSponsor, logo_url: e.target.value })}
                    placeholder="https://.../logo.png"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    URL Banner Iklan Jeda (Opsional, 16:9 / 1200x600)
                  </label>
                  <input
                    type="url"
                    value={newSponsor.banner_url}
                    onChange={(e) => setNewSponsor({ ...newSponsor, banner_url: e.target.value })}
                    placeholder="https://.../banner-promo.jpg"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Website / Instagram Link (Opsional)
                  </label>
                  <input
                    type="url"
                    value={newSponsor.external_url}
                    onChange={(e) => setNewSponsor({ ...newSponsor, external_url: e.target.value })}
                    placeholder="https://instagram.com/kopikapten"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddSponsorModal(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white text-xs font-semibold border border-zinc-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSponsor}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition-all disabled:opacity-50"
                >
                  {isSubmittingSponsor ? "Menyimpan..." : "Simpan & Aktifkan Sponsor"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Grid Sponsor yang Terpasang */}
        {sponsors.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sponsors.map((s) => (
              <div
                key={s.id}
                className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800 flex flex-col justify-between gap-3 group hover:border-zinc-700 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center p-1.5 shrink-0">
                      <img
                        src={s.logo_url}
                        alt={s.name}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase">{s.name}</h4>
                      <span className="text-[10px] font-black uppercase text-amber-400 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 inline-block mt-0.5">
                        {s.tier.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteSponsor(s.id)}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Hapus sponsor"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {s.banner_url && (
                  <div className="w-full h-24 rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800/80">
                    <img
                      src={s.banner_url}
                      alt={`${s.name} banner`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="text-[11px] text-zinc-500 truncate">
                  {s.external_url ? (
                    <a
                      href={s.external_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-400/80 hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>{s.external_url.replace(/^https?:\/\//, "")}</span>
                    </a>
                  ) : (
                    <span>Tanpa tautan luar</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-xl bg-zinc-950/40 border border-dashed border-zinc-800 text-center space-y-2">
            <Sparkles className="w-8 h-8 text-zinc-600 mx-auto" />
            <p className="text-xs font-semibold text-zinc-400">
              Belum ada sponsor yang didaftarkan untuk turnamen ini
            </p>
            <p className="text-[11px] text-zinc-600 max-w-sm mx-auto">
              Daftarkan sponsor lokal Anda untuk ditampilkan pada siaran live streaming dan layar jeda pertandingan.
            </p>
          </div>
        )}
      </div>

      {/* 4. Grid: Pengaturan Link Siaran & Preview Player */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Kolom Kiri: Form Pengaturan Siaran */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 space-y-5">
            <div className="flex items-center gap-2.5 pb-4 border-b border-zinc-800">
              <Tv className="w-5 h-5 text-amber-500" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Konfigurasi Link Siaran Langsung
              </h3>
            </div>

            {/* Pilihan Platform */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-2">
                Pilih Platform Siaran Utama
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { id: "youtube", label: "YouTube Live", icon: Video, color: "hover:border-red-500 hover:text-red-400" },
                  { id: "tiktok", label: "TikTok Live", icon: Globe, color: "hover:border-cyan-500 hover:text-cyan-400" },
                  { id: "facebook", label: "Facebook Live", icon: Globe, color: "hover:border-blue-500 hover:text-blue-400" },
                  { id: "custom", label: "Custom / Lainnya", icon: Share2, color: "hover:border-amber-500 hover:text-amber-400" },
                ].map((p) => {
                  const Icon = p.icon;
                  const active = platform === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPlatform(p.id)}
                      className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-2 transition-all ${
                        active
                          ? "bg-amber-500/10 border-amber-500 text-amber-400 shadow-md shadow-amber-500/10"
                          : `bg-zinc-900 border-zinc-800 text-zinc-400 ${p.color}`
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{p.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Judul Sesi Siaran */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Judul Sesi Siaran (Opsional)
              </label>
              <input
                type="text"
                value={liveTitle}
                onChange={(e) => setLiveTitle(e.target.value)}
                placeholder="Contoh: Grand Final Day 1 — Round 1 & 2 (Bermuda & Purgatory)"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition-colors"
              />
              <p className="text-[11px] text-zinc-500 mt-1">
                Ditampilkan di bar status penonton dan ticker overlay penyiaran.
              </p>
            </div>

            {/* URL Siaran */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                URL Siaran Langsung ({platform.toUpperCase()})
              </label>
              <input
                type="text"
                value={streamUrl}
                onChange={(e) => setStreamUrl(e.target.value)}
                placeholder={
                  platform === "youtube"
                    ? "https://www.youtube.com/watch?v=xxxxxxxxxxx atau https://youtu.be/..."
                    : platform === "tiktok"
                    ? "https://www.tiktok.com/@namacaster/live"
                    : "https://facebook.com/..."
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition-colors"
              />
              <p className="text-[11px] text-zinc-500 mt-1">
                {platform === "youtube"
                  ? "💡 Video YouTube akan diputar langsung secara otomatis di website Arena Tempur."
                  : "Penonton akan diarahkan langsung ke aplikasi/web platform bersangkutan."}
              </p>
            </div>

            {/* Tombol Simpan */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => handleSave()}
                disabled={isSaving}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <Settings2 className="w-4 h-4" />
                <span>{isSaving ? "Menyimpan..." : "Simpan Pengaturan Siaran"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Live Stream Monitor / Player Preview */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 space-y-4">
            {/* Monitor Header with Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-1.5 p-1 bg-zinc-950 rounded-xl border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setMonitorTab("gladi")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    monitorTab === "gladi"
                      ? "bg-amber-500 text-zinc-950 shadow"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Gladi Resik (Simulasi)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMonitorTab("youtube")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    monitorTab === "youtube"
                      ? "bg-red-600 text-white shadow"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Tv className="w-3.5 h-3.5" />
                  <span>YouTube On-Air</span>
                </button>
              </div>

              {isLive && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white animate-pulse inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  ON AIR
                </span>
              )}
            </div>

            {/* TAB 1: GLADI RESIK / OVERLAY SIMULATOR */}
            {monitorTab === "gladi" && (
              <div className="space-y-3">
                {/* Overlay Sub-selector */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setGladiOverlay("ticker")}
                      className={`px-2.5 py-1 rounded-md font-semibold text-[11px] transition-colors ${
                        gladiOverlay === "ticker"
                          ? "bg-zinc-800 text-amber-400 border border-amber-500/30"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      Ticker HUD Bawah
                    </button>
                    <button
                      type="button"
                      onClick={() => setGladiOverlay("intermission")}
                      className={`px-2.5 py-1 rounded-md font-semibold text-[11px] transition-colors ${
                        gladiOverlay === "intermission"
                          ? "bg-zinc-800 text-amber-400 border border-amber-500/30"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      Jeda Iklan 16:9
                    </button>
                    <button
                      type="button"
                      onClick={() => setGladiOverlay("bracket")}
                      className={`px-2.5 py-1 rounded-md font-semibold text-[11px] transition-colors ${
                        gladiOverlay === "bracket"
                          ? "bg-zinc-800 text-amber-400 border border-amber-500/30"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      Bagan Bracket
                    </button>
                  </div>

                  <a
                    href={`/overlay/${tournament.id}/${gladiOverlay}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-zinc-400 hover:text-amber-400 flex items-center gap-1"
                    title="Buka Overlay di Tab Penuh"
                  >
                    <span>Layar Penuh</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {/* 16:9 Simulated Canvas */}
                <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-zinc-800 shadow-xl group">
                  {/* Gameplay Simulated Backdrop for Ticker */}
                  {gladiOverlay === "ticker" && (
                    <div
                      className="absolute inset-0 w-full h-full bg-cover bg-center opacity-70 filter brightness-90"
                      style={{ backgroundImage: `url('/images/ff-tournament-esports.jpg')` }}
                    />
                  )}

                  {/* Live Overlay Iframe */}
                  <iframe
                    src={`/overlay/${tournament.id}/${gladiOverlay}`}
                    title="Gladi Resik Overlay Simulator"
                    className="absolute inset-0 w-full h-full border-0 pointer-events-none"
                  />

                  {/* Watermark Tag */}
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-md border border-white/10 text-[9px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" />
                    SIMULASI LAYAR RESMI
                  </div>
                </div>

                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  💡 <strong>Gladi Resik Mandiri:</strong> Tampilan di atas adalah hasil rendering nyata dari database turnamen Anda. Jika Anda menambah sponsor atau mengubah skor, pratinjau ini langsung terupdate secara real-time.
                </p>
              </div>
            )}

            {/* TAB 2: YOUTUBE PLAYER */}
            {monitorTab === "youtube" && (
              <div>
                {platform === "youtube" && ytVideoId ? (
                  <div className="space-y-3">
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-zinc-800 shadow-md">
                      <iframe
                        src={`https://www.youtube-nocookie.com/embed/${ytVideoId}?autoplay=0&rel=0`}
                        title="Live Stream Preview"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full border-0"
                      />
                    </div>
                    <div className="text-[11px] text-zinc-400 flex items-center justify-between">
                      <span>YouTube Video ID: <strong className="text-zinc-200">{ytVideoId}</strong></span>
                      <a
                        href={streamUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-amber-400 hover:underline flex items-center gap-1"
                      >
                        Buka YouTube
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="aspect-video rounded-xl bg-zinc-950 border border-dashed border-zinc-800 flex flex-col items-center justify-center text-center p-6 text-zinc-500">
                    <Tv className="w-8 h-8 text-zinc-600 mb-2" />
                    <p className="text-xs font-semibold text-zinc-400">
                      {streamUrl
                        ? `Pratinjau player untuk ${platform.toUpperCase()}`
                        : "Belum Ada URL Siaran yang Dimasukkan"}
                    </p>
                    <p className="text-[11px] text-zinc-600 max-w-xs mt-1">
                      Masukkan link siaran YouTube Live di panel sebelah kiri untuk melihat siaran resmi pemutar langsung di sini.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. OBS Browser Source Generator Hub */}
      <div className="space-y-4 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-zinc-800">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-500" />
              OBS Studio Dynamic Overlays (Browser Source Hub)
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Salin URL overlay di bawah dan tempelkan ke <strong>OBS Studio Browser Source</strong>. Latar belakang otomatis transparan dan data ter-update real-time.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {overlayOptions.map((overlay) => {
            const Icon = overlay.icon;
            const isCopied = copiedKey === overlay.key;

            return (
              <div
                key={overlay.key}
                className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/90 hover:border-zinc-700 transition-all flex flex-col justify-between gap-4 group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      {overlay.badge}
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      Res: <strong className="text-zinc-300">{overlay.recommendedRes}</strong>
                    </span>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center text-amber-400 shrink-0 border border-zinc-700/80 group-hover:scale-105 transition-transform">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{overlay.title}</h4>
                      <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                        {overlay.desc}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Input URL & Tombol Copy */}
                <div className="space-y-2 pt-2 border-t border-zinc-800/70">
                  <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={overlay.url}
                      className="flex-1 px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] font-mono text-zinc-400 select-all focus:outline-none min-w-0"
                    />

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCopy(overlay.url, overlay.key)}
                        className={`flex-1 xs:flex-initial px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          isCopied
                            ? "bg-emerald-600 text-white"
                            : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white border border-zinc-700"
                        }`}
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{isCopied ? "Tersalin!" : "Salin URL"}</span>
                      </button>

                      <Link
                        href={overlay.url}
                        target="_blank"
                        className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white border border-zinc-700 transition-colors"
                        title="Buka pratinjau overlay di tab baru"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. Panduan Setup OBS Studio */}
      <div className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-4">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-amber-500" />
          Panduan Setup OBS Studio (5 Menit Siap Siaran)
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-zinc-400">
          <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 space-y-1.5">
            <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-[11px]">1</span>
            <h5 className="font-bold text-zinc-200">Tambah Browser Source</h5>
            <p className="text-[11px] leading-relaxed">
              Di OBS Studio, pada panel <strong>Sources</strong>, klik tanda <strong>+</strong> lalu pilih <strong>Browser</strong>. Beri nama (misal: <em>Layar Jeda Iklan / Ticker</em>).
            </p>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 space-y-1.5">
            <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-[11px]">2</span>
            <h5 className="font-bold text-zinc-200">Paste URL & Resolusi</h5>
            <p className="text-[11px] leading-relaxed">
              Tempelkan URL yang disalin di atas. Atur Width: <strong>1920</strong> dan Height: <strong>1080</strong> (atau sesuaikan dengan rekomendasi tiap overlay).
            </p>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 space-y-1.5">
            <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-[11px]">3</span>
            <h5 className="font-bold text-zinc-200">Centang Auto-Refresh</h5>
            <p className="text-[11px] leading-relaxed">
              Centang opsi <em>&quot;Shutdown source when not visible&quot;</em> dan <em>&quot;Refresh browser when scene becomes active&quot;</em> agar selalu sinkron dengan database.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
