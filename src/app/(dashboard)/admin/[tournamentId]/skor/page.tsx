import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import ScoreManagementClient from "./ScoreManagementClient";

export default async function AdminScorePage({
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

  // 3. Ambil data match beserta slotting tim dan hasil yang sudah ada
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
      match_teams (
        id,
        slot,
        team_id,
        teams:team_id (id, nama, logo_url)
      ),
      results (
        id,
        team_id,
        placement,
        kills,
        points,
        screenshot_url,
        status,
        submitted_by,
        teams:team_id (id, nama),
        submitter:submitted_by (nama, email)
      )
    `)
    .eq("tournament_id", tournamentId)
    .order("round", { ascending: true })
    .order("jadwal", { ascending: true });

  const isOwnerOrAdmin = staff.role === "owner" || staff.role === "admin";

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <Link
          href={`/admin/${tournamentId}/match`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Kembali ke Jadwal & Match
        </Link>
      </div>

      <div className="card-glow p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-500">
              Panel Panitia (Peran: {staff.role})
            </span>
            <h1 className="text-3xl text-white tracking-tight mt-0.5">
              Input & Verifikasi Skor Pertandingan: {tournament.nama}
            </h1>
          </div>
        </div>
      </div>

      <ScoreManagementClient
        tournamentId={tournamentId}
        matches={matches || []}
        currentUserId={user.id}
        isOwnerOrAdmin={isOwnerOrAdmin}
      />
    </div>
  );
}
