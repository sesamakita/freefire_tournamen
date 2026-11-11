"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Trophy, Flame, Swords, Shield } from "lucide-react";

interface StandingItem {
  team_id: string;
  tournament_id: string;
  team_nama: string;
  logo_url: string | null;
  matches_played: number;
  total_kills: number;
  total_points: number;
  best_placement: number | null;
  rank: number;
}

interface Props {
  tournamentId: string;
  initialTournament: {
    nama: string;
    format: string;
    live_title: string | null;
  };
}

export default function LeaderboardOverlayClient({
  tournamentId,
  initialTournament,
}: Props) {
  const [standings, setStandings] = useState<StandingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Polling data setiap 6 detik agar di OBS selalu update otomatis tanpa reload
  useEffect(() => {
    let isMounted = true;

    const fetchStandings = async () => {
      try {
        const res = await fetch(`/api/tournaments/${tournamentId}/standings`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (json.success && isMounted) {
          setStandings(json.data || []);
          setLastUpdated(new Date());
        }
      } catch (err) {
        console.error("Gagal update overlay standings:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchStandings();
    const interval = setInterval(fetchStandings, 6000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [tournamentId]);

  // Cari tim dengan kill terbanyak (Predator)
  const highestKillTeam = standings.reduce<StandingItem | null>((prev, current) => {
    if (!prev) return current.total_kills > 0 ? current : null;
    return current.total_kills > prev.total_kills ? current : prev;
  }, null);

  return (
    <div className="w-full min-h-screen p-6 sm:p-10 flex flex-col justify-center items-center bg-transparent">
      {/* Container Overlay: Lebar 1200px max, transparan backdrop glass */}
      <div className="w-full max-w-5xl rounded-3xl overflow-hidden border border-white/15 bg-zinc-950/90 backdrop-blur-xl shadow-2xl shadow-black/80">
        {/* Header HUD */}
        <div className="px-8 py-5 border-b border-white/10 bg-gradient-to-r from-red-950/80 via-zinc-950/90 to-amber-950/80 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-red-600 flex items-center justify-center text-zinc-950 shadow-lg shadow-amber-500/30">
              <Trophy className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20">
                  OVERALL STANDINGS
                </span>
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  LIVE SCORES
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
                {initialTournament.live_title || initialTournament.nama}
              </h1>
            </div>
          </div>

          {highestKillTeam && highestKillTeam.total_kills > 0 && (
            <div className="hidden sm:flex items-center gap-3 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/30">
              <Flame className="w-5 h-5 text-red-500 animate-bounce" />
              <div className="text-right">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Top Predator
                </span>
                <span className="text-xs font-black text-white">
                  {highestKillTeam.team_nama} ({highestKillTeam.total_kills} Kills)
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Tabel Klasemen Broadcast */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-[11px] font-black uppercase tracking-widest text-zinc-400">
                <th className="py-3 px-4 text-center w-16">#</th>
                <th className="py-3 px-4">Nama Tim</th>
                <th className="py-3 px-3 text-center w-20">Match</th>
                <th className="py-3 px-3 text-center w-20">Kills</th>
                <th className="py-3 px-3 text-center w-20">Best</th>
                <th className="py-3 px-6 text-right w-28 text-amber-400 font-black">
                  Total Pts
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-semibold">
              {standings.length > 0 ? (
                standings.map((team) => {
                  const isTop1 = team.rank === 1;
                  const isTop2 = team.rank === 2;
                  const isTop3 = team.rank === 3;

                  return (
                    <tr
                      key={team.team_id}
                      className={`transition-colors ${
                        isTop1
                          ? "bg-amber-500/10 text-white"
                          : isTop2
                          ? "bg-zinc-800/40 text-zinc-100"
                          : isTop3
                          ? "bg-amber-900/10 text-zinc-200"
                          : "hover:bg-white/[0.02] text-zinc-300"
                      }`}
                    >
                      {/* Rank Badge */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-black shadow-sm ${
                            isTop1
                              ? "bg-gradient-to-tr from-amber-500 to-yellow-300 text-zinc-950 shadow-amber-500/40 ring-2 ring-amber-400/50"
                              : isTop2
                              ? "bg-zinc-300 text-zinc-950"
                              : isTop3
                              ? "bg-amber-700 text-white"
                              : "bg-zinc-800/80 text-zinc-400"
                          }`}
                        >
                          {team.rank}
                        </span>
                      </td>

                      {/* Nama Tim & Logo */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {team.logo_url ? (
                            <div className="w-8 h-8 rounded-lg overflow-hidden relative shrink-0 border border-white/10 bg-zinc-900">
                              <Image
                                src={team.logo_url}
                                alt={team.team_nama}
                                fill
                                sizes="32px"
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-white/10 flex items-center justify-center text-xs font-black text-amber-400 shrink-0">
                              {team.team_nama.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <span className="font-bold text-sm tracking-tight text-white block">
                              {team.team_nama}
                            </span>
                            {isTop1 && (
                              <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1">
                                👑 Pemuncak Klasemen
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Matches Played */}
                      <td className="py-3 px-3 text-center font-mono text-zinc-300 text-xs">
                        {team.matches_played}
                      </td>

                      {/* Total Kills */}
                      <td className="py-3 px-3 text-center font-mono text-red-400 font-bold text-xs">
                        {team.total_kills}
                      </td>

                      {/* Best Placement */}
                      <td className="py-3 px-3 text-center font-mono text-zinc-400 text-xs">
                        {team.best_placement ? `#${team.best_placement}` : "-"}
                      </td>

                      {/* Total Poin */}
                      <td className="py-3 px-6 text-right font-black font-mono text-base text-amber-400">
                        {team.total_points}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-500">
                    <Shield className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                    <p className="text-sm font-bold text-zinc-400">
                      Menunggu Hasil Pertandingan
                    </p>
                    <p className="text-xs text-zinc-600 mt-0.5">
                      Klasemen akan diperbarui otomatis setelah panitia memvalidasi skor match
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer HUD */}
        <div className="px-6 py-3 border-t border-white/10 bg-zinc-950/90 flex items-center justify-between text-[11px] text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="font-black text-white tracking-wider">ARENA TEMPUR</span>
            <span>&bull; Official Tournament Broadcast HUD</span>
          </div>
          <div>
            Data otomatis ter-update secara realtime
          </div>
        </div>
      </div>
    </div>
  );
}
