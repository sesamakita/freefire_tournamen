import { Link, useLoaderData, redirect } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { ArrowLeft, Shield } from "lucide-react";
import { createWebClient } from "@/lib/supabase/web";
import { createAdminClient } from "@/lib/supabase/admin";
import { StaffManagementClient } from "@/app/(dashboard)/admin/[tournamentId]/panitia/StaffManagementClient";
import TournamentAdminNav from "@/components/TournamentAdminNav";

export function meta() {
  return [
    { title: "Kelola Panitia & Staf — Arena Tempur" },
    { name: "description", content: "Undang pengguna terdaftar untuk menjadi panitia atau admin turnamen." },
  ];
}

export async function loader({ params, request }: LoaderFunctionArgs) {
  const tournamentId = params.tournamentId;
  if (!tournamentId) throw new Response("Tournament ID required", { status: 400 });

  const { client: supabase } = createWebClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw redirect("/login");

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
    throw redirect("/dashboard");
  }

  // 2. Ambil data turnamen
  const { data: tournament } = await db
    .from("tournaments")
    .select("id, nama, slug, format, status")
    .eq("id", tournamentId)
    .single();

  if (!tournament) throw new Response("Turnamen tidak ditemukan", { status: 404 });

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

  return {
    tournamentId,
    tournament,
    myStaff,
    staffList: staffList || [],
    userId: user.id,
  };
}

export default function AdminPanitiaRoute() {
  const { tournamentId, tournament, myStaff, staffList, userId } =
    useLoaderData<typeof loader>();

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Unified Tab Bar & Header Konteks Turnamen */}
      <TournamentAdminNav
        tournamentId={tournamentId}
        tournamentName={tournament.nama}
        format={tournament.format}
        slug={tournament.slug}
        status={tournament.status}
        role={myStaff?.role || "panitia"}
      />

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
        currentUserId={userId}
        myRole={myStaff.role}
        initialStaff={staffList}
      />
    </div>
  );
}
