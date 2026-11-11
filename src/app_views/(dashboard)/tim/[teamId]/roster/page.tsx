import Link from "next/link";
import { notFound, redirect } from "next/navigation";
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
import { createClient } from "@/lib/supabase/server";
import InviteMemberSection from "./InviteMemberSection";
import RosterMembersList from "./RosterMembersList";
import TeamHeaderActions from "../TeamHeaderActions";

export default async function TeamRosterPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

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

  if (!team) notFound();

  // Pastikan user adalah kapten atau panitia
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/dashboard"
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
            <h1 className="text-3xl text-white tracking-tight">
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
              href={`/tim/${team.id}/bayar`}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg transition-all ${
                isRosterReadyForVerification
                  ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-zinc-950 hover:from-emerald-400 hover:to-emerald-500 shadow-emerald-500/20"
                  : "bg-zinc-800 text-zinc-500 cursor-not-allowed pointer-events-none"
              }`}
            >
              <CreditCard className="w-4 h-4" />
              Lanjut ke Pembayaran QRIS <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}

          {isLoneWolf && team.verification_status === "approved" && (
            <Link
              href={`/t/${team.tournaments?.slug}/bracket`}
              className="px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 transition-all"
            >
              <Trophy className="w-4 h-4" />
              Lihat Bagan Gugur <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>

      {/* Banner 1v1 vs Squad */}
      {isLoneWolf ? (
        <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-2xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Mode: King of By One (1v1 Solo)</p>
              <p className="text-xs text-zinc-400 mt-0.5">
                Format duel individu 1 lawan 1 (First to 5 Rounds). Anda bertanding solo tanpa susunan anggota roster.
              </p>
            </div>
          </div>
          {team.tournaments?.slug && (
            <Link
              href={`/t/${team.tournaments?.slug}/bracket`}
              target="_blank"
              className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shrink-0 transition-colors"
            >
              Lihat Bagan
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Banner Roster Lock (BR-ROST-07) */}
          {isTournamentClosed && (
            <div className="p-4 bg-zinc-900 border border-zinc-700/80 rounded-2xl flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-zinc-800 text-zinc-400 flex items-center justify-center shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Roster Tim Telah Dikunci (Roster Lock)</p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Turnamen telah memasuki tahap penutupan/pertandingan. Perubahan anggota hanya dapat dilakukan oleh Panitia.
                </p>
              </div>
            </div>
          )}

          {/* Banner Syarat Minimal Anggota (BR-ROST-01) */}
          {!isTournamentClosed && !isRosterReadyForVerification && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-300">
                  Roster belum lengkap ({coreMembersCount}/4 Pemain Inti)
                </p>
                <p className="text-xs text-amber-200/70 mt-0.5">
                  Minimal 4 pemain inti wajib terdaftar sebelum tim dapat diajukan untuk verifikasi dan pembayaran turnamen.
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* Slot Status Summary */}
      {isLoneWolf ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl">
            <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Format Pertandingan</p>
            <p className="text-lg font-black text-amber-400 mt-1">Duel 1 vs 1 (Solo)</p>
          </div>
          <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl">
            <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Status Partisipasi</p>
            <p className="text-lg font-black text-emerald-400 mt-1 capitalize">
              {team.verification_status === "approved" ? "Terverifikasi (Siap)" : team.verification_status}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl">
            <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Total Slot</p>
            <p className="text-xl font-black text-white mt-1">
              {totalSlotsUsed} <span className="text-xs text-zinc-500 font-normal">/ 6 Maksimal</span>
            </p>
          </div>
          <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl">
            <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Pemain Inti</p>
            <p className="text-xl font-black text-amber-500 mt-1">
              {coreMembersCount} <span className="text-xs text-zinc-500 font-normal">/ 4 Wajib</span>
            </p>
          </div>
          <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl col-span-2 sm:col-span-1">
            <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Pemain Cadangan</p>
            <p className="text-xl font-black text-blue-400 mt-1">
              {substituteMembersCount} <span className="text-xs text-zinc-500 font-normal">/ 2 Maksimal</span>
            </p>
          </div>
        </div>
      )}

      {/* Tabel Roster Interaktif (Bisa Edit & Keluarkan Peserta) */}
      <RosterMembersList
        teamId={team.id}
        captainUserId={team.kapten_user_id}
        currentUserId={user.id}
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
