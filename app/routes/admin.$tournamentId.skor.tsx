import { useLoaderData, Link, redirect } from "react-router";
import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { ArrowLeft, Trophy } from "lucide-react";
import { createWebClient } from "@/lib/supabase/web";
import { createAdminClient } from "@/lib/supabase/admin";
import ScoreManagementClient from "@/app/(dashboard)/admin/[tournamentId]/skor/ScoreManagementClient";
import TournamentAdminNav from "@/components/TournamentAdminNav";

export const meta: MetaFunction = () => {
  return [
    { title: "Input & Verifikasi Skor — Arena Tempur" },
  ];
};

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { tournamentId } = params;
  if (!tournamentId) {
    throw redirect("/dashboard");
  }

  const { client: supabase } = createWebClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw redirect("/login");

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any;

  // 1. Cek hak akses staff
  const { data: staff } = await db
    .from("tournament_staff")
    .select("role")
    .eq("tournament_id", tournamentId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!staff) throw redirect("/dashboard");

  // 2. Ambil data turnamen
  const { data: tournament } = await db
    .from("tournaments")
    .select("id, nama, status, format, slug, prize_pool, prize_distribution, prizes_disbursed_at")
    .eq("id", tournamentId)
    .single();

  if (!tournament) {
    throw new Response("Turnamen tidak ditemukan", { status: 404 });
  }

  // 3. Ambil data match beserta slotting tim dan hasil
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

  
  // 4. Ambil top 3 standings
  const { data: topStandings } = await db
    .from("standings")
    .select("rank, team_id, team_nama, logo_url, total_points, total_kills")
    .eq("tournament_id", tournamentId)
    .order("rank", { ascending: true })
    .limit(3);

  return {
    tournamentId,
    tournament,
    matches: matches || [],
    topStandings: topStandings || [],
    currentUserId: user.id,
    isOwnerOrAdmin,
    role: staff.role,
  };
}

export default function AdminScorePage() {
  const { tournamentId, tournament, matches, currentUserId, isOwnerOrAdmin, role } =
    useLoaderData<typeof loader>();

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Unified Tab Bar & Header Konteks Turnamen */}
      <TournamentAdminNav
        tournamentId={tournamentId}
        tournamentName={tournament.nama}
        format={tournament.format}
        slug={tournament.slug}
        status={tournament.status}
        role={role}
      />

      <div className="card-glow p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-500">
              Panel Panitia (Peran: {role})
            </span>
            <h1 className="text-2xl sm:text-3xl text-white tracking-tight mt-0.5 font-headline">
              Input & Verifikasi Skor: {tournament.nama}
            </h1>
          </div>
        </div>
      </div>

      <ScoreManagementClient
        tournamentId={tournamentId}
        matches={matches}
        currentUserId={currentUserId}
        isOwnerOrAdmin={isOwnerOrAdmin}
      />
    </div>
  );
}
