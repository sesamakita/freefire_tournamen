import Link from "next/link";
import { Trophy, ShieldCheck } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background ambient decorative glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-amber-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-20 right-0 w-[400px] h-[400px] bg-orange-600/10 blur-[140px] rounded-full pointer-events-none" />

      {/* Header / Brand */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10 px-4">
        <Link href="/" className="inline-flex items-center gap-2 group mb-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
            <Trophy className="w-6 h-6 text-zinc-950 stroke-[2.5]" />
          </div>
          <span className="text-2xl font-black tracking-tight text-white uppercase italic font-headline">
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
        <div className="bg-zinc-900/90 backdrop-blur-xl py-8 px-5 sm:px-10 shadow-2xl rounded-2xl border border-zinc-800/80">
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

