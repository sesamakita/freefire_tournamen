import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Trophy, Calendar, BarChart3, Home, Users, Radio } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function PublicTournamentLayout(props: any) {
  const { slug } = await props.params;
  const children = props.children;
  const admin = createAdminClient();
  const db = admin as any;

  const { data: tournament } = await db
    .from("tournaments")
    .select("id, nama, slug, status, logo_url, banner_url, entry_fee, max_teams, format, is_live")
    .eq("slug", slug)
    .single();

  if (!tournament) notFound();

  const isLoneWolf = tournament.format === "lone_wolf_1v1";

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col text-zinc-100 selection:bg-[#DA292A] selection:text-white">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <Image
              src="/images/logo-arenatempur.svg"
              alt="ARENA TEMPUR"
              width={180}
              height={30}
              priority
              className="h-7 sm:h-8 w-auto object-contain transition-transform group-hover:scale-105"
            />
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors"
            >
              Portal Kapten
            </Link>
            <Link
              href="/register"
              className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition-colors"
            >
              Daftar Turnamen
            </Link>
          </div>
        </div>
      </header>

      {/* Tournament Navigation Header */}
      <div className="border-b border-zinc-800/80 bg-zinc-900/40">
        <div className="max-w-5xl mx-auto px-4 pt-6 pb-0">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center font-bold text-amber-500 border border-zinc-700">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                {isLoneWolf ? "Mode: King of By One (1v1)" : "Mode: Battle Royale"} • {tournament.status}
              </span>
              <h1 className="text-2xl sm:text-3xl text-white tracking-tight mt-1">
                {tournament.nama}
              </h1>
            </div>
          </div>

          {/* Sub Navigation Tabs */}
          <nav className="flex items-center gap-6 text-xs font-bold border-b border-zinc-800/80">
            <Link
              href={`/t/${slug}`}
              className="py-3 border-b-2 border-transparent hover:text-amber-400 transition-colors flex items-center gap-1.5"
            >
              <Home className="w-3.5 h-3.5" />
              Ikhtisar
            </Link>

            {isLoneWolf ? (
              <Link
                href={`/t/${slug}/bracket`}
                className="py-3 border-b-2 border-amber-500 text-amber-400 flex items-center gap-1.5"
              >
                <Trophy className="w-3.5 h-3.5" />
                Bagan Gugur (Bracket)
              </Link>
            ) : (
              <Link
                href={`/t/${slug}/klasemen`}
                className="py-3 border-b-2 border-amber-500 text-amber-400 flex items-center gap-1.5"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Klasemen Live
              </Link>
            )}

            <Link
              href={`/t/${slug}/jadwal`}
              className="py-3 border-b-2 border-transparent hover:text-amber-400 transition-colors flex items-center gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5" />
              Jadwal Pertandingan
            </Link>

            <Link
              href={`/t/${slug}/live`}
              className="py-3 border-b-2 border-transparent hover:text-red-400 transition-colors flex items-center gap-1.5 relative group"
            >
              <Radio className={`w-3.5 h-3.5 ${tournament.is_live ? "text-red-500 animate-pulse" : "text-zinc-400 group-hover:text-red-400"}`} />
              <span>Live Stream</span>
              {tournament.is_live && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-red-600 text-white animate-pulse">
                  LIVE
                </span>
              )}
            </Link>
          </nav>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8">
        {children}
      </main>

      {/* Public Footer */}
      <footer className="border-t border-zinc-900 py-6 text-center text-xs text-zinc-500">
        <p>&copy; 2026 Arena Tempur &bull; Satu Sumber Kebenaran untuk Turnamen Free Fire</p>
      </footer>
    </div>
  );
}
