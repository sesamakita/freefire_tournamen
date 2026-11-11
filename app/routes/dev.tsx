import { useState } from "react";
import { useLoaderData, useFetcher, Link } from "react-router";
import type { LoaderFunctionArgs, ActionFunctionArgs, MetaFunction } from "react-router";
import { toast } from "sonner";
import {
  Terminal,
  KeyRound,
  Database,
  Tv,
  Trophy,
  Users,
  Sparkles,
  ExternalLink,
  PlusCircle,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  LogOut,
  Layers,
  Zap,
  Cpu,
  Sliders,
  Eye,
  EyeOff,
  Globe,
  Loader2,
  Server,
  CreditCard,
  Radio,
  Activity,
  Trash2,
  DollarSign,
  Building,
  Check,
  Copy,
  GitBranch,
  GitPullRequest,
  Lock,
  Tag,
  Shield,
  Search,
  Code2,
} from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { isDevAuthenticated, getDevMasterKey, DEFAULT_DEV_KEY } from "@/lib/dev-auth";
import {
  getPublicAIVisionConfig,
  PRESET_DEFAULTS,
  type AIPreset,
} from "@/lib/ai/config";
import {
  getPaymentGatewayConfig,
  getCloudVpsDefaultConfig,
  runSystemDiagnostics,
  saveAppSetting,
  cleanSandboxTournaments,
  type PaymentGatewayConfig,
  type CloudVpsDefaultConfig,
  type SystemDiagnostics,
} from "@/lib/platform-settings";

export const meta: MetaFunction = () => {
  return [
    { title: "Developer Console · Arena Tempur" },
    { name: "robots", content: "noindex, nofollow" },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const isAuth = isDevAuthenticated(request);

  if (!isAuth) {
    return {
      isAuth: false,
      tournaments: [],
      stats: { totalTournaments: 0, totalTeams: 0, totalSponsors: 0 },
      aiConfig: null,
      aiPresets: PRESET_DEFAULTS,
      paymentConfig: null,
      vpsDefault: null,
      diagnostics: null,
    };
  }

  const admin = createAdminClient();
  const db = admin as any;

  // 1. Ambil semua turnamen
  const { data: tournaments } = await db
    .from("tournaments")
    .select(`
      id,
      nama,
      slug,
      format,
      status,
      entry_fee,
      max_teams,
      is_live,
      live_title,
      created_at
    `)
    .order("created_at", { ascending: false });

  // 2. Statistik
  const { count: totalTournaments } = await db
    .from("tournaments")
    .select("*", { count: "exact", head: true });

  const { count: totalTeams } = await db
    .from("teams")
    .select("*", { count: "exact", head: true });

  const { count: totalSponsors } = await db
    .from("tournament_sponsors")
    .select("*", { count: "exact", head: true });

  // 3. Konfigurasi AI
  const aiConfig = await getPublicAIVisionConfig();

  // 4. Konfigurasi Payment & Monetisasi
  const paymentConfig = await getPaymentGatewayConfig();

  // 5. Default Cloud VPS Streaming
  const vpsDefault = await getCloudVpsDefaultConfig();

  // 6. Diagnostik Sistem Radar
  const diagnostics = await runSystemDiagnostics();

  return {
    isAuth: true,
    tournaments: tournaments || [],
    stats: {
      totalTournaments: totalTournaments || 0,
      totalTeams: totalTeams || 0,
      totalSponsors: totalSponsors || 0,
    },
    defaultKeyHint: DEFAULT_DEV_KEY,
    aiConfig,
    aiPresets: PRESET_DEFAULTS,
    paymentConfig,
    vpsDefault,
    diagnostics,
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "login") {
    const key = (formData.get("key") as string)?.trim();
    const expected = getDevMasterKey();

    if (key === expected) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          "Set-Cookie": `arenatempur_dev_key=${encodeURIComponent(
            key
          )}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`,
          "Content-Type": "application/json",
        },
      });
    }

    return new Response(
      JSON.stringify({ success: false, error: "Incorrect master password or key." }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  if (intent === "logout") {
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Set-Cookie": `arenatempur_dev_key=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
        "Content-Type": "application/json",
      },
    });
  }

  // Quick Action: Buat Turnamen Testing Kilat (1v1 Lone Wolf)
  if (intent === "create_test_tournament") {
    const admin = createAdminClient();
    const db = admin as any;

    const testId = `dev-test-${Date.now().toString().slice(-6)}`;
    const { data, error } = await db
      .from("tournaments")
      .insert({
        nama: `arena-byone-test-${testId.slice(-4)}`,
        slug: `test-byone-${testId}`,
        format: "lone_wolf_1v1",
        status: "open",
        entry_fee: 0,
        max_teams: 16,
        deskripsi: "Automated test repository tournament generated from Developer Room.",
        tgl_mulai: new Date().toISOString(),
        tgl_selesai: new Date(Date.now() + 86400000 * 3).toISOString(),
        is_live: false,
      })
      .select("id")
      .single();

    if (error) {
      return Response.json({ success: false, error: error.message }, { status: 500 });
    }

    return Response.json({ success: true, tournamentId: data.id });
  }

  // Quick Action: Suntik 8 Tim Dummy
  if (intent === "seed_dummy_teams") {
    const tournamentId = formData.get("tournamentId") as string;
    if (!tournamentId) return Response.json({ success: false, error: "Tournament ID required" }, { status: 400 });

    const admin = createAdminClient();
    const db = admin as any;

    const dummyNames = [
      "evos-esports", "rrq-hoshi", "onic-esports", "alter-ego",
      "bigetron-era", "aura-fire", "rebellion-zion", "dewa-united"
    ];

    const teamInserts = dummyNames.map((nama, idx) => ({
      tournament_id: tournamentId,
      nama: nama.toUpperCase(),
      kapten_ign: `cpt-${nama.split("-")[0]}`,
      kapten_uid: `100200${idx + 1}`,
      verification_status: "approved",
      payment_status: "paid",
      verified_at: new Date().toISOString(),
    }));

    const { data: insertedTeams, error: teamErr } = await db
      .from("teams")
      .insert(teamInserts)
      .select("id, nama, kapten_ign, kapten_uid");

    if (teamErr) {
      return Response.json({ success: false, error: teamErr.message }, { status: 500 });
    }

    if (insertedTeams && insertedTeams.length > 0) {
      const memberInserts = insertedTeams.map((t: any) => ({
        team_id: t.id,
        ign: t.kapten_ign,
        uid_game: t.kapten_uid,
        role_tim: "igl",
        is_substitute: false,
      }));
      await db.from("team_members").insert(memberInserts);
    }

    return Response.json({ success: true, count: insertedTeams?.length || 0 });
  }

  // Quick Action: Suntik Sponsor Demo
  if (intent === "seed_demo_sponsors") {
    const tournamentId = formData.get("tournamentId") as string;
    if (!tournamentId) return Response.json({ success: false, error: "Tournament ID required" }, { status: 400 });

    const admin = createAdminClient();
    const db = admin as any;

    const sponsors = [
      {
        tournament_id: tournamentId,
        name: "ROG Gaming Phone",
        tier: "title",
        logo_url: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200&fit=crop&q=80",
        banner_url: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1920&q=80",
        external_url: "https://rog.asus.com",
        display_order: 1,
        is_active: true,
      },
      {
        tournament_id: tournamentId,
        name: "Kenangan Gaming Cafe",
        tier: "main",
        logo_url: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=200&fit=crop&q=80",
        banner_url: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1920&q=80",
        external_url: "https://kopikenangan.com",
        display_order: 2,
        is_active: true,
      },
    ];

    await db.from("tournament_sponsors").insert(sponsors);
    return Response.json({ success: true });
  }

  // Action: Simpan Konfigurasi Payment & Monetisasi
  if (intent === "save_payment_config") {
    try {
      const isProduction = formData.get("is_production") === "true";
      const clientKey = (formData.get("client_key") as string)?.trim() || "";
      const serverKey = (formData.get("server_key") as string)?.trim() || "";
      const feeType = (formData.get("platform_fee_type") as string) || "fixed";
      const feeAmount = parseFloat(formData.get("platform_fee_amount") as string) || 0;
      const bankName = (formData.get("master_bank_name") as string)?.trim() || "";
      const accNumber = (formData.get("master_account_number") as string)?.trim() || "";
      const accName = (formData.get("master_account_name") as string)?.trim() || "";
      const qrisUrl = (formData.get("qris_image_url") as string)?.trim() || "";

      const payload: any = {
        is_production: isProduction,
        client_key: clientKey,
        platform_fee_type: feeType,
        platform_fee_amount: feeAmount,
        master_bank_name: bankName,
        master_account_number: accNumber,
        master_account_name: accName,
        qris_image_url: qrisUrl,
      };

      if (serverKey) {
        payload.server_key = serverKey;
      }

      await saveAppSetting("payment_gateway", payload);
      return Response.json({ success: true, message: "Payment settings saved successfully." });
    } catch (err: any) {
      return Response.json({ success: false, error: err.message }, { status: 500 });
    }
  }

  // Action: Simpan Default Cloud VPS Streaming
  if (intent === "save_vps_default") {
    try {
      const rtmpUrl = (formData.get("default_rtmp_url") as string)?.trim() || "";
      const hlsUrl = (formData.get("default_hls_url") as string)?.trim() || "";
      const port = parseInt(formData.get("obs_web_port") as string) || 8080;
      const autoReconnect = formData.get("auto_reconnect") === "true";

      await saveAppSetting("cloud_vps_default", {
        default_rtmp_url: rtmpUrl,
        default_hls_url: hlsUrl,
        obs_web_port: port,
        auto_reconnect: autoReconnect,
      });

      return Response.json({ success: true, message: "Cloud VPS defaults saved." });
    } catch (err: any) {
      return Response.json({ success: false, error: err.message }, { status: 500 });
    }
  }

  // Action: Bersihkan Data Dummy Sandbox
  if (intent === "clean_sandbox") {
    try {
      const deletedCount = await cleanSandboxTournaments();
      return Response.json({ success: true, deletedCount });
    } catch (err: any) {
      return Response.json({ success: false, error: err.message }, { status: 500 });
    }
  }

  return Response.json({ success: false, error: "Unknown action" }, { status: 400 });
}

export default function DeveloperRoomPage() {
  const data = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const [inputKey, setInputKey] = useState("");
  const [activeTab, setActiveTab] = useState<
    "tournaments" | "ai_settings" | "monetization" | "vps_defaults" | "diagnostics"
  >("tournaments");
  const [selectedTournId, setSelectedTournId] = useState<string>(
    data.tournaments[0]?.id || ""
  );
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Copy helper
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    toast.success(`Copied to clipboard: ${label}`);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // AI Configuration States
  const [aiProvider, setAiProvider] = useState<"gemini" | "openai_compatible">(
    data.aiConfig?.provider || "gemini"
  );
  const [aiPreset, setAiPreset] = useState<AIPreset>(data.aiConfig?.preset || "gemini");
  const [aiBaseUrl, setAiBaseUrl] = useState(data.aiConfig?.baseUrl || "");
  const [aiApiKey, setAiApiKey] = useState("");
  const [aiModel, setAiModel] = useState(data.aiConfig?.model || "gemini-2.0-flash");
  const [aiTemperature, setAiTemperature] = useState<number>(data.aiConfig?.temperature ?? 0.1);
  const [showAiKey, setShowAiKey] = useState(false);
  const [isTestingAi, setIsTestingAi] = useState(false);
  const [isSavingAi, setIsSavingAi] = useState(false);
  const [hasStoredAiKey, setHasStoredAiKey] = useState(data.aiConfig?.hasApiKey || false);
  const [maskedAiKey, setMaskedAiKey] = useState(data.aiConfig?.maskedApiKey || "");
  const [aiTestResult, setAiTestResult] = useState<{
    ok: boolean;
    message: string;
    latencyMs?: number;
    testedAt?: string;
  } | null>(null);

  // Switch Preset Handler
  const handleSelectPreset = (pKey: AIPreset) => {
    const p = data.aiPresets[pKey];
    if (!p) return;
    setAiPreset(pKey);
    setAiProvider(p.provider);
    setAiBaseUrl(p.baseUrl);
    setAiModel(p.model);
    setAiTestResult(null);
    toast.info(`Switched preset to: ${p.name}`);
  };

  // Test AI Connection Handler
  const handleTestAi = async () => {
    setIsTestingAi(true);
    setAiTestResult(null);

    try {
      const res = await fetch("/api/ai/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: aiProvider,
          preset: aiPreset,
          baseUrl: aiProvider === "openai_compatible" ? aiBaseUrl : "",
          apiKey: aiApiKey.trim() !== "" ? aiApiKey.trim() : undefined,
          model: aiModel,
          temperature: aiTemperature,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setAiTestResult({
          ok: false,
          message: json.error || "Failed to reach AI provider.",
        });
        toast.error("AI connection test failed");
        return;
      }

      setAiTestResult({
        ok: json.data.ok,
        message: json.data.message,
        latencyMs: json.data.latencyMs,
        testedAt: json.data.testedAt,
      });

      if (json.data.ok) {
        toast.success(`Connected successfully (${json.data.latencyMs}ms)`);
      } else {
        toast.error(`Connection rejected: ${json.data.message}`);
      }
    } catch (err: any) {
      setAiTestResult({
        ok: false,
        message: err.message || "Network test failed.",
      });
      toast.error("Network error during AI test");
    } finally {
      setIsTestingAi(false);
    }
  };

  // Save AI Config Handler
  const handleSaveAi = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingAi(true);

    try {
      const res = await fetch("/api/ai/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: aiProvider,
          preset: aiPreset,
          baseUrl: aiProvider === "openai_compatible" ? aiBaseUrl.trim() : "",
          apiKey: aiApiKey.trim() !== "" ? aiApiKey.trim() : undefined,
          model: aiModel.trim(),
          temperature: aiTemperature,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Failed to save AI configuration.");
        return;
      }

      toast.success("AI configuration saved and active globally.");
      if (aiApiKey.trim() !== "") {
        setHasStoredAiKey(true);
        setMaskedAiKey(`${aiApiKey.trim().slice(0, 4)}...${aiApiKey.trim().slice(-4)}`);
        setAiApiKey("");
      }
    } catch (err: any) {
      toast.error(`Save error: ${err.message}`);
    } finally {
      setIsSavingAi(false);
    }
  };

  // Payment Form State
  const [payIsProd, setPayIsProd] = useState<boolean>(data.paymentConfig?.is_production ?? false);
  const [payClientKey, setPayClientKey] = useState<string>(data.paymentConfig?.client_key || "");
  const [payServerKey, setPayServerKey] = useState<string>("");
  const [payFeeType, setPayFeeType] = useState<"fixed" | "percent">(data.paymentConfig?.platform_fee_type || "fixed");
  const [payFeeAmount, setPayFeeAmount] = useState<number>(data.paymentConfig?.platform_fee_amount ?? 2500);
  const [payBankName, setPayBankName] = useState<string>(data.paymentConfig?.master_bank_name || "BCA");
  const [payAccNumber, setPayAccNumber] = useState<string>(data.paymentConfig?.master_account_number || "");
  const [payAccName, setPayAccName] = useState<string>(data.paymentConfig?.master_account_name || "");
  const [payQrisUrl, setPayQrisUrl] = useState<string>(data.paymentConfig?.qris_image_url || "");

  // VPS Default State
  const [vpsRtmp, setVpsRtmp] = useState<string>(data.vpsDefault?.default_rtmp_url || "rtmp://vps.arenatempur.com:1935/live");
  const [vpsHls, setVpsHls] = useState<string>(data.vpsDefault?.default_hls_url || "http://vps.arenatempur.com:8888/live");
  const [vpsPort, setVpsPort] = useState<number>(data.vpsDefault?.obs_web_port || 8080);

  // Filtered Tournaments
  const filteredTournaments = data.tournaments.filter(
    (t: any) =>
      t.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // =========================================================================
  // GITHUB SUDO / CONFIRM ACCESS MODAL (LOGIN GATEWAY)
  // =========================================================================
  if (!data.isAuth) {
    return (
      <div
        className="min-h-screen bg-[#0d1117] text-[#e6edf3] flex flex-col items-center justify-center p-4"
        style={{
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif',
        }}
      >
        {/* Arena Tempur Logo Header */}
        <div className="mb-6 flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-[#161b22] border border-[#30363d] flex items-center justify-center mb-4 shadow-sm p-2">
            <img
              src="/images/logo-monogram.svg"
              alt="Arena Tempur"
              className="w-7 h-7 object-contain"
            />
          </div>
          <h1 className="text-xl font-normal text-[#e6edf3] tracking-tight">
            Confirm access to developer console
          </h1>
          <p className="text-xs text-[#8d96a0] mt-1.5 text-center max-w-sm">
            This is a secure private area for the platform owner. Please confirm your Master Passkey to continue.
          </p>
        </div>

        {/* GitHub Confirm Access Box */}
        <div className="w-full max-w-sm bg-[#161b22] border border-[#30363d] rounded-md p-5 shadow-sm">
          <fetcher.Form method="post" className="space-y-4">
            <input type="hidden" name="intent" value="login" />

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-[#e6edf3] flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#8d96a0]" />
                  Master Password
                </label>
                <span className="text-[11px] text-[#8d96a0] font-mono">god_mode</span>
              </div>
              <input
                type="password"
                name="key"
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                autoFocus
                placeholder="Password or token"
                required
                className="w-full px-3 py-1.5 text-xs bg-[#0d1117] border border-[#30363d] rounded-md text-[#e6edf3] focus:border-[#58a6ff] focus:outline-none focus:ring-1 focus:ring-[#58a6ff] transition-all font-mono"
              />
              <p className="text-[11px] text-[#8d96a0]">
                Default key: <code className="text-[#e6edf3] bg-[#21262d] px-1 py-0.5 rounded font-mono">arenatempur-dev-2026</code>
              </p>
            </div>

            {fetcher.data?.error && (
              <div className="p-2.5 rounded-md bg-[#da3633]/15 border border-[#da3633]/40 text-[#f85149] text-xs flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{fetcher.data.error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={fetcher.state !== "idle"}
              className="w-full py-1.5 px-3 rounded-md bg-[#238636] hover:bg-[#2ea043] border border-[rgba(240,246,252,0.1)] text-white text-xs font-semibold tracking-wide shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {fetcher.state !== "idle" ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Verifying credentials...</span>
                </>
              ) : (
                <span>Confirm access</span>
              )}
            </button>
          </fetcher.Form>
        </div>

        {/* Footer Link */}
        <div className="mt-8 text-center text-xs text-[#8d96a0]">
          <Link to="/" className="text-[#58a6ff] hover:underline">
            &larr; Return to Arena Tempur
          </Link>
          <span className="mx-2">&bull;</span>
          <span>Security environment: Protected</span>
        </div>
      </div>
    );
  }

  // =========================================================================
  // GITHUB MAIN DEVELOPER REPOSITORY & DASHBOARD INTERFACE
  // =========================================================================
  return (
    <div
      className="min-h-screen bg-[#0d1117] text-[#e6edf3] flex flex-col selection:bg-[#1f6feb] selection:text-white"
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif',
      }}
    >
      {/* 1. GITHUB TOP GLOBAL NAVBAR */}
      <header className="w-full border-b border-[#30363d] bg-[#161b22] px-3.5 sm:px-6 py-2.5 sm:py-3 flex flex-col xs:flex-row xs:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          {/* Arena Tempur Logo Icon */}
          <Link to="/dev" className="text-white hover:opacity-80 transition-opacity shrink-0 flex items-center">
            <img
              src="/images/logo-monogram.svg"
              alt="Arena Tempur"
              className="w-6 h-6 object-contain"
            />
          </Link>

          {/* Repo Breadcrumbs */}
          <div className="flex items-center gap-1.5 text-[#e6edf3] font-semibold text-xs sm:text-sm truncate">
            <span className="text-[#8d96a0] hidden sm:inline">arenatempur</span>
            <span className="text-[#8d96a0] hidden sm:inline">/</span>
            <span className="font-bold text-[#e6edf3] truncate">core-dev-console</span>
            <span className="ml-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-medium border border-[#30363d] bg-[#21262d] text-[#8d96a0] shrink-0">
              Private
            </span>
            <span className="ml-0.5 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-mono font-medium border border-[#238636]/40 bg-[#238636]/15 text-[#3fb950] shrink-0">
              god_mode
            </span>
          </div>
        </div>

        {/* Right Nav Utilities */}
        <div className="flex items-center gap-2 shrink-0 self-end xs:self-auto">
          <Link
            to="/dashboard"
            className="px-2.5 sm:px-3 py-1 rounded-md bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-[#c9d1d9] font-medium text-xs transition-colors"
          >
            Switch to Public App
          </Link>

          <fetcher.Form method="post">
            <input type="hidden" name="intent" value="logout" />
            <button
              type="submit"
              className="px-2.5 py-1 rounded-md bg-[#21262d] hover:bg-[#da3633]/20 hover:text-[#f85149] hover:border-[#da3633]/40 border border-[#30363d] text-[#8d96a0] font-medium text-xs transition-colors flex items-center gap-1 cursor-pointer"
              title="Sign out from Developer Mode"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign out</span>
            </button>
          </fetcher.Form>
        </div>
      </header>

      {/* 2. GITHUB UNDERLINE SUBNAV (TAB REPOSITORY STYLE - Swipeable on Mobile) */}
      <div className="w-full bg-[#0d1117] border-b border-[#30363d] px-3.5 sm:px-6 pt-2">
        <nav className="flex items-center gap-1 -mb-px text-xs font-medium overflow-x-auto scrollbar-none whitespace-nowrap">
          {/* Tab 1: Tournaments */}
          <button
            type="button"
            onClick={() => setActiveTab("tournaments")}
            className={`px-3 py-2 border-b-2 flex items-center gap-1.5 sm:gap-2 transition-colors cursor-pointer shrink-0 select-none ${
              activeTab === "tournaments"
                ? "border-[#f78166] text-[#e6edf3] font-semibold"
                : "border-transparent text-[#8d96a0] hover:text-[#e6edf3] hover:border-[#8d96a0]"
            }`}
          >
            <Trophy className="w-4 h-4 text-[#8d96a0]" />
            <span>Tournaments</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#21262d] border border-[#30363d] text-[#8d96a0] font-mono">
              {data.stats.totalTournaments}
            </span>
          </button>

          {/* Tab 2: AI Engine */}
          <button
            type="button"
            onClick={() => setActiveTab("ai_settings")}
            className={`px-3 py-2 border-b-2 flex items-center gap-1.5 sm:gap-2 transition-colors cursor-pointer shrink-0 select-none ${
              activeTab === "ai_settings"
                ? "border-[#f78166] text-[#e6edf3] font-semibold"
                : "border-transparent text-[#8d96a0] hover:text-[#e6edf3] hover:border-[#8d96a0]"
            }`}
          >
            <Cpu className="w-4 h-4 text-[#8d96a0]" />
            <span>AI Scoreboard Engine</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#21262d] border border-[#30363d] text-[#3fb950] font-mono">
              active
            </span>
          </button>

          {/* Tab 3: Payment */}
          <button
            type="button"
            onClick={() => setActiveTab("monetization")}
            className={`px-3 py-2 border-b-2 flex items-center gap-1.5 sm:gap-2 transition-colors cursor-pointer shrink-0 select-none ${
              activeTab === "monetization"
                ? "border-[#f78166] text-[#e6edf3] font-semibold"
                : "border-transparent text-[#8d96a0] hover:text-[#e6edf3] hover:border-[#8d96a0]"
            }`}
          >
            <CreditCard className="w-4 h-4 text-[#8d96a0]" />
            <span>Payment & Fees</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#21262d] border border-[#30363d] text-[#8d96a0] font-mono">
              {data.paymentConfig?.is_production ? "production" : "sandbox"}
            </span>
          </button>

          {/* Tab 4: Cloud VPS */}
          <button
            type="button"
            onClick={() => setActiveTab("vps_defaults")}
            className={`px-3 py-2 border-b-2 flex items-center gap-1.5 sm:gap-2 transition-colors cursor-pointer shrink-0 select-none ${
              activeTab === "vps_defaults"
                ? "border-[#f78166] text-[#e6edf3] font-semibold"
                : "border-transparent text-[#8d96a0] hover:text-[#e6edf3] hover:border-[#8d96a0]"
            }`}
          >
            <Radio className="w-4 h-4 text-[#8d96a0]" />
            <span>Cloud Streaming</span>
          </button>

          {/* Tab 5: Diagnostics */}
          <button
            type="button"
            onClick={() => setActiveTab("diagnostics")}
            className={`px-3 py-2 border-b-2 flex items-center gap-1.5 sm:gap-2 transition-colors cursor-pointer shrink-0 select-none ${
              activeTab === "diagnostics"
                ? "border-[#f78166] text-[#e6edf3] font-semibold"
                : "border-transparent text-[#8d96a0] hover:text-[#e6edf3] hover:border-[#8d96a0]"
            }`}
          >
            <Activity className="w-4 h-4 text-[#8d96a0]" />
            <span>Health & Diagnostics</span>
            <span className="w-2 h-2 rounded-full bg-[#238636]" />
          </button>
        </nav>
      </div>

      {/* 3. MAIN WORKSPACE CONTENT */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-3.5 sm:px-6 py-4 sm:py-6 space-y-6">
        {/* =================================================================== */}
        {/* TAB 1: MASTER TOURNAMENTS & SANDBOX */}
        {/* =================================================================== */}
        {activeTab === "tournaments" && (
          <div className="space-y-6">
            {/* Quick Sandbox Action Bar (GitHub Style Actions Header) */}
            <div className="bg-[#161b22] border border-[#30363d] rounded-md p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#30363d]">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#e3b341]" />
                  <span className="text-xs font-semibold text-[#e6edf3]">
                    Sandbox & Automation Tools
                  </span>
                  <span className="text-[11px] text-[#8d96a0] font-mono">
                    (1-Click Testing Utilities)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#8d96a0]">Active Target:</span>
                  <select
                    value={selectedTournId}
                    onChange={(e) => setSelectedTournId(e.target.value)}
                    className="px-2.5 py-1 rounded-md bg-[#0d1117] border border-[#30363d] text-xs text-[#e6edf3] font-mono focus:border-[#58a6ff] focus:outline-none"
                  >
                    {data.tournaments.map((t: any) => (
                      <option key={t.id} value={t.id}>
                        {t.nama}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 3 Quick Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
                <fetcher.Form method="post">
                  <input type="hidden" name="intent" value="create_test_tournament" />
                  <button
                    type="submit"
                    disabled={fetcher.state !== "idle"}
                    className="w-full py-2 px-3 rounded-md bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-left text-xs transition-colors flex items-center justify-between group cursor-pointer"
                  >
                    <span className="font-semibold text-[#58a6ff] group-hover:underline flex items-center gap-1.5">
                      <PlusCircle className="w-3.5 h-3.5" />
                      New 1v1 Test Tournament
                    </span>
                    <span className="text-[10px] text-[#8d96a0] font-mono">auto-init</span>
                  </button>
                </fetcher.Form>

                <fetcher.Form method="post">
                  <input type="hidden" name="intent" value="seed_dummy_teams" />
                  <input type="hidden" name="tournamentId" value={selectedTournId} />
                  <button
                    type="submit"
                    disabled={fetcher.state !== "idle" || !selectedTournId}
                    className="w-full py-2 px-3 rounded-md bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-left text-xs transition-colors flex items-center justify-between group cursor-pointer disabled:opacity-50"
                  >
                    <span className="font-semibold text-[#3fb950] group-hover:underline flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      Seed 8 Approved Teams
                    </span>
                    <span className="text-[10px] text-[#8d96a0] font-mono">bracket-ready</span>
                  </button>
                </fetcher.Form>

                <fetcher.Form method="post">
                  <input type="hidden" name="intent" value="seed_demo_sponsors" />
                  <input type="hidden" name="tournamentId" value={selectedTournId} />
                  <button
                    type="submit"
                    disabled={fetcher.state !== "idle" || !selectedTournId}
                    className="w-full py-2 px-3 rounded-md bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-left text-xs transition-colors flex items-center justify-between group cursor-pointer disabled:opacity-50"
                  >
                    <span className="font-semibold text-[#d29922] group-hover:underline flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Seed 2 Demo Sponsors
                    </span>
                    <span className="text-[10px] text-[#8d96a0] font-mono">overlay-ready</span>
                  </button>
                </fetcher.Form>
              </div>
            </div>

            {/* Tournament Repository Explorer List */}
            <div className="space-y-3">
              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8d96a0]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Find a tournament by name or ID..."
                    className="w-full pl-9 pr-3 py-1.5 bg-[#0d1117] border border-[#30363d] rounded-md text-xs text-[#e6edf3] focus:border-[#58a6ff] focus:outline-none placeholder-[#8d96a0]"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#8d96a0] font-mono">
                    Showing {filteredTournaments.length} of {data.tournaments.length} tournaments
                  </span>
                </div>
              </div>

              {/* Repositories / Tournaments Container Box */}
              <div className="border border-[#30363d] rounded-md divide-y divide-[#30363d] bg-[#0d1117]">
                {filteredTournaments.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#8d96a0]">
                    No tournaments match your search query.
                  </div>
                ) : (
                  filteredTournaments.map((t: any) => (
                    <div
                      key={t.id}
                      className="p-4 hover:bg-[#161b22]/70 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/admin/${t.id}/live`}
                            className="text-sm font-semibold text-[#58a6ff] hover:underline"
                          >
                            {t.nama}
                          </Link>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium border border-[#30363d] bg-[#21262d] text-[#8d96a0]">
                            {t.format === "lone_wolf_1v1" ? "1v1-by-one" : "battle-royale"}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border ${
                              t.status === "open"
                                ? "border-[#238636]/40 bg-[#238636]/15 text-[#3fb950]"
                                : "border-[#30363d] bg-[#21262d] text-[#8d96a0]"
                            }`}
                          >
                            {t.status}
                          </span>
                          {t.is_live && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#da3633] text-white animate-pulse">
                              LIVE
                            </span>
                          )}
                        </div>

                        {/* Metadata row */}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-[#8d96a0]">
                          <span className="font-mono text-[11px]">ID: {t.id}</span>
                          <span>&bull;</span>
                          <span className="font-mono text-[11px]">Slug: /t/{t.slug}</span>
                          <span>&bull;</span>
                          <span className="text-[11px]">
                            Created: {new Date(t.created_at).toLocaleDateString("id-ID")}
                          </span>
                        </div>
                      </div>

                      {/* Action Button Group (GitHub Style) */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Link
                          to={`/admin/${t.id}/live`}
                          className="px-2.5 py-1 rounded-md bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-xs font-medium text-[#c9d1d9] transition-colors flex items-center gap-1"
                        >
                          <Tv className="w-3.5 h-3.5 text-[#e3b341]" />
                          <span>Live Studio</span>
                        </Link>

                        <Link
                          to={`/admin/${t.id}/sponsor`}
                          className="px-2.5 py-1 rounded-md bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-xs font-medium text-[#c9d1d9] transition-colors flex items-center gap-1"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-[#bc8cff]" />
                          <span>Sponsors</span>
                        </Link>

                        <Link
                          to={`/admin/${t.id}/verifikasi`}
                          className="px-2.5 py-1 rounded-md bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-xs font-medium text-[#c9d1d9] transition-colors flex items-center gap-1"
                        >
                          <Users className="w-3.5 h-3.5 text-[#3fb950]" />
                          <span>Teams</span>
                        </Link>

                        <Link
                          to={`/admin/${t.id}/skor`}
                          className="px-2.5 py-1 rounded-md bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-xs font-medium text-[#c9d1d9] transition-colors flex items-center gap-1"
                        >
                          <Trophy className="w-3.5 h-3.5 text-[#f78166]" />
                          <span>Scores</span>
                        </Link>

                        <Link
                          to={`/t/${t.slug}`}
                          target="_blank"
                          className="px-2 py-1 rounded-md bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-xs font-medium text-[#8d96a0] hover:text-[#e6edf3] transition-colors"
                          title="Open public page in new tab"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Direct Overlays Stream Hub */}
            {selectedTournId && (
              <div className="bg-[#161b22] border border-[#30363d] rounded-md p-4 space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-[#30363d]">
                  <Layers className="w-4 h-4 text-[#bc8cff]" />
                  <span className="text-xs font-semibold text-[#e6edf3]">
                    OBS Overlays Endpoints (Selected Tournament)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <a
                    href={`/overlay/${selectedTournId}/ticker`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-3 rounded-md bg-[#0d1117] hover:bg-[#21262d] border border-[#30363d] block transition-colors group"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold text-[#58a6ff] group-hover:underline">
                      <span>Ticker HUD (Lower-Third)</span>
                      <ExternalLink className="w-3 h-3 text-[#8d96a0]" />
                    </div>
                    <p className="text-[11px] text-[#8d96a0] font-mono mt-1 truncate">
                      /overlay/{selectedTournId.slice(0, 8)}.../ticker
                    </p>
                  </a>

                  <a
                    href={`/overlay/${selectedTournId}/intermission`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-3 rounded-md bg-[#0d1117] hover:bg-[#21262d] border border-[#30363d] block transition-colors group"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold text-[#58a6ff] group-hover:underline">
                      <span>16:9 Commercial Intermission</span>
                      <ExternalLink className="w-3 h-3 text-[#8d96a0]" />
                    </div>
                    <p className="text-[11px] text-[#8d96a0] font-mono mt-1 truncate">
                      /overlay/{selectedTournId.slice(0, 8)}.../intermission
                    </p>
                  </a>

                  <a
                    href={`/overlay/${selectedTournId}/bracket`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-3 rounded-md bg-[#0d1117] hover:bg-[#21262d] border border-[#30363d] block transition-colors group"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold text-[#58a6ff] group-hover:underline">
                      <span>Elimination Bracket Overlay</span>
                      <ExternalLink className="w-3 h-3 text-[#8d96a0]" />
                    </div>
                    <p className="text-[11px] text-[#8d96a0] font-mono mt-1 truncate">
                      /overlay/{selectedTournId.slice(0, 8)}.../bracket
                    </p>
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: AI SCOREBOARD VISION SETTINGS */}
        {/* =================================================================== */}
        {activeTab === "ai_settings" && (
          <div className="bg-[#161b22] border border-[#30363d] rounded-md p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#30363d]">
              <div>
                <h2 className="text-base font-semibold text-[#e6edf3]">
                  AI Vision Scoreboard OCR Engine
                </h2>
                <p className="text-xs text-[#8d96a0] mt-0.5">
                  Configure Gemini or OpenAI-compatible visual models for automatic post-match scoreboard recognition.
                </p>
              </div>

              {hasStoredAiKey && (
                <span className="px-2.5 py-1 rounded-full text-xs font-mono font-medium border border-[#238636]/40 bg-[#238636]/15 text-[#3fb950] flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Key configured: {maskedAiKey}
                </span>
              )}
            </div>

            {/* Presets Grid */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#e6edf3]">Select Provider Preset</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {(Object.keys(data.aiPresets) as AIPreset[]).map((pKey) => {
                  const p = data.aiPresets[pKey];
                  const isSelected = aiPreset === pKey;
                  return (
                    <button
                      key={pKey}
                      type="button"
                      onClick={() => handleSelectPreset(pKey)}
                      className={`p-3 rounded-md text-left border transition-all flex flex-col justify-between gap-1.5 cursor-pointer ${
                        isSelected
                          ? "bg-[#0d1117] border-[#58a6ff] ring-1 ring-[#58a6ff]"
                          : "bg-[#0d1117] border-[#30363d] hover:border-[#8d96a0]"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-[#e6edf3]">{p.name}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[#58a6ff]" />}
                        </div>
                        <p className="text-[11px] text-[#8d96a0] mt-0.5 line-clamp-1">{p.description}</p>
                      </div>
                      <span className="text-[10px] font-mono text-[#8d96a0] truncate">{p.model}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Form Inputs */}
            <form onSubmit={handleSaveAi} className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#e6edf3]">Provider Protocol</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAiProvider("gemini")}
                      className={`py-1.5 px-3 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                        aiProvider === "gemini"
                          ? "bg-[#21262d] border-[#58a6ff] text-[#e6edf3]"
                          : "bg-[#0d1117] border-[#30363d] text-[#8d96a0]"
                      }`}
                    >
                      Google Gemini (Native)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAiProvider("openai_compatible")}
                      className={`py-1.5 px-3 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                        aiProvider === "openai_compatible"
                          ? "bg-[#21262d] border-[#58a6ff] text-[#e6edf3]"
                          : "bg-[#0d1117] border-[#30363d] text-[#8d96a0]"
                      }`}
                    >
                      OpenAI / Generic REST
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#e6edf3]">Model Identifier</label>
                  <input
                    type="text"
                    value={aiModel}
                    onChange={(e) => setAiModel(e.target.value)}
                    placeholder="gemini-2.0-flash"
                    className="w-full px-3 py-1.5 rounded-md bg-[#0d1117] border border-[#30363d] text-xs text-[#e6edf3] font-mono focus:border-[#58a6ff] focus:outline-none"
                  />
                </div>
              </div>

              {aiProvider === "openai_compatible" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#e6edf3]">Base URL Endpoint</label>
                  <input
                    type="text"
                    value={aiBaseUrl}
                    onChange={(e) => setAiBaseUrl(e.target.value)}
                    placeholder="https://api.groq.com/openai/v1"
                    className="w-full px-3 py-1.5 rounded-md bg-[#0d1117] border border-[#30363d] text-xs text-[#e6edf3] font-mono focus:border-[#58a6ff] focus:outline-none"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-semibold text-[#e6edf3]">API Key Secret</label>
                  {hasStoredAiKey && (
                    <span className="text-[11px] text-[#8d96a0]">
                      Leave empty to retain existing stored key
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showAiKey ? "text" : "password"}
                    value={aiApiKey}
                    onChange={(e) => setAiApiKey(e.target.value)}
                    placeholder={hasStoredAiKey ? "••••••••••••••••••••••••" : "Paste API key here..."}
                    className="w-full px-3 py-1.5 pr-10 rounded-md bg-[#0d1117] border border-[#30363d] text-xs text-[#e6edf3] font-mono focus:border-[#58a6ff] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAiKey(!showAiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8d96a0] hover:text-[#e6edf3]"
                  >
                    {showAiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-semibold text-[#e6edf3]">
                    Temperature: <span className="font-mono text-[#58a6ff]">{aiTemperature}</span>
                  </label>
                  <span className="text-[11px] text-[#8d96a0]">Recommended for OCR: 0.1</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={aiTemperature}
                  onChange={(e) => setAiTemperature(parseFloat(e.target.value))}
                  className="w-full accent-[#58a6ff] cursor-pointer"
                />
              </div>

              {aiTestResult && (
                <div
                  className={`p-3 rounded-md border text-xs flex items-start gap-2.5 ${
                    aiTestResult.ok
                      ? "bg-[#238636]/10 border-[#238636]/40 text-[#3fb950]"
                      : "bg-[#da3633]/10 border-[#da3633]/40 text-[#f85149]"
                  }`}
                >
                  {aiTestResult.ok ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-0.5">
                    <p className="font-semibold">
                      {aiTestResult.ok ? "Provider Connection Verified" : "Connection Failed"}
                    </p>
                    <p className="opacity-90">{aiTestResult.message}</p>
                    {aiTestResult.latencyMs && (
                      <p className="text-[11px] opacity-75 font-mono">
                        Roundtrip latency: {aiTestResult.latencyMs}ms
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#30363d]">
                <button
                  type="button"
                  onClick={handleTestAi}
                  disabled={isTestingAi}
                  className="px-3 py-1.5 rounded-md bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-xs font-semibold text-[#c9d1d9] transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isTestingAi ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 text-[#e3b341]" />}
                  <span>{isTestingAi ? "Testing..." : "Test Connection"}</span>
                </button>

                <button
                  type="submit"
                  disabled={isSavingAi}
                  className="px-4 py-1.5 rounded-md bg-[#238636] hover:bg-[#2ea043] border border-[rgba(240,246,252,0.1)] text-xs font-semibold text-white transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSavingAi ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Save AI Configuration</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 3: PAYMENT GATEWAY & PLATFORM FEES */}
        {/* =================================================================== */}
        {activeTab === "monetization" && (
          <div className="bg-[#161b22] border border-[#30363d] rounded-md p-6 space-y-6">
            <div className="pb-4 border-b border-[#30363d]">
              <h2 className="text-base font-semibold text-[#e6edf3]">
                Payment Gateway & Platform Fee Monetization
              </h2>
              <p className="text-xs text-[#8d96a0] mt-0.5">
                Manage Midtrans credentials, production toggle, platform fee cuts, and master escrow accounts.
              </p>
            </div>

            <fetcher.Form method="post" className="space-y-6">
              <input type="hidden" name="intent" value="save_payment_config" />
              <input type="hidden" name="is_production" value={payIsProd ? "true" : "false"} />
              <input type="hidden" name="platform_fee_type" value={payFeeType} />

              {/* Mode Toggle */}
              <div className="p-3.5 rounded-md bg-[#0d1117] border border-[#30363d] flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-[#e6edf3]">Environment Mode</p>
                  <p className="text-[11px] text-[#8d96a0]">
                    {payIsProd
                      ? "PRODUCTION: Active live transactions with real financial settlement."
                      : "SANDBOX: Simulated dummy payments for developer testing."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPayIsProd(!payIsProd)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer border ${
                    payIsProd
                      ? "bg-[#da3633]/20 border-[#da3633]/40 text-[#f85149]"
                      : "bg-[#238636]/20 border-[#238636]/40 text-[#3fb950]"
                  }`}
                >
                  {payIsProd ? "Mode: Production" : "Mode: Sandbox"}
                </button>
              </div>

              {/* Keys */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#e6edf3]">Midtrans Client Key</label>
                  <input
                    type="text"
                    name="client_key"
                    value={payClientKey}
                    onChange={(e) => setPayClientKey(e.target.value)}
                    placeholder="Mid-client-xxxx"
                    className="w-full px-3 py-1.5 rounded-md bg-[#0d1117] border border-[#30363d] text-xs text-[#e6edf3] font-mono focus:border-[#58a6ff] focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-semibold text-[#e6edf3]">Midtrans Server Key</label>
                    {data.paymentConfig?.has_server_key && (
                      <span className="text-[11px] text-[#8d96a0] font-mono">
                        Stored: {data.paymentConfig.masked_server_key}
                      </span>
                    )}
                  </div>
                  <input
                    type="password"
                    name="server_key"
                    value={payServerKey}
                    onChange={(e) => setPayServerKey(e.target.value)}
                    placeholder={data.paymentConfig?.has_server_key ? "••••••••••••••••" : "Mid-server-xxxx"}
                    className="w-full px-3 py-1.5 rounded-md bg-[#0d1117] border border-[#30363d] text-xs text-[#e6edf3] font-mono focus:border-[#58a6ff] focus:outline-none"
                  />
                </div>
              </div>

              {/* Platform Fee Cut (Revenue) */}
              <div className="p-4 rounded-md bg-[#0d1117] border border-[#30363d] space-y-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-[#3fb950]" />
                  <span className="text-xs font-semibold text-[#e6edf3]">
                    Platform Service Fee Rate (Owner Commission)
                  </span>
                </div>
                <p className="text-[11px] text-[#8d96a0]">
                  Automatic deduction retained by the platform on each paid tournament registration.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#e6edf3]">Fee Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPayFeeType("fixed")}
                        className={`py-1 px-3 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                          payFeeType === "fixed"
                            ? "bg-[#21262d] border-[#58a6ff] text-[#e6edf3]"
                            : "bg-[#0d1117] border-[#30363d] text-[#8d96a0]"
                        }`}
                      >
                        Fixed (IDR)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPayFeeType("percent")}
                        className={`py-1 px-3 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                          payFeeType === "percent"
                            ? "bg-[#21262d] border-[#58a6ff] text-[#e6edf3]"
                            : "bg-[#0d1117] border-[#30363d] text-[#8d96a0]"
                        }`}
                      >
                        Percentage (%)
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#e6edf3]">
                      Amount {payFeeType === "fixed" ? "(Rupiah)" : "(%)"}
                    </label>
                    <input
                      type="number"
                      name="platform_fee_amount"
                      value={payFeeAmount}
                      onChange={(e) => setPayFeeAmount(parseFloat(e.target.value))}
                      placeholder="2500"
                      className="w-full px-3 py-1.5 rounded-md bg-[#0d1117] border border-[#30363d] text-xs text-[#e6edf3] font-mono focus:border-[#58a6ff] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Master Escrow Account Details */}
              <div className="space-y-3">
                <span className="text-xs font-semibold text-[#e6edf3] flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-[#8d96a0]" />
                  Master Platform Escrow Account
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-[#8d96a0]">Bank / Channel</label>
                    <input
                      type="text"
                      name="master_bank_name"
                      value={payBankName}
                      onChange={(e) => setPayBankName(e.target.value)}
                      placeholder="BCA"
                      className="w-full px-3 py-1.5 rounded-md bg-[#0d1117] border border-[#30363d] text-xs text-[#e6edf3] font-mono focus:border-[#58a6ff] focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-[#8d96a0]">Account Number</label>
                    <input
                      type="text"
                      name="master_account_number"
                      value={payAccNumber}
                      onChange={(e) => setPayAccNumber(e.target.value)}
                      placeholder="0123456789"
                      className="w-full px-3 py-1.5 rounded-md bg-[#0d1117] border border-[#30363d] text-xs text-[#e6edf3] font-mono focus:border-[#58a6ff] focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-[#8d96a0]">Account Holder</label>
                    <input
                      type="text"
                      name="master_account_name"
                      value={payAccName}
                      onChange={(e) => setPayAccName(e.target.value)}
                      placeholder="Arena Tempur Official"
                      className="w-full px-3 py-1.5 rounded-md bg-[#0d1117] border border-[#30363d] text-xs text-[#e6edf3] font-mono focus:border-[#58a6ff] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#30363d]">
                <button
                  type="submit"
                  disabled={fetcher.state !== "idle"}
                  className="px-4 py-1.5 rounded-md bg-[#238636] hover:bg-[#2ea043] border border-[rgba(240,246,252,0.1)] text-xs font-semibold text-white transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Payment Settings</span>
                </button>
              </div>
            </fetcher.Form>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 4: DEFAULT CLOUD VPS STREAMING */}
        {/* =================================================================== */}
        {activeTab === "vps_defaults" && (
          <div className="bg-[#161b22] border border-[#30363d] rounded-md p-6 space-y-6">
            <div className="pb-4 border-b border-[#30363d]">
              <h2 className="text-base font-semibold text-[#e6edf3]">
                Default Cloud VPS Streaming Configuration
              </h2>
              <p className="text-xs text-[#8d96a0] mt-0.5">
                Centralized RTMP Ingest endpoint propagated as the global baseline for all tournament streams.
              </p>
            </div>

            <fetcher.Form method="post" className="space-y-4">
              <input type="hidden" name="intent" value="save_vps_default" />

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#e6edf3]">Default RTMP Ingest Server URL</label>
                <input
                  type="text"
                  name="default_rtmp_url"
                  value={vpsRtmp}
                  onChange={(e) => setVpsRtmp(e.target.value)}
                  placeholder="rtmp://vps.arenatempur.com:1935/live"
                  className="w-full px-3 py-1.5 rounded-md bg-[#0d1117] border border-[#30363d] text-xs text-[#e6edf3] font-mono focus:border-[#58a6ff] focus:outline-none"
                />
                <p className="text-[11px] text-[#8d96a0]">
                  Target destination URL entered into Larix Broadcaster on the referee spectator phone.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#e6edf3]">Default HLS Playback URL</label>
                  <input
                    type="text"
                    name="default_hls_url"
                    value={vpsHls}
                    onChange={(e) => setVpsHls(e.target.value)}
                    placeholder="http://vps.arenatempur.com:8888/live"
                    className="w-full px-3 py-1.5 rounded-md bg-[#0d1117] border border-[#30363d] text-xs text-[#e6edf3] font-mono focus:border-[#58a6ff] focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#e6edf3]">OBS Web GUI HTTPS Port</label>
                  <input
                    type="number"
                    name="obs_web_port"
                    value={vpsPort}
                    onChange={(e) => setVpsPort(parseInt(e.target.value))}
                    placeholder="8080"
                    className="w-full px-3 py-1.5 rounded-md bg-[#0d1117] border border-[#30363d] text-xs text-[#e6edf3] font-mono focus:border-[#58a6ff] focus:outline-none"
                  />
                </div>
              </div>

              {/* Shell Script Deploy Snippet */}
              <div className="p-3.5 rounded-md bg-[#0d1117] border border-[#30363d] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#e6edf3] flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-[#8d96a0]" />
                    Ubuntu VPS Automated 1-Line Bootstrap:
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(
                        "curl -fsSL https://raw.githubusercontent.com/arenatempur/deploy/main/setup.sh | bash",
                        "VPS Command"
                      )
                    }
                    className="text-[#58a6ff] hover:underline flex items-center gap-1 text-[11px] cursor-pointer"
                  >
                    {copiedText === "VPS Command" ? <Check className="w-3 h-3 text-[#3fb950]" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedText === "VPS Command" ? "Copied" : "Copy command"}</span>
                  </button>
                </div>
                <pre className="p-2.5 rounded bg-[#161b22] border border-[#30363d] text-[11px] text-[#79c0ff] font-mono overflow-x-auto">
                  curl -fsSL https://raw.githubusercontent.com/arenatempur/deploy/main/setup.sh | bash
                </pre>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#30363d]">
                <button
                  type="submit"
                  disabled={fetcher.state !== "idle"}
                  className="px-4 py-1.5 rounded-md bg-[#238636] hover:bg-[#2ea043] border border-[rgba(240,246,252,0.1)] text-xs font-semibold text-white transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save VPS Defaults</span>
                </button>
              </div>
            </fetcher.Form>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 5: HEALTH RADAR & MAINTENANCE CLEANER */}
        {/* =================================================================== */}
        {activeTab === "diagnostics" && (
          <div className="space-y-6">
            <div className="bg-[#161b22] border border-[#30363d] rounded-md p-6 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-[#30363d]">
                <div>
                  <h2 className="text-base font-semibold text-[#e6edf3]">
                    Infrastructure Health & Sandbox Cleaner
                  </h2>
                  <p className="text-xs text-[#8d96a0] mt-0.5">
                    Live system latency checks and automated testing data purge tools.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="px-3 py-1.5 rounded-md bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-xs font-semibold text-[#c9d1d9] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh Health</span>
                </button>
              </div>

              {/* Status Grid Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-md bg-[#0d1117] border border-[#30363d] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#e6edf3] flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-[#3fb950]" />
                      PostgreSQL Database (Supabase)
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono border border-[#238636]/40 bg-[#238636]/15 text-[#3fb950]">
                      operational
                    </span>
                  </div>
                  <p className="text-[11px] text-[#8d96a0] font-mono">
                    Ping latency: <strong className="text-[#3fb950]">{data.diagnostics?.database.latencyMs}ms</strong>
                  </p>
                </div>

                <div className="p-3.5 rounded-md bg-[#0d1117] border border-[#30363d] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#e6edf3] flex items-center gap-1.5">
                      <Server className="w-3.5 h-3.5 text-[#58a6ff]" />
                      Supabase Storage Buckets
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono border border-[#238636]/40 bg-[#238636]/15 text-[#3fb950]">
                      ready
                    </span>
                  </div>
                  <p className="text-[11px] text-[#8d96a0] font-mono truncate">
                    {data.diagnostics?.storage.message}
                  </p>
                </div>

                <div className="p-3.5 rounded-md bg-[#0d1117] border border-[#30363d] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#e6edf3] flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-[#e3b341]" />
                      AI Scoreboard Engine
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                        data.diagnostics?.aiEngine.hasKey
                          ? "border-[#238636]/40 bg-[#238636]/15 text-[#3fb950]"
                          : "border-[#d29922]/40 bg-[#d29922]/15 text-[#e3b341]"
                      }`}
                    >
                      {data.diagnostics?.aiEngine.hasKey ? "ready" : "unconfigured"}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#8d96a0] font-mono">
                    Model: {data.diagnostics?.aiEngine.model}
                  </p>
                </div>

                <div className="p-3.5 rounded-md bg-[#0d1117] border border-[#30363d] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#e6edf3] flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-[#bc8cff]" />
                      Midtrans Gateway Integration
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono border border-[#30363d] bg-[#21262d] text-[#8d96a0]">
                      {data.diagnostics?.midtrans.mode}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#8d96a0] font-mono">
                    {data.diagnostics?.midtrans.ok ? "Keys loaded" : "Pending setup"}
                  </p>
                </div>
              </div>

              {/* Sandbox Data Cleaner */}
              <div className="p-4 rounded-md border border-[#da3633]/40 bg-[#da3633]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#f85149]">
                    <Trash2 className="w-4 h-4" />
                    <span>Danger Zone: Purge Sandbox Testing Data</span>
                  </div>
                  <p className="text-[11px] text-[#8d96a0]">
                    Deletes all automated test tournaments (slugs with <code>test-byone-</code>) and dummy test teams to keep the production database clean.
                  </p>
                </div>

                <fetcher.Form method="post">
                  <input type="hidden" name="intent" value="clean_sandbox" />
                  <button
                    type="submit"
                    disabled={fetcher.state !== "idle"}
                    className="px-3.5 py-1.5 rounded-md bg-[#da3633] hover:bg-[#b62324] text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Purge test data</span>
                  </button>
                </fetcher.Form>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 4. GITHUB FOOTER */}
      <footer className="w-full border-t border-[#30363d] mt-auto py-6 px-6 text-xs text-[#8d96a0]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img
              src="/images/logo-monogram.svg"
              alt="Arena Tempur"
              className="w-4 h-4 object-contain opacity-80"
            />
            <span>&copy; 2026 Arena Tempur &bull; Developer Console</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span className="text-[#3fb950] font-mono flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#3fb950]" />
              All systems operational
            </span>
            <span>&bull;</span>
            <Link to="/" className="text-[#58a6ff] hover:underline">
              Arena Tempur Public Web
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
