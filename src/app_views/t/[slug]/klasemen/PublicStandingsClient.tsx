"use client";

import { useState } from "react";
import Image from "next/image";
import { Trophy, Flame, Search, ChevronRight, Crown } from "lucide-react";
import PodiumSection from "@/components/PodiumSection";
import TeamCareerModal from "@/components/TeamCareerModal";

interface StandingTeam {
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

interface PublicStandingsClientProps {
  tournamentId: string;
  tournamentNama: string;
  standings: StandingTeam[];
  prizePool?: number;
  prizeDistribution?: Record<string, number>;
}

export default function PublicStandingsClient({
  tournamentId,
  tournamentNama,
  standings,
  prizePool = 0,
  prizeDistribution,
}: PublicStandingsClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  const filteredStandings = standings.filter((t) =>
    (t.team_nama || "").toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  return (
    <div className="space-y-6">
      {/* 1. Podium 3 Besar (Olympic / Hall of Fame) */}
      {standings.length > 0 && (
        <PodiumSection
          standings={standings}
          prizePool={prizePool}
          prizeDistribution={prizeDistribution}
          onSelectTeam={(teamId) => setSelectedTeamId(teamId)}
        />
      )}

      {/* 2. Header Klasemen Lengkap & Pencarian */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
        <div>
          <h2 className="text-xl text-white tracking-tight flex items-center gap-2 font-bold">
            <Trophy className="w-5 h-5 text-amber-500" />
            Klasemen Resmi Turnamen (Live)
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Klik pada baris tim mana saja untuk melihat susunan roster pemain &amp; statistik karir.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Search Tim */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama tim..."
              className="w-full pl-9 pr-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <span className="shrink-0 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-semibold">
            {standings.length} Tim
          </span>
        </div>
      </div>

      {/* 3. Standings Leaderboard Table */}
      <div className="card-glow rounded-2xl overflow-hidden border border-zinc-800/80">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[540px] text-left border-collapse text-xs ui-dense">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/80 text-[11px] font-black uppercase tracking-wider text-zinc-400">
                <th className="py-3 px-3 text-center w-12 whitespace-nowrap">Rank</th>
                <th className="py-3 px-4">Nama Tim</th>
                <th className="py-3 px-3 text-center w-14 whitespace-nowrap">MP</th>
                <th className="py-3 px-3 text-center w-16 whitespace-nowrap">Kills</th>
                <th className="py-3 px-3 text-center w-16 whitespace-nowrap">Best</th>
                <th className="py-3 px-4 text-right w-24 text-amber-400 whitespace-nowrap">Total Poin</th>
                <th className="py-3 px-3 text-center w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-medium">
              {filteredStandings.length > 0 ? (
                filteredStandings.map((team, idx) => {
                  const isTop1 = team.rank === 1;
                  const isTop2 = team.rank === 2;
                  const isTop3 = team.rank === 3;

                  return (
                    <tr
                      key={team.team_id || idx}
                      onClick={() => setSelectedTeamId(team.team_id)}
                      className={`hover:bg-zinc-800/50 transition-colors cursor-pointer group ${
                        isTop1
                          ? "bg-amber-500/[0.06] font-semibold border-l-2 border-l-amber-400"
                          : ""
                      }`}
                      title="Klik untuk membuka profil tim & roster"
                    >
                      {/* Rank */}
                      <td className="py-3.5 px-3 text-center">
                        {isTop1 ? (
                          <span className="w-7 h-7 rounded-lg bg-amber-400 text-zinc-950 font-black text-xs inline-flex items-center justify-center shadow-md shadow-amber-400/30">
                            1
                          </span>
                        ) : isTop2 ? (
                          <span className="w-7 h-7 rounded-lg bg-zinc-300 text-zinc-950 font-black text-xs inline-flex items-center justify-center">
                            2
                          </span>
                        ) : isTop3 ? (
                          <span className="w-7 h-7 rounded-lg bg-amber-700 text-amber-100 font-black text-xs inline-flex items-center justify-center">
                            3
                          </span>
                        ) : (
                          <span className="text-zinc-500 font-mono text-xs">
                            #{team.rank}
                          </span>
                        )}
                      </td>

                      {/* Tim Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          {team.logo_url ? (
                            <Image
                              src={team.logo_url}
                              alt={team.team_nama || "Team"}
                              width={28}
                              height={28}
                              className="w-7 h-7 rounded-lg object-cover border border-zinc-800 shrink-0"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center text-[11px] font-bold text-zinc-400 shrink-0">
                              {(team.team_nama || "T").slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="space-y-0.5">
                            <span className="text-sm font-bold text-white tracking-tight group-hover:text-amber-400 transition-colors">
                              {team.team_nama}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Matches Played */}
                      <td className="py-3.5 px-3 text-center text-zinc-400 font-mono">
                        {team.matches_played}
                      </td>

                      {/* Total Kills */}
                      <td className="py-3.5 px-3 text-center font-mono text-zinc-300">
                        {team.total_kills}
                      </td>

                      {/* Best Placement */}
                      <td className="py-3.5 px-3 text-center font-mono text-zinc-400">
                        {team.best_placement ? `#${team.best_placement}` : "-"}
                      </td>

                      {/* Total Points */}
                      <td className="py-3.5 px-4 text-right">
                        {isTop1 ? (
                          <span className="font-mono text-2xl font-black leading-none text-amber-300 tracking-tight">
                            {team.total_points}
                          </span>
                        ) : (
                          <span className="font-mono text-base font-bold text-amber-400">
                            {team.total_points}
                          </span>
                        )}
                      </td>

                      {/* Action Chevron */}
                      <td className="py-3.5 px-3 text-center text-zinc-600 group-hover:text-amber-400 transition-colors">
                        <ChevronRight className="w-4 h-4 inline-block" />
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-zinc-500">
                    {searchQuery ? "Tidak ada tim yang cocok dengan pencarian." : "Belum ada data pertandingan yang selesai."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tie-Breaker Explanation Note */}
      <div className="p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-xl text-[11px] text-zinc-500 space-y-1">
        <p className="font-bold text-zinc-400">Aturan Penentuan Posisi Klasemen (Tie-Breaker):</p>
        <p>1. Total Poin Tertinggi (Placement Poin + Kill Poin)</p>
        <p>2. Jika poin sama: Total Kills Terbanyak</p>
        <p>3. Jika masih sama: Placement Ranking Terbaik</p>
        <p>4. Jika masih sama: Submisi Skor Terawal</p>
      </div>

      {/* 4. Modal Profil Karir Tim & Roster Pemain */}
      <TeamCareerModal
        tournamentId={tournamentId}
        teamId={selectedTeamId}
        onClose={() => setSelectedTeamId(null)}
      />
    </div>
  );
}
