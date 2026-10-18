import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  Shield,
  ArrowLeft,
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  ExternalLink,
  MessageCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import VerifyTeamActions from "./VerifyTeamActions";

export default async function AdminVerificationPage({
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

  // 1. Cek kepemilikan/hak akses panitia
  const { data: staff } = await admin
    .from("tournament_staff")
    .select("role")
    .eq("tournament_id", tournamentId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!staff) {
    redirect("/dashboard");
  }

  // 2. Ambil data turnamen
  const { data: tournament } = await admin
    .from("tournaments")
    .select("*")
    .eq("id", tournamentId)
    .single();

  if (!tournament) notFound();

  // 3. Ambil seluruh tim di turnamen ini beserta data kaptennya
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any;
  const { data: teams } = await db
    .from("teams")
    .select(`
      *,
      users:kapten_user_id (nama, email, no_wa),
      team_members (id, ign, uid_game, role_tim, is_substitute)
    `)
    .eq("tournament_id", tournamentId)
    .order("created_at", { ascending: false });

  const allTeams = teams || [];
  const pendingTeams = allTeams.filter((t: any) => t.verification_status === "pending");
  const approvedTeams = allTeams.filter((t: any) => t.verification_status === "approved");
  const rejectedTeams = allTeams.filter((t: any) => t.verification_status === "rejected");
  const draftTeams = allTeams.filter((t: any) => t.verification_status === "draft");

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Kembali ke Dashboard
        </Link>
      </div>

      {/* Header Turnamen */}
      <div className="p-6 bg-zinc-900/90 border border-zinc-800 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">
              Panel Panitia (Peran: {staff.role})
            </span>
            <h1 className="text-xl font-black text-white tracking-tight mt-0.5">
              Antrean Verifikasi Tim: {tournament.nama}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 font-semibold">
            {approvedTeams.length} / {tournament.max_teams} Tim Terisi
          </span>
        </div>
      </div>

      {/* 1. Antrean Verifikasi (Pending) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            Menunggu Persetujuan Panitia ({pendingTeams.length})
          </h2>
        </div>

        {pendingTeams.length > 0 ? (
          <div className="space-y-4">
            {pendingTeams.map((team: any) => {
              const members = team.team_members || [];
              const cleanWa = team.users?.no_wa?.replace(/[^0-9]/g, "");
              const waLink = cleanWa
                ? `https://wa.me/${cleanWa.startsWith("0") ? "62" + cleanWa.slice(1) : cleanWa}`
                : null;

              return (
                <div
                  key={team.id}
                  className="p-6 bg-zinc-900/80 border border-amber-500/30 rounded-2xl space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-zinc-800">
                    <div>
                      <h3 className="text-lg font-black text-white tracking-tight">
                        {team.nama}
                      </h3>
                      <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-2">
                        <span>Kapten: <strong className="text-zinc-200">{team.users?.nama}</strong></span>
                        <span>&bull;</span>
                        <span>{team.users?.email}</span>
                        {waLink && (
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-400 hover:text-emerald-300 font-semibold inline-flex items-center gap-1"
                          >
                            <MessageCircle className="w-3 h-3" /> WA: {team.users?.no_wa}
                          </a>
                        )}
                      </p>
                    </div>

                    <VerifyTeamActions
                      tournamentId={tournamentId}
                      teamId={team.id}
                      teamNama={team.nama}
                    />
                  </div>

                  {/* Detail Bukti & Roster */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {/* Bukti Pembayaran */}
                    <div className="p-4 bg-zinc-950 border border-zinc-800/80 rounded-xl space-y-2">
                      <p className="font-semibold text-zinc-300 flex items-center justify-between">
                        <span>Bukti Pembayaran QRIS:</span>
                        {team.payment_proof_url && team.payment_proof_url !== "FREE_TOURNAMENT" && (
                          <a
                            href={team.payment_proof_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-amber-400 hover:text-amber-300 font-medium inline-flex items-center gap-1"
                          >
                            Buka Gambar Penuh <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </p>

                      {team.payment_proof_url === "FREE_TOURNAMENT" ? (
                        <p className="text-zinc-500 italic py-4">Turnamen Gratis (Tanpa Transfer)</p>
                      ) : team.payment_proof_url ? (
                        <img
                          src={team.payment_proof_url}
                          alt="Bukti Transfer"
                          className="max-h-48 rounded-lg border border-zinc-800 object-contain mx-auto"
                        />
                      ) : (
                        <p className="text-red-400">Belum ada bukti yang diunggah</p>
                      )}
                    </div>

                    {/* Roster Preview */}
                    <div className="p-4 bg-zinc-950 border border-zinc-800/80 rounded-xl space-y-2">
                      <p className="font-semibold text-zinc-300">
                        Susunan Roster ({members.length} Pemain):
                      </p>
                      <div className="divide-y divide-zinc-900">
                        {members.map((m: any, idx: number) => (
                          <div key={m.id} className="py-1.5 flex items-center justify-between">
                            <span className="text-zinc-300">
                              #{idx + 1} {m.ign} {m.is_substitute && "(Cadangan)"}
                            </span>
                            <span className="font-mono text-zinc-500">
                              UID: {m.uid_game} &bull; {m.role_tim}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 text-center bg-zinc-900/40 border border-zinc-800 rounded-xl text-xs text-zinc-500">
            Tidak ada tim dalam antrean verifikasi saat ini.
          </div>
        )}
      </div>

      {/* 2. Tim yang Sudah Disetujui (Approved) */}
      <div className="space-y-4 pt-4 border-t border-zinc-800">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          Tim Resmi Terdaftar ({approvedTeams.length})
        </h2>

        {approvedTeams.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {approvedTeams.map((team: any) => (
              <div
                key={team.id}
                className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-1"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white">{team.nama}</h3>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                    Resmi
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  Kapten: {team.users?.nama}
                </p>
                <p className="text-[11px] text-zinc-500">
                  {team.team_members?.length || 0} Pemain Terdaftar
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-500">Belum ada tim yang disetujui.</p>
        )}
      </div>

      {/* 3. Tim Ditolak (Rejected) */}
      {rejectedTeams.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-zinc-800">
          <h2 className="text-base font-bold text-zinc-400 flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-400" />
            Tim yang Ditolak ({rejectedTeams.length})
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {rejectedTeams.map((team: any) => (
              <div
                key={team.id}
                className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl space-y-1"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white">{team.nama}</h3>
                  <span className="text-[10px] font-bold text-red-400">Ditolak</span>
                </div>
                <p className="text-zinc-400">Kapten: {team.users?.nama}</p>
                {team.rejection_reason && (
                  <p className="text-red-300/80 pt-1 border-t border-red-500/20">
                    Alasan: {team.rejection_reason}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
