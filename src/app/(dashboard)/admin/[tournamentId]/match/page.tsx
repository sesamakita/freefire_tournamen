import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Calendar, Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import MatchManagementClient from "./MatchManagementClient";

export default async function AdminMatchPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const admin = createAdminClient();

  // 1. Cek hak akses staff
  const { data: staff } = await admin
    .from("tournament_staff")
    .select("role")
    .eq("tournament_id", tournamentId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!staff) redirect("/dashboard");

  // 2. Ambil data turnamen
  const { data: tournament } = await admin
    .from("tournaments")
    .select("id, nama, status")
    .eq("id", tournamentId)
    .single();

  if (!tournament) notFound();

  // 3. Ambil data match turnamen
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any;
  const { data: matches } = await db
    .from("matches")
    .select(`
      id,
      tournament_id,
      nama,
      round,
      grup,
      jadwal,
      status,
      room_id,
      room_pass,
      match_teams (slot, team_id, teams:team_id (id, nama))
    `)
    .eq("tournament_id", tournamentId)
    .order("round", { ascending: true })
    .order("jadwal", { ascending: true });

  // 4. Ambil daftar tim yang sudah 'approved' untuk slotting
  const { data: approvedTeams } = await admin
    .from("teams")
    .select("id, nama, logo_url")
    .eq("tournament_id", tournamentId)
    .eq("verification_status", "approved");

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Kembali ke Dashboard
        </Link>
      </div>

      <div className="card-glow p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-500">
              Panel Panitia (Peran: {staff.role})
            </span>
            <h1 className="text-3xl text-white tracking-tight mt-0.5">
              Kelola Jadwal, Room ID & Slot Tim: {tournament.nama}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/admin/${tournamentId}/skor`}
            className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-colors"
          >
            Input & Verifikasi Skor &rarr;
          </Link>
        </div>
      </div>

      <MatchManagementClient
        tournamentId={tournamentId}
        matches={matches || []}
        approvedTeams={approvedTeams || []}
      />
    </div>
  );
}
