"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  Trophy,
  Users,
  Flame,
  Award,
  Shield,
  Clock,
  Loader2,
  X,
  Target,
  Sparkles,
  Zap,
} from "lucide-react";

interface TeamCareerModalProps {
  tournamentId: string;
  teamId: string | null;
  onClose: () => void;
}

export default function TeamCareerModal({
  tournamentId,
  teamId,
  onClose,
}: TeamCareerModalProps) {
  const [data, setData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"roster" | "history">("roster");

  useEffect(() => {
    if (!teamId) {
      setData(null);
      return;
    }

    const fetchTeamStats = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/tournaments/${tournamentId}/teams/${teamId}/stats`);
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        }
      } catch (err) {
        console.error("Gagal memuat profil karir tim:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTeamStats();
  }, [tournamentId, teamId]);

  if (!teamId) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl sm:rounded-3xl max-w-2xl w-full p-4 sm:p-6 space-y-4 sm:space-y-5 shadow-2xl max-h-[85vh] sm:max-h-[90vh] overflow-y-auto">
        {/* Header Modal */}
        <div className="flex items-start justify-between border-b border-zinc-800 pb-4">
          {isLoading || !data ? (
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
              <span className="text-sm text-zinc-400">Memuat profil karir tim...</span>
            </div>
          ) : (
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-zinc-950 border border-zinc-800 p-1 flex items-center justify-center shrink-0 overflow-hidden">
                {data.team.logo_url ? (
                  <Image
                    src={data.team.logo_url}
                    alt={data.team.nama}
                    width={56}
                    height={56}
                    className="w-full h-full object-cover rounded-xl"
                  />
                ) : (
                  <span className="font-black text-amber-500 text-lg">
                    {data.team.nama.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                    {data.team.nama}
                  </h3>
                  {data.summary.rank && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-black text-[11px]">
                      Rank #{data.summary.rank}
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Kapten: <strong className="text-zinc-200">{data.team.kapten_nama}</strong>
                </p>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        {!isLoading && data && (
          <div className="space-y-5">
            {/* Badges / Pencapaian Gamifikasi */}
            {data.badges && data.badges.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  Lencana Prestasi Tim (Badges)
                </span>
                <div className="flex flex-wrap gap-2">
                  {data.badges.map((b: any) => {
                    const rarityColors = {
                      gold: "bg-amber-500/15 border-amber-500/40 text-amber-300 ring-1 ring-amber-500/20",
                      purple: "bg-purple-500/15 border-purple-500/40 text-purple-300 ring-1 ring-purple-500/20",
                      blue: "bg-blue-500/15 border-blue-500/40 text-blue-300 ring-1 ring-blue-500/20",
                    };

                    return (
                      <div
                        key={b.id}
                        className={`px-2.5 py-1 rounded-xl border text-xs font-semibold flex items-center gap-1.5 shadow-sm ${
                          rarityColors[b.rarity as keyof typeof rarityColors] || "bg-zinc-800 text-zinc-200"
                        }`}
                        title={b.desc}
                      >
                        <span>{b.icon}</span>
                        <span>{b.name}</span>
                        <span className="hidden sm:inline text-[10px] text-zinc-400 font-normal">({b.desc})</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tactical Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 bg-zinc-950 border border-zinc-800/80 rounded-2xl text-center">
                <p className="text-[10px] font-bold text-zinc-500 uppercase">Total Poin</p>
                <p className="font-mono text-xl font-black text-amber-400 mt-0.5">
                  {data.summary.total_points}
                </p>
              </div>

              <div className="p-3 bg-zinc-950 border border-zinc-800/80 rounded-2xl text-center">
                <p className="text-[10px] font-bold text-zinc-500 uppercase">Total Kills</p>
                <p className="font-mono text-xl font-black text-red-400 mt-0.5">
                  {data.summary.total_kills}
                </p>
              </div>

              <div className="p-3 bg-zinc-950 border border-zinc-800/80 rounded-2xl text-center">
                <p className="text-[10px] font-bold text-zinc-500 uppercase">Booyah</p>
                <p className="font-mono text-xl font-black text-emerald-400 mt-0.5">
                  {data.summary.booyah_count}x
                </p>
              </div>

              <div className="p-3 bg-zinc-950 border border-zinc-800/80 rounded-2xl text-center">
                <p className="text-[10px] font-bold text-zinc-500 uppercase">Avg Kills / Match</p>
                <p className="font-mono text-xl font-black text-white mt-0.5">
                  {data.summary.avg_kills}
                </p>
              </div>
            </div>

            {/* Tabs Selector */}
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
              <button
                type="button"
                onClick={() => setActiveTab("roster")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "roster"
                    ? "bg-amber-500 text-zinc-950"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Susunan Roster ({data.roster.length} Pemain)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("history")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "history"
                    ? "bg-amber-500 text-zinc-950"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Riwayat Ronde ({data.match_history.length} Match)
              </button>
            </div>

            {/* Tab 1: Roster Pemain */}
            {activeTab === "roster" && (
              <div className="space-y-2">
                {data.roster.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic p-4 text-center">
                    Belum ada anggota roster yang didaftarkan.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {data.roster.map((member: any) => (
                      <div
                        key={member.id}
                        className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between text-xs"
                      >
                        <div className="space-y-0.5">
                          <p className="font-bold text-white flex items-center gap-1.5">
                            <span>{member.ign}</span>
                            {member.is_substitute && (
                              <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 text-[10px]">
                                Cadangan
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] font-mono text-zinc-400">
                            UID: {member.uid_game}
                          </p>
                        </div>

                        <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold uppercase text-[10px]">
                          {member.role_tim}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Riwayat Ronde Match */}
            {activeTab === "history" && (
              <div className="space-y-2">
                {data.match_history.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic p-4 text-center">
                    Belum ada pertandingan yang selesai dan diverifikasi untuk tim ini.
                  </p>
                ) : (
                  <div className="divide-y divide-zinc-800 border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-950 text-xs">
                    {data.match_history.map((m: any) => {
                      const isBooyah = m.placement === 1;
                      return (
                        <div
                          key={m.id}
                          className={`p-3.5 flex items-center justify-between gap-3 ${
                            isBooyah ? "bg-amber-500/5" : ""
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-white">{m.match_nama}</span>
                              <span className="text-[10px] text-zinc-500">
                                (Round {m.round})
                              </span>
                              {isBooyah && (
                                <span className="px-1.5 py-0.2 rounded bg-amber-500 text-zinc-950 font-black text-[10px] flex items-center gap-0.5">
                                  👑 Booyah
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-zinc-400">
                              Placement: <strong>#{m.placement}</strong> &bull; Kills: <strong>{m.kills}</strong>
                            </p>
                          </div>

                          <div className="text-right">
                            <span className="font-mono text-sm font-bold text-amber-400">
                              +{m.points} PTS
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
