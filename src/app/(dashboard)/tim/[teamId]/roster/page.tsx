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
      tournaments:tournament_id (id, nama, status, entry_fee, qris_image_url)
    `)
    .eq("id", teamId)
    .single();

  if (!team) notFound();

  // Pastikan user adalah kapten atau panitia
  const isCaptain = team.kapten_user_id === user.id;

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

  const isRosterReadyForVerification = coreMembersCount >= 4;

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
      <div className="p-6 bg-zinc-900/90 border border-zinc-800 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight">
              {team.nama}
            </h1>
            {isCaptain && (
              <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold uppercase">
                Kapten
              </span>
            )}
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
        </div>
      </div>

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

      {/* Slot Status Summary */}
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

      {/* Tabel Roster Saat Ini */}
      <div className="p-6 bg-zinc-900/60 border border-zinc-800 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-500" />
            Susunan Roster Tim
          </h2>
          <span className="text-xs text-zinc-400">{currentMembers.length} Pemain Terdaftar</span>
        </div>

        <div className="divide-y divide-zinc-800/80">
          {currentMembers.map((member: any, index: number) => {
            const isMemberCaptain = member.user_id === team.kapten_user_id;
            return (
              <div
                key={member.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400 shrink-0">
                    #{index + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-white tracking-tight">
                        {member.ign}
                      </p>
                      {isMemberCaptain && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-bold">
                          Kapten
                        </span>
                      )}
                      {member.is_substitute && (
                        <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[10px] font-bold">
                          Cadangan
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      UID FF: <span className="text-zinc-300 font-mono">{member.uid_game}</span> &bull; Akun: {member.users?.nama || member.users?.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <span className="px-2.5 py-1 rounded-md bg-zinc-800 text-zinc-300 font-semibold uppercase tracking-wider text-[10px]">
                    {member.role_tim}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bagian Undang Anggota (SCR-T07) */}
      {isCaptain && !isTournamentClosed && totalSlotsUsed < 6 && (
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
