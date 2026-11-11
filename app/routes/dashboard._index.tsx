import { Link, useLoaderData, redirect } from "react-router";
import type { LoaderFunctionArgs, MetaFunction } from "react-router";
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
  Radio,
  Settings2,
  Calendar,
  Megaphone,
} from "lucide-react";
import { createWebClient } from "@/lib/supabase/web";
import { StaffInvitationCard, type StaffInvitationItem } from "@/app/(dashboard)/dashboard/StaffInvitationCard";
import TeamHeaderActions from "@/app/(dashboard)/tim/[teamId]/TeamHeaderActions";

export const meta: MetaFunction = () => {
  return [
    { title: "Dashboard — Arena Tempur" },
    { name: "description", content: "Dashboard tim dan turnamen komunitas." },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const { client: supabase } = createWebClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw redirect("/login");

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
      tournaments:tournament_id (id, nama, status, slug, format, entry_fee)
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

  // 5. Staff peran
  const { data: rawStaffRecords } = await db
    .from("tournament_staff")
    .select(`
      id,
      role,
      status,
      created_at,
      tournaments:tournament_id (id, nama, status, slug, format)
    `)
    .eq("user_id", user.id);

  const pendingStaffInvites: StaffInvitationItem[] = (rawStaffRecords || [])
    .filter((st: any) => st.status === "pending")
    .map((st: any) => ({
      id: st.id,
      role: st.role,
      created_at: st.created_at,
      tournament: {
        id: st.tournaments?.id || "",
        nama: st.tournaments?.nama || "Turnamen Komunitas",
        slug: st.tournaments?.slug || "",
      },
    }));

  const activeStaffList = (rawStaffRecords || []).filter(
    (st: any) => !st.status || st.status === "accepted"
  );

  const isEmailVerified = !!user.email_confirmed_at;

  return {
    user,
    profile,
    captainTeams: captainTeams || [],
    memberTeams: memberTeams || [],
    pendingInvitations: pendingInvitations || [],
    pendingStaffInvites,
    activeStaffList,
    isEmailVerified,
  };
}

export default function DashboardRoute() {
  const {
    user,
    profile,
    captainTeams,
    memberTeams,
    pendingInvitations,
    pendingStaffInvites,
    activeStaffList,
    isEmailVerified,
  } = useLoaderData<typeof loader>();

  return (
    <div className="space-y-8">
      {/* Banner Undangan Panitia Turnamen */}
      {pendingStaffInvites.length > 0 && (
        <StaffInvitationCard invitations={pendingStaffInvites} />
      )}

      {/* Banner Peringatan Verifikasi Email */}
      {!isEmailVerified && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-300 font-headline">
                Email Anda belum diverifikasi
              </p>
              <p className="text-xs text-amber-200/70 mt-0.5">
                Verifikasi email untuk menerima notifikasi Room ID, jadwal tanding, dan status
                verifikasi tim.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl text-white tracking-tight font-headline">
            Selamat Datang,{" "}
            <span className="text-amber-500">
              {profile?.nama || user.email?.split("@")[0]}
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Kelola tim Anda, pantau jadwal turnamen komunitas, dan akses Room ID di sini.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/tim/buat"
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-xs shadow-lg shadow-amber-500/20 inline-flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Daftar Tim Turnamen
          </Link>
        </div>
      </div>

      {/* Undangan Masuk */}
      {pendingInvitations && pendingInvitations.length > 0 && (
        <div className="p-5 bg-gradient-to-r from-blue-950/40 to-indigo-950/40 border border-blue-500/30 rounded-2xl space-y-3">
          <div className="flex items-center gap-2 text-blue-400 text-sm font-bold font-headline">
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
                  <p className="text-xs font-bold text-white">Tim: {inv.teams?.nama}</p>
                  <p className="text-[11px] text-zinc-400">
                    Turnamen: {inv.teams?.tournaments?.nama}
                  </p>
                  <p className="text-[11px] text-amber-400 font-medium capitalize mt-1">
                    Role: {inv.role_tim} {inv.is_substitute && "(Cadangan)"}
                  </p>
                </div>
                <Link
                  to={`/tim/bergabung/${inv.token}`}
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
          <h2 className="text-base text-white flex items-center gap-2 font-headline">
            <Trophy className="w-4 h-4 text-amber-500" />
            Tim Turnamen Saya (Sebagai Kapten)
          </h2>
          <span className="text-xs text-zinc-500">{captainTeams.length} Tim</span>
        </div>

        {captainTeams.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {captainTeams.map((team: any) => (
              <div
                key={team.id}
                className="card-glow card-glow-hover p-5 rounded-2xl space-y-4 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      {team.tournaments?.format === "lone_wolf_1v1" ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/10 border border-blue-500/20 text-blue-400">
                          Duel 1v1
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-zinc-800 text-zinc-400">
                          Squad BR
                        </span>
                      )}
                    </div>
                    <h3 className="text-base text-white tracking-tight font-bold">{team.nama}</h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {team.tournaments?.nama || "Turnamen Komunitas"}
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

                <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs gap-2 flex-wrap">
                  <div className="flex items-center gap-3">
                    {team.tournaments?.format === "lone_wolf_1v1" ? (
                      team.payment_status === "unpaid" && (team.tournaments?.entry_fee ?? 0) > 0 ? (
                        <Link
                          to={`/tim/${team.id}/bayar`}
                          className="text-emerald-400 hover:text-emerald-300 font-semibold inline-flex items-center gap-1"
                        >
                          Bayar Tiket QRIS <ArrowRight className="w-3 h-3" />
                        </Link>
                      ) : (
                        <Link
                          to={`/t/${team.tournaments?.slug}/bracket`}
                          className="text-blue-400 hover:text-blue-300 font-semibold inline-flex items-center gap-1"
                        >
                          Lihat Bagan 1v1 <ArrowRight className="w-3 h-3" />
                        </Link>
                      )
                    ) : (
                      <Link
                        to={`/tim/${team.id}/roster`}
                        className="text-amber-400 hover:text-amber-300 font-semibold inline-flex items-center gap-1"
                      >
                        Kelola Roster <ArrowRight className="w-3 h-3" />
                      </Link>
                    )}

                    <Link to={`/tim/${team.id}/jadwal`} className="text-zinc-400 hover:text-white">
                      Jadwal & Room
                    </Link>
                  </div>

                  <TeamHeaderActions
                    teamId={team.id}
                    initialTeamName={team.nama}
                    initialLogoUrl={team.logo_url}
                    tournamentName={team.tournaments?.nama}
                    isCaptain={true}
                    isTournamentClosed={
                      team.tournaments?.status === "closed" ||
                      team.tournaments?.status === "running" ||
                      team.tournaments?.status === "done"
                    }
                    redirectOnDelete={false}
                  />
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
                Daftarkan tim Anda sekarang untuk mengikuti turnamen komunitas dan dapatkan akses
                Room ID saat pertandingan dimulai.
              </p>
            </div>
            <Link
              to="/tim/buat"
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
          <h2 className="text-base text-white flex items-center gap-2 font-headline">
            <Users className="w-4 h-4 text-zinc-400" />
            Tim di mana Saya Bergabung
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {memberTeams.map((membership: any, idx: number) => (
              <div
                key={idx}
                className="card-glow card-glow-hover p-5 rounded-2xl space-y-2 transition-all"
              >
                <h3 className="text-white font-bold">{membership.teams?.nama}</h3>
                <p className="text-xs text-zinc-400">
                  Role:{" "}
                  <span className="text-amber-400 font-semibold capitalize">
                    {membership.role_tim}
                  </span>{" "}
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

      {/* Panel Panitia / Admin */}
      {activeStaffList && activeStaffList.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-zinc-800/80">
          <div className="flex items-center justify-between">
            <h2 className="text-base text-amber-400 flex items-center gap-2 font-headline">
              <Shield className="w-4 h-4" />
              Akses & Kewenangan Panitia Turnamen
            </h2>
            <Link
              to="/admin"
              className="text-xs text-zinc-400 hover:text-white inline-flex items-center gap-1 font-semibold"
            >
              <span>Semua Turnamen Anda</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeStaffList.map((st: any, idx: number) => {
              const tourn = st.tournaments;
              const isLoneWolf = tourn?.format === "lone_wolf_1v1";

              return (
                <div
                  key={idx}
                  className="card-glow card-glow-hover p-6 rounded-2xl space-y-4 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold uppercase">
                          Kewenangan: {st.role}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-[10px] font-semibold uppercase">
                          {isLoneWolf ? "King of By One (1v1)" : "Battle Royale"}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-white tracking-tight">
                        {tourn?.nama}
                      </h3>
                      <p className="text-[11px] text-zinc-500 font-mono mt-0.5 select-all">
                        ID: <span className="text-zinc-400">{tourn?.id}</span>
                      </p>
                    </div>

                    <Link
                      to={`/admin/${tourn?.id}/edit`}
                      className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-amber-500/50 hover:text-amber-400 text-zinc-400 text-xs transition-colors shrink-0"
                      title="Pengaturan Turnamen"
                    >
                      <Settings2 className="w-4 h-4" />
                    </Link>
                  </div>

                  {/* Menu Tombol Cepat Panitia */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center">
                    <Link
                      to={`/admin/${tourn?.id}/verifikasi`}
                      className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-amber-500/40 hover:bg-zinc-900 transition-all flex flex-col items-center justify-center gap-1 group"
                    >
                      <Users className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
                      <span className="text-[11px] font-bold text-zinc-200">Verifikasi Tim</span>
                    </Link>

                    {isLoneWolf ? (
                      <Link
                        to={`/admin/${tourn?.id}/bracket`}
                        className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-amber-500/40 hover:bg-zinc-900 transition-all flex flex-col items-center justify-center gap-1 group"
                      >
                        <Trophy className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                        <span className="text-[11px] font-bold text-zinc-200">Bagan 1v1</span>
                      </Link>
                    ) : (
                      <Link
                        to={`/admin/${tourn?.id}/match`}
                        className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-amber-500/40 hover:bg-zinc-900 transition-all flex flex-col items-center justify-center gap-1 group"
                      >
                        <Calendar className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
                        <span className="text-[11px] font-bold text-zinc-200">Match & Room</span>
                      </Link>
                    )}

                    <Link
                      to={`/admin/${tourn?.id}/sponsor`}
                      className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-amber-500/40 hover:bg-zinc-900 transition-all flex flex-col items-center justify-center gap-1 group"
                    >
                      <Megaphone className="w-4 h-4 text-amber-300 group-hover:scale-110 transition-transform" />
                      <span className="text-[11px] font-bold text-zinc-200">Sponsor</span>
                    </Link>

                    <Link
                      to={`/admin/${tourn?.id}/live`}
                      className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-red-500/40 hover:bg-zinc-900 transition-all flex flex-col items-center justify-center gap-1 group"
                    >
                      <Radio className="w-4 h-4 text-red-500 animate-pulse" />
                      <span className="text-[11px] font-bold text-zinc-200">Live & OBS</span>
                    </Link>
                  </div>

                  {/* Tombol Utama Pusat Kontrol */}
                  <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                    <Link
                      to={`/t/${tourn?.slug}`}
                      target="_blank"
                      className="text-zinc-500 hover:text-zinc-300 font-medium"
                    >
                      Halaman Publik Turnamen ↗
                    </Link>
                    <Link
                      to={`/admin/${tourn?.id}`}
                      className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold inline-flex items-center gap-1.5 transition-colors shadow-md shadow-amber-500/20"
                    >
                      <span>Buka Panel Panitia</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
