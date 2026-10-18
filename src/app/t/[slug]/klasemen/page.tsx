import Link from "next/link";
import { notFound } from "next/navigation";
import { Trophy, BarChart3, Flame, Shield, ArrowUpRight } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function PublicStandingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const admin = createAdminClient();

  // 1. Ambil data turnamen
  const { data: tournament } = await admin
    .from("tournaments")
    .select("id, nama, slug")
    .eq("slug", slug)
    .single();

  if (!tournament) notFound();

  // 2. Query view standings (On-the-fly calculation, BR-CLS-01)
  const { data: standings, error } = await admin
    .from("standings")
    .select("*")
    .eq("tournament_id", tournament.id)
    .order("rank", { ascending: true });

  const allStandings = standings || [];

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            Klasemen Resmi Turnamen (Live)
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Diperbarui secara real-time berdasarkan hasil match yang disetujui panitia
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 font-semibold">
            {allStandings.length} Tim Berkompetisi
          </span>
        </div>
      </div>

      {/* Standings Leaderboard Table (Mobile-First) */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/80 text-[10px] font-black uppercase tracking-wider text-zinc-400">
                <th className="py-3 px-3 text-center w-12">Rank</th>
                <th className="py-3 px-4">Nama Tim</th>
                <th className="py-3 px-3 text-center w-14">MP</th>
                <th className="py-3 px-3 text-center w-16">Kills</th>
                <th className="py-3 px-3 text-center w-16">Best</th>
                <th className="py-3 px-4 text-right w-20 text-amber-400">Total Poin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-medium">
              {allStandings.length > 0 ? (
                allStandings.map((team, idx) => {
                  const isTop1 = team.rank === 1;
                  const isTop2 = team.rank === 2;
                  const isTop3 = team.rank === 3;

                  return (
                    <tr
                      key={team.team_id || idx}
                      className={`hover:bg-zinc-800/40 transition-colors ${
                        isTop1 ? "bg-amber-500/5 font-semibold" : ""
                      }`}
                    >
                      {/* Rank */}
                      <td className="py-3.5 px-3 text-center">
                        {isTop1 ? (
                          <span className="w-7 h-7 rounded-lg bg-amber-500 text-zinc-950 font-black text-xs inline-flex items-center justify-center shadow-md shadow-amber-500/20">
                            1
                          </span>
                        ) : isTop2 ? (
                          <span className="w-7 h-7 rounded-lg bg-zinc-300 text-zinc-950 font-black text-xs inline-flex items-center justify-center">
                            2
                          </span>
                        ) : isTop3 ? (
                          <span className="w-7 h-7 rounded-lg bg-amber-700/80 text-white font-black text-xs inline-flex items-center justify-center">
                            3
                          </span>
                        ) : (
                          <span className="text-zinc-500 font-mono text-xs">
                            #{team.rank}
                          </span>
                        )}
                      </td>

                      {/* Tim */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          {team.logo_url ? (
                            <img
                              src={team.logo_url}
                              alt={team.team_nama || "Team"}
                              className="w-6 h-6 rounded-md object-cover border border-zinc-800"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-md bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-400">
                              {(team.team_nama || "T").slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <span className="text-sm font-bold text-white tracking-tight">
                            {team.team_nama}
                          </span>
                        </div>
                      </td>

                      {/* Match Played */}
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
                        <span className="font-mono text-base font-black text-amber-400">
                          {team.total_points}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-zinc-500">
                    Belum ada data pertandingan yang selesai.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tie-Breaker Explanation Note (BR-CLS-03) */}
      <div className="p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-xl text-[11px] text-zinc-500 space-y-1">
        <p className="font-bold text-zinc-400">Aturan Penentuan Posisi Klasemen (Tie-Breaker):</p>
        <p>1. Total Poin Tertinggi (Placement Poin + Kill Poin)</p>
        <p>2. Jika poin sama: Total Kills Terbanyak</p>
        <p>3. Jika masih sama: Placement Ranking Terbaik</p>
        <p>4. Jika masih sama: Submisi Skor Terawal</p>
      </div>
    </div>
  );
}
