"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Trophy, Swords, Zap, Shield } from "lucide-react";

interface BracketMatch {
  id: string;
  round_number: number;
  match_number: number;
  round_name: string;
  score_p1: number | null;
  score_p2: number | null;
  winner_id: string | null;
  status: string;
  player1?: { id: string; nama: string; logo_url: string | null } | null;
  player2?: { id: string; nama: string; logo_url: string | null } | null;
}

interface Props {
  tournamentId: string;
  tournamentNama: string;
}

export default function BracketOverlayClient({
  tournamentId,
  tournamentNama,
}: Props) {
  const [brackets, setBrackets] = useState<BracketMatch[]>([]);
  const [activeMatch, setActiveMatch] = useState<BracketMatch | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchBracket = async () => {
      try {
        const res = await fetch(`/api/tournaments/${tournamentId}/bracket`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (json.success && isMounted) {
          const list: BracketMatch[] = json.data?.brackets || [];
          setBrackets(list);

          // Cari match yang sedang ongoing terlebih dahulu
          const ongoing = list.find((m) => m.status === "ongoing" && m.player1 && m.player2);
          if (ongoing) {
            setActiveMatch(ongoing);
          } else {
            // Ambil match yang ada 2 pemainnya dan belum selesai, atau match terakhir yang selesai
            const playable = list.find((m) => m.player1 && m.player2 && m.status !== "selesai");
            if (playable) {
              setActiveMatch(playable);
            } else {
              const lastDone = [...list].reverse().find((m) => m.player1 && m.player2);
              setActiveMatch(lastDone || list[0] || null);
            }
          }
        }
      } catch (err) {
        console.error("Gagal polling bracket overlay:", err);
      }
    };

    fetchBracket();
    const interval = setInterval(fetchBracket, 6000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [tournamentId]);

  const p1 = activeMatch?.player1;
  const p2 = activeMatch?.player2;
  const score1 = activeMatch?.score_p1 ?? 0;
  const score2 = activeMatch?.score_p2 ?? 0;

  return (
    <div className="w-full min-h-screen p-6 flex flex-col justify-start items-center bg-transparent pointer-events-none select-none">
      {/* Top Center Duel Card HUD */}
      <div className="w-full max-w-4xl rounded-2xl overflow-hidden border border-white/20 bg-zinc-950/95 backdrop-blur-2xl shadow-2xl shadow-black mt-2">
        {/* Header HUD */}
        <div className="px-6 py-2.5 bg-gradient-to-r from-red-950 via-zinc-900 to-amber-950 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-red-400">
              BY ONE 1V1 DUEL
            </span>
            <div className="h-3 w-px bg-white/20" />
            <span className="text-xs font-bold text-white">
              {tournamentNama}
            </span>
          </div>

          <div className="text-[11px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20">
            {activeMatch?.round_name || "Babak Pertandingan"}
          </div>
        </div>

        {/* Duel Match Body */}
        <div className="p-4 grid grid-cols-11 items-center gap-4">
          {/* Player 1 */}
          <div className="col-span-4 flex items-center gap-3 justify-end">
            <div className="text-right">
              <span className="text-base sm:text-lg font-black text-white tracking-tight block">
                {p1?.nama || "TBD Player 1"}
              </span>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Fighter 1
              </span>
            </div>
            {p1?.logo_url ? (
              <div className="w-12 h-12 rounded-xl overflow-hidden relative border border-white/15 bg-zinc-900 shrink-0">
                <Image src={p1.logo_url} alt={p1.nama} fill sizes="48px" className="object-cover" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-white/15 flex items-center justify-center text-sm font-black text-amber-400 shrink-0">
                {p1?.nama?.slice(0, 2).toUpperCase() || "P1"}
              </div>
            )}
          </div>

          {/* Skor Center Board */}
          <div className="col-span-3 flex flex-col items-center justify-center">
            <div className="flex items-center gap-3 px-5 py-2 rounded-xl bg-zinc-900/90 border border-white/15 shadow-inner">
              <span className="text-2xl sm:text-3xl font-black font-mono text-white">
                {score1}
              </span>
              <span className="text-zinc-500 font-bold text-sm">:</span>
              <span className="text-2xl sm:text-3xl font-black font-mono text-white">
                {score2}
              </span>
            </div>
            <span className="text-[10px] font-bold text-zinc-400 mt-1 uppercase tracking-wider">
              {activeMatch?.status === "selesai" ? "MATCH SELESAI" : "CURRENT ROUND"}
            </span>
          </div>

          {/* Player 2 */}
          <div className="col-span-4 flex items-center gap-3 justify-start">
            {p2?.logo_url ? (
              <div className="w-12 h-12 rounded-xl overflow-hidden relative border border-white/15 bg-zinc-900 shrink-0">
                <Image src={p2.logo_url} alt={p2.nama} fill sizes="48px" className="object-cover" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-white/15 flex items-center justify-center text-sm font-black text-amber-400 shrink-0">
                {p2?.nama?.slice(0, 2).toUpperCase() || "P2"}
              </div>
            )}
            <div className="text-left">
              <span className="text-base sm:text-lg font-black text-white tracking-tight block">
                {p2?.nama || "TBD Player 2"}
              </span>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Fighter 2
              </span>
            </div>
          </div>
        </div>

        {/* Footer HUD Rules */}
        <div className="px-6 py-2 bg-black/60 border-t border-white/10 flex items-center justify-between text-[10px] font-bold text-zinc-400">
          <span>🔫 Shotgun 2 (M1887) & Desert Eagle Wajib</span>
          <span>⚡ No Character Skill & No Pay-to-Win Properties</span>
          <span>🛡️ Gloo Wall Bebas & Anti-Stalling</span>
        </div>
      </div>
    </div>
  );
}
