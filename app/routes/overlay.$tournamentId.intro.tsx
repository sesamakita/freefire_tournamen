import { useLoaderData } from "react-router";
import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { Trophy, Radio, Flame, Sparkles } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";

export const meta: MetaFunction = () => {
  return [
    { title: "Starting Soon Overlay — OBS Arena Tempur" },
    { name: "robots", content: "noindex, nofollow" },
  ];
};

export async function loader({ params }: LoaderFunctionArgs) {
  const { tournamentId } = params;
  if (!tournamentId) {
    throw new Response("Tournament ID diperlukan", { status: 400 });
  }

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any;

  const { data: tournament } = await db
    .from("tournaments")
    .select("id, nama, slug, format, live_title")
    .eq("id", tournamentId)
    .maybeSingle();

  if (!tournament) {
    throw new Response("Turnamen tidak ditemukan", { status: 404 });
  }

  return { tournament };
}

export default function IntroOverlayPage() {
  const { tournament } = useLoaderData<typeof loader>();
  const isLoneWolf = tournament.format === "lone_wolf_1v1";

  return (
    <div className="w-screen h-screen flex flex-col justify-between items-center p-12 bg-zinc-950/95 text-white select-none relative overflow-hidden">
      {/* Background Ambience Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-red-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Top Header */}
      <div className="w-full flex items-center justify-between z-10 border-b border-white/10 pb-6">
        <div className="flex items-center gap-3">
          <img
            src="/images/logo-arenatempur.svg"
            alt="ARENA TEMPUR"
            className="h-8 w-auto object-contain"
          />
        </div>

        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-600/20 border border-red-500/40 text-red-400 font-bold text-xs uppercase tracking-wider">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
          <span>OFFICIAL BROADCAST</span>
        </div>
      </div>

      {/* Center Hero: Starting Soon */}
      <div className="flex flex-col items-center text-center space-y-6 z-10 max-w-2xl">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-widest font-heading">
          <Radio className="w-3.5 h-3.5 text-red-500 animate-pulse" />
          <span>SIARAN SEGERA DIMULAI</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black font-headline tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-zinc-100 to-zinc-400">
          {tournament.live_title || tournament.nama}
        </h1>

        <p className="text-sm sm:text-base text-zinc-400 max-w-lg font-medium">
          {isLoneWolf
            ? "Pertarungan Duel 1v1 King of By One Free Fire akan segera berlangsung. Siapkan tim dan pantau bagan eliminasi secara langsung."
            : "Pertandingan Battle Royale Free Fire akan segera dimulai. Pantau perolehan poin dan kills secara real-time di Arena Tempur."}
        </p>

        <div className="pt-4 flex items-center gap-6 text-xs text-zinc-500 font-mono uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            Fair Play & Official Rule
          </span>
          <span>&bull;</span>
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-red-500" />
            Live Real-time Scoring
          </span>
        </div>
      </div>

      {/* Bottom Footer HUD */}
      <div className="w-full flex items-center justify-between z-10 border-t border-white/10 pt-6 text-xs text-zinc-500 font-mono">
        <div>
          <span>TOURNAMENT ID: </span>
          <span className="text-zinc-300 font-bold">{tournament.id.slice(0, 8)}</span>
        </div>

        <div className="flex items-center gap-2 text-zinc-400">
          <Flame className="w-4 h-4 text-amber-500" />
          <span className="font-sans font-bold text-white tracking-wide">
            POWERED BY ARENA TEMPUR ESPORTS
          </span>
        </div>
      </div>
    </div>
  );
}
