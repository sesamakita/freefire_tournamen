import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Shield,
  Trophy,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  ArrowRight,
  PlusCircle,
  FileSpreadsheet,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminHubPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const admin = createAdminClient();

  // 1. Ambil daftar turnamen di mana user menjadi staff (owner, admin, panitia)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any;
  const { data: staffRoles } = await db
    .from("tournament_staff")
    .select(`
      role,
      tournaments:tournament_id (
        id,
        nama,
        slug,
        status,
        entry_fee,
        max_teams,
        tgl_mulai,
        tgl_selesai
      )
    `)
    .eq("user_id", user.id);

  const tournamentsManaged = (staffRoles || [])
    .map((s: any) => ({
      ...s.tournaments,
      myRole: s.role,
    }))
    .filter((t: any) => Boolean(t.id));

  // 2. Ambil statistik ringkas untuk tiap turnamen
  const tournamentIds = tournamentsManaged.map((t: any) => t.id);

  let pendingTeamsCountMap: { [tid: string]: number } = {};
  let totalMatchesCountMap: { [tid: string]: number } = {};

  if (tournamentIds.length > 0) {
    const { data: teamsData } = await admin
      .from("teams")
      .select("tournament_id, verification_status")
      .in("tournament_id", tournamentIds);

    (teamsData || []).forEach((tm: any) => {
      if (tm.verification_status === "pending") {
        pendingTeamsCountMap[tm.tournament_id] =
          (pendingTeamsCountMap[tm.tournament_id] || 0) + 1;
      }
    });

    const { data: matchesData } = await admin
      .from("matches")
      .select("tournament_id")
      .in("tournament_id", tournamentIds);

    (matchesData || []).forEach((m: any) => {
      totalMatchesCountMap[m.tournament_id] =
        (totalMatchesCountMap[m.tournament_id] || 0) + 1;
    });
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header Admin Hub */}
      <div className="card-glow p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-zinc-950 shadow-lg shadow-amber-500/20">
            <Shield className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-3xl text-white tracking-tight">
              Portal Panitia Turnamen
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Pusat kendali verifikasi tim, jadwal match, Room ID, dan persetujuan skor
            </p>
          </div>
        </div>

        <div>
          <Link
            href="/admin/turnamen/buat"
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-xs shadow-md shadow-amber-500/20 inline-flex items-center gap-2 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            Buka Turnamen Baru
          </Link>
        </div>
      </div>

      {/* Daftar Turnamen yang Dikelola */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base text-white flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            Turnamen yang Anda Kelola ({tournamentsManaged.length})
          </h2>
        </div>

        {tournamentsManaged.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tournamentsManaged.map((t: any) => {
              const pendingCount = pendingTeamsCountMap[t.id] || 0;
              const matchesCount = totalMatchesCountMap[t.id] || 0;

              return (
                <div
                  key={t.id}
                  className="card-glow card-glow-hover p-6 rounded-2xl space-y-5 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-bold uppercase">
                        Peran: {t.myRole}
                      </span>
                      <h3 className="text-lg text-white tracking-tight mt-1.5">
                        {t.nama}
                      </h3>
                      <p className="text-xs text-zinc-400">
                        Status: <span className="capitalize font-semibold text-zinc-200">{t.status}</span> &bull; Kapasitas: {t.max_teams} Tim
                      </p>
                    </div>

                    {pendingCount > 0 && (
                      <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-bold animate-pulse flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {pendingCount} Pending
                      </span>
                    )}
                  </div>

                  {/* Menu Navigasi Modul Admin */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800/80 text-center">
                    <Link
                      href={`/admin/${t.id}/verifikasi`}
                      className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-amber-500/40 hover:bg-zinc-900 transition-all space-y-1 block"
                    >
                      <Users className="w-4 h-4 text-amber-500 mx-auto" />
                      <p className="text-[11px] font-bold text-white">Verifikasi</p>
                      <p className="text-[11px] text-zinc-500">{pendingCount} Tim</p>
                    </Link>

                    <Link
                      href={`/admin/${t.id}/match`}
                      className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-amber-500/40 hover:bg-zinc-900 transition-all space-y-1 block"
                    >
                      <Calendar className="w-4 h-4 text-blue-400 mx-auto" />
                      <p className="text-[11px] font-bold text-white">Match & Room</p>
                      <p className="text-[11px] text-zinc-500">{matchesCount} Match</p>
                    </Link>

                    <Link
                      href={`/admin/${t.id}/skor`}
                      className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-amber-500/40 hover:bg-zinc-900 transition-all space-y-1 block"
                    >
                      <Trophy className="w-4 h-4 text-emerald-400 mx-auto" />
                      <p className="text-[11px] font-bold text-white">Input Skor</p>
                      <p className="text-[11px] text-zinc-500">Dual Control</p>
                    </Link>
                  </div>

                  {/* Link Lihat Klasemen Publik */}
                  <div className="pt-2 flex items-center justify-between text-xs">
                    <Link
                      href={`/t/${t.slug}`}
                      target="_blank"
                      className="text-zinc-400 hover:text-white inline-flex items-center gap-1 font-medium"
                    >
                      <span>Lihat Halaman Publik Turnamen</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center bg-zinc-900/40 border border-zinc-800 rounded-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-zinc-800 text-zinc-500 flex items-center justify-center mx-auto">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-200">
                Anda belum terdaftar sebagai panitia di turnamen apa pun
              </p>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1">
                Jika Anda adalah penyelenggara turnamen, Anda bisa langsung membuka turnamen baru.
                Anda akan otomatis menjadi Owner turnamen tersebut.
              </p>
            </div>
            <Link
              href="/admin/turnamen/buat"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-zinc-950 text-xs font-bold shadow-md shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              Buka Turnamen Pertama Saya
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
