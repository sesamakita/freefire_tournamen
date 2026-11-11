import { Link, useLoaderData, Form } from "react-router";
import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { Trophy, Search, Users, ArrowRight, Inbox } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";

export const meta: MetaFunction = () => {
  return [
    { title: "Pencarian — Arena Tempur" },
    { name: "description", content: "Cari turnamen, tim, atau pemain Free Fire." },
  ];
};

type TournamentHit = {
  id: string;
  nama: string;
  slug: string;
  status: string;
  entry_fee: number;
  tgl_mulai: string;
};

type TeamHit = {
  id: string;
  nama: string;
  tournament_id: string;
  verification_status: string;
};

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const query = (url.searchParams.get("q") ?? "").trim();

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any;

  let tournamentHits: TournamentHit[] = [];
  let teamHits: TeamHit[] = [];
  const slugByTournamentId: Record<string, string> = {};

  if (query) {
    const [tournamentRes, teamRes] = await Promise.all([
      db
        .from("tournaments")
        .select("id, nama, slug, status, entry_fee, tgl_mulai")
        .or(`nama.ilike.%${query}%,slug.ilike.%${query}%`)
        .order("tgl_mulai", { ascending: true })
        .limit(8),
      db
        .from("teams")
        .select("id, nama, tournament_id, verification_status")
        .ilike("nama", `%${query}%`)
        .limit(8),
    ]);

    tournamentHits = (tournamentRes.data ?? []) as TournamentHit[];
    teamHits = (teamRes.data ?? []) as TeamHit[];

    const teamTournamentIds = [...new Set(teamHits.map((t) => t.tournament_id))];
    if (teamTournamentIds.length > 0) {
      const { data: teamTournaments } = await db
        .from("tournaments")
        .select("id, slug")
        .in("id", teamTournamentIds);
      for (const tt of teamTournaments ?? []) {
        slugByTournamentId[tt.id] = tt.slug;
      }
    }
  }

  return {
    query,
    tournamentHits,
    teamHits,
    slugByTournamentId,
  };
}

export default function SearchPage() {
  const { query, tournamentHits, teamHits, slugByTournamentId } =
    useLoaderData<typeof loader>();

  const hasQuery = query.length > 0;
  const total = tournamentHits.length + teamHits.length;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-amber-500 selection:text-white bg-tactical-lines">
      {/* Header */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3 group shrink-0">
            <img
              src="/images/logo-arenatempur.svg"
              alt="ARENA TEMPUR"
              className="h-7 sm:h-8 w-auto object-contain transition-transform group-hover:scale-105"
            />
          </Link>

          <Form method="get" action="/cari" role="search" className="flex-1 max-w-md">
            <label className="relative w-full block">
              <span className="sr-only">Cari turnamen atau tim</span>
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
              <input
                type="search"
                name="q"
                defaultValue={query}
                placeholder="Cari turnamen, tim, atau pemain…"
                autoComplete="off"
                className="w-full h-10 pl-10 pr-4 rounded-xl bg-zinc-900/70 border border-zinc-800
                           text-xs text-zinc-200 placeholder:text-zinc-500
                           focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/20
                           transition-colors outline-none"
              />
            </label>
          </Form>
        </div>
      </header>

      {/* Konten */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-1">
        {!hasQuery ? (
          <div className="text-center py-16 space-y-3">
            <Search className="w-10 h-10 text-zinc-600 mx-auto" />
            <h1 className="text-xl text-white font-bold font-headline">Cari turnamen atau tim</h1>
            <p className="text-sm text-zinc-500 max-w-md mx-auto">
              Ketik nama turnamen, slug, atau nama tim untuk menemukan hasilnya.
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            <div>
              <h1 className="text-xl text-white font-bold font-headline">
                Hasil untuk &ldquo;{query}&rdquo;
              </h1>
              <p className="text-xs text-zinc-500 mt-1">
                {total > 0 ? `${total} hasil ditemukan` : "Tidak ada hasil yang cocok"}
              </p>
            </div>

            {/* Turnamen */}
            <section className="space-y-4">
              <h2 className="text-[11px] font-semibold tracking-wide text-amber-500 uppercase flex items-center gap-2 font-headline">
                <Trophy className="w-3.5 h-3.5" /> Turnamen
              </h2>
              {tournamentHits.length === 0 ? (
                <p className="text-sm text-zinc-500">Tidak ada turnamen yang cocok.</p>
              ) : (
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {tournamentHits.map((t) => (
                    <li key={t.id}>
                      <Link
                        to={`/t/${t.slug}`}
                        className="group block p-5 rounded-2xl card-glow card-glow-hover space-y-2 transition-all"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors truncate">
                            {t.nama}
                          </span>
                          <span className="shrink-0 text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 capitalize">
                            {t.status}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-zinc-500">
                          <span className="font-mono">/{t.slug}</span>
                          <span className="font-mono text-amber-400">
                            {t.entry_fee === 0
                              ? "Gratis"
                              : `Rp ${t.entry_fee.toLocaleString("id-ID")}`}
                          </span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Tim */}
            <section className="space-y-4">
              <h2 className="text-[11px] font-semibold tracking-wide text-amber-500 uppercase flex items-center gap-2 font-headline">
                <Users className="w-3.5 h-3.5" /> Tim
              </h2>
              {teamHits.length === 0 ? (
                <p className="text-sm text-zinc-500">Tidak ada tim yang cocok.</p>
              ) : (
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {teamHits.map((tm) => {
                    const slug = slugByTournamentId[tm.tournament_id];
                    const href = slug ? `/t/${slug}` : "/";
                    return (
                      <li key={tm.id}>
                        <Link
                          to={href}
                          className="group block p-5 rounded-2xl card-glow card-glow-hover space-y-2 transition-all"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors truncate">
                              {tm.nama}
                            </span>
                            <span className="shrink-0 text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              {tm.verification_status}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-zinc-500">
                            <span>Lihat halaman turnamen</span>
                            <ArrowRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {total === 0 && (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <Inbox className="w-10 h-10 text-zinc-700" />
                <p className="text-sm text-zinc-400">
                  Coba kata kunci lain, misalnya nama turnamen atau nama tim.
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950/80 py-6 text-center text-xs text-zinc-600">
        <p>&copy; 2026 Arena Tempur &bull; Pencarian turnamen &amp; tim Free Fire.</p>
      </footer>
    </div>
  );
}
