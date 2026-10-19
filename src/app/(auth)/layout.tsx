import Link from "next/link";
import { Trophy, ShieldCheck } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden bg-tactical-grid">
      {/* Ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[620px] h-[320px] bg-amber-500/15 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-24 right-0 w-[420px] h-[420px] bg-orange-600/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/40 via-zinc-950/70 to-zinc-950 pointer-events-none" />

      {/* Header / Brand */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10 px-4">
        <Link href="/" className="inline-flex items-center gap-2 group mb-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
            <Trophy className="w-6 h-6 text-zinc-950 stroke-[2.5]" />
          </div>
          <span className="text-2xl font-black tracking-tight text-white uppercase font-headline">
            Arena<span className="text-amber-500">Ku</span>
          </span>
        </Link>
        <p className="text-xs text-zinc-400 font-medium tracking-wide flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-500 inline" />
          Satu Sumber Kebenaran untuk Turnamen Free Fire
        </p>
      </div>

      {/* Main card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0 z-10">
        <div className="card-glow py-8 px-5 sm:px-10 rounded-2xl edge-top-glow">
          {children}
        </div>
        
        {/* Footer info */}
        <p className="text-center text-xs text-zinc-500 mt-6">
          &copy; 2026 ArenaKu Platform. All rights reserved.
        </p>
      </div>
    </div>
  );
}

