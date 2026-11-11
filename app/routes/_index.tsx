import { useLoaderData, Link } from "react-router";
import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import Image from "next/image";
import {
  Trophy,
  Shield,
  KeyRound,
  CheckCircle2,
  Users,
  Flame,
  ArrowRight,
  Copy,
  Crosshair,
  ExternalLink,
  Tv,
  Calendar,
  Wallet,
  Coins,
  Crown,
  Smartphone,
  Building2,
  Award,
  Sparkles,
  Zap,
} from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { createWebClient } from "@/lib/supabase/web";
import EsportsHeader from "@/components/EsportsHeader";
import TacticalMetricsBar from "@/components/TacticalMetricsBar";
import ApexHeroSection from "@/components/ApexHeroSection";
import PodiumSection from "@/components/PodiumSection";

export const meta: MetaFunction = () => {
  return [
    { title: "Arena Tempur — Platform Turnamen Komunitas Esports" },
    {
      name: "description",
      content: "Platform manajemen dan administrasi turnamen komunitas Battle Royale terpercaya & independen dengan Room ID T-15, anti-smurf UID, dan hadiah otomatis ke dompet.",
    },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const { client: supabase } = createWebClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any;

  // Turnamen publik aktif dan selesai — data asli dari Supabase
  const { data: tournaments } = await db
    .from("tournaments")
    .select("id, nama, slug, status, entry_fee, max_teams, prize_pool, prize_distribution, tgl_mulai, tgl_selesai")
    .eq("is_public", true)
    .in("status", ["open", "running", "done"])
    .order("tgl_mulai", { ascending: false })
    .limit(6);

  const activeTournaments = tournaments ?? [];

  // Jumlah tim terverifikasi per turnamen untuk ditampilkan di kartu
  const approvedCounts = await Promise.all(
    activeTournaments.map(async (t: any) => {
      const { count } = await db
        .from("teams")
        .select("*", { count: "exact", head: true })
        .eq("tournament_id", t.id)
        .eq("verification_status", "approved");
      return { id: t.id, count: count ?? 0 };
    })
  );

  // Ambil saldo dompet user jika sudah login
  let walletBalance: number | null = null;
  if (user) {
    const { data: w } = await db
      .from("wallets")
      .select("balance")
      .eq("user_id", user.id)
      .single();
    if (w) walletBalance = Number(w.balance || 0);
  }

  // Cari turnamen yang sudah memiliki standings aktif untuk spotlight Hall of Fame
  let spotlightStandings: any[] = [];
  let spotlightTournament: any = null;

  for (const t of activeTournaments) {
    const { data: std } = await db
      .from("standings")
      .select("*")
      .eq("tournament_id", t.id)
      .order("rank", { ascending: true })
      .limit(3);

    if (std && std.length > 0 && Number(std[0].matches_played || 0) > 0) {
      spotlightStandings = std.map((s: any) => ({
        team_id: s.team_id,
        tournament_id: s.tournament_id,
        team_nama: s.team_nama,
        logo_url: s.logo_url,
        matches_played: Number(s.matches_played || 0),
        total_kills: Number(s.total_kills || 0),
        total_points: Number(s.total_points || 0),
        best_placement: s.best_placement ? Number(s.best_placement) : null,
        rank: Number(s.rank || 0),
      }));
      spotlightTournament = t;
      break;
    }
  }

  return {
    user,
    walletBalance,
    activeTournaments,
    approvedCounts,
    spotlightTournament,
    spotlightStandings,
  };
}

export default function HomeRoute() {
  const {
    user,
    walletBalance,
    activeTournaments,
    approvedCounts,
    spotlightTournament,
    spotlightStandings,
  } = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between selection:bg-[#DA292A] selection:text-white relative bg-tactical-lines">
      {/* Ambient glow berlapis */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none transform-gpu">
        <div className="absolute -top-40 left-1/4 w-[700px] h-[500px] bg-amber-500/5 blur-[160px] rounded-full will-change-transform" />
        <div className="absolute top-1/3 -right-32 w-[520px] h-[520px] bg-orange-600/5 blur-[150px] rounded-full will-change-transform" />
      </div>

      {/* Ambient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/40 via-zinc-950/75 to-zinc-950 pointer-events-none" />

      {/* Esports Header (Fixed di atas) */}
      <EsportsHeader user={user} />

      {/* Spacer tinggi header */}
      <div className="h-16 sm:h-20 w-full shrink-0 pointer-events-none" />

      {/* Cinematic Hero Section */}
      <ApexHeroSection user={user} />

      {/* Tactical Metric Ribbon */}
      <TacticalMetricsBar />

      {/* Main Content Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 z-10 w-full space-y-12 sm:space-y-16">

        {/* SPOTLIGHT SECTION: HALL OF FAME TOP 3 PODIUM JIKA ADA PERTANDINGAN SELESAI */}
        {spotlightStandings.length > 0 && spotlightTournament && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-zinc-800/80 pb-3">
              <div>
                <span className="text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5" />
                  // SPOTLIGHT JUARA TURNAMEN LIVE
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white font-headline mt-0.5">
                  {spotlightTournament.nama}
                </h2>
              </div>
              <Link
                to={`/t/${spotlightTournament.slug}/klasemen`}
                className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-bold"
              >
                <span>Lihat Klasemen Lengkap & Roster</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <PodiumSection
              standings={spotlightStandings}
              prizePool={Number(spotlightTournament.prize_pool || 0)}
              prizeDistribution={spotlightTournament.prize_distribution as Record<string, number> | undefined}
            />
          </div>
        )}

        {/* SECTION: TACTICAL BENTO GRID — FITUR UTAMA PLATFORM */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <span className="text-[10px] sm:text-[11px] font-semibold tracking-wide text-amber-500 uppercase font-mono">
                // ARSITEKTUR & INTEGRITAS
              </span>
              <h2 className="text-2xl sm:text-3xl text-white font-bold font-headline mt-1">
                Semua Berjalan Otomatis & Terverifikasi
              </h2>
            </div>
            <span className="text-xs text-zinc-500 font-mono">
              Standar Regulasi Esports Battle Royale
            </span>
          </div>

          {/* Bento Grid Layout (Mobile: 1 Col, Tablet: 2 Cols, Desktop: 12 Cols) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 sm:gap-5">
            
            {/* BENTO CARD 1: SECURE ROOM GATE WITH BACKGROUND IMAGE (Col 8 Desktop, Col 2 Tablet) */}
            <div className="card-esports md:col-span-2 lg:col-span-8 p-5 sm:p-7 rounded-2xl relative overflow-hidden flex flex-col justify-between space-y-6 group bg-carbon-mesh">
              <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                <Image
                  src="/images/ff-tournament-esports.jpg"
                  alt=""
                  fill
                  sizes="(max-width: 1024px) 100vw, 60vw"
                  className="object-cover opacity-20 group-hover:opacity-30 group-hover:scale-105 transition-all duration-700 filter brightness-90"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/90 to-zinc-950/70" />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-zinc-950/60" />
              </div>

              <div className="relative z-10 flex flex-col justify-between space-y-5">

                <div>
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-semibold uppercase mb-3 backdrop-blur-sm font-mono">
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>MODUL T-01 // ROOM ID TIMELOCK</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl text-white font-bold font-headline">
                    Room ID Dibagikan Otomatis T-15 Menit
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-400 mt-2 max-w-xl leading-relaxed">
                    ID &amp; Password room tersimpan terenkripsi di server dan baru terbuka otomatis di layar kapten tim peserta tepat 15 menit sebelum match dimulai. Tombol salin mengirimkan tanda terima (*read receipt*) seketika ke wasit.
                  </p>
                </div>

                {/* Simulated Interactive Tactical HUD */}
                <div className="bg-zinc-950/90 backdrop-blur-md p-4 sm:p-5 rounded-xl border border-zinc-800 space-y-3.5 shadow-xl">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-2.5 text-xs">
                    <span className="text-zinc-400 flex items-center gap-2 font-mono text-[11px]">
                      <Crosshair className="w-4 h-4 text-amber-500" />
                      MATCH #01 • MAP BERMUDA • SLOT #04
                    </span>
                    <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-mono text-[10px] font-bold">
                      DEMO SIMULASI FITUR
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-zinc-900/90 border border-zinc-800 flex items-center justify-between group-hover:border-amber-500/30 transition-colors">
                      <div>
                        <p className="text-[10px] font-mono font-semibold text-zinc-500 uppercase tracking-wider">ROOM ID</p>
                        <p className="text-base sm:text-lg font-mono font-bold text-white tracking-wider">7728 1904</p>
                      </div>
                      <div className="p-2 rounded bg-zinc-800 text-zinc-300">
                        <Copy className="w-4 h-4" />
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-zinc-900/90 border border-zinc-800 flex items-center justify-between group-hover:border-amber-500/30 transition-colors">
                      <div>
                        <p className="text-[10px] font-mono font-semibold text-zinc-500 uppercase tracking-wider">PASSWORD</p>
                        <p className="text-base sm:text-lg font-mono font-bold text-amber-400 tracking-wider">BOOYAH88</p>
                      </div>
                      <div className="p-2 rounded bg-zinc-800 text-zinc-300">
                        <Copy className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-[10px] sm:text-[11px] font-mono text-zinc-500 pt-1">
                    <span className="flex items-center gap-1 text-emerald-400">
                      <CheckCircle2 className="w-3 h-3" /> Tanda terima wasit: Kapten telah menyalin data room
                    </span>
                    <span className="text-zinc-400">Auto-push notification T-15</span>
                  </div>
                </div>
              </div>
            </div>

            {/* BENTO CARD 2: REALTIME LEADERBOARD POINT CALCULATION (Col 4 Desktop, Col 1 Tablet) */}
            <div className="card-esports md:col-span-1 lg:col-span-4 p-5 sm:p-7 rounded-2xl relative overflow-hidden flex flex-col justify-between space-y-4 group bg-carbon-mesh">

              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-semibold uppercase mb-3 font-mono">
                  <Trophy className="w-3.5 h-3.5" />
                  <span>KLASEMEN REAL-TIME</span>
                </div>
                <h3 className="text-lg text-white font-bold font-headline">
                  Perhitungan Poin Otomatis
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Kalkulasi otomatis poin placement + eliminasi kill sesuai matriks resmi Garena.
                </p>
              </div>

              {/* Leaderboard Mini Demo */}
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 badge-polygon bg-gradient-to-tr from-amber-500 to-amber-300 text-zinc-950 font-black text-[11px] flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0 font-mono">
                      01
                    </div>
                    <div>
                      <p className="font-bold text-white leading-tight">JUARA 1</p>
                      <p className="text-[10px] text-zinc-400 font-mono">2 Booyah &bull; 26 Kills</p>
                    </div>
                  </div>
                  <span className="font-mono font-black text-amber-400 text-sm">62 PTS</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 badge-polygon bg-gradient-to-tr from-zinc-300 to-zinc-100 text-zinc-950 font-bold text-[11px] flex items-center justify-center shrink-0 font-mono">
                      02
                    </div>
                    <div>
                      <p className="font-bold text-zinc-200 leading-tight">RUNNER UP</p>
                      <p className="text-[10px] text-zinc-500 font-mono">1 Booyah &bull; 20 Kills</p>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-zinc-300 text-sm">49 PTS</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 badge-polygon bg-gradient-to-tr from-orange-500 to-amber-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 font-mono">
                      03
                    </div>
                    <div>
                      <p className="font-bold text-zinc-200 leading-tight">3RD PLACE</p>
                      <p className="text-[10px] text-zinc-500 font-mono">1 Booyah &bull; 17 Kills</p>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-zinc-300 text-sm">43 PTS</span>
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-800/80 text-[10px] sm:text-[11px] font-mono text-zinc-500 flex flex-wrap items-center justify-between gap-1">
                <span>Placement: 12-9-8-7-6...</span>
                <span className="text-amber-500 font-bold">+1 Poin per Kill</span>
              </div>
            </div>

            {/* BENTO CARD 3: PRIZE POOL & AUTOMATIC WALLET SYSTEM (Col 8 Desktop, Col 2 Tablet) — FITUR PRIORITAS 2 */}
            <div className="card-esports md:col-span-2 lg:col-span-8 p-5 sm:p-7 rounded-2xl relative overflow-hidden flex flex-col justify-between space-y-6 group bg-gradient-to-br from-amber-950/20 via-zinc-950 to-zinc-950 border border-amber-500/30">

              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-semibold uppercase font-mono">
                  <Coins className="w-3.5 h-3.5 text-amber-400" />
                  <span>TRANSPARANSI HADIAH TUNAI</span>
                </div>
                <h3 className="text-xl sm:text-2xl text-white font-bold font-headline">
                  Hadiah Juara Otomatis Masuk ke Dompet Kapten
                </h3>
                <p className="text-xs sm:text-sm text-zinc-400 max-w-xl leading-relaxed">
                  Bebas drama hadiah tertahan. Saat panitia mengesahkan hasil akhir turnamen, sistem secara atomik membagi saldo hadiah langsung ke dompet digital kapten pemenang, siap ditarik ke rekening bank atau e-wallet kapan saja.
                </p>
              </div>

              {/* Interactive Wallet Simulation Showcase */}
              <div className="bg-zinc-950/90 border border-zinc-800 rounded-xl p-4 sm:p-5 space-y-3 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-zinc-800/80 pb-2 text-xs">
                  <span className="text-zinc-300 font-semibold flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    Simulasi Pembagian Prize Pool Rp 2.000.000
                  </span>
                  <span className="text-emerald-400 font-mono text-[11px] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
                    ✓ Otomatis Dikreditkan
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="p-3 rounded-lg bg-zinc-900 border border-amber-500/30 text-xs space-y-1">
                    <span className="text-[10px] font-bold text-amber-400 uppercase">Juara 1 (50%)</span>
                    <p className="font-mono text-base font-black text-white">Rp 1.000.000</p>
                    <p className="text-[10px] text-emerald-400">Masuk Dompet Kapten #1</p>
                  </div>

                  <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-xs space-y-1">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase">Juara 2 (30%)</span>
                    <p className="font-mono text-base font-black text-white">Rp 600.000</p>
                    <p className="text-[10px] text-emerald-400">Masuk Dompet Kapten #2</p>
                  </div>

                  <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-xs space-y-1">
                    <span className="text-[10px] font-bold text-amber-700 uppercase">Juara 3 (20%)</span>
                    <p className="font-mono text-base font-black text-white">Rp 400.000</p>
                    <p className="text-[10px] text-emerald-400">Masuk Dompet Kapten #3</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] font-mono text-zinc-400">
                  <span className="flex items-center gap-2">
                    <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                    Dukung Penarikan: DANA, GoPay, OVO, ShopeePay &amp; Rekening Bank
                  </span>
                  <Link
                    to="/dompet"
                    className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1"
                  >
                    <span>Buka Dompet</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>

            {/* BENTO CARD 4: GAMIFICATION BADGES & TEAM CAREER PROFILE (Col 4 Desktop, Col 1 Tablet) — FITUR PRIORITAS 3 */}
            <div className="card-esports md:col-span-1 lg:col-span-4 p-5 sm:p-7 rounded-2xl relative overflow-hidden flex flex-col justify-between space-y-4 group bg-carbon-mesh">

              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[11px] font-semibold uppercase mb-3 font-mono">
                  <Award className="w-3.5 h-3.5" />
                  <span>GAMIFIKASI TIM</span>
                </div>
                <h3 className="text-lg text-white font-bold font-headline">
                  Profil Karir &amp; Lencana Prestasi
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Rekor tempur skuad tercatat abadi. Raih badge prestisius di setiap turnamen yang diikuti.
                </p>
              </div>

              {/* Badges Mini Showcase */}
              <div className="space-y-2">
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs flex items-center gap-2 text-amber-300 font-semibold">
                  <span className="text-base">👑</span>
                  <div>
                    <p className="leading-tight font-bold">Booyah King</p>
                    <p className="text-[10px] text-zinc-400 font-normal">Peraih Booyah terbanyak turnamen</p>
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/30 text-xs flex items-center gap-2 text-red-300 font-semibold">
                  <span className="text-base">💀</span>
                  <div>
                    <p className="leading-tight font-bold">Apex Predator</p>
                    <p className="text-[10px] text-zinc-400 font-normal">Tim pembantai dengan total kill tertinggi</p>
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs flex items-center gap-2 text-blue-300 font-semibold">
                  <span className="text-base">🛡️</span>
                  <div>
                    <p className="leading-tight font-bold">Iron Fortress</p>
                    <p className="text-[10px] text-zinc-400 font-normal">Konsisten posisi 3 besar di setiap ronde</p>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-800/80 text-[10px] sm:text-[11px] font-mono text-zinc-500">
                &bull; Klik baris tim di klasemen publik untuk membuka modal roster lengkap
              </div>
            </div>

            {/* BENTO CARD 5: ROSTER & GAME UID VALIDATION (Col 6 Desktop, Col 1 Tablet) */}
            <div className="card-esports md:col-span-1 lg:col-span-6 p-5 sm:p-7 rounded-2xl relative overflow-hidden flex flex-col justify-between space-y-4 group">

              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-semibold uppercase mb-3 font-mono">
                  <Users className="w-3.5 h-3.5" />
                  <span>VALIDASI ROSTER</span>
                </div>
                <h3 className="text-lg sm:text-xl text-white font-bold font-headline">
                  Validasi Game UID &amp; Anti-Smurf
                </h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Setiap pemain diverifikasi menggunakan Game Player UID. Sistem secara otomatis mendeteksi dan menolak pendaftaran UID ganda dalam turnamen yang sama.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs font-mono">
                <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-1">
                  <span className="text-[10px] text-amber-400 font-bold uppercase">KAPTEN TIM</span>
                  <p className="text-white font-bold truncate">PLAYER_ONE</p>
                  <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> UID Terverifikasi
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-1">
                  <span className="text-[10px] text-zinc-400 font-bold uppercase">RUSHER</span>
                  <p className="text-white font-bold truncate">PLAYER_TWO</p>
                  <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> UID Terverifikasi
                  </p>
                </div>
              </div>

              <p className="text-[10px] sm:text-[11px] text-zinc-500 font-mono">
                &bull; Maksimal 4–5 pemain per skuad terdaftar resmi
              </p>
            </div>

            {/* BENTO CARD 6: DUAL-APPROVAL SCORE VERIFICATION (Col 6 Desktop, Col 1 Tablet) */}
            <div className="card-esports md:col-span-1 lg:col-span-6 p-5 sm:p-7 rounded-2xl relative overflow-hidden flex flex-col justify-between space-y-4 group">

              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-semibold uppercase mb-3 font-mono">
                  <Shield className="w-3.5 h-3.5" />
                  <span>ANTI-MANIPULASI SKOR</span>
                </div>
                <h3 className="text-lg sm:text-xl text-white font-bold font-headline">
                  Verifikasi Skor Dua Pihak (Dual Approval)
                </h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Wasit match mengunggah screenshot scoreboard dan menginput angka kill/placement. Admin verifikator terpisah wajib mengaudit kesesuaian gambar sebelum skor sah dipublish.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-1">
                  <span className="font-mono text-amber-400 font-bold text-xs">01</span>
                  <p className="text-[11px] text-zinc-300 font-semibold">Input Wasit</p>
                </div>

                <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-1">
                  <span className="font-mono text-blue-400 font-bold text-xs">02</span>
                  <p className="text-[11px] text-zinc-300 font-semibold">Audit Bukti</p>
                </div>

                <div className="p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-1">
                  <span className="font-mono text-emerald-400 font-bold text-xs">03</span>
                  <p className="text-[11px] text-emerald-300 font-semibold">Publish Sah</p>
                </div>
              </div>

              <p className="text-[10px] sm:text-[11px] text-zinc-500 font-mono">
                &bull; Jejak audit permanen mencatat identitas panitia penginput &amp; verifikator
              </p>
            </div>

          </div>
        </div>

        {/* SECTION: TURNAMEN SEDANG BERLANGSUNG — DATA REAL DARI DATABASE */}
        {activeTournaments.length > 0 && (
          <div id="tournaments" className="space-y-6 scroll-mt-24">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <span className="text-[10px] sm:text-[11px] font-semibold tracking-wide text-amber-500 uppercase font-mono">
                  // REALTIME_FEED
                </span>
                <h2 className="text-2xl sm:text-3xl text-white font-bold font-headline mt-1">
                  Turnamen Sedang Berlangsung
                </h2>
              </div>
              <span className="text-xs font-mono text-zinc-500">
                LIVE DARI DATABASE SUPABASE
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {activeTournaments.map((t: any, i: number) => {
                const teamCount = approvedCounts.find((a) => a.id === t.id)?.count ?? 0;
                const tglMulai = new Date(t.tgl_mulai).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                });
                const isRunning = t.status === "running";
                const isDone = t.status === "done";
                const prizePoolNum = Number(t.prize_pool || 0);

                return (
                  <Link
                    key={t.id}
                    to={`/t/${t.slug}`}
                    className="card-esports group p-5 sm:p-6 rounded-2xl flex flex-col justify-between space-y-4 sm:space-y-5 transition-all hover:border-amber-500/40"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] sm:text-[11px] font-semibold border ${
                          isDone
                            ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                            : isRunning
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isDone ? "bg-blue-400" : isRunning ? "bg-emerald-400" : "bg-amber-400"}`} />
                        {isDone ? "Selesai" : isRunning ? "Sedang Berlangsung" : "Pendaftaran Dibuka"}
                      </span>
                      <span className="text-[11px] font-mono text-zinc-500">
                        #{String(i + 1).padStart(2, "0")}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <h3 className="text-base sm:text-lg text-white font-bold leading-snug group-hover:text-amber-400 transition-colors">
                        {t.nama}
                      </h3>
                      <p className="text-[10px] sm:text-[11px] text-zinc-500 uppercase tracking-wide font-semibold truncate font-mono">
                        /{t.slug}
                      </p>
                    </div>

                    {/* Prize Pool Badge if Available */}
                    {prizePoolNum > 0 && (
                      <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs">
                        <span className="text-zinc-400 flex items-center gap-1 text-[11px]">
                          <Trophy className="w-3.5 h-3.5 text-amber-400" /> Total Hadiah:
                        </span>
                        <span className="font-mono font-black text-amber-300">
                          Rp {prizePoolNum.toLocaleString("id-ID")}
                        </span>
                      </div>
                    )}

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400 flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                          {tglMulai}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400 flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 text-zinc-500" />
                          {teamCount} / {t.max_teams} tim
                        </span>
                        <span className="font-mono text-emerald-400 font-bold">
                          {t.entry_fee === 0 ? "Gratis" : `Rp ${t.entry_fee.toLocaleString("id-ID")}`}
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                      <span className="text-amber-400 font-semibold flex items-center gap-1.5">
                        Lihat Turnamen
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                      <span className="text-[10px] sm:text-[11px] text-zinc-500">Klasemen &amp; Roster</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Tactical Call To Action Box (Smart Auth State) */}
        <div className="card-esports group p-6 sm:p-10 md:p-12 rounded-3xl relative overflow-hidden text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl">
          <div className="space-y-2 max-w-xl z-10">
            <span className="text-xs font-semibold text-amber-400 uppercase font-mono">
              // PINTU MASUK TURNAMEN
            </span>
            <h3 className="text-2xl sm:text-3xl text-white font-bold font-headline">
              {user ? "Siap Melanjutkan Perjuangan Skuad Anda?" : "Siap Menjalankan Turnamen dengan Standar Pro?"}
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              {user
                ? "Pantau status jadwal match, cek read receipt wasit, atau cairkan saldo hadiah di dompet."
                : "Daftarkan tim atau buat turnamen resmi Anda dalam hitungan menit tanpa drama skor dan kecurangan."}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto shrink-0 z-10">
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className="px-6 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/20 text-center transition-all cursor-pointer"
                >
                  Buka Dashboard Tim
                </Link>
                <Link
                  to="/dompet"
                  className="px-6 py-3.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-amber-400 border border-amber-500/30 font-bold text-xs sm:text-sm text-center transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <Wallet className="w-4 h-4 text-amber-400" />
                  <span>Dompet Saya</span>
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/register"
                  className="px-6 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/20 text-center transition-all cursor-pointer"
                >
                  Daftar Sekarang
                </Link>
                <Link
                  to="/login"
                  className="px-6 py-3.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 font-bold text-xs sm:text-sm text-center transition-colors cursor-pointer"
                >
                  Masuk Akun / Wasit
                </Link>
              </>
            )}
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-10 px-4 text-center text-xs text-zinc-500 z-10 space-y-4">
        <div className="max-w-4xl mx-auto space-y-3">
          <p className="font-medium text-zinc-300">
            &copy; 2026 Arena Tempur &bull; Platform Manajemen Turnamen Komunitas Battle Royale Independen.
          </p>
          <div className="text-[11px] leading-relaxed text-zinc-500 border border-zinc-900 bg-zinc-900/30 p-4 rounded-xl text-left sm:text-center space-y-1.5">
            <p className="font-semibold text-zinc-400 uppercase tracking-wider text-[10px] font-mono">
              PENAFIAN HUKUM / LEGAL DISCLAIMER
            </p>
            <p>
              Arena Tempur adalah platform independen yang dikembangkan sebagai perangkat manajemen kompetisi esports akar rumput (grassroots). Platform ini <strong>TIDAK berafiliasi, didukung, disponsori, atau terafiliasi secara resmi</strong> dengan SEA Group, Garena, Shopee, atau penerbit game mana pun. Seluruh merek dagang, logo turnamen resmi, dan hak cipta judul game (termasuk Free Fire dan Garena) merupakan hak milik penuh dari pemilik sah masing-masing.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
