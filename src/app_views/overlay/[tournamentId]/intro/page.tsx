import { notFound } from "next/navigation";
import Image from "next/image";
import { Trophy, Radio, Flame, Sparkles } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = {
  title: "Starting Soon Overlay — OBS Arena Tempur",
  robots: "noindex, nofollow",
};

export default async function IntroOverlayPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = await params;
  const admin = createAdminClient();
  const db = admin as any;

  const { data: tournament } = await db
    .from("tournaments")
    .select("id, nama, slug, format, live_title")
    .eq("id", tournamentId)
    .maybeSingle();

  if (!tournament) notFound();

  const isLoneWolf = tournament.format === "lone_wolf_1v1";

  return (
    <div className="w-screen h-screen flex flex-col justify-between items-center p-12 bg-zinc-950/95 text-white select-none relative overflow-hidden">
      {/* Background Ambience Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-red-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Top Header */}
      <div className="w-full flex items-center justify-between z-10 border-b border-white/10 pb-6">
        <div className="flex items-center gap-3">
          <Image
            src="/images/logo-arenatempur.svg"
            alt="ARENA TEMPUR"
            width={180}
            height={36}
            priority
            className="h-8 w-auto object-contain"
          />
        </div>

        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-600/20 border border-red-500/40 text-red-400 font-bold text-xs uppercase tracking-wider">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
          OFFICIAL BROADCAST
        </div>
      </div>

      {/* Center Main Stage */}
      <div className="flex flex-col items-center text-center z-10 max-w-3xl space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-black uppercase tracking-widest">
          <Trophy className="w-4 h-4" />
          {isLoneWolf ? "KING OF BY ONE (1V1)" : "FREE FIRE BATTLE ROYALE"}
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white uppercase drop-shadow-2xl">
          {tournament.live_title || tournament.nama}
        </h1>

        <div className="space-y-3">
          <p className="text-xl sm:text-2xl font-bold text-amber-400 uppercase tracking-widest animate-pulse">
            SIARAN SEGERA DIMULAI &bull; STAND BY
          </p>
          <p className="text-sm text-zinc-400 max-w-lg mx-auto">
            Room sedang dipersiapkan oleh panitia. Pastikan seluruh kapten tim telah standby di dalam custom room.
          </p>
        </div>

        {/* Animated Soundwave / Radar Indicator */}
        <div className="flex items-center gap-1.5 h-8 pt-4">
          {[40, 75, 30, 90, 60, 100, 45, 80, 55, 95, 35, 70, 85, 50].map((h, i) => (
            <span
              key={i}
              className="w-1.5 bg-gradient-to-t from-red-600 to-amber-500 rounded-full animate-pulse"
              style={{
                height: `${h}%`,
                animationDelay: `${(i * 0.15).toFixed(2)}s`,
                animationDuration: "1.2s",
              }}
            />
          ))}
        </div>
      </div>

      {/* Bottom Footer Info */}
      <div className="w-full flex items-center justify-between z-10 border-t border-white/10 pt-6 text-xs text-zinc-400 font-medium">
        <div className="flex items-center gap-2">
          <span>Website Resmi:</span>
          <strong className="text-white font-mono">arenatempur.com</strong>
        </div>
        <div>
          <span>Fairplay & Pure Mechanical Skills &bull; No Cheats Allowed</span>
        </div>
      </div>
    </div>
  );
}
