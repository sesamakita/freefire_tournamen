"use client";

import { useState } from "react";
import { Trophy, Swords, Shield, Clock, CheckCircle2, ChevronRight, Lock, Key } from "lucide-react";

export interface BracketMatch {
  id: string;
  round_number: number;
  match_number: number;
  round_name: string;
  score_p1: number;
  score_p2: number;
  winner_id: string | null;
  status: "pending" | "ready" | "ongoing" | "completed";
  room_id?: string | null;
  room_pass?: string | null;
  jadwal?: string | null;
  screenshot_url?: string | null;
  player1: { id: string; nama: string; logo_url?: string | null } | null;
  player2: { id: string; nama: string; logo_url?: string | null } | null;
  winner: { id: string; nama: string } | null;
}

interface TournamentBracketViewProps {
  brackets: BracketMatch[];
  isAdmin?: boolean;
  onSelectMatch?: (match: BracketMatch) => void;
}

export default function TournamentBracketView({
  brackets,
  isAdmin = false,
  onSelectMatch,
}: TournamentBracketViewProps) {
  // Kelompokkan matches berdasarkan round_number
  const roundsMap = new Map<number, BracketMatch[]>();

  brackets.forEach((b) => {
    const list = roundsMap.get(b.round_number) || [];
    list.push(b);
    roundsMap.set(b.round_number, list);
  });

  const sortedRoundNumbers = Array.from(roundsMap.keys()).sort((a, b) => a - b);

  if (brackets.length === 0) {
    return (
      <div className="card-glow bg-zinc-950/80 p-12 text-center border border-zinc-800/80 rounded-2xl">
        <Swords className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
        <h3 className="font-heading text-lg font-bold text-white tracking-wide">
          Bagan Pertandingan Belum Dibuat
        </h3>
        <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">
          {isAdmin
            ? "Bagan dapat di-generate otomatis begitu kuota pendaftar terverifikasi sudah mencukupi."
            : "Panitia sedang memverifikasi peserta. Bagan pohon pertandingan akan muncul di sini saat babak 1 dimulai."}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Mobile Horizontal Scroll Hint */}
      <div className="sm:hidden flex items-center justify-between pb-3 text-[11px] text-zinc-400 font-medium">
        <span className="flex items-center gap-1.5 text-zinc-300 font-bold">
          <Swords className="w-3.5 h-3.5 text-amber-500" />
          Pohon Bagan Turnamen
        </span>
        <span className="text-amber-400/90 font-mono">
          Geser ke kanan &rarr;
        </span>
      </div>

      <div className="w-full overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-zinc-950 -mx-1 px-1 sm:mx-0 sm:px-0">
        <div className="min-w-[1100px] flex gap-8 items-start py-2 px-1">
        {sortedRoundNumbers.map((roundNum) => {
          const matches = roundsMap.get(roundNum) || [];
          const roundName = matches[0]?.round_name || `Babak ${roundNum}`;
          const isFinal = roundNum === sortedRoundNumbers[sortedRoundNumbers.length - 1];

          return (
            <div key={roundNum} className="flex-1 flex flex-col min-w-[240px] max-w-[280px]">
              {/* Header Babak */}
              <div className="mb-4 text-center">
                <div
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider font-heading uppercase border ${
                    isFinal
                      ? "bg-amber-500/15 text-amber-400 border-amber-500/40 shadow-lg shadow-amber-500/10"
                      : "bg-blue-950/50 text-blue-400 border-blue-800/50"
                  }`}
                >
                  {isFinal && <Trophy className="w-3.5 h-3.5" />}
                  {roundName}
                </div>
                <div className="text-[10px] text-zinc-500 mt-1">
                  {matches.length} Pertandingan
                </div>
              </div>

              {/* Daftar Pertandingan dalam Babak */}
              <div className="flex flex-col gap-6 justify-around flex-grow">
                {matches.map((match) => {
                  const p1IsWinner = match.winner_id && match.winner_id === match.player1?.id;
                  const p2IsWinner = match.winner_id && match.winner_id === match.player2?.id;

                  return (
                    <div
                      key={match.id}
                      onClick={() => onSelectMatch && onSelectMatch(match)}
                      className={`card-glow card-glow-hover relative bg-zinc-950/90 border rounded-xl p-3 transition-all ${
                        isAdmin ? "cursor-pointer hover:border-amber-500/80 hover:scale-[1.01]" : ""
                      } ${
                        match.status === "completed"
                          ? "border-zinc-800"
                          : match.status === "ongoing"
                          ? "border-amber-500/60 shadow-lg shadow-amber-500/10 animate-pulse"
                          : match.status === "ready"
                          ? "border-blue-500/50"
                          : "border-zinc-900 opacity-70"
                      }`}
                    >
                      {/* Baris Status Match */}
                      <div className="flex items-center justify-between text-[10px] text-zinc-500 pb-2 mb-2 border-b border-zinc-900">
                        <span className="font-mono">Match #{match.match_number}</span>
                        <span
                          className={`font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                            match.status === "completed"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : match.status === "ongoing"
                              ? "bg-amber-500/10 text-amber-400"
                              : match.status === "ready"
                              ? "bg-blue-500/10 text-blue-400"
                              : "bg-zinc-800 text-zinc-400"
                          }`}
                        >
                          {match.status === "completed"
                            ? "Selesai"
                            : match.status === "ongoing"
                            ? "Sedang Main"
                            : match.status === "ready"
                            ? "Siap"
                            : "Menunggu"}
                        </span>
                      </div>

                      {/* Player 1 */}
                      <div
                        className={`flex items-center justify-between p-2 rounded-lg transition-colors mb-1.5 ${
                          p1IsWinner
                            ? "bg-blue-500/15 border border-blue-500/40 text-white font-bold"
                            : match.player1
                            ? "bg-zinc-900/60 text-zinc-300"
                            : "bg-zinc-900/30 text-zinc-600 italic"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              p1IsWinner ? "bg-blue-400 shadow-[0_0_8px_#38bdf8]" : "bg-zinc-700"
                            }`}
                          />
                          <span className="text-xs truncate tracking-wide">
                            {match.player1?.nama || "TBD (Pemenang)"}
                          </span>
                        </div>
                        <span
                          className={`font-mono text-xs px-1.5 py-0.5 rounded font-bold ${
                            p1IsWinner
                              ? "bg-blue-500/30 text-blue-200"
                              : "bg-zinc-900 text-zinc-400"
                          }`}
                        >
                          {match.status === "completed" ? match.score_p1 : "-"}
                        </span>
                      </div>

                      {/* Player 2 */}
                      <div
                        className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                          p2IsWinner
                            ? "bg-blue-500/15 border border-blue-500/40 text-white font-bold"
                            : match.player2
                            ? "bg-zinc-900/60 text-zinc-300"
                            : "bg-zinc-900/30 text-zinc-600 italic"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              p2IsWinner ? "bg-blue-400 shadow-[0_0_8px_#38bdf8]" : "bg-zinc-700"
                            }`}
                          />
                          <span className="text-xs truncate tracking-wide">
                            {match.player2?.nama || "TBD (Pemenang)"}
                          </span>
                        </div>
                        <span
                          className={`font-mono text-xs px-1.5 py-0.5 rounded font-bold ${
                            p2IsWinner
                              ? "bg-blue-500/30 text-blue-200"
                              : "bg-zinc-900 text-zinc-400"
                          }`}
                        >
                          {match.status === "completed" ? match.score_p2 : "-"}
                        </span>
                      </div>

                      {/* Room ID Badge jika sudah siap */}
                      {match.room_id && (
                        <div className="mt-2.5 pt-2 border-t border-zinc-900 flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                          <span className="flex items-center gap-1 text-amber-400">
                            <Key className="w-3 h-3" /> Room: {match.room_id}
                          </span>
                          <span className="text-zinc-500">Pass: {match.room_pass}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  </div>
  );
}
