import { useLoaderData, Link, redirect } from "react-router";
import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import {
  Users,
  Trophy,
  Shield,
  ArrowLeft,
  Lock,
  ArrowRight,
  AlertTriangle,
  CreditCard,
} from "lucide-react";
import { createWebClient } from "@/lib/supabase/web";
import InviteMemberSection from "@/app/(dashboard)/tim/[teamId]/roster/InviteMemberSection";
import RosterMembersList from "@/app/(dashboard)/tim/[teamId]/roster/RosterMembersList";
import TeamHeaderActions from "@/app/(dashboard)/tim/[teamId]/TeamHeaderActions";

export const meta: MetaFunction = () => {
  return [
    { title: "Kelola Roster Tim — Arena Tempur" },
  ];
};

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { teamId } = params;
  if (!teamId) throw redirect("/dashboard");

  const { client: supabase } = createWebClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw redirect("/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  // 1. Ambil data tim
  const { data: team } = await db
    .from("teams")
    .select(`
      *,
      tournaments:tournament_id (id, nama, status, entry_fee, qris_image_url, format, slug)
    `)
    .eq("id", teamId)
    .single();

  if (!team) throw new Response("Tim tidak ditemukan", { status: 404 });

  const isCaptain = team.kapten_user_id === user.id;

  const { data: staffRole } = await db
    .from("tournament_staff")
    .select("role")
    .eq("tournament_id", team.tournament_id)
    .eq("user_id", user.id)
    .maybeSingle();

  const isStaff = Boolean(staffRole);

  // 2. Ambil seluruh anggota tim saat ini
  const { data: members } = await db
    .from("team_members")
    .select(`
      id,
      user_id,
      ign,
      uid_game,
      role_tim,
      is_substitute,
      created_at,
      users:user_id (nama, email)
    `)
    .eq("team_id", teamId)
    .order("created_at", { ascending: true });

  // 3. Ambil daftar undangan aktif
  const { data: invitations } = await db
    .from("team_invitations")
    .select("*")
    .eq("team_id", teamId)
    .order("created_at", { ascending: false });

  const currentMembers = members || [];
  const coreMembersCount = currentMembers.filter((m: any) => !m.is_substitute).length;
  const substituteMembersCount = currentMembers.filter((m: any) => m.is_substitute).length;
  const totalSlotsUsed = currentMembers.length;

  const isTournamentClosed =
    team.tournaments?.status === "closed" ||
    team.tournaments?.status === "running" ||
    team.tournaments?.status === "done";

  const isLoneWolf = team.tournaments?.format === "lone_wolf_1v1";
  const isRosterReadyForVerification = isLoneWolf ? coreMembersCount >= 1 : coreMembersCount >= 4;

  return {
    team,
    isCaptain,
    isStaff,
    currentUserId: user.id,
    currentMembers,
    invitations: invitations || [],
    coreMembersCount,
    substituteMembersCount,
    totalSlotsUsed,
    isTournamentClosed,
    isLoneWolf,
    isRosterReadyForVerification,
  };
}

export default function TeamRosterRoute() {
  const {
    team,
    isCaptain,
    isStaff,
    currentUserId,
    currentMembers,
    invitations,
    coreMembersCount,
    substituteMembersCount,
    totalSlotsUsed,
    isTournamentClosed,
    isLoneWolf,
    isRosterReadyForVerification,
  } = useLoaderData<typeof loader>();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back button */}
      <div>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Kembali ke Dashboard
        </Link>
      </div>

      {/* Header Tim & Turnamen */}
      <div className="card-glow card-glow-hover p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-3xl text-white tracking-tight font-headline">
              {team.nama}
            </h1>
            {isLoneWolf ? (
              <span className="px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[11px] font-bold uppercase">
                Peserta Duel 1v1
              </span>
            ) : (
              isCaptain && (
                <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-bold uppercase">
                  Kapten
                </span>
              )
            )}

            <TeamHeaderActions
              teamId={team.id}
              initialTeamName={team.nama}
              initialLogoUrl={team.logo_url}
              tournamentName={team.tournaments?.nama}
              isCaptain={isCaptain}
              isStaff={isStaff}
              isTournamentClosed={isTournamentClosed}
              redirectOnDelete={true}
            />
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Turnamen: <span className="font-semibold text-zinc-200">{team.tournaments?.nama}</span>
          </p>
        </div>

        {/* Action Button: Lanjut ke Pembayaran QRIS */}
        <div className="flex items-center gap-2">
          {team.verification_status === "draft" && (
            <Link
              to={`/tim/${team.id}/bayar`}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg transition-all ${
                isRosterReadyForVerification
                  ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-zinc-950 hover:from-emerald-400 hover:to-emerald-500 shadow-emerald-500/20"
                  : "bg-zinc-800 text-zinc-500 pointer-events-none opacity-60"
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Verifikasi & Bayar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}

          <Link
            to={`/tim/${team.id}/jadwal`}
            className="px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold transition-colors"
          >
            Jadwal & Room
          </Link>
        </div>
      </div>

      {/* Roster Status Warning */}
      {!isRosterReadyForVerification && team.verification_status === "draft" && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold text-amber-300">Roster Belum Lengkap</p>
            <p className="text-amber-200/80 leading-relaxed">
              {isLoneWolf
                ? "Daftarkan 1 kontestan inti untuk dapat melanjutkan ke pembayaran tiket."
                : `Tim Anda baru memiliki ${coreMembersCount} dari minimal 4 pemain inti yang diwajibkan. Undang anggota tim menggunakan formulir di bawah.`}
            </p>
          </div>
        </div>
      )}

      {/* Tabel Roster Interaktif (Bisa Edit & Keluarkan Peserta) */}
      <RosterMembersList
        teamId={team.id}
        captainUserId={team.kapten_user_id}
        currentUserId={currentUserId}
        isCaptain={isCaptain}
        isStaff={isStaff}
        isTournamentClosed={isTournamentClosed}
        isLoneWolf={isLoneWolf}
        members={currentMembers}
      />

      {/* Bagian Undang Anggota (Hanya untuk Squad BR) */}
      {!isLoneWolf && isCaptain && !isTournamentClosed && totalSlotsUsed < 6 && (
        <InviteMemberSection
          teamId={team.id}
          currentMemberCount={totalSlotsUsed}
          currentSubstituteCount={substituteMembersCount}
          invitations={invitations || []}
        />
      )}
    </div>
  );
}
