import Link from "next/link";
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
  Radio,
  Zap,
  Calendar,
} from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function Home() {
  // Turnamen aktif (publik) — data asli dari Supabase
  const admin = createAdminClient();

  const { data: tournaments } = await admin
    .from("tournaments")
    .select("id, nama, slug, status, entry_fee, max_teams, tgl_mulai, tgl_selesai")
    .eq("is_public", true)
    .in("status", ["open", "running"])
    .order("tgl_mulai", { ascending: true })
    .limit(3);

  const activeTournaments = tournaments ?? [];

  // Jumlah tim terverifikasi per turnamen untuk ditampilkan di kartu
  const approvedCounts = await Promise.all(
    activeTournaments.map(async (t) => {
      const { count } = await admin
        .from("teams")
        .select("*", { count: "exact", head: true })
        .eq("tournament_id", t.id)
        .eq("verification_status", "approved");
      return { id: t.id, count: count ?? 0 };
    })
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between selection:bg-amber-500 selection:text-white relative overflow-hidden bg-tactical-lines">
      {/* Ambient glow berlapis — dibuat redup agar tidak mencolok */}
      <div className="absolute -top-40 left-1/4 w-[700px] h-[500px] bg-amber-500/5 blur-[160px] rounded-full pointer-events-none" />
      <div className="absolute top-1/3 -right-32 w-[520px] h-[520px] bg-orange-600/5 blur-[150px] rounded-full pointer-events-none" />

      {/* Subtle tactical ambient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/40 via-zinc-950/75 to-zinc-950 pointer-events-none" />

      {/* Header */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform border border-amber-400/40">
              <Trophy className="w-5 h-5 text-zinc-950 stroke-[2.5]" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tight text-white uppercase font-headline leading-none">
                Arena<span className="text-amber-500">Ku</span>
              </span>
              <span className="text-[11px] font-semibold tracking-wide text-zinc-500 mt-0.5">
                Platform Turnamen Free Fire
              </span>
            </div>
          </Link>

          {/* System status pill */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="font-semibold text-emerald-400">Klasemen real-time</span>
            <span className="text-zinc-600">•</span>
            <span>Verifikasi skor dua pihak</span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors border border-transparent hover:border-zinc-800"
            >
              Masuk
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-xs sm:text-sm shadow-lg shadow-amber-500/20 transition-all cursor-pointer tracking-wide"
            >
              Daftar Squad
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 z-10 w-full space-y-16">
        
        {/* Hero Section with Graphic Banner */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left: Text & CTA */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
              <Radio className="w-3.5 h-3.5 text-amber-500" />
              <span>Platform Turnamen Free Fire Terpercaya</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-5xl xl:text-6xl tracking-tight text-white leading-[1.08] font-headline">
              Sistem Operasi Turnamen <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500">
                Bebas Drama Skor &amp; Joki
              </span>
            </h1>

            <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-xl">
              Tinggalkan kekacauan grup WhatsApp dan spreadsheet manual. ArenaKu mengunci Room ID 
              hingga T-15 menit, memvalidasi Game UID resmi setiap pemain, dan mewajibkan verifikasi 
              skor dua panitia independen dengan bukti tangkapan layar.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href="/register"
                className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-zinc-950 font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-amber-500/25 flex items-center gap-2 transition-all"
              >
                Daftarkan Squad <ArrowRight className="w-4 h-4 stroke-[3]" />
              </Link>
              <Link
                href="/login"
                className="px-6 py-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 hover:border-zinc-700 font-semibold text-xs sm:text-sm flex items-center gap-2 transition-colors"
              >
                <Shield className="w-4 h-4 text-amber-500" />
                Masuk Dashboard
              </Link>
            </div>
          </div>

          {/* Right: High-Impact Visual Card */}
          <div className="lg:col-span-5 relative group">
            <div className="card-esports bracket-corners relative rounded-2xl overflow-hidden shadow-2xl group-hover:border-amber-500/50 group-hover:shadow-[0_0_50px_-12px_rgba(77,163,255,0.5)] transition-all edge-top-glow">
              {/* Image banner */}
              <div className="relative h-64 sm:h-72 w-full overflow-hidden">
                <Image
                  src="/images/ff-tournament-banner.png"
                  alt="Free Fire Tournament Arena"
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 45vw"
                  className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
                
                {/* Live Match Badge Overlay */}
                <div className="absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1 rounded bg-zinc-950/80 backdrop-blur-md border border-zinc-700 text-[11px] text-white">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="font-bold text-red-400">Championship Stage</span>
                </div>

                <div className="absolute top-3 right-3 px-2 py-0.5 rounded bg-amber-500/20 backdrop-blur-md border border-amber-500/40 text-[11px] font-semibold text-amber-400">
                  Garena Official
                </div>
              </div>

              {/* HUD detail strip below image */}
              <div className="p-4 space-y-2 bg-zinc-950/90 border-t border-zinc-800/80">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    Map: Bermuda • Purgatory • Kalahari
                  </span>
                  <span className="text-emerald-400 font-bold">12 Slot Tersedia</span>
                </div>
                <p className="text-[11px] text-zinc-500">
                  Rotasi map dinamis dengan kalkulasi skor Booyah placement otomatis.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tactical Fast Metric Ribbon */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 border-y border-zinc-800/80 py-4 bg-zinc-950/50 backdrop-blur-sm">
          <div className="flex items-center gap-3 px-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-amber-500 font-mono text-xs font-bold">
              12
            </div>
            <div>
              <p className="text-xs font-bold text-white">Tim per Match</p>
              <p className="text-[11px] text-zinc-400">Slot presisi 1–12</p>
            </div>
          </div>

          <div className="flex items-center gap-3 px-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400 font-mono text-xs font-bold">
              T-15
            </div>
            <div>
              <p className="text-xs font-bold text-white">Room Terkunci</p>
              <p className="text-[11px] text-zinc-400">Anti-bocor ke pihak luar</p>
            </div>
          </div>

          <div className="flex items-center gap-3 px-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-orange-400 font-mono text-xs font-bold">
              2x
            </div>
            <div>
              <p className="text-xs font-bold text-white">Verifikasi Ganda</p>
              <p className="text-[11px] text-zinc-400">Panitia input, admin verifikasi</p>
            </div>
          </div>

          <div className="flex items-center gap-3 px-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-blue-400 font-mono text-xs font-bold">
              UID
            </div>
            <div>
              <p className="text-xs font-bold text-white">Anti-Smurf</p>
              <p className="text-[11px] text-zinc-400">Tolak akun ganda otomatis</p>
            </div>
          </div>
        </div>

        {/* SECTION: TACTICAL BENTO GRID */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold tracking-wide text-amber-500 uppercase">
                Fitur Platform
              </span>
              <h2 className="text-2xl sm:text-3xl text-white font-bold mt-1">
                Semua Berjalan Otomatis
              </h2>
            </div>
            <span className="hidden sm:inline-block text-xs text-zinc-500">
              Mengikuti regulasi resmi
            </span>
          </div>

          {/* Bento Grid Layout (12 Columns) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            
            {/* BENTO CARD 1: Large Span (Col 8) - SECURE ROOM GATE WITH BACKGROUND IMAGE */}
            <div className="card-esports bracket-corners md:col-span-8 p-6 sm:p-7 rounded-2xl relative overflow-hidden flex flex-col justify-between space-y-6 group bg-carbon-mesh">
              {/* Atmospheric Background Image from esports.id */}
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

              {/* Content on top */}
              <div className="relative z-10 flex flex-col justify-between space-y-6">
                {/* Technical HUD Top Strip */}
                <div className="hud-strip">
                  <span className="flex items-center gap-2 font-mono text-[10px] text-zinc-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    // PROTOCOL: TIMELOCK_GATED_v2.6
                  </span>
                  <span className="font-mono text-[10px] text-amber-400 font-bold tracking-wider">
                    STATUS: DECRYPT_T15 [SYS_OK]
                  </span>
                </div>

                <div className="flex items-start justify-between">
                  <div>
                    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-semibold uppercase mb-3 backdrop-blur-sm font-mono">
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>MODUL T-05 // ROOM ID TIMELOCK</span>
                    </div>
                    <h3 className="text-xl sm:text-2xl text-white font-bold font-headline">
                      Room ID Dibagikan Otomatis T-15 Menit
                    </h3>
                    <p className="text-xs sm:text-sm text-zinc-400 mt-2 max-w-xl leading-relaxed">
                      Room ID dan Password terenkripsi di server dan hanya terbuka otomatis di layar kapten tim peserta yang sah tepat 15 menit sebelum match dimulai.
                    </p>
                  </div>
                </div>

                {/* Simulated Interactive Tactical HUD */}
                <div className="bg-zinc-950/90 backdrop-blur-md p-4 sm:p-5 rounded-xl border border-zinc-800 space-y-4 shadow-xl">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-3 text-xs">
                    <span className="text-zinc-400 flex items-center gap-2 font-mono text-[11px]">
                      <Crosshair className="w-4 h-4 text-amber-500" />
                      MATCH #03 • MAP BERMUDA • SLOT #07
                    </span>
                    <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-mono text-[11px] font-bold">
                      TERKUNCI HINGGA KICKOFF
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-lg bg-zinc-900/90 border border-zinc-800 flex items-center justify-between group-hover:border-amber-500/30 transition-colors">
                      <div>
                        <p className="text-[10px] font-mono font-semibold text-zinc-500 uppercase tracking-wider">ROOM ID</p>
                        <p className="text-lg font-mono font-bold text-white tracking-wider">8841 9201</p>
                      </div>
                      <div className="p-2 rounded bg-zinc-800 text-zinc-300 group-hover:text-amber-400 transition-colors">
                        <Copy className="w-4 h-4" />
                      </div>
                    </div>

                    <div className="p-3.5 rounded-lg bg-zinc-900/90 border border-zinc-800 flex items-center justify-between group-hover:border-amber-500/30 transition-colors">
                      <div>
                        <p className="text-[10px] font-mono font-semibold text-zinc-500 uppercase tracking-wider">PASSWORD</p>
                        <p className="text-lg font-mono font-bold text-amber-400 tracking-wider">BOOYAH99</p>
                      </div>
                      <div className="p-2 rounded bg-zinc-800 text-zinc-300 group-hover:text-amber-400 transition-colors">
                        <Copy className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-1">
                    <span>Terbuka otomatis 15 menit sebelum kickoff</span>
                    <span className="text-zinc-400">Slot terkunci: EVOS KAZU</span>
                  </div>
                </div>
              </div>
            </div>

            {/* BENTO CARD 2: Vertical Span (Col 4) - REALTIME LEADERBOARD */}
            <div className="card-esports bracket-corners md:col-span-4 p-6 sm:p-7 rounded-2xl relative overflow-hidden flex flex-col justify-between space-y-4 group bg-carbon-mesh">
              {/* Technical HUD Top Strip */}
              <div className="hud-strip">
                <span className="font-mono text-[10px] text-zinc-400">// MATRIX: GARENA_OFFICIAL_12</span>
                <span className="font-mono text-[10px] text-emerald-400 font-bold">[CALC: REALTIME]</span>
              </div>

              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-semibold uppercase mb-3 font-mono">
                  <Trophy className="w-3.5 h-3.5" />
                  <span>KLASEMEN REAL-TIME</span>
                </div>
                <h3 className="text-lg text-white font-bold font-headline">
                  Perhitungan Poin Otomatis
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Kalkulasi otomatis poin placement + eliminasi kill sesuai regulasi resmi.
                </p>
              </div>

              {/* Leaderboard Mini Table with Polygon Badges */}
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 badge-polygon bg-gradient-to-tr from-amber-500 to-amber-300 text-zinc-950 font-black text-[11px] flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0 font-mono">
                      01
                    </div>
                    <div>
                      <p className="font-bold text-white leading-tight">EVOS DIVINE</p>
                      <p className="text-[11px] text-zinc-400 font-mono">2 Booyah &bull; 28 Kills</p>
                    </div>
                  </div>
                  <span className="font-mono font-black text-amber-400 text-sm">68 PTS</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 badge-polygon bg-gradient-to-tr from-zinc-300 to-zinc-100 text-zinc-950 font-bold text-[11px] flex items-center justify-center shrink-0 font-mono">
                      02
                    </div>
                    <div>
                      <p className="font-bold text-zinc-200 leading-tight">RRQ KAZU</p>
                      <p className="text-[11px] text-zinc-500 font-mono">1 Booyah &bull; 22 Kills</p>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-zinc-300 text-sm">54 PTS</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 badge-polygon bg-gradient-to-tr from-orange-500 to-amber-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 font-mono">
                      03
                    </div>
                    <div>
                      <p className="font-bold text-zinc-200 leading-tight">ONIC OLYMPUS</p>
                      <p className="text-[11px] text-zinc-500 font-mono">1 Booyah &bull; 19 Kills</p>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-zinc-300 text-sm">49 PTS</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800 text-xs opacity-75">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-md bg-zinc-800/80 border border-zinc-700 text-zinc-400 font-bold text-[10px] flex items-center justify-center shrink-0 font-mono">
                      04
                    </div>
                    <div>
                      <p className="font-bold text-zinc-300 leading-tight">BIGETRON</p>
                      <p className="text-[11px] text-zinc-500 font-mono">0 Booyah &bull; 16 Kills</p>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-zinc-400 text-sm">38 PTS</span>
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-800/80 text-[11px] font-mono text-zinc-500 flex items-center justify-between">
                <span>Sistem poin: 12-9-8-7-6...</span>
                <span className="text-amber-500 font-bold">+1 Poin per Kill</span>
              </div>
            </div>

            {/* BENTO CARD 3: Medium Span (Col 4) - DUAL APPROVAL PIPELINE */}
            <div className="card-esports bracket-corners md:col-span-4 p-6 sm:p-7 rounded-2xl relative overflow-hidden flex flex-col justify-between space-y-5 group">
              {/* Technical HUD Top Strip */}
              <div className="hud-strip">
                <span className="font-mono text-[10px] text-zinc-400">// PROTOCOL: DUAL_APPROVAL</span>
                <span className="font-mono text-[10px] text-amber-400 font-bold">[AUDIT: STRICT]</span>
              </div>

              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-semibold uppercase mb-3 font-mono">
                  <Shield className="w-3.5 h-3.5" />
                  <span>ANTI-MANIPULASI</span>
                </div>
                <h3 className="text-lg text-white font-bold font-headline">
                  Verifikasi Skor Dua Pihak
                </h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Panitia yang menginput skor wajib berbeda dari admin yang menyetujui hasil pertandingan.
                </p>
              </div>

              {/* Visual Workflow Steps */}
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-lg bg-zinc-950/80 border border-zinc-800 flex items-center gap-3">
                  <span className="w-6 h-6 rounded-md bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[11px] font-mono">
                    01
                  </span>
                  <div className="flex-1">
                    <p className="text-white font-bold">Input Skor + Screenshot</p>
                    <p className="text-[11px] text-zinc-500">Oleh Panitia Wasit Match</p>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-zinc-950/80 border border-zinc-800 flex items-center gap-3">
                  <span className="w-6 h-6 rounded-md bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-[11px] font-mono">
                    02
                  </span>
                  <div className="flex-1">
                    <p className="text-white font-bold">Audit Foto Tabulasi</p>
                    <p className="text-[11px] text-zinc-500">Cek kecocokan kill &amp; ranking</p>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-zinc-950/80 border border-emerald-500/30 flex items-center gap-3">
                  <span className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[11px] font-mono">
                    03
                  </span>
                  <div className="flex-1">
                    <p className="text-emerald-400 font-bold">Approval Admin B</p>
                    <p className="text-[11px] text-emerald-500/80">Skor terkunci &amp; publish live</p>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-zinc-500 font-mono">
                &bull; Log audit tercatat permanen di sistem
              </p>
            </div>

            {/* BENTO CARD 4: Large Span (Col 8) - ROSTER & CHARACTER IMAGE SHOWCASE */}
            <div className="card-esports bracket-corners md:col-span-8 p-6 sm:p-7 rounded-2xl relative overflow-hidden flex flex-col justify-between space-y-6 group bg-carbon-mesh">
              {/* Technical HUD Top Strip */}
              <div className="hud-strip">
                <span className="font-mono text-[10px] text-zinc-400">// DATABASE: ROSTER_VALIDATION</span>
                <span className="font-mono text-[10px] text-emerald-400 font-bold">[ANTI_SMURF: ACTIVE]</span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-semibold uppercase mb-3 font-mono">
                    <Users className="w-3.5 h-3.5" />
                    <span>ROSTER &amp; UID PEMAIN</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl text-white font-bold font-headline">
                    Validasi Roster &amp; Anti-Smurf
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-400 mt-2 max-w-lg leading-relaxed">
                    Setiap pemain diverifikasi berdasarkan Game UID resmi. Sistem otomatis memvalidasi dan menolak pendaftaran UID ganda dalam turnamen yang sama.
                  </p>
                </div>

                {/* Tactical Character Thumbnail from IDN Media */}
                <div className="shrink-0 w-full sm:w-44 h-24 rounded-xl overflow-hidden border border-zinc-700 bg-zinc-950 relative group">
                  <Image
                    src="/images/ff-character-sniper.jpg"
                    alt="Free Fire Tactical Operative"
                    fill
                    sizes="(max-width: 640px) 100vw, 11rem"
                    className="object-cover object-center group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/30 to-transparent" />
                  <div className="absolute bottom-1.5 left-2 right-2 text-[11px] font-semibold text-amber-400 flex items-center justify-between font-mono">
                    <span>Roster Tim</span>
                    <span className="text-emerald-400">&#10003; UID OK</span>
                  </div>
                </div>
              </div>

              {/* Roster Cards Showcase */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-zinc-950/80 border border-amber-500/30 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded font-mono">
                    Kapten
                  </span>
                  <p className="text-xs font-bold text-white truncate">EVOS_SAM13</p>
                  <p className="text-[11px] font-mono text-zinc-400">UID: 198273619</p>
                  <span className="inline-block text-[10px] text-emerald-400 font-mono">
                    • Terverifikasi
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded font-mono">
                    Rusher
                  </span>
                  <p className="text-xs font-bold text-white truncate">EVOS_MR05</p>
                  <p className="text-[11px] font-mono text-zinc-400">UID: 442901822</p>
                  <span className="inline-block text-[10px] text-emerald-400 font-mono">
                    • Terverifikasi
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded font-mono">
                    Sniper
                  </span>
                  <p className="text-xs font-bold text-white truncate">EVOS_STREET</p>
                  <p className="text-[11px] font-mono text-zinc-400">UID: 712903114</p>
                  <span className="inline-block text-[10px] text-emerald-400 font-mono">
                    • Terverifikasi
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded font-mono">
                    Support
                  </span>
                  <p className="text-xs font-bold text-white truncate">EVOS_ABAAX</p>
                  <p className="text-[11px] font-mono text-zinc-400">UID: 881290455</p>
                  <span className="inline-block text-[10px] text-emerald-400 font-mono">
                    • Terverifikasi
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-zinc-950/70 border border-zinc-800 flex items-center justify-between text-xs">
                <span className="text-zinc-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Sistem proteksi UID ganda aktif di seluruh grup turnamen
                </span>
                <span className="text-[11px] text-zinc-500 font-mono">Roster: 4–5 orang</span>
              </div>
            </div>

            {/* BENTO CARD 5: Medium Span (Col 6) - QRIS & PEMBAYARAN */}
            <div className="card-esports bracket-corners md:col-span-6 p-6 sm:p-7 rounded-2xl relative overflow-hidden flex flex-col justify-between space-y-4 group">
              {/* Technical HUD Top Strip */}
              <div className="hud-strip">
                <span className="font-mono text-[10px] text-zinc-400">// GATEWAY: QRIS_INVOICE</span>
                <span className="font-mono text-[10px] text-emerald-400 font-bold">[INSTANT_SLOT]</span>
              </div>

              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-semibold uppercase mb-3 font-mono">
                  <Flame className="w-3.5 h-3.5" />
                  <span>PENDAFTARAN &amp; PEMBAYARAN</span>
                </div>
                <h3 className="text-lg sm:text-xl text-white font-bold font-headline">
                  Upload Bukti QRIS &amp; Verifikasi 1-Klik
                </h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Kapten mengunggah bukti transfer, admin memverifikasi dari antrean dashboard. Status pembayaran langsung mengunci slot tim.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Status Pembayaran Tim:</span>
                  <span className="font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    LUNAS
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Verifikator:</span>
                  <span className="font-mono text-zinc-300">Admin Utama #01</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Slot Terkonfirmasi:</span>
                  <span className="font-mono text-amber-400 font-bold">Slot Grup A #05</span>
                </div>
              </div>
            </div>

            {/* BENTO CARD 6: Medium Span (Col 6) - SPECTATOR & STREAMER OVERLAY */}
            <div className="card-esports bracket-corners md:col-span-6 p-6 sm:p-7 rounded-2xl relative overflow-hidden flex flex-col justify-between space-y-4 group">
              {/* Technical HUD Top Strip */}
              <div className="hud-strip">
                <span className="font-mono text-[10px] text-zinc-400">// BROADCAST: OBS_OVERLAY</span>
                <span className="font-mono text-[10px] text-amber-400 font-bold">[REALTIME_SYNC]</span>
              </div>

              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-semibold uppercase mb-3 font-mono">
                  <Tv className="w-3.5 h-3.5" />
                  <span>PORTAL PUBLIK</span>
                </div>
                <h3 className="text-lg sm:text-xl text-white font-bold font-headline">
                  Portal Publik &amp; Overlay OBS
                </h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Link publik tersendiri untuk penonton dan caster. Klasemen live dapat langsung ditampilkan di OBS tanpa perlu refresh halaman.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-2">
                <p className="text-[11px] font-semibold text-zinc-500 font-mono">Tautan Turnamen Publik</p>
                <div className="p-2.5 rounded bg-zinc-900 border border-zinc-800 font-mono text-xs text-amber-400 flex items-center justify-between group-hover:border-amber-500/30 transition-colors">
                  <span className="truncate">arenaku.id/t/ff-championship-2026</span>
                  <ExternalLink className="w-4 h-4 text-zinc-400 shrink-0 ml-2" />
                </div>
                <p className="text-[11px] text-zinc-500 font-mono">
                  &bull; Terintegrasi langsung dengan Supabase Realtime
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* SECTION: TURNAMEN AKTIF — data asli dari Supabase */}
        {activeTournaments.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold tracking-wide text-amber-500 uppercase font-mono">
                  // REALTIME_FEED
                </span>
                <h2 className="text-2xl sm:text-3xl text-white font-bold font-headline mt-1">
                  Turnamen Sedang Berlangsung
                </h2>
              </div>
              <span className="hidden sm:inline-block text-xs font-mono text-zinc-500">
                LIVE DARI SUPABASE
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {activeTournaments.map((t, i) => {
                const teamCount = approvedCounts.find((a) => a.id === t.id)?.count ?? 0;
                const tglMulai = new Date(t.tgl_mulai).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                });
                const isRunning = t.status === "running";
                return (
                  <Link
                    key={t.id}
                    href={`/t/${t.slug}`}
                    className="card-esports bracket-corners group p-6 rounded-2xl flex flex-col justify-between space-y-5 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`inline-flex items-center gap-2 px-2.5 py-1 rounded text-[11px] font-semibold border ${
                          isRunning
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? "bg-emerald-400" : "bg-amber-400"}`} />
                        {isRunning ? "Berlangsung" : "Pendaftaran Dibuka"}
                      </span>
                      <span className="text-[11px] font-mono text-zinc-500">
                        #{String(i + 1).padStart(2, "0")}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <h3 className="text-lg text-white font-bold leading-snug group-hover:text-amber-400 transition-colors">
                        {t.nama}
                      </h3>
                      <p className="text-[11px] text-zinc-500 uppercase tracking-wide font-semibold truncate">
                        /{t.slug}
                      </p>
                    </div>

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
                        <span className="font-mono text-amber-400 font-bold">
                          {t.entry_fee === 0 ? "Gratis" : `Rp ${t.entry_fee.toLocaleString("id-ID")}`}
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                      <span className="text-amber-400 font-semibold flex items-center gap-1.5">
                        Lihat Detail
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                      <span className="text-[11px] text-zinc-500">Klasemen &amp; Jadwal</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Tactical Call To Action Box with subtle background art */}
        <div className="p-8 sm:p-12 rounded-3xl bg-zinc-900/90 border border-amber-500/30 relative overflow-hidden text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl">
          <div className="space-y-2 max-w-xl z-10">
            <span className="text-xs font-semibold text-amber-400 uppercase">
              Mulai Sekarang
            </span>
            <h3 className="text-2xl sm:text-3xl text-white font-bold">
              Siap Menjalankan Turnamen dengan Standar Pro?
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400">
              Daftarkan tim atau buat turnamen resmi Anda dalam hitungan menit tanpa drama skor.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto shrink-0 z-10">
            <Link
              href="/register"
              className="px-6 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/20 text-center transition-all cursor-pointer"
            >
              Daftar Sekarang
            </Link>
            <Link
              href="/login"
              className="px-6 py-3.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 font-bold text-xs sm:text-sm text-center transition-colors cursor-pointer"
            >
              Masuk Panitia
            </Link>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950/80 py-8 text-center text-xs text-zinc-500 z-10">
        <p>&copy; 2026 ArenaKu &bull; Platform manajemen turnamen Free Fire.</p>
      </footer>
    </div>
  );
}
