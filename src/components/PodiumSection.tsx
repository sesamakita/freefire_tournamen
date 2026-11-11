"use client";

import Image from "next/image";
import { Trophy, Crown, Flame, Shield, Award } from "lucide-react";

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

interface PodiumSectionProps {
  standings: StandingTeam[];
  prizePool?: number;
  prizeDistribution?: Record<string, number>;
  onSelectTeam?: (teamId: string) => void;
}

export default function PodiumSection({
  standings,
  prizePool = 0,
  prizeDistribution = { "1": 0.5, "2": 0.3, "3": 0.2 },
  onSelectTeam,
}: PodiumSectionProps) {
  if (!standings || standings.length === 0) return null;

  const top1 = standings.find((s) => s.rank === 1);
  const top2 = standings.find((s) => s.rank === 2);
  const top3 = standings.find((s) => s.rank === 3);

  const calculatePrize = (rank: number) => {
    if (!prizePool || prizePool <= 0) return null;
    const ratioOrAmount = prizeDistribution[String(rank)];
    if (!ratioOrAmount) return null;
    return ratioOrAmount <= 1.0 ? Math.round(prizePool * ratioOrAmount) : Math.round(ratioOrAmount);
  };

  const prize1 = calculatePrize(1);
  const prize2 = calculatePrize(2);
  const prize3 = calculatePrize(3);

  return (
    <div className="card-glow p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl border border-amber-500/20 bg-gradient-to-b from-amber-950/20 via-zinc-950/80 to-zinc-950 space-y-5 sm:space-y-6">
      {/* Title */}
      <div className="text-center space-y-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider">
          <Crown className="w-3.5 h-3.5" />
          Hall of Fame &bull; Podium Juara
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
          Puncak Klasemen Turnamen
        </h2>
        <p className="text-xs text-zinc-400 max-w-md mx-auto">
          Tiga tim terbaik dengan perolehan poin dan kill tertinggi. Klik tim untuk melihat profil karir & roster.
        </p>
      </div>

      {/* Podium Grid */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end max-w-2xl mx-auto pt-4 sm:pt-8">
        {/* Juara 2 (Perak - Kiri) */}
        {top2 ? (
          <div
            onClick={() => onSelectTeam && onSelectTeam(top2.team_id)}
            className="flex flex-col items-center group cursor-pointer transition-all hover:-translate-y-1"
          >
            {/* Avatar / Logo */}
            <div className="relative mb-2">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-zinc-900 border-2 border-zinc-400/80 p-1 flex items-center justify-center shadow-lg shadow-zinc-400/10 overflow-hidden group-hover:border-zinc-300 transition-colors">
                {top2.logo_url ? (
                  <Image
                    src={top2.logo_url}
                    alt={top2.team_nama}
                    width={72}
                    height={72}
                    className="w-full h-full object-cover rounded-xl"
                  />
                ) : (
                  <span className="font-black text-zinc-300 text-lg">
                    {top2.team_nama.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-zinc-300 text-zinc-950 font-black text-[10px] shadow">
                #2
              </span>
            </div>

            {/* Pedestal Box */}
            <div className="w-full h-32 sm:h-40 rounded-t-2xl bg-gradient-to-t from-zinc-900 via-zinc-800/80 to-zinc-700/40 border-t-2 border-zinc-400 p-2 sm:p-3 text-center flex flex-col justify-between">
              <div>
                <p className="font-bold text-white text-xs sm:text-sm truncate" title={top2.team_nama}>
                  {top2.team_nama}
                </p>
                <p className="font-mono text-base sm:text-lg font-black text-amber-400 mt-0.5">
                  {top2.total_points} <span className="text-[10px] text-zinc-400 font-normal">PTS</span>
                </p>
                <p className="text-[10px] text-zinc-400 flex items-center justify-center gap-1 mt-0.5">
                  <Flame className="w-3 h-3 text-red-400" /> {top2.total_kills} Kills
                </p>
              </div>

              {prize2 && (
                <div className="py-1 px-1.5 rounded-lg bg-zinc-950/80 border border-zinc-700 text-[9px] sm:text-[10px] text-zinc-300 font-mono font-bold truncate">
                  Rp {prize2.toLocaleString("id-ID")}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-32 rounded-t-2xl bg-zinc-900/30 border-t border-zinc-800" />
        )}

        {/* Juara 1 (Emas - Tengah - Paling Tinggi) */}
        {top1 ? (
          <div
            onClick={() => onSelectTeam && onSelectTeam(top1.team_id)}
            className="flex flex-col items-center group cursor-pointer transition-all hover:-translate-y-1.5 z-10"
          >
            {/* Crown Icon */}
            <Crown className="w-5 h-5 sm:w-7 sm:h-7 text-amber-400 animate-bounce mb-1 drop-shadow-[0_0_12px_rgba(245,197,66,0.8)]" />

            {/* Avatar / Logo */}
            <div className="relative mb-2">
              <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-zinc-900 border-2 border-amber-400 p-1 flex items-center justify-center shadow-xl shadow-amber-500/30 overflow-hidden ring-2 sm:ring-4 ring-amber-400/20 group-hover:scale-105 transition-all">
                {top1.logo_url ? (
                  <Image
                    src={top1.logo_url}
                    alt={top1.team_nama}
                    width={96}
                    height={96}
                    className="w-full h-full object-cover rounded-xl"
                  />
                ) : (
                  <span className="font-black text-amber-400 text-2xl">
                    {top1.team_nama.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-zinc-950 font-black text-xs shadow-md shadow-amber-500/40">
                #1
              </span>
            </div>

            {/* Pedestal Box */}
            <div className="w-full h-40 sm:h-52 rounded-t-2xl bg-gradient-to-t from-amber-950/80 via-amber-900/40 to-amber-600/30 border-t-2 border-amber-400 p-2 sm:p-3 text-center flex flex-col justify-between shadow-2xl shadow-amber-500/20">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-300">
                  CHAMPION
                </span>
                <p className="font-bold text-white text-xs sm:text-base truncate mt-0.5" title={top1.team_nama}>
                  {top1.team_nama}
                </p>
                <p className="font-mono text-lg sm:text-2xl font-black text-amber-300 mt-1">
                  {top1.total_points} <span className="text-xs text-amber-400/70 font-normal">PTS</span>
                </p>
                <p className="text-[11px] text-amber-200/90 flex items-center justify-center gap-1 mt-0.5">
                  <Flame className="w-3.5 h-3.5 text-red-400" /> {top1.total_kills} Kills
                </p>
              </div>

              {prize1 && (
                <div className="py-1.5 px-2 rounded-lg bg-zinc-950/90 border border-amber-500/50 text-[10px] sm:text-xs text-amber-300 font-mono font-black truncate shadow">
                  Rp {prize1.toLocaleString("id-ID")}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-40 rounded-t-2xl bg-zinc-900/30 border-t border-zinc-800" />
        )}

        {/* Juara 3 (Perunggu - Kanan) */}
        {top3 ? (
          <div
            onClick={() => onSelectTeam && onSelectTeam(top3.team_id)}
            className="flex flex-col items-center group cursor-pointer transition-all hover:-translate-y-1"
          >
            {/* Avatar / Logo */}
            <div className="relative mb-2">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-zinc-900 border-2 border-amber-700/80 p-1 flex items-center justify-center shadow-lg shadow-amber-700/10 overflow-hidden group-hover:border-amber-600 transition-colors">
                {top3.logo_url ? (
                  <Image
                    src={top3.logo_url}
                    alt={top3.team_nama}
                    width={72}
                    height={72}
                    className="w-full h-full object-cover rounded-xl"
                  />
                ) : (
                  <span className="font-black text-amber-600 text-lg">
                    {top3.team_nama.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-amber-700 text-amber-100 font-black text-[10px] shadow">
                #3
              </span>
            </div>

            {/* Pedestal Box */}
            <div className="w-full h-28 sm:h-36 rounded-t-2xl bg-gradient-to-t from-zinc-900 via-amber-950/40 to-amber-900/20 border-t-2 border-amber-700 p-2 sm:p-3 text-center flex flex-col justify-between">
              <div>
                <p className="font-bold text-white text-xs sm:text-sm truncate" title={top3.team_nama}>
                  {top3.team_nama}
                </p>
                <p className="font-mono text-base sm:text-lg font-black text-amber-400 mt-0.5">
                  {top3.total_points} <span className="text-[10px] text-zinc-400 font-normal">PTS</span>
                </p>
                <p className="text-[10px] text-zinc-400 flex items-center justify-center gap-1 mt-0.5">
                  <Flame className="w-3 h-3 text-red-400" /> {top3.total_kills} Kills
                </p>
              </div>

              {prize3 && (
                <div className="py-1 px-1.5 rounded-lg bg-zinc-950/80 border border-zinc-700 text-[9px] sm:text-[10px] text-zinc-300 font-mono font-bold truncate">
                  Rp {prize3.toLocaleString("id-ID")}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-28 rounded-t-2xl bg-zinc-900/30 border-t border-zinc-800" />
        )}
      </div>
    </div>
  );
}
