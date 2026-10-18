import Link from "next/link";
import { notFound } from "next/navigation";
import { Trophy, Calendar, BarChart3, Home, Users } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function PublicTournamentLayout(props: any) {
  const { slug } = await props.params;
  const children = props.children;
  const admin = createAdminClient();

  const { data: tournament } = await admin
    .from("tournaments")
    .select("id, nama, slug, status, logo_url, banner_url, entry_fee, max_teams")
    .eq("slug", slug)
    .single();

  if (!tournament) notFound();

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col text-zinc-100 selection:bg-amber-500 selection:text-black">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
              <Trophy className="w-4 h-4 text-zinc-950 stroke-[2.5]" />
            </div>
            <span className="text-lg font-black tracking-tight text-white uppercase italic">
              Arena<span className="text-amber-500">Ku</span>
            </span>
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
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                Status: {tournament.status}
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
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
            <Link
              href={`/t/${slug}/klasemen`}
              className="py-3 border-b-2 border-amber-500 text-amber-400 flex items-center gap-1.5"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Klasemen Live
            </Link>
            <Link
              href={`/t/${slug}/jadwal`}
              className="py-3 border-b-2 border-transparent hover:text-amber-400 transition-colors flex items-center gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5" />
              Jadwal Pertandingan
            </Link>
          </nav>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8">
        {children}
      </main>

      {/* Public Footer */}
      <footer className="border-t border-zinc-900 py-6 text-center text-xs text-zinc-600">
        <p>&copy; 2026 ArenaKu &bull; Satu Sumber Kebenaran untuk Turnamen Free Fire</p>
      </footer>
    </div>
  );
}
