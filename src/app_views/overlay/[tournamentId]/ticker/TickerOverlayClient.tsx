"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Radio, Flame, ShieldAlert, Trophy, Swords, Zap, Sparkles } from "lucide-react";

interface Sponsor {
  id: string;
  name: string;
  logo_url: string;
  tier: string;
}

interface Props {
  tournament: {
    id: string;
    nama: string;
    format: string;
    live_title: string | null;
    is_live: boolean;
  };
  initialSponsors?: Sponsor[];
}

export default function TickerOverlayClient({ tournament, initialSponsors = [] }: Props) {
  const [currentInfo, setCurrentInfo] = useState(tournament);
  const [sponsors, setSponsors] = useState<Sponsor[]>(initialSponsors);

  // Polling data turnamen & sponsor tiap 10 detik
  useEffect(() => {
    let isMounted = true;
    const fetchTournament = async () => {
      try {
        const [resTourn, resSponsors] = await Promise.all([
          fetch(`/api/tournaments/${tournament.id}`),
          fetch(`/api/tournaments/${tournament.id}/sponsors`),
        ]);
        const jsonTourn = await resTourn.json();
        const jsonSponsors = await resSponsors.json();

        if (jsonTourn.success && isMounted && jsonTourn.data) {
          setCurrentInfo({
            id: jsonTourn.data.id,
            nama: jsonTourn.data.nama,
            format: jsonTourn.data.format,
            live_title: jsonTourn.data.live_title,
            is_live: jsonTourn.data.is_live,
          });
        }

        if (jsonSponsors.success && isMounted && Array.isArray(jsonSponsors.data)) {
          setSponsors(jsonSponsors.data);
        }
      } catch (err) {
        console.error("Gagal polling ticker:", err);
      }
    };

    const interval = setInterval(fetchTournament, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [tournament.id]);

  const isLoneWolf = currentInfo.format === "lone_wolf_1v1";
  const titleSponsor = sponsors.find((s) => s.tier === "title");

  return (
    <div className="fixed bottom-0 left-0 right-0 w-full p-4 pointer-events-none select-none flex flex-col justify-end bg-transparent">
      {/* Lower Third Main Container */}
      <div className="max-w-7xl mx-auto w-full rounded-2xl overflow-hidden border border-white/20 bg-zinc-950/95 backdrop-blur-2xl shadow-2xl shadow-black">
        {/* Bar Atas: Brand + Judul Match Aktif + Title Sponsor */}
        <div className="px-6 py-3.5 bg-gradient-to-r from-red-950/90 via-zinc-900/90 to-amber-950/90 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-red-600 text-white font-black text-xs tracking-wider shadow-md shadow-red-600/30 uppercase">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              LIVE
            </div>
            <div className="h-4 w-px bg-white/20" />
            <span className="text-xs font-black text-amber-400 uppercase tracking-widest">
              ARENA TEMPUR
            </span>
            <div className="h-4 w-px bg-white/20" />
            <h2 className="text-sm font-bold text-white tracking-tight">
              {currentInfo.live_title || currentInfo.nama}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {titleSponsor && (
              <div className="flex items-center gap-2 px-3 py-1 rounded bg-black/40 border border-white/10">
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                  SPONSORED BY
                </span>
                <img
                  src={titleSponsor.logo_url}
                  alt={titleSponsor.name}
                  className="h-5 max-w-[100px] object-contain drop-shadow"
                />
              </div>
            )}
            <span className="px-3 py-1 rounded-md bg-white/5 border border-white/10 text-[11px] font-bold text-zinc-300">
              {isLoneWolf ? "👑 King of By One (1v1)" : "🔥 Free Fire Battle Royale"}
            </span>
          </div>
        </div>

        {/* Bar Bawah: Running Ticker Marquee */}
        <div className="px-6 py-2 bg-black/60 flex items-center overflow-hidden">
          <div className="flex items-center gap-2 shrink-0 pr-4 border-r border-white/10 text-[11px] font-black text-amber-400 uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5 fill-amber-400" />
            INFORMASI RESMI
          </div>

          <div className="overflow-hidden whitespace-nowrap w-full pl-4">
            <div className="animate-marquee text-xs font-semibold text-zinc-300 space-x-12 inline-block">
              <span>
                🏆 <strong>Turnamen:</strong> {currentInfo.nama}
              </span>
              {sponsors.length > 0 && (
                <span>
                  ✨ <strong>Official Partners:</strong> {sponsors.map((s) => s.name).join(" • ")}
                </span>
              )}
              <span>
                🔑 <strong>Room ID & Password:</strong> Hanya dibagikan melalui Portal Kapten resmi di Arena Tempur
              </span>
              <span>
                🚫 <strong>Fairplay Rule:</strong> Dilarang keras menggunakan script/config ilegal, emulator PC, atau teaming
              </span>
              <span>
                🌐 <strong>Website Resmi:</strong> arenatempur.com &bull; Satu Sumber Kebenaran Turnamen Esports
              </span>
              <span>
                📊 <strong>Klasemen Live:</strong> Cek ranking real-time langsung di web resmi Arena Tempur
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
