import { Link, useLoaderData, redirect } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import {
  Shield,
  Trophy,
  Calendar,
  Users,
  Clock,
  ArrowRight,
  PlusCircle,
  Settings2,
  Cpu,
  Smartphone,
  Download,
  Radio,
  Megaphone,
  ExternalLink,
} from "lucide-react";
import { createWebClient } from "@/lib/supabase/web";
import { createAdminClient } from "@/lib/supabase/admin";

export function meta() {
  return [
    { title: "Portal Panitia Turnamen — Arena Tempur" },
    { name: "description", content: "Pusat kendali verifikasi tim, jadwal match, Room ID, dan persetujuan skor turnamen komunitas." },
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

  const admin = createAdminClient();

  // 1. Ambil daftar turnamen di mana user menjadi staff (owner, admin, panitia)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any;
  const { data: staffRoles } = await db
    .from("tournament_staff")
    .select(`
      role,
      tournaments:tournament_id (
        id,
        nama,
        slug,
        status,
        entry_fee,
        max_teams,
        format,
        tgl_mulai,
        tgl_selesai
      )
    `)
    .eq("user_id", user.id);

  const tournamentsManaged = (staffRoles || [])
    .map((s: any) => ({
      ...s.tournaments,
      myRole: s.role,
    }))
    .filter((t: any) => Boolean(t.id));

  // 2. Ambil statistik ringkas untuk tiap turnamen
  const tournamentIds = tournamentsManaged.map((t: any) => t.id);

  const pendingTeamsCountMap: { [tid: string]: number } = {};
  const totalMatchesCountMap: { [tid: string]: number } = {};

  if (tournamentIds.length > 0) {
    const { data: teamsData } = await admin
      .from("teams")
      .select("tournament_id, verification_status")
      .in("tournament_id", tournamentIds);

    (teamsData || []).forEach((tm: any) => {
      if (tm.verification_status === "pending") {
        pendingTeamsCountMap[tm.tournament_id] =
          (pendingTeamsCountMap[tm.tournament_id] || 0) + 1;
      }
    });

    const { data: matchesData } = await admin
      .from("matches")
      .select("tournament_id")
      .in("tournament_id", tournamentIds);

    (matchesData || []).forEach((m: any) => {
      totalMatchesCountMap[m.tournament_id] =
        (totalMatchesCountMap[m.tournament_id] || 0) + 1;
    });
  }

  return {
    tournamentsManaged,
    pendingTeamsCountMap,
    totalMatchesCountMap,
  };
}

export default function AdminHubRoute() {
  const { tournamentsManaged, pendingTeamsCountMap, totalMatchesCountMap } =
    useLoaderData<typeof loader>();

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header Admin Hub */}
      <div className="card-glow card-glow-hover p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-zinc-950 shadow-lg shadow-amber-500/20">
            <Shield className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-3xl text-white tracking-tight">
              Portal Panitia Turnamen
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Pusat kendali verifikasi tim, jadwal match, Room ID, dan persetujuan skor
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/admin/ai-settings"
            className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs border border-zinc-700 hover:border-amber-500/50 inline-flex items-center gap-2 transition-all cursor-pointer shadow-sm"
          >
            <Cpu className="w-4 h-4 text-amber-400" />
            Konfigurasi AI Vision
          </Link>
          <Link
            to="/admin/turnamen/buat"
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-xs shadow-md shadow-amber-500/20 inline-flex items-center gap-2 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            Buka Turnamen Baru
          </Link>
        </div>
      </div>

      {/* Banner Download APK Panitia Android */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-zinc-900 to-zinc-900 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">APK Android Panitia (Organizer Tool)</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                v1.0 Ready
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Gunakan aplikasi di HP panitia untuk verifikasi bukti transfer, scan papan skor match via kamera AI, dan kontrol overlay OBS.
            </p>
          </div>
        </div>

        <a
          href="/downloads/arena-tempur-panitia.apk"
          download="arena-tempur-panitia.apk"
          className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs inline-flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-500/20 self-start sm:self-auto shrink-0"
        >
          <Download className="w-4 h-4 stroke-[2.5]" />
          <span>Download APK (6.6 MB)</span>
        </a>
      </div>

      {/* Daftar Turnamen yang Dikelola */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base text-white flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            Turnamen yang Anda Kelola ({tournamentsManaged.length})
          </h2>
        </div>

        {tournamentsManaged.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tournamentsManaged.map((t: any) => {
              const pendingCount = pendingTeamsCountMap[t.id] || 0;
              const matchesCount = totalMatchesCountMap[t.id] || 0;

              return (
                <div
                  key={t.id}
                  className="card-glow card-glow-hover p-5 sm:p-6 rounded-2xl flex flex-col justify-between gap-5 transition-all"
                >
                  {/* 1. Header: Status, Identitas Turnamen & Tombol Pengaturan */}
                  <div className="space-y-3">
                    {/* Baris Status Badges & Tombol Edit */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
                          Peran: {t.myRole}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
                          {t.status}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-[10px] sm:text-[11px] font-medium">
                          {t.format === "lone_wolf_1v1" ? "1v1 Lone Wolf" : "Battle Royale"}
                        </span>
                        {pendingCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] sm:text-[11px] font-bold animate-pulse flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {pendingCount} Pending
                          </span>
                        )}
                      </div>

                      <Link
                        to={`/admin/${t.id}/edit`}
                        className="px-2.5 py-1 rounded-lg bg-zinc-900/90 border border-zinc-800 hover:border-amber-500/50 hover:text-amber-400 text-zinc-400 text-xs font-medium inline-flex items-center gap-1.5 transition-colors"
                        title="Edit Pengaturan Turnamen"
                      >
                        <Settings2 className="w-3.5 h-3.5 text-amber-500" />
                        <span>Edit</span>
                      </Link>
                    </div>

                    {/* Judul Turnamen & Info Kapasitas / ID */}
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug line-clamp-2">
                        {t.nama}
                      </h3>
                      <div className="flex items-center gap-3 mt-1 text-xs text-zinc-400 flex-wrap">
                        <span>
                          Kapasitas: <strong className="text-zinc-200">{t.max_teams} Tim</strong>
                        </span>
                        <span className="text-zinc-600">•</span>
                        <span className="font-mono text-[11px] text-zinc-500 select-all">
                          ID: <span className="text-zinc-400">{t.id.slice(0, 8)}...{t.id.slice(-4)}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 2. Modul Operasional Utama (3 Kolom untuk 1v1, 4 Kolom untuk Battle Royale) */}
                  <div
                    className={
                      t.format === "lone_wolf_1v1"
                        ? "grid grid-cols-1 sm:grid-cols-3 gap-2.5"
                        : "grid grid-cols-2 sm:grid-cols-4 gap-2.5"
                    }
                  >
                    {/* Modul: Peserta & Tim */}
                    <Link
                      to={`/admin/${t.id}/verifikasi`}
                      className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/90 hover:border-amber-500/50 hover:bg-zinc-900/80 transition-all flex flex-col justify-between group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20 group-hover:scale-105 transition-transform">
                          <Users className="w-4 h-4" />
                        </div>
                        {pendingCount > 0 ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                            {pendingCount} Verif
                          </span>
                        ) : (
                          <span className="text-[10px] text-zinc-500">Aman</span>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                          Peserta & Tim
                        </p>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          {pendingCount > 0 ? `${pendingCount} Menunggu` : "Kelola Roster"}
                        </p>
                      </div>
                    </Link>

                    {/* Modul: Pertandingan / Bagan */}
                    {t.format === "lone_wolf_1v1" ? (
                      <Link
                        to={`/admin/${t.id}/bracket`}
                        className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/90 hover:border-amber-500/50 hover:bg-zinc-900/80 transition-all flex flex-col justify-between group"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20 group-hover:scale-105 transition-transform">
                            <Trophy className="w-4 h-4" />
                          </div>
                          <span className="text-[10px] text-amber-400/80 font-medium">Bagan 1v1</span>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                            Bagan Turnamen
                          </p>
                          <p className="text-[11px] text-zinc-400 mt-0.5">
                            Kocok & Input Skor
                          </p>
                        </div>
                      </Link>
                    ) : (
                      <>
                        <Link
                          to={`/admin/${t.id}/match`}
                          className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/90 hover:border-blue-500/50 hover:bg-zinc-900/80 transition-all flex flex-col justify-between group"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20 group-hover:scale-105 transition-transform">
                              <Calendar className="w-4 h-4" />
                            </div>
                            <span className="text-[10px] text-blue-400/80 font-medium">{matchesCount} Match</span>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors">
                              Jadwal & Room
                            </p>
                            <p className="text-[11px] text-zinc-400 mt-0.5">
                              ID & Password
                            </p>
                          </div>
                        </Link>

                        <Link
                          to={`/admin/${t.id}/skor`}
                          className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/90 hover:border-emerald-500/50 hover:bg-zinc-900/80 transition-all flex flex-col justify-between group"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 group-hover:scale-105 transition-transform">
                              <Trophy className="w-4 h-4" />
                            </div>
                            <span className="text-[10px] text-emerald-400/80 font-medium">Dual Ctr</span>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                              Input Skor
                            </p>
                            <p className="text-[11px] text-zinc-400 mt-0.5">
                              Klasemen Match
                            </p>
                          </div>
                        </Link>
                      </>
                    )}

                    {/* Modul: Live Streaming & OBS */}
                    <Link
                      to={`/admin/${t.id}/live`}
                      className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/90 hover:border-red-500/50 hover:bg-zinc-900/80 transition-all flex flex-col justify-between group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-7 h-7 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center border border-red-500/20 group-hover:scale-105 transition-transform">
                          <Radio className="w-4 h-4 text-red-400 animate-pulse" />
                        </div>
                        <span className="text-[10px] text-red-400/90 font-medium">OBS & QRIS</span>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white group-hover:text-red-300 transition-colors">
                          Pusat Siaran Live
                        </p>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          Overlay & Audio SFX
                        </p>
                      </div>
                    </Link>
                  </div>

                  {/* 3. Footer: Aksi Tambahan & Link Halaman Publik */}
                  <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between flex-wrap gap-2 text-xs">
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      <Link
                        to={`/admin/${t.id}/sponsor`}
                        className="px-2.5 py-1 rounded-lg bg-zinc-900/80 border border-zinc-800 hover:border-amber-500/40 hover:text-amber-300 text-zinc-400 text-[11px] font-medium inline-flex items-center gap-1.5 transition-colors"
                        title="Manajemen Sponsor & Iklan Siaran"
                      >
                        <Megaphone className="w-3 h-3 text-amber-400" />
                        <span>Sponsor & Iklan</span>
                      </Link>

                      <Link
                        to={`/admin/${t.id}/panitia`}
                        className="px-2.5 py-1 rounded-lg bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 hover:text-white text-zinc-400 text-[11px] font-medium inline-flex items-center gap-1.5 transition-colors"
                        title="Kelola & Undang Panitia"
                      >
                        <Shield className="w-3 h-3 text-zinc-400" />
                        <span>Staf Panitia</span>
                      </Link>
                    </div>

                    <Link
                      to={`/t/${t.slug}`}
                      target="_blank"
                      className="text-zinc-400 hover:text-white inline-flex items-center gap-1.5 font-medium text-[11px] transition-colors ml-auto group"
                    >
                      <span>Lihat Web Publik</span>
                      <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center bg-zinc-900/40 border border-zinc-800 rounded-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-zinc-800 text-zinc-500 flex items-center justify-center mx-auto">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-200">
                Anda belum terdaftar sebagai panitia di turnamen apa pun
              </p>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1">
                Jika Anda adalah penyelenggara turnamen, Anda bisa langsung membuka turnamen baru.
                Anda akan otomatis menjadi Owner turnamen tersebut.
              </p>
            </div>
            <Link
              to="/admin/turnamen/buat"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-zinc-950 text-xs font-bold shadow-md shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              Buka Turnamen Pertama Saya
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
