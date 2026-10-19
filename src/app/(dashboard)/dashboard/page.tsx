import Link from "next/link";
import {
  Users,
  Trophy,
  AlertTriangle,
  Plus,
  Shield,
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
  Mail,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  // 1. Profil user
  const { data: profile } = await db
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  // 2. Tim yang dikapteni oleh user
  const { data: captainTeams } = await db
    .from("teams")
    .select(`
      *,
      tournaments:tournament_id (nama, status, slug)
    `)
    .eq("kapten_user_id", user.id);

  // 3. Tim di mana user menjadi anggota biasa
  const { data: memberTeams } = await db
    .from("team_members")
    .select(`
      role_tim,
      is_substitute,
      teams:team_id (
        id,
        nama,
        verification_status,
        tournaments:tournament_id (nama, status, slug)
      )
    `)
    .eq("user_id", user.id);

  // 4. Undangan masuk yang masih pending
  const { data: pendingInvitations } = await db
    .from("team_invitations")
    .select(`
      id,
      token,
      ign,
      role_tim,
      is_substitute,
      created_at,
      teams:team_id (
        nama,
        tournaments:tournament_id (nama)
      )
    `)
    .eq("invited_email", user.email!)
    .eq("status", "pending");

  // 5. Staff peran (jika panitia / admin)
  const { data: staffList } = await db
    .from("tournament_staff")
    .select(`
      role,
      tournaments:tournament_id (id, nama, status, slug)
    `)
    .eq("user_id", user.id);

  const isEmailVerified = !!user.email_confirmed_at;

  return (
    <div className="space-y-8">
      {/* Banner Peringatan Verifikasi Email (FSD BR-AUTH-05) */}
      {!isEmailVerified && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-300">
                Email Anda belum diverifikasi
              </p>
              <p className="text-xs text-amber-200/70 mt-0.5">
                Verifikasi email untuk menerima notifikasi Room ID, jadwal tanding, dan status verifikasi tim.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl text-white tracking-tight">
            Selamat Datang,{" "}
            <span className="text-amber-500">
              {profile?.nama || user.email?.split("@")[0]}
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Kelola tim Anda, pantau jadwal turnamen Free Fire, dan akses Room ID di sini.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/tim/buat"
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-xs shadow-lg shadow-amber-500/20 inline-flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Daftar Tim Turnamen
          </Link>
        </div>
      </div>

      {/* Undangan Masuk (Jika Ada) */}
      {pendingInvitations && pendingInvitations.length > 0 && (
        <div className="p-5 bg-gradient-to-r from-blue-950/40 to-indigo-950/40 border border-blue-500/30 rounded-2xl space-y-3">
          <div className="flex items-center gap-2 text-blue-400 text-sm font-bold">
            <Mail className="w-4 h-4" />
            <span>Anda Memiliki {pendingInvitations.length} Undangan Tim Baru!</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {pendingInvitations.map((inv: any) => (
              <div
                key={inv.id}
                className="p-3.5 bg-zinc-900/80 border border-zinc-800 rounded-xl flex items-center justify-between gap-3"
              >
                <div>
                  <p className="text-xs font-bold text-white">
                    
                    Tim: {inv.teams?.nama}
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    
                    Turnamen: {inv.teams?.tournaments?.nama}
                  </p>
                  <p className="text-[11px] text-amber-400 font-medium capitalize mt-1">
                    Role: {inv.role_tim} {inv.is_substitute && "(Cadangan)"}
                  </p>
                </div>
                <Link
                  href={`/tim/bergabung/${inv.token}`}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                >
                  Tanggapi <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tim yang Dikelola sebagai Kapten */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base text-white flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            Tim Turnamen Saya (Sebagai Kapten)
          </h2>
          <span className="text-xs text-zinc-500">
            {captainTeams?.length || 0} Tim
          </span>
        </div>

        {captainTeams && captainTeams.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {captainTeams.map((team: any) => (
              <div
                key={team.id}
                className="card-glow card-glow-hover p-5 rounded-2xl space-y-4 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base text-white tracking-tight">
                      {team.nama}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      
                      {team.tournaments?.nama || "Turnamen Free Fire"}
                    </p>
                  </div>
                  <div>
                    {team.verification_status === "approved" && (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Terverifikasi
                      </span>
                    )}
                    {team.verification_status === "pending" && (
                      <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-bold flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Menunggu Verifikasi
                      </span>
                    )}
                    {team.verification_status === "rejected" && (
                      <span className="px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-[11px] font-bold flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> Ditolak
                      </span>
                    )}
                    {team.verification_status === "draft" && (
                      <span className="px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-400 text-[11px] font-bold">
                        Draft
                      </span>
                    )}
                  </div>
                </div>

                {team.verification_status === "rejected" && team.rejection_reason && (
                  <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-300">
                    <span className="font-semibold">Alasan penolakan:</span> {team.rejection_reason}
                  </div>
                )}

                <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                  <Link
                    href={`/tim/${team.id}/roster`}
                    className="text-amber-400 hover:text-amber-300 font-semibold inline-flex items-center gap-1"
                  >
                    Kelola Roster <ArrowRight className="w-3 h-3" />
                  </Link>
                  <Link
                    href={`/tim/${team.id}/jadwal`}
                    className="text-zinc-400 hover:text-white"
                  >
                    Jadwal & Room
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center bg-zinc-900/40 border border-zinc-800/80 rounded-2xl space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-zinc-800/80 text-zinc-500 flex items-center justify-center mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-200">
                Belum ada tim yang didaftarkan
              </p>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1">
                Daftarkan tim Anda sekarang untuk mengikuti turnamen Free Fire dan dapatkan akses Room ID saat pertandingan dimulai.
              </p>
            </div>
            <Link
              href="/tim/buat"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Buat Tim Pertama
            </Link>
          </div>
        )}
      </div>

      {/* Tim Sebagai Anggota */}
      {memberTeams && memberTeams.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-zinc-800/80">
          <h2 className="text-base text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-zinc-400" />
            Tim di mana Saya Bergabung
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {memberTeams.map((membership: any, idx: number) => (
              <div
                key={idx}
                className="card-glow p-5 rounded-2xl space-y-2"
              >
                <h3 className="text-white">{membership.teams?.nama}</h3>
                <p className="text-xs text-zinc-400">
                  Role: <span className="text-amber-400 font-semibold capitalize">{membership.role_tim}</span>{" "}
                  {membership.is_substitute && "(Cadangan)"}
                </p>
                <p className="text-xs text-zinc-500">
                  Turnamen: {membership.teams?.tournaments?.nama}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Panel Panitia / Admin (Jika Ada) */}
      {staffList && staffList.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-zinc-800/80">
          <h2 className="text-base text-amber-400 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Akses Panitia Turnamen
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {staffList.map((st: any, idx: number) => (
              <div
                key={idx}
                className="p-5 bg-amber-500/5 border border-amber-500/20 rounded-2xl flex items-center justify-between"
              >
                <div>
                  
                  <h3 className="text-white">{st.tournaments?.nama}</h3>
                  <p className="text-xs text-amber-400 font-medium capitalize mt-0.5">
                    Peran: {st.role}
                  </p>
                </div>
                
                <Link
                  href={`/admin/${st.tournaments?.id}/verifikasi`}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs inline-flex items-center gap-1 transition-colors"
                >
                  Kelola <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


