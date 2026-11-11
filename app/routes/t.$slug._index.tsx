import { Link, useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { Trophy, Calendar, Shield, BarChart3, Award, ExternalLink } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import PodiumSection from "@/components/PodiumSection";

export async function loader({ params }: LoaderFunctionArgs) {
  const { slug } = params;
  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any;

  const { data: tournament } = await db
    .from("tournaments")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!tournament) {
    throw new Response("Turnamen tidak ditemukan", { status: 404 });
  }

  // Ambil jumlah tim terdaftar yang approved
  const { count: approvedCount } = await db
    .from("teams")
    .select("*", { count: "exact", head: true })
    .eq("tournament_id", tournament.id)
    .eq("verification_status", "approved");

  // Ambil jumlah match
  const { count: matchCount } = await db
    .from("matches")
    .select("*", { count: "exact", head: true })
    .eq("tournament_id", tournament.id);

  // Ambil sponsor turnamen yang aktif
  const { data: sponsors } = await db
    .from("tournament_sponsors")
    .select("id, name, logo_url, banner_url, tier, external_url")
    .eq("tournament_id", tournament.id)
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  const tglMulai = new Date(tournament.tgl_mulai).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const tglSelesai = new Date(tournament.tgl_selesai).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  
  // Ambil top 3 standings untuk podium
  const { data: standings } = await db
    .from("standings")
    .select("*")
    .eq("tournament_id", tournament.id)
    .order("rank", { ascending: true })
    .limit(3);

  const topStandings = (standings || []).map((st: any) => ({
    team_id: st.team_id,
    tournament_id: st.tournament_id,
    team_nama: st.team_nama,
    logo_url: st.logo_url,
    matches_played: Number(st.matches_played || 0),
    total_kills: Number(st.total_kills || 0),
    total_points: Number(st.total_points || 0),
    best_placement: st.best_placement ? Number(st.best_placement) : null,
    rank: Number(st.rank || 0),
  }));

  return {
    tournament,
    approvedCount: approvedCount ?? 0,
    matchCount: matchCount ?? 0,
    tglMulai,
    tglSelesai,
    sponsors: sponsors || [],
    topStandings,
  };
}

export default function PublicTournamentPage() {
  const { tournament, approvedCount, matchCount, tglMulai, tglSelesai, sponsors, topStandings } =
    useLoaderData<typeof loader>();
  const slug = tournament.slug;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
        {Number(tournament.prize_pool || 0) > 0 && (
          <div className="card-glow card-glow-hover p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-amber-500/30 bg-gradient-to-b from-amber-500/10 to-transparent space-y-1 col-span-2 sm:col-span-1">
            <p className="text-[10px] sm:text-[11px] uppercase font-bold text-amber-400 tracking-wider flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5" /> Total Hadiah
            </p>
            <p className="text-lg sm:text-xl font-black text-amber-300 font-mono truncate">
              Rp {Number(tournament.prize_pool).toLocaleString("id-ID")}
            </p>
          </div>
        )}

        <div className="card-glow card-glow-hover p-3.5 sm:p-4 rounded-xl sm:rounded-2xl space-y-1">
          <p className="text-[10px] sm:text-[11px] uppercase font-bold text-zinc-500 tracking-wider">Slot Tim</p>
          <p className="text-lg sm:text-xl font-black text-white truncate">
            {approvedCount} <span className="text-xs text-zinc-500 font-normal">/ {tournament.max_teams}</span>
          </p>
        </div>

        <div className="card-glow card-glow-hover p-3.5 sm:p-4 rounded-xl sm:rounded-2xl space-y-1">
          <p className="text-[10px] sm:text-[11px] uppercase font-bold text-zinc-500 tracking-wider">
            Biaya Registrasi
          </p>
          <p className="text-lg sm:text-xl font-black text-emerald-400 truncate">
            {tournament.entry_fee === 0
              ? "Gratis"
              : `Rp ${tournament.entry_fee.toLocaleString("id-ID")}`}
          </p>
        </div>

        <div className="card-glow card-glow-hover p-3.5 sm:p-4 rounded-xl sm:rounded-2xl space-y-1">
          <p className="text-[10px] sm:text-[11px] uppercase font-bold text-zinc-500 tracking-wider">
            Total Match
          </p>
          <p className="text-lg sm:text-xl font-black text-amber-500 truncate">{matchCount} Match</p>
        </div>

        <div className="card-glow card-glow-hover p-3.5 sm:p-4 rounded-xl sm:rounded-2xl space-y-1">
          <p className="text-[10px] sm:text-[11px] uppercase font-bold text-zinc-500 tracking-wider">Status</p>
          <p className="text-sm sm:text-base font-black text-zinc-200 capitalize mt-1 truncate">{tournament.status}</p>
        </div>
      </div>

      {/* Podium Top 3 jika sudah ada ronde yang berjalan */}
      {topStandings && topStandings.length > 0 && topStandings[0].matches_played > 0 && (
        <PodiumSection
          standings={topStandings}
          prizePool={Number(tournament.prize_pool || 0)}
          prizeDistribution={tournament.prize_distribution as Record<string, number> | undefined}
        />
      )}

      {/* Deskripsi & Aturan */}
      <div className="card-glow card-glow-hover p-4 sm:p-6 rounded-xl sm:rounded-2xl space-y-4">
        <h2 className="text-xs sm:text-sm text-white uppercase flex items-center gap-2 font-headline">
          <Shield className="w-4 h-4 text-amber-500" />
          Informasi & Aturan Turnamen
        </h2>

        <MarkdownRenderer content={tournament.deskripsi || ""} />

        <div className="pt-2 border-t border-zinc-800/80 flex items-center gap-2 text-xs text-zinc-400 flex-wrap">
          <Calendar className="w-4 h-4 text-zinc-500 shrink-0" />
          <span>
            Periode: <strong>{tglMulai}</strong> s/d <strong>{tglSelesai}</strong>
          </span>
        </div>
      </div>

      {/* Banner Ajakan Daftar (Bila Pendaftaran Open) */}
      {tournament.status === "open" && (
        <div className="p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-gradient-to-r from-amber-500/20 via-zinc-900 to-zinc-900 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
          <div className="space-y-1.5 min-w-0">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500 text-zinc-950 inline-block">
              PENDAFTARAN DIBUKA
            </span>
            <h3 className="text-base sm:text-lg font-bold text-white font-headline">
              Kunci Slot Anda di Turnamen Ini Sekarang!
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Slot terisi {approvedCount} dari total {tournament.max_teams} slot. Biaya pendaftaran:{" "}
              <strong className="text-amber-400">
                {tournament.entry_fee === 0
                  ? "Gratis"
                  : `Rp ${tournament.entry_fee.toLocaleString("id-ID")}`}
              </strong>
            </p>
          </div>

          <Link
            to={`/tim/buat?tournament=${tournament.id}`}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs sm:text-sm tracking-wide transition-all shadow-lg shadow-amber-500/20 text-center shrink-0 cursor-pointer"
          >
            Daftar Sekarang &rarr;
          </Link>
        </div>
      )}

      {/* Call to Actions Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {tournament.format === "lone_wolf_1v1" ? (
          <Link
            to={`/t/${slug}/bracket`}
            className="card-glow card-glow-hover p-4 sm:p-6 rounded-xl sm:rounded-2xl space-y-2 transition-all group col-span-1 sm:col-span-2"
          >
            <Trophy className="w-6 h-6 text-amber-400 group-hover:scale-110 transition-transform" />
            <h3 className="text-white text-base font-bold font-headline">
              Bagan Pertandingan Gugur (Live 1v1 Bracket)
            </h3>
            <p className="text-xs text-zinc-300">
              Pantau pohon bagan eliminasi, skor ronde (First to 5/7), dan pemenang duel 1v1 secara
              langsung.
            </p>
          </Link>
        ) : (
          <>
            <Link
              to={`/t/${slug}/klasemen`}
              className="card-glow card-glow-hover p-4 sm:p-6 rounded-xl sm:rounded-2xl space-y-2 transition-all group"
            >
              <BarChart3 className="w-6 h-6 text-amber-500 group-hover:scale-110 transition-transform" />
              <h3 className="text-white text-base font-headline font-bold">Klasemen Sementara (Live)</h3>
              <p className="text-xs text-zinc-400">
                Pantau perolehan poin dan kill dari seluruh tim peserta turnamen secara real-time.
              </p>
            </Link>

            <Link
              to={`/t/${slug}/jadwal`}
              className="card-glow card-glow-hover p-4 sm:p-6 rounded-xl sm:rounded-2xl space-y-2 transition-all group"
            >
              <Calendar className="w-6 h-6 text-zinc-400 group-hover:scale-110 transition-transform" />
              <h3 className="text-white text-base font-headline font-bold">Jadwal Pertandingan</h3>
              <p className="text-xs text-zinc-400">
                Cek jam tanding per round, pembagian grup, dan slot tim peserta.
              </p>
            </Link>
          </>
        )}
      </div>

      {/* Sponsor & Partner Resmi */}
      {sponsors && sponsors.length > 0 && (
        <div className="card-glow p-4 sm:p-6 rounded-xl sm:rounded-2xl space-y-4">
          <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-1 border-b border-zinc-800/80 pb-3">
            <h2 className="text-xs uppercase tracking-wider text-amber-400 font-bold flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              Didukung Oleh & Official Partners
            </h2>
            <span className="text-[11px] text-zinc-500 font-medium">Sponsor Resmi Turnamen</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 py-2">
            {sponsors.map((sp: { id: string; name: string; logo_url: string; banner_url?: string | null; tier: string; external_url?: string | null }) => (
              <a
                key={sp.id}
                href={sp.external_url || "#"}
                target={sp.external_url ? "_blank" : undefined}
                rel="noreferrer"
                className="group flex flex-col items-center gap-2 p-3 sm:p-3.5 rounded-xl bg-zinc-900/60 hover:bg-zinc-900 border border-white/5 hover:border-amber-500/30 transition-all min-w-[110px] sm:min-w-[120px] max-w-[180px] sm:max-w-[200px]"
                title={sp.name}
              >
                <div className="h-10 sm:h-12 w-24 sm:w-36 flex items-center justify-center p-1">
                  <img
                    src={sp.logo_url}
                    alt={sp.name}
                    className="max-h-full max-w-full object-contain filter grayscale group-hover:grayscale-0 transition-all drop-shadow"
                  />
                </div>
                <div className="flex items-center gap-1 text-[11px] text-zinc-400 group-hover:text-amber-400 font-semibold tracking-wide text-center">
                  <span className="truncate max-w-[110px] sm:max-w-[130px]">{sp.name}</span>
                  {sp.external_url && <ExternalLink className="w-2.5 h-2.5 opacity-60 shrink-0" />}
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
