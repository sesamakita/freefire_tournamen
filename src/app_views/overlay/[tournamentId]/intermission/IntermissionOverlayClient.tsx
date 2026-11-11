"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Clock, Trophy, Flame, Sparkles, Megaphone, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Sponsor {
  id: string;
  name: string;
  logo_url: string;
  banner_url?: string | null;
  tier: "title" | "main" | "supporter" | "media_partner";
  external_url?: string | null;
  display_order: number;
}

interface TournamentData {
  id: string;
  nama: string;
  slug: string;
  format: string;
  live_title: string | null;
  intermission_active?: boolean;
  intermission_target_time?: string | null;
  intermission_title?: string | null;
  intermission_match_number?: number | null;
}

interface Props {
  tournament: TournamentData;
  initialSponsors: Sponsor[];
}

export default function IntermissionOverlayClient({
  tournament: initialTournament,
  initialSponsors,
}: Props) {
  const [tournament, setTournament] = useState<TournamentData>(initialTournament);
  const [sponsors, setSponsors] = useState<Sponsor[]>(initialSponsors);
  const [activeSponsorIndex, setActiveSponsorIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState<{ minutes: number; seconds: number; isExpired: boolean }>({
    minutes: 0,
    seconds: 0,
    isExpired: true,
  });

  // 1. Carousel Auto-slide tiap 6 detik
  useEffect(() => {
    if (sponsors.length <= 1) return;
    const interval = setInterval(() => {
      setActiveSponsorIndex((prev) => (prev + 1) % sponsors.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [sponsors.length]);

  // 2. Realtime listener Supabase untuk update timer / judul jeda
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`obs_intermission_${tournament.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tournaments",
          filter: `id=eq.${tournament.id}`,
        },
        (payload: any) => {
          if (payload.new) {
            setTournament((prev) => ({
              ...prev,
              ...payload.new,
            }));
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tournament_sponsors",
          filter: `tournament_id=eq.${tournament.id}`,
        },
        async () => {
          // Re-fetch sponsors on change
          try {
            const res = await fetch(`/api/tournaments/${tournament.id}/sponsors`);
            const data = await res.json();
            if (data.success && Array.isArray(data.data)) {
              setSponsors(data.data);
            }
          } catch (e) {
            console.error("Failed to re-fetch sponsors", e);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournament.id]);

  // 3. Countdown calculation
  useEffect(() => {
    const target = tournament.intermission_target_time
      ? new Date(tournament.intermission_target_time).getTime()
      : null;

    if (!target) {
      setTimeLeft({ minutes: 0, seconds: 0, isExpired: true });
      return;
    }

    const updateCountdown = () => {
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({ minutes: 0, seconds: 0, isExpired: true });
      } else {
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setTimeLeft({ minutes, seconds, isExpired: false });
      }
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [tournament.intermission_target_time]);

  const currentSponsor = sponsors.length > 0 ? sponsors[activeSponsorIndex] : null;
  const titleSponsor = sponsors.find((s) => s.tier === "title");

  const getTierLabel = (tier: string) => {
    switch (tier) {
      case "title":
        return "TITLE SPONSOR";
      case "main":
        return "MAIN PARTNER";
      case "media_partner":
        return "OFFICIAL MEDIA PARTNER";
      default:
        return "OFFICIAL SPONSOR";
    }
  };

  return (
    <div className="w-screen h-screen flex flex-col justify-between items-center p-8 bg-zinc-950 text-white select-none relative overflow-hidden font-sans">
      {/* Background Ambience Glow */}
      <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-red-600/15 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      {/* Top Header: Platform + Title Sponsor + Broadcast Badge */}
      <header className="w-full flex items-center justify-between z-20 border-b border-white/10 pb-5 px-4 backdrop-blur-md">
        <div className="flex items-center gap-6">
          <Image
            src="/images/logo-arenatempur.svg"
            alt="ARENA TEMPUR"
            width={180}
            height={40}
            priority
            className="h-9 w-auto object-contain drop-shadow"
          />

          {titleSponsor && (
            <div className="hidden sm:flex items-center gap-3 pl-6 border-l border-white/15">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                PRESENTED BY
              </span>
              <img
                src={titleSponsor.logo_url}
                alt={titleSponsor.name}
                className="h-8 max-w-[140px] object-contain drop-shadow"
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-black uppercase tracking-wider">
            <Trophy className="w-3.5 h-3.5" />
            {tournament.format === "lone_wolf_1v1" ? "1v1 LONE WOLF" : "FREE FIRE BATTLE ROYALE"}
          </div>

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-600/20 border border-red-500/40 text-red-400 font-black text-xs uppercase tracking-wider">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            COMMERCIAL BREAK
          </div>
        </div>
      </header>

      {/* Main Center Stage: Dual Split (Left: Countdown & Match Info, Right: Sponsor Showcase) */}
      <main className="w-full max-w-7xl flex-1 flex flex-col lg:flex-row items-center justify-between gap-12 my-auto z-10 px-4">
        {/* Left Column: Intermission Info & Big Countdown Timer */}
        <div className="flex-1 flex flex-col items-start space-y-6 text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-bold uppercase tracking-widest">
            <Clock className="w-4 h-4 text-amber-400" />
            {tournament.intermission_match_number
              ? `JEDA MENUJU MATCH ${tournament.intermission_match_number}`
              : "JEDA PERTANDINGAN"}
          </div>

          <h1 className="text-4xl lg:text-5xl font-black uppercase tracking-tight text-white drop-shadow-xl leading-tight">
            {tournament.intermission_title || "MATCH BERIKUTNYA SEGERA DIMULAI"}
          </h1>

          <p className="text-zinc-400 text-base max-w-md">
            Tetap stand by! Room sedang dipersiapkan oleh panitia. Nikmati pesan dari para sponsor resmi turnamen.
          </p>

          {/* Countdown Clock Box */}
          <div className="p-6 rounded-2xl bg-zinc-900/90 border border-red-500/30 shadow-2xl backdrop-blur-md flex items-center gap-6">
            <div className="flex flex-col items-center">
              <span className="text-5xl lg:text-6xl font-black text-amber-400 tracking-wider font-mono">
                {String(timeLeft.minutes).padStart(2, "0")}
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mt-1">
                MENIT
              </span>
            </div>

            <span className="text-4xl font-black text-zinc-600 pb-4">:</span>

            <div className="flex flex-col items-center">
              <span className="text-5xl lg:text-6xl font-black text-white tracking-wider font-mono">
                {String(timeLeft.seconds).padStart(2, "0")}
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mt-1">
                DETIK
              </span>
            </div>

            <div className="pl-6 border-l border-zinc-800 flex flex-col justify-center">
              <div className="flex items-center gap-1.5 text-xs font-bold text-red-400 uppercase">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                COUNTDOWN
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                {timeLeft.isExpired ? "Waktu jeda selesai" : "Menghitung mundur"}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: High Impact Sponsor Showcase Banner */}
        <div className="flex-1 w-full max-w-xl flex flex-col items-center">
          {currentSponsor ? (
            <div className="w-full relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-amber-500 rounded-2xl blur-lg opacity-40 animate-pulse transition duration-1000 group-hover:opacity-75" />

              <div className="relative rounded-2xl bg-zinc-900 border border-zinc-800 p-6 flex flex-col items-center text-center overflow-hidden shadow-2xl">
                {/* Badge Tier */}
                <div className="flex items-center justify-between w-full mb-4">
                  <span className="px-3 py-1 rounded bg-amber-500/20 border border-amber-500/40 text-amber-400 text-[11px] font-black uppercase tracking-widest">
                    {getTierLabel(currentSponsor.tier)}
                  </span>
                  <span className="text-xs text-zinc-400 font-semibold">
                    Iklan Resmi {activeSponsorIndex + 1} / {sponsors.length}
                  </span>
                </div>

                {/* Banner or Big Logo Display */}
                {currentSponsor.banner_url ? (
                  <div className="w-full h-56 rounded-xl overflow-hidden bg-zinc-950 flex items-center justify-center border border-zinc-800 relative">
                    <img
                      src={currentSponsor.banner_url}
                      alt={currentSponsor.name}
                      className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                    />
                  </div>
                ) : (
                  <div className="w-full h-56 rounded-xl bg-zinc-950/80 border border-zinc-800 flex flex-col items-center justify-center p-6 space-y-4">
                    <img
                      src={currentSponsor.logo_url}
                      alt={currentSponsor.name}
                      className="max-h-24 max-w-[240px] object-contain drop-shadow-2xl"
                    />
                    <h3 className="text-2xl font-black uppercase tracking-wider text-white">
                      {currentSponsor.name}
                    </h3>
                  </div>
                )}

                {/* Bottom Sponsor Info */}
                <div className="w-full mt-4 flex items-center justify-between text-left">
                  <div>
                    <h4 className="text-base font-bold text-white uppercase tracking-wide">
                      {currentSponsor.name}
                    </h4>
                    {currentSponsor.external_url && (
                      <p className="text-xs text-amber-400 font-mono truncate max-w-xs">
                        {currentSponsor.external_url.replace(/^https?:\/\//, "")}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-zinc-400 uppercase">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      TERVERIFIKASI
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Default Platform Card if no sponsor uploaded yet */
            <div className="w-full p-8 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-center space-y-4">
              <Megaphone className="w-12 h-12 text-amber-400 mx-auto opacity-70 animate-bounce" />
              <h3 className="text-xl font-black uppercase text-white">
                SLOT SPONSOR TERSEDIA
              </h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                Promosikan brand, produk, atau komunitas Anda di siaran langsung resmi turnamen ini.
                Hubungi panitia penyelenggara untuk pemesanan slot iklan.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Footer: Partner Strip / Ticker Carousel */}
      <footer className="w-full z-20 border-t border-white/10 pt-4 px-4 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-zinc-400 shrink-0">
          <Sparkles className="w-4 h-4 text-amber-400" />
          OFFICIAL PARTNERS:
        </div>

        <div className="flex-1 flex items-center justify-center gap-6 overflow-hidden px-4">
          {sponsors.length > 0 ? (
            sponsors.map((s) => (
              <div key={s.id} className="flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity">
                <img
                  src={s.logo_url}
                  alt={s.name}
                  className="h-6 max-w-[90px] object-contain brightness-90 hover:brightness-100"
                />
                <span className="text-[11px] font-bold text-zinc-300 hidden md:inline">
                  {s.name}
                </span>
              </div>
            ))
          ) : (
            <span className="text-xs text-zinc-500 font-medium">
              Arena Tempur Esports Network &bull; Menyelenggarakan Kompetisi Berkualitas
            </span>
          )}
        </div>

        <div className="text-[11px] font-mono text-zinc-400 shrink-0">
          POWERED BY <span className="font-bold text-red-500">ARENA TEMPUR</span>
        </div>
      </footer>
    </div>
  );
}
