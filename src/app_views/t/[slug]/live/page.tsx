import Link from "next/link";
import { notFound } from "next/navigation";
import Image from "next/image";
import {
  Radio,
  Tv,
  Trophy,
  BarChart3,
  ExternalLink,
  Flame,
  Calendar,
  Share2,
  AlertCircle,
  Clock,
  Sparkles,
  Shield
} from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const metadata = {
  title: "Siaran Langsung (Live Stream) — Arena Tempur",
  description: "Saksikan pertandingan turnamen Free Fire live streaming dengan klasemen real-time.",
};

// Helper untuk mengekstrak Video ID YouTube
function extractYouTubeId(url: string | null) {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

export default async function PublicLiveStreamPage({ params }: PageProps) {
  const { slug } = await params;
  const admin = createAdminClient();
  const db = admin as any;

  // 1. Ambil data turnamen
  const { data: tournament } = await db
    .from("tournaments")
    .select(`
      id,
      nama,
      slug,
      format,
      status,
      is_live,
      live_platform,
      live_stream_url,
      live_title,
      max_rounds
    `)
    .eq("slug", slug)
    .maybeSingle();

  if (!tournament) notFound();

  // 2. Ambil data klasemen jika format battle_royale
  let standings: any[] = [];
  if (tournament.format === "battle_royale") {
    const { data: stData } = await db
      .from("standings")
      .select("*")
      .eq("tournament_id", tournament.id)
      .order("rank", { ascending: true })
      .limit(12);

    standings = stData || [];
  }

  // 3. Ambil data bracket aktif jika format lone_wolf_1v1
  let activeBracketMatch: any = null;
  if (tournament.format === "lone_wolf_1v1") {
    const { data: brData } = await db
      .from("brackets")
      .select(`
        id,
        round_name,
        score_p1,
        score_p2,
        status,
        player1:player1_id (nama, logo_url),
        player2:player2_id (nama, logo_url)
      `)
      .eq("tournament_id", tournament.id)
      .in("status", ["ongoing", "scheduled"])
      .limit(1)
      .maybeSingle();

    activeBracketMatch = brData;
  }

  const isLive = tournament.is_live;
  const platform = tournament.live_platform || "youtube";
  const ytVideoId = platform === "youtube" ? extractYouTubeId(tournament.live_stream_url) : null;
  const isLoneWolf = tournament.format === "lone_wolf_1v1";

  return (
    <div className="space-y-8 pb-12">
      {/* Header Info Siaran */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            {isLive ? (
              <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white font-black text-[11px] tracking-wider uppercase flex items-center gap-1.5 animate-pulse shadow-md shadow-red-600/30">
                <span className="w-2 h-2 rounded-full bg-white" />
                SEDANG SIARAN LANGSUNG
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 font-semibold text-[11px] tracking-wider uppercase flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                SIARAN OFFLINE / STANDBY
              </span>
            )}

            <span className="text-xs text-zinc-400">
              Platform: <strong className="text-zinc-200 capitalize">{platform}</strong>
            </span>
          </div>

          <h2 className="text-2xl font-black text-white tracking-tight">
            {tournament.live_title || `Siaran Resmi: ${tournament.nama}`}
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            {isLive
              ? "Tonton jalannya turnamen secara langsung dan pantau perolehan poin setiap tim secara real-time."
              : "Siaran langsung belum aktif atau sedang dalam jeda sesi. Periksa jadwal match berikutnya di bawah."}
          </p>
        </div>

        {tournament.live_stream_url && (
          <a
            href={tournament.live_stream_url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 hover:text-white text-xs font-bold inline-flex items-center gap-1.5 transition-all shrink-0 self-start sm:self-auto"
          >
            <span>Buka di Aplikasi {platform.toUpperCase()}</span>
            <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
          </a>
        )}
      </div>

      {/* Main Stage: Player Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Kolom Kiri: Player Video Responsif */}
        <div className="lg:col-span-8 space-y-4">
          <div className="card-glow rounded-2xl overflow-hidden border border-zinc-800 bg-black relative shadow-2xl">
            {isLive && platform === "youtube" && ytVideoId ? (
              <div className="relative aspect-video w-full">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${ytVideoId}?autoplay=1&rel=0`}
                  title={tournament.nama}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full border-0 absolute inset-0"
                />
              </div>
            ) : isLive && tournament.live_stream_url ? (
              <div className="aspect-video w-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center text-white mb-4 shadow-xl shadow-red-600/20">
                  <Tv className="w-8 h-8 stroke-[2.2]" />
                </div>
                <span className="px-3 py-1 rounded-full bg-red-600/20 border border-red-500/40 text-red-400 text-xs font-black uppercase tracking-wider mb-2">
                  🔴 SIARAN DI {platform.toUpperCase()}
                </span>
                <h3 className="text-xl font-bold text-white max-w-md">
                  {tournament.live_title || tournament.nama}
                </h3>
                <p className="text-xs text-zinc-400 max-w-md mt-2 mb-6">
                  Siaran turnamen ini disiarkan langsung melalui saluran resmi {platform.toUpperCase()}. Klik tombol di bawah untuk bergabung dengan siaran.
                </p>
                <a
                  href={tournament.live_stream_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs uppercase tracking-wider inline-flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all hover:scale-105"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Saksikan di {platform.toUpperCase()} Live</span>
                </a>
              </div>
            ) : (
              <div className="aspect-video w-full flex flex-col items-center justify-center p-8 text-center bg-zinc-950/80">
                <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 mb-3">
                  <Tv className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-zinc-300">
                  Sesi Siaran Langsung Sedang Offline
                </h3>
                <p className="text-xs text-zinc-500 max-w-sm mt-1">
                  Panitia belum mengaktifkan pemutar siaran. Silakan cek jadwal pertandingan atau pantau klasemen poin di tab turnamen.
                </p>
              </div>
            )}

            {/* Video Player Bottom Meta */}
            <div className="p-4 bg-zinc-950/90 border-t border-zinc-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-zinc-400">
                <span className="font-bold text-white">{tournament.nama}</span>
                <span>&bull;</span>
                <span className="text-[11px] uppercase tracking-wider text-amber-400 font-semibold">
                  {isLoneWolf ? "Mode 1v1 King of By One" : "Mode Battle Royale"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/t/${tournament.slug}/jadwal`}
                  className="text-zinc-400 hover:text-white transition-colors flex items-center gap-1 font-semibold"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Jadwal
                </Link>
                <span className="text-zinc-700">&bull;</span>
                <Link
                  href={isLoneWolf ? `/t/${tournament.slug}/bracket` : `/t/${tournament.slug}/klasemen`}
                  className="text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1 font-bold"
                >
                  <Trophy className="w-3.5 h-3.5" />
                  {isLoneWolf ? "Bagan Gugur" : "Klasemen Penuh"}
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Real-Time Sidebar Klasemen / Duel Info */}
        <div className="lg:col-span-4 space-y-4">
          {/* Battle Royale: Mini Leaderboard Realtime */}
          {!isLoneWolf ? (
            <div className="card-glow rounded-2xl p-5 border border-zinc-800 bg-zinc-900/40 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-amber-500" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Klasemen Sementara (Top 12)
                  </h3>
                </div>
                <Link
                  href={`/t/${tournament.slug}/klasemen`}
                  className="text-[11px] font-bold text-amber-400 hover:underline flex items-center gap-0.5"
                >
                  Lihat Semua
                </Link>
              </div>

              {standings.length > 0 ? (
                <div className="space-y-2">
                  {standings.map((team) => (
                    <div
                      key={team.team_id}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-colors ${
                        team.rank === 1
                          ? "bg-amber-500/10 border-amber-500/30 text-white"
                          : team.rank <= 3
                          ? "bg-zinc-800/40 border-zinc-700/60 text-zinc-200"
                          : "bg-zinc-950/40 border-zinc-800/60 text-zinc-400"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <span
                          className={`w-5 h-5 rounded flex items-center justify-center font-black text-[10px] shrink-0 ${
                            team.rank === 1
                              ? "bg-amber-500 text-zinc-950"
                              : team.rank === 2
                              ? "bg-zinc-300 text-zinc-950"
                              : team.rank === 3
                              ? "bg-amber-700 text-white"
                              : "bg-zinc-800 text-zinc-400"
                          }`}
                        >
                          {team.rank}
                        </span>

                        <span className="font-bold text-zinc-200 truncate">
                          {team.team_nama}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 font-mono text-[11px]">
                        <span className="text-red-400 font-semibold" title="Total Kills">
                          {team.total_kills} K
                        </span>
                        <span className="font-black text-amber-400 text-xs w-8 text-right" title="Total Points">
                          {team.total_points}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-zinc-500 text-xs">
                  <Shield className="w-6 h-6 text-zinc-600 mx-auto mb-1.5" />
                  <p>Belum ada skor yang diverifikasi</p>
                </div>
              )}
            </div>
          ) : (
            /* Lone Wolf: Duel Card Active */
            <div className="card-glow rounded-2xl p-5 border border-zinc-800 bg-zinc-900/40 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Duel Aktif (1v1 By One)
                  </h3>
                </div>
                <Link
                  href={`/t/${tournament.slug}/bracket`}
                  className="text-[11px] font-bold text-amber-400 hover:underline"
                >
                  Bagan Penuh
                </Link>
              </div>

              {activeBracketMatch ? (
                <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 block text-center">
                    {activeBracketMatch.round_name}
                  </span>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="text-center flex-1">
                      <span className="font-bold text-sm text-white block truncate">
                        {activeBracketMatch.player1?.nama || "Player 1"}
                      </span>
                      <span className="text-2xl font-black font-mono text-amber-400 mt-1 block">
                        {activeBracketMatch.score_p1 ?? 0}
                      </span>
                    </div>

                    <span className="text-zinc-600 font-bold text-xs">VS</span>

                    <div className="text-center flex-1">
                      <span className="font-bold text-sm text-white block truncate">
                        {activeBracketMatch.player2?.nama || "Player 2"}
                      </span>
                      <span className="text-2xl font-black font-mono text-amber-400 mt-1 block">
                        {activeBracketMatch.score_p2 ?? 0}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-zinc-500 text-xs">
                  <p>Semua match babak ini telah rampung</p>
                </div>
              )}
            </div>
          )}

          {/* Quick Notice Card */}
          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800/80 text-xs space-y-2 text-zinc-400">
            <h4 className="font-bold text-zinc-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Satu Sumber Kebenaran
            </h4>
            <p className="text-[11px] leading-relaxed">
              Skor dan statistik yang Anda saksikan di video siaran terhubung langsung dengan database Arena Tempur. Apabila terdapat sengketa skor, hubungi panitia melalui portal kapten.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
