import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Shield, Trophy, Users, Calendar, Settings2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { StaffManagementClient } from "./StaffManagementClient";

export const metadata = {
  title: "Kelola Panitia & Staf — Arena Tempur",
  description: "Undang pengguna terdaftar untuk menjadi panitia atau admin turnamen.",
};

export default async function AdminPanitiaPage({
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any;

  // 1. Cek hak akses panitia
  const { data: myStaff } = await db
    .from("tournament_staff")
    .select("role")
    .eq("tournament_id", tournamentId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!myStaff) {
    redirect("/dashboard");
  }

  // 2. Ambil data turnamen
  const { data: tournament } = await db
    .from("tournaments")
    .select("id, nama, slug, format, status")
    .eq("id", tournamentId)
    .single();

  if (!tournament) notFound();

  // 3. Ambil daftar staf
  const { data: staffList } = await db
    .from("tournament_staff")
    .select(`
      id,
      role,
      status,
      created_at,
      users:user_id (id, nama, email, no_wa)
    `)
    .eq("tournament_id", tournamentId)
    .order("created_at", { ascending: true });

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Navigasi Atas & Tab Sub-Modul Admin */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Kembali ke Portal Panitia
        </Link>

        {/* Tab Navigasi Modul Admin */}
        <div className="flex items-center gap-2 flex-wrap text-xs font-bold">
          <Link
            href={`/admin/${tournamentId}/verifikasi`}
            className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
          >
            Verifikasi Tim
          </Link>
          {tournament.format === "lone_wolf_1v1" ? (
            <Link
              href={`/admin/${tournamentId}/bracket`}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
            >
              Bagan 1v1
            </Link>
          ) : (
            <>
              <Link
                href={`/admin/${tournamentId}/match`}
                className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
              >
                Match & Room
              </Link>
              <Link
                href={`/admin/${tournamentId}/skor`}
                className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
              >
                Input Skor
              </Link>
            </>
          )}
          <Link
            href={`/admin/${tournamentId}/panitia`}
            className="px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300"
          >
            Kelola Panitia
          </Link>
          <Link
            href={`/admin/${tournamentId}/edit`}
            className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
          >
            Edit Turnamen
          </Link>
        </div>
      </div>

      {/* Header Turnamen */}
      <div className="card-glow p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-zinc-950 shadow-lg shadow-amber-500/20 shrink-0">
            <Shield className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-500">
              Manajemen Panitia (Peran Anda: {myStaff.role})
            </span>
            <h1 className="text-2xl sm:text-3xl text-white font-bold tracking-tight">
              Kepanitiaan: {tournament.nama}
            </h1>
          </div>
        </div>
      </div>

      {/* Client Component */}
      <StaffManagementClient
        tournamentId={tournamentId}
        tournamentName={tournament.nama}
        currentUserId={user.id}
        myRole={myStaff.role}
        initialStaff={staffList || []}
      />
    </div>
  );
}
