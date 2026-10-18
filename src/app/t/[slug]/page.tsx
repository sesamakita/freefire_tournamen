import Link from "next/link";
import { notFound } from "next/navigation";
import { Trophy, Calendar, Users, ArrowRight, Shield, BarChart3, CreditCard } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";

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

  return (
    <div className="space-y-8">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl space-y-1">
          <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Slot Tim</p>
          <p className="text-xl font-black text-white">
            {approvedCount || 0} <span className="text-xs text-zinc-500 font-normal">/ {tournament.max_teams}</span>
          </p>
        </div>

        <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl space-y-1">
          <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Biaya Registrasi</p>
          <p className="text-xl font-black text-emerald-400">
            {tournament.entry_fee === 0 ? "Gratis" : `Rp ${tournament.entry_fee.toLocaleString("id-ID")}`}
          </p>
        </div>

        <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl space-y-1">
          <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Total Match</p>
          <p className="text-xl font-black text-amber-500">{matchCount || 0} Match</p>
        </div>

        <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl space-y-1">
          <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Status</p>
          <p className="text-base font-black text-zinc-200 capitalize mt-1">{tournament.status}</p>
        </div>
      </div>

      {/* Deskripsi & Aturan */}
      <div className="p-6 bg-zinc-900/60 border border-zinc-800 rounded-2xl space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Shield className="w-4 h-4 text-amber-500" />
          Informasi & Aturan Turnamen
        </h2>

        <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed whitespace-pre-line">
          {tournament.deskripsi || "Penyelenggara belum menambahkan deskripsi khusus untuk turnamen ini."}
        </p>

        <div className="pt-2 border-t border-zinc-800/80 flex items-center gap-2 text-xs text-zinc-400">
          <Calendar className="w-4 h-4 text-zinc-500" />
          <span>Periode Pelaksanaan: <strong>{tglMulai}</strong> s/d <strong>{tglSelesai}</strong></span>
        </div>
      </div>

      {/* Call to Actions Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href={`/t/${slug}/klasemen`}
          className="p-6 bg-gradient-to-tr from-amber-500/10 to-orange-500/5 border border-amber-500/20 hover:border-amber-500/40 rounded-2xl space-y-2 transition-all group"
        >
          <BarChart3 className="w-6 h-6 text-amber-500 group-hover:scale-110 transition-transform" />
          <h3 className="font-bold text-white text-base">Klasemen Sementara (Live)</h3>
          <p className="text-xs text-zinc-400">
            Pantau perolehan poin dan kill dari seluruh tim peserta turnamen secara real-time.
          </p>
        </Link>

        <Link
          href={`/t/${slug}/jadwal`}
          className="p-6 bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 rounded-2xl space-y-2 transition-all group"
        >
          <Calendar className="w-6 h-6 text-zinc-400 group-hover:scale-110 transition-transform" />
          <h3 className="font-bold text-white text-base">Jadwal Pertandingan</h3>
          <p className="text-xs text-zinc-400">
            Cek jam tanding per round, pembagian grup, dan slot tim peserta.
          </p>
        </Link>
      </div>
    </div>
  );
}
