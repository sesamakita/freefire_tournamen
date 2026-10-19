import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Trophy,
  Shield,
  Users,
  AlertCircle,
  Clock,
  ArrowRight,
  LogIn,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import AcceptInviteActions from "./AcceptInviteActions";

export default async function AcceptInvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = createAdminClient();

  // 1. Ambil data undangan lengkap
  const { data: invitation, error } = await admin
    .from("team_invitations")
    .select(`
      *,
      teams:team_id (
        id,
        nama,
        logo_url,
        tournaments:tournament_id (id, nama, status)
      )
    `)
    .eq("token", token)
    .single();

  if (error || !invitation) {
    notFound();
  }

  const isExpired = new Date(invitation.expires_at) < new Date();
  const isPending = invitation.status === "pending" && !isExpired;

  // @ts-expect-error Supabase nested relation
  const teamNama = invitation.teams?.nama || "Tim Free Fire";
  // @ts-expect-error Supabase nested relation
  const tournamentNama = invitation.teams?.tournaments?.nama || "Turnamen";

  return (
    <div className="max-w-md mx-auto py-8 px-4 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20">
          <Trophy className="w-6 h-6 text-zinc-950 stroke-[2.5]" />
        </div>
        <h1 className="text-2xl text-white tracking-tight">
          Undangan Bergabung Tim
        </h1>
        <p className="text-xs text-zinc-400">
          Anda diundang untuk bertanding di turnamen Free Fire
        </p>
      </div>

      {/* Kartu Status / Detail Tim */}
      <div className="card-glow p-6 rounded-2xl space-y-5">
        <div className="text-center pb-4 border-b border-zinc-800">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
            {tournamentNama}
          </span>
          <h2 className="text-2xl text-white mt-2 tracking-tight">
            {teamNama}
          </h2>
        </div>

        {/* Info Anggota yang diundang */}
        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between py-1.5 border-b border-zinc-800/60">
            <span className="text-zinc-400">IGN (In-Game Name)</span>
            <span className="font-bold text-white text-sm">{invitation.ign}</span>
          </div>

          <div className="flex items-center justify-between py-1.5 border-b border-zinc-800/60">
            <span className="text-zinc-400">UID Free Fire</span>
            <span className="font-mono font-bold text-amber-400">{invitation.uid_game}</span>
          </div>

          <div className="flex items-center justify-between py-1.5 border-b border-zinc-800/60">
            <span className="text-zinc-400">Peran Tim</span>
            <span className="font-bold text-zinc-200 capitalize">{invitation.role_tim}</span>
          </div>

          <div className="flex items-center justify-between py-1.5">
            <span className="text-zinc-400">Status Pemain</span>
            <span
              className={`font-bold ${
                invitation.is_substitute ? "text-blue-400" : "text-emerald-400"
              }`}
            >
              {invitation.is_substitute ? "Pemain Cadangan" : "Pemain Inti"}
            </span>
          </div>
        </div>

        {/* Kondisi 1: Undangan Kadaluarsa */}
        {isExpired && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-center space-y-2">
            <div className="flex items-center justify-center gap-1.5 text-red-400 text-xs font-bold">
              <Clock className="w-4 h-4" />
              <span>Undangan Kadaluarsa</span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Tautan undangan ini sudah melewati batas aktif 7 hari. Silakan hubungi kapten tim untuk mengirimkan tautan baru.
            </p>
          </div>
        )}

        {/* Kondisi 2: Undangan Sudah Diproses */}
        {!isExpired && invitation.status !== "pending" && (
          <div className="p-4 bg-zinc-800/80 rounded-xl text-center space-y-1">
            <p className="text-xs font-bold text-zinc-300">
              Undangan sudah berstatus: <span className="uppercase text-amber-400">{invitation.status}</span>
            </p>
            <p className="text-[11px] text-zinc-500">
              Undangan ini telah diproses sebelumnya.
            </p>
          </div>
        )}

        {/* Kondisi 3: Undangan Masih Aktif */}
        {isPending && (
          <div>
            {!user ? (
              /* User belum login */
              <div className="space-y-3 pt-2">
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-2 text-amber-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Anda perlu masuk atau mendaftar akun ArenaKu untuk bergabung ke tim ini.</span>
                </div>

                <Link
                  href={`/login?next=/tim/bergabung/${token}`}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-sm shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  Masuk / Daftar untuk Menerima
                </Link>
              </div>
            ) : (
              /* User sudah login -> render aksi Terima / Tolak */
              <AcceptInviteActions
                token={token}
                invitedEmail={invitation.invited_email}
                userEmail={user.email || ""}
              />
            )}
          </div>
        )}
      </div>

      <div className="text-center">
        <Link
          href="/dashboard"
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Kembali ke Dashboard Utama
        </Link>
      </div>
    </div>
  );
}
