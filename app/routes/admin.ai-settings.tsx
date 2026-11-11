// app/routes/admin.ai-settings.tsx
import { useState } from "react";
import { Link, useLoaderData, redirect } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { toast } from "sonner";
import {
  Cpu,
  ArrowLeft,
  Sparkles,
  Key,
  Globe,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Zap,
  HelpCircle,
  Server,
} from "lucide-react";
import { createWebClient } from "@/lib/supabase/web";
import {
  getPublicAIVisionConfig,
  PRESET_DEFAULTS,
  type AIVisionConfig,
  type AIPreset,
} from "@/lib/ai/config";

export function meta() {
  return [
    { title: "Konfigurasi AI Vision Scoreboard — Arena Tempur" },
    {
      name: "description",
      content:
        "Atur penyedia AI (Gemini, OpenAI, DeepSeek, Groq, OpenRouter, Ollama) untuk membaca skor pertandingan.",
    },
  ];
}

export async function loader({ request }: LoaderFunctionArgs) {
  const { client: supabase } = createWebClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw redirect("/login");
  }

  // Verifikasi apakah user adalah panitia/staff turnamen
  const { data: staffList } = await supabase
    .from("tournament_staff")
    .select("role, tournament_id")
    .eq("user_id", user.id)
    .limit(1);

  if (!staffList || staffList.length === 0) {
    throw redirect("/dashboard");
  }

  const initialConfig = await getPublicAIVisionConfig();

  return {
    initialConfig,
    presets: PRESET_DEFAULTS,
  };
}

export default function AdminAISettingsRoute() {
  const { initialConfig, presets } = useLoaderData<typeof loader>();

  const [provider, setProvider] = useState<"gemini" | "openai_compatible">(initialConfig.provider);
  const [preset, setPreset] = useState<AIPreset>(initialConfig.preset || "gemini");
  const [baseUrl, setBaseUrl] = useState(initialConfig.baseUrl || "");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(initialConfig.model || "gemini-2.0-flash");
  const [temperature, setTemperature] = useState<number>(initialConfig.temperature ?? 0.1);
  const [showApiKey, setShowApiKey] = useState(false);

  // Status State
  const [hasStoredKey, setHasStoredKey] = useState(initialConfig.hasApiKey);
  const [maskedKey, setMaskedKey] = useState(initialConfig.maskedApiKey);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
    latencyMs?: number;
    testedAt?: string;
  } | null>(null);

  // Ganti Preset
  const handleSelectPreset = (pKey: AIPreset) => {
    const p = presets[pKey];
    if (!p) return;

    setPreset(pKey);
    setProvider(p.provider);
    setBaseUrl(p.baseUrl);
    setModel(p.model);
    setTestResult(null);

    toast.info(`Preset diubah ke: ${p.name}`);
  };

  // Uji Koneksi AI
  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/ai/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          preset,
          baseUrl: provider === "openai_compatible" ? baseUrl : "",
          apiKey: apiKey.trim() !== "" ? apiKey.trim() : undefined,
          model,
          temperature,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setTestResult({
          ok: false,
          message: data.error || "Gagal menguji koneksi AI.",
        });
        toast.error("Uji koneksi AI gagal!");
        return;
      }

      setTestResult({
        ok: data.data.ok,
        message: data.data.message,
        latencyMs: data.data.latencyMs,
        testedAt: data.data.testedAt,
      });

      if (data.data.ok) {
        toast.success(`Koneksi AI Terhubung! (${data.data.latencyMs}ms)`);
      } else {
        toast.error(`Koneksi ditolak: ${data.data.message}`);
      }
    } catch (err: any) {
      setTestResult({
        ok: false,
        message: err.message || "Gagal menghubungi server pengujian.",
      });
      toast.error("Terjadi galat saat pengujian jaringan.");
    } finally {
      setIsTesting(false);
    }
  };

  // Simpan Konfigurasi
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const res = await fetch("/api/ai/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          preset,
          baseUrl: provider === "openai_compatible" ? baseUrl.trim() : "",
          apiKey: apiKey.trim() !== "" ? apiKey.trim() : undefined,
          model: model.trim(),
          temperature,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.error || "Gagal menyimpan konfigurasi.");
        return;
      }

      toast.success("Konfigurasi AI berhasil disimpan dan langsung aktif!");
      if (apiKey.trim() !== "") {
        setHasStoredKey(true);
        setMaskedKey(`${apiKey.trim().slice(0, 4)}...${apiKey.trim().slice(-4)}`);
        setApiKey("");
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Breadcrumb & Header */}
      <div>
        <Link
          to="/admin"
          className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Portal Panitia
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 via-red-600 to-rose-700 flex items-center justify-center text-white shadow-lg shadow-red-500/20">
              <Cpu className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
                Konfigurasi AI Vision
                <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                  Universal OCR
                </span>
              </h1>
              <p className="text-xs text-zinc-400 mt-1">
                Atur penyedia kecerdasan buatan untuk membaca screenshot papan skor match Free Fire
              </p>
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-zinc-400">Aktif:</span>
            <span className="font-bold text-white capitalize">{preset}</span>
            <span className="text-zinc-600">({model})</span>
          </div>
        </div>
      </div>

      {/* Preset Selector Cards */}
      <div className="card-glow p-5 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Pilih Template Cepat (Preset)
          </h2>
          <span className="text-[11px] text-zinc-500">Klik salah satu untuk otomatis mengisi parameter</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {(Object.keys(presets) as AIPreset[]).map((pKey) => {
            const p = presets[pKey];
            const isSelected = preset === pKey;
            return (
              <button
                key={pKey}
                type="button"
                onClick={() => handleSelectPreset(pKey)}
                className={`p-3 rounded-xl text-left border transition-all flex flex-col justify-between h-28 cursor-pointer ${
                  isSelected
                    ? "bg-red-500/15 border-red-500 text-white shadow-lg shadow-red-500/10"
                    : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold truncate">{p.name.split(" ")[0]}</span>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-red-400" />}
                  </div>
                  <p className="text-[10px] text-zinc-500 line-clamp-2 leading-tight">
                    {p.name.includes("(") ? p.name.slice(p.name.indexOf("(")) : p.provider}
                  </p>
                </div>
                <div className="text-[9px] font-mono text-zinc-400 truncate bg-black/40 px-1.5 py-0.5 rounded">
                  {p.model}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="card-glow p-6 rounded-2xl space-y-5">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-zinc-800/80 pb-3">
            <Sliders className="w-4 h-4 text-amber-400" />
            Parameter Koneksi API
          </h2>

          {/* Provider Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-300">Tipe Protokol Provider</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  provider === "gemini"
                    ? "bg-amber-500/10 border-amber-500/50 text-white"
                    : "bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                }`}
              >
                <input
                  type="radio"
                  name="provider"
                  value="gemini"
                  checked={provider === "gemini"}
                  onChange={() => {
                    setProvider("gemini");
                    setPreset("gemini");
                    setModel("gemini-2.0-flash");
                  }}
                  className="accent-amber-500 w-4 h-4"
                />
                <div>
                  <div className="text-xs font-bold">Google Gemini (Bawaan Resmi)</div>
                  <div className="text-[11px] text-zinc-500">
                    Menggunakan SDK resmi @google/genai (Direct Google Cloud)
                  </div>
                </div>
              </label>

              <label
                className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  provider === "openai_compatible"
                    ? "bg-red-500/10 border-red-500/50 text-white"
                    : "bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                }`}
              >
                <input
                  type="radio"
                  name="provider"
                  value="openai_compatible"
                  checked={provider === "openai_compatible"}
                  onChange={() => {
                    setProvider("openai_compatible");
                    if (preset === "gemini") {
                      setPreset("openai");
                      setBaseUrl("https://api.openai.com/v1");
                      setModel("gpt-4o-mini");
                    }
                  }}
                  className="accent-red-500 w-4 h-4"
                />
                <div>
                  <div className="text-xs font-bold">OpenAI Compatible (Custom Base URL)</div>
                  <div className="text-[11px] text-zinc-500">
                    Bebas pakai OpenAI, Groq, DeepSeek, OpenRouter, atau Ollama
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Base URL (Only for OpenAI-Compatible) */}
          {provider === "openai_compatible" && (
            <div className="space-y-1.5 animate-fadeIn">
              <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-zinc-400" />
                  Base URL Penyedia AI
                </span>
                <span className="text-[10px] text-zinc-500">Contoh: https://api.openai.com/v1</span>
              </label>
              <input
                type="text"
                required={provider === "openai_compatible"}
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://api.openai.com/v1 atau http://localhost:11434/v1"
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-red-500 focus:ring-1 focus:ring-red-500 text-white text-xs rounded-xl px-4 py-3 font-mono outline-none transition-all"
              />
              <p className="text-[10px] text-zinc-500">
                Sistem akan otomatis memanggil endpoint{" "}
                <code className="text-zinc-400 font-mono">
                  {baseUrl ? baseUrl.replace(/\/+$/, "") : ""}/chat/completions
                </code>
              </p>
            </div>
          )}

          {/* Model Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-zinc-400" />
                Nama Model Vision (Multimodal)
              </span>
              <span className="text-[10px] text-amber-400 font-medium">Wajib mendukung input gambar</span>
            </label>
            <input
              type="text"
              required
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="gemini-2.0-flash / gpt-4o-mini / llama-3.2-11b-vision-preview"
              className="w-full bg-zinc-900 border border-zinc-800 focus:border-red-500 focus:ring-1 focus:ring-red-500 text-white text-xs rounded-xl px-4 py-3 font-mono outline-none transition-all"
            />
          </div>

          {/* API Key */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-zinc-400" />
                API Key
              </label>
              {hasStoredKey && (
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Key Tersimpan: {maskedKey}
                </span>
              )}
            </div>

            <div className="relative">
              <input
                type={showApiKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={
                  hasStoredKey
                    ? "•••••••••••••••••••••••••••••••• (Kosongkan jika tidak ingin mengubah)"
                    : preset === "ollama"
                    ? "Opsional untuk Ollama lokal"
                    : "Masukkan API Key (sk-... / AIzaSy...)"
                }
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-red-500 focus:ring-1 focus:ring-red-500 text-white text-xs rounded-xl pl-4 pr-11 py-3 font-mono outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-1 cursor-pointer"
                title={showApiKey ? "Sembunyikan" : "Tampilkan"}
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[10px] text-zinc-500">
              Kunci API disimpan aman di server backend dan tidak pernah dikirim ke HP wasit.
            </p>
          </div>

          {/* Temperature Slider */}
          <div className="space-y-1.5 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-300">Temperature (Suhu Presisi OCR)</label>
              <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                {temperature}
              </span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full accent-red-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
              <span>0.0 (Presisi Tinggi / Kaku)</span>
              <span>Default: 0.1</span>
              <span>1.0 (Kreatif)</span>
            </div>
          </div>
        </div>

        {/* Test Result Banner */}
        {testResult && (
          <div
            className={`p-4 rounded-xl border animate-fadeIn flex items-start gap-3 ${
              testResult.ok
                ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-300"
                : "bg-red-950/30 border-red-500/40 text-red-300"
            }`}
          >
            {testResult.ok ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 text-xs">
              <div className="font-bold mb-0.5">
                {testResult.ok ? "Koneksi Berhasil & Model Siap Digunakan!" : "Koneksi Uji Gagal"}
              </div>
              <div className="text-[11px] opacity-90">{testResult.message}</div>
              {testResult.latencyMs !== undefined && (
                <div className="text-[10px] mt-1 font-mono text-zinc-400">
                  Kecepatan respon: <span className="text-white font-bold">{testResult.latencyMs} ms</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold transition-all border border-zinc-700 disabled:opacity-50 cursor-pointer"
          >
            {isTesting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                Menguji Respon API...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 text-amber-400" />
                Tes Koneksi AI (Ping)
              </>
            )}
          </button>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white text-xs font-black tracking-wide shadow-lg shadow-red-600/25 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                SIMPAN & AKTIFKAN AI
              </>
            )}
          </button>
        </div>
      </form>

      {/* Info / FAQ Accordion Card */}
      <div className="card-glow p-5 rounded-2xl space-y-4 text-xs text-zinc-400">
        <h3 className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-zinc-400" />
          Pertanyaan Umum & Petunjuk Penggunaan
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-800 space-y-1">
            <h4 className="font-bold text-white text-xs">Apakah HP Wasit (APK) perlu disetel ulang?</h4>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              <strong className="text-emerald-400">Tidak perlu.</strong> Begitu Anda klik Simpan di halaman ini,
              seluruh tangkapan layar yang dikirimkan oleh wasit di lapangan otomatis langsung diproses menggunakan
              provider AI yang Anda tentukan di sini.
            </p>
          </div>

          <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-800 space-y-1">
            <h4 className="font-bold text-white text-xs">Bisakah menggunakan AI Lokal Offline (Tanpa Kuota)?</h4>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              <strong className="text-amber-400">Bisa!</strong> Instal <span className="text-white">Ollama</span> di
              laptop, unduh model vision dengan perintah: <code className="text-zinc-200 font-mono">ollama run llama3.2-vision</code>,
              lalu pilih preset <strong>Ollama Local</strong> di atas dengan Base URL:{" "}
              <code className="text-zinc-200 font-mono">http://localhost:11434/v1</code>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
