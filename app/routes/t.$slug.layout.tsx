import { Link, Outlet, useLoaderData, useLocation } from "react-router";
import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { Trophy, Calendar, BarChart3, Home, Radio } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data?.tournament) {
    return [{ title: "Turnamen Tidak Ditemukan — Arena Tempur" }];
  }
  return [
    { title: `${data.tournament.nama} — Arena Tempur` },
    {
      name: "description",
      content: `Ikuti klasemen, jadwal, dan live pertandingan turnamen ${data.tournament.nama} di Arena Tempur.`,
    },
  ];
};

export async function loader({ params }: LoaderFunctionArgs) {
  const { slug } = params;
  if (!slug) {
    throw new Response("Slug turnamen tidak ditemukan", { status: 404 });
  }

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any;

  const { data: tournament } = await db
    .from("tournaments")
    .select("id, nama, slug, status, logo_url, banner_url, entry_fee, max_teams, format, is_live")
    .eq("slug", slug)
    .single();

  if (!tournament) {
    throw new Response("Turnamen tidak ditemukan", { status: 404 });
  }

  return { tournament };
}

export default function PublicTournamentLayout() {
  const { tournament } = useLoaderData<typeof loader>();
  const location = useLocation();
  const slug = tournament.slug;
  const isLoneWolf = tournament.format === "lone_wolf_1v1";
  const pathname = location.pathname;

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col text-zinc-100 selection:bg-[#DA292A] selection:text-white">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-3.5 sm:px-4 h-16 flex items-center justify-between gap-2">
          <Link to="/" className="flex items-center gap-2 group shrink-0">
            <img
              src="/images/logo-arenatempur.svg"
              alt="ARENA TEMPUR"
              className="h-6 sm:h-8 w-auto object-contain transition-transform group-hover:scale-105"
            />
          </Link>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link
              to="/login"
              className="px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors"
            >
              Portal Kapten
            </Link>
            <Link
              to={`/tim/buat?tournament=${tournament.id}`}
              className="px-2.5 sm:px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition-colors shrink-0"
            >
              Daftar Turnamen
            </Link>
          </div>
        </div>
      </header>

      {/* Tournament Navigation Header */}
      <div className="border-b border-zinc-800/80 bg-zinc-900/40">
        <div className="max-w-5xl mx-auto px-3.5 sm:px-4 pt-5 sm:pt-6 pb-0">
          <div className="flex items-start sm:items-center gap-3 mb-4">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-zinc-800 flex items-center justify-center font-bold text-amber-500 border border-zinc-700 shrink-0 mt-0.5 sm:mt-0">
              <Trophy className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 inline-block">
                {isLoneWolf ? "Mode: King of By One (1v1)" : "Mode: Battle Royale"} • {tournament.status}
              </span>
              <h1 className="text-xl sm:text-2xl md:text-3xl text-white tracking-tight mt-1 font-headline truncate">
                {tournament.nama}
              </h1>
            </div>
          </div>

          {/* Sub Navigation Tabs (Mobile-swipe friendly) */}
          <nav className="flex items-center gap-4 sm:gap-6 text-xs font-bold border-b border-zinc-800/80 overflow-x-auto scrollbar-none whitespace-nowrap -mx-3.5 px-3.5 sm:mx-0 sm:px-0">
            <Link
              to={`/t/${slug}`}
              className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors shrink-0 select-none ${
                pathname === `/t/${slug}`
                  ? "border-amber-500 text-amber-400"
                  : "border-transparent text-zinc-400 hover:text-amber-400"
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              <span>Ikhtisar</span>
            </Link>

            {isLoneWolf ? (
              <Link
                to={`/t/${slug}/bracket`}
                className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors shrink-0 select-none ${
                  pathname.includes("/bracket")
                    ? "border-amber-500 text-amber-400"
                    : "border-transparent text-zinc-400 hover:text-amber-400"
                }`}
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>Bagan Gugur (Bracket)</span>
              </Link>
            ) : (
              <Link
                to={`/t/${slug}/klasemen`}
                className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors shrink-0 select-none ${
                  pathname.includes("/klasemen")
                    ? "border-amber-500 text-amber-400"
                    : "border-transparent text-zinc-400 hover:text-amber-400"
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Klasemen Live</span>
              </Link>
            )}

            <Link
              to={`/t/${slug}/jadwal`}
              className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors shrink-0 select-none ${
                pathname.includes("/jadwal")
                  ? "border-amber-500 text-amber-400"
                  : "border-transparent text-zinc-400 hover:text-amber-400"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Jadwal Pertandingan</span>
            </Link>

            <Link
              to={`/t/${slug}/live`}
              className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors relative group shrink-0 select-none ${
                pathname.includes("/live")
                  ? "border-red-500 text-red-400"
                  : "border-transparent text-zinc-400 hover:text-red-400"
              }`}
            >
              <Radio
                className={`w-3.5 h-3.5 ${
                  tournament.is_live
                    ? "text-red-500 animate-pulse"
                    : "text-zinc-400 group-hover:text-red-400"
                }`}
              />
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
      <main className="flex-1 max-w-5xl w-full mx-auto px-3.5 sm:px-4 py-5 sm:py-8">
        <Outlet context={{ tournament }} />
      </main>

      {/* Public Footer */}
      <footer className="border-t border-zinc-900 py-6 text-center text-xs text-zinc-500">
        <p>&copy; 2026 Arena Tempur &bull; Satu Sumber Kebenaran untuk Turnamen Komunitas</p>
      </footer>
    </div>
  );
}
