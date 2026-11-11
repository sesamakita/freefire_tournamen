import Link from "next/link";
import { notFound } from "next/navigation";
import { Trophy, Calendar, Users, ArrowRight, Shield, BarChart3, CreditCard } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import PodiumSection from "@/components/PodiumSection";

export default async function PublicTournamentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const admin = createAdminClient();

  const { data: tournament } = await admin
    .from("tournaments")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!tournament) notFound();

  // Ambil jumlah tim terdaftar yang approved
  const { count: approvedCount } = await admin
    .from("teams")
    .select("*", { count: "exact", head: true })
    .eq("tournament_id", tournament.id)
    .eq("verification_status", "approved");

  // Ambil jumlah match
  const { count: matchCount } = await admin
    .from("matches")
    .select("*", { count: "exact", head: true })
    .eq("tournament_id", tournament.id);

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

  
  // Ambil top 3 standings untuk podium jika pertandingan sudah dimulai
  const { data: standings } = await admin
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

  return (
    <div className="space-y-8">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
        {Number(tournament.prize_pool || 0) > 0 && (
          <div className="card-glow card-glow-hover p-4 rounded-2xl border border-amber-500/30 bg-gradient-to-b from-amber-500/10 to-transparent space-y-1 col-span-2 sm:col-span-1">
            <p className="text-[11px] uppercase font-bold text-amber-400 tracking-wider flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5" /> Total Hadiah
            </p>
            <p className="text-xl font-black text-amber-300 font-mono">
              Rp {Number(tournament.prize_pool).toLocaleString("id-ID")}
            </p>
          </div>
        )}

        <div className="card-glow card-glow-hover p-4 rounded-2xl space-y-1">
          <p className="text-[11px] uppercase font-bold text-zinc-500 tracking-wider">Slot Tim</p>
          <p className="text-xl font-black text-white">
            {approvedCount || 0} <span className="text-xs text-zinc-500 font-normal">/ {tournament.max_teams}</span>
          </p>
        </div>

        <div className="card-glow card-glow-hover p-4 rounded-2xl space-y-1">
          <p className="text-[11px] uppercase font-bold text-zinc-500 tracking-wider">Biaya Registrasi</p>
          <p className="text-xl font-black text-emerald-400">
            {tournament.entry_fee === 0 ? "Gratis" : `Rp ${tournament.entry_fee.toLocaleString("id-ID")}`}
          </p>
        </div>

        <div className="card-glow card-glow-hover p-4 rounded-2xl space-y-1">
          <p className="text-[11px] uppercase font-bold text-zinc-500 tracking-wider">Total Match</p>
          <p className="text-xl font-black text-amber-500">{matchCount || 0} Match</p>
        </div>

        <div className="card-glow card-glow-hover p-4 rounded-2xl space-y-1">
          <p className="text-[11px] uppercase font-bold text-zinc-500 tracking-wider">Status</p>
          <p className="text-base font-black text-zinc-200 capitalize mt-1">{tournament.status}</p>
        </div>
      </div>

      {/* Podium Top 3 jika sudah ada pertandingan yang selesai */}
      {topStandings.length > 0 && topStandings[0].matches_played > 0 && (
        <PodiumSection
          standings={topStandings}
          prizePool={Number(tournament.prize_pool || 0)}
          prizeDistribution={tournament.prize_distribution as Record<string, number> | undefined}
        />
      )}

      {/* Deskripsi & Aturan */}
      <div className="card-glow card-glow-hover p-6 rounded-2xl space-y-4">
        <h2 className="text-sm text-white uppercase flex items-center gap-2">
          <Shield className="w-4 h-4 text-amber-500" />
          Informasi & Aturan Turnamen
        </h2>

        <MarkdownRenderer content={tournament.deskripsi || ""} />

        <div className="pt-2 border-t border-zinc-800/80 flex items-center gap-2 text-xs text-zinc-400">
          <Calendar className="w-4 h-4 text-zinc-500" />
          <span>Periode Pelaksanaan: <strong>{tglMulai}</strong> s/d <strong>{tglSelesai}</strong></span>
        </div>
      </div>

      {/* Call to Actions Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {tournament.format === "lone_wolf_1v1" ? (
          <Link
            href={`/t/${slug}/bracket`}
            className="card-glow card-glow-hover p-6 rounded-2xl space-y-2 transition-all group col-span-1 sm:col-span-2"
          >
            <Trophy className="w-6 h-6 text-amber-400 group-hover:scale-110 transition-transform" />
            <h3 className="text-white text-base font-bold">Bagan Pertandingan Gugur (Live 1v1 Bracket)</h3>
            <p className="text-xs text-zinc-300">
              Pantau pohon bagan eliminasi, skor ronde (First to 5/7), dan pemenang duel 1v1 secara langsung.
            </p>
          </Link>
        ) : (
          <>
            <Link
              href={`/t/${slug}/klasemen`}
              className="card-glow card-glow-hover p-6 rounded-2xl space-y-2 transition-all group"
            >
              <BarChart3 className="w-6 h-6 text-amber-500 group-hover:scale-110 transition-transform" />
              <h3 className="text-white text-base">Klasemen Sementara (Live)</h3>
              <p className="text-xs text-zinc-400">
                Pantau perolehan poin dan kill dari seluruh tim peserta turnamen secara real-time.
              </p>
            </Link>

            <Link
              href={`/t/${slug}/jadwal`}
              className="card-glow card-glow-hover p-6 rounded-2xl space-y-2 transition-all group"
            >
              <Calendar className="w-6 h-6 text-zinc-400 group-hover:scale-110 transition-transform" />
              <h3 className="text-white text-base">Jadwal Pertandingan</h3>
              <p className="text-xs text-zinc-400">
                Cek jam tanding per round, pembagian grup, dan slot tim peserta.
              </p>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
