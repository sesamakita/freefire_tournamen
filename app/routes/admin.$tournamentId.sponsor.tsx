import { useLoaderData, redirect } from "react-router";
import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { createWebClient } from "@/lib/supabase/web";
import { createAdminClient } from "@/lib/supabase/admin";
import TournamentAdminNav from "@/components/TournamentAdminNav";
import SponsorManagementClient, {
  type Sponsor,
} from "@/app/(dashboard)/admin/[tournamentId]/sponsor/SponsorManagementClient";
import { isDevAuthenticated } from "@/lib/dev-auth";

export const meta: MetaFunction = () => {
  return [
    { title: "Manajemen Sponsor & Iklan Siaran — Arena Tempur" },
    {
      name: "description",
      content:
        "Kelola daftar mitra sponsor, rotasi banner jeda pertandingan (intermission), dan logo overlay OBS Studio.",
    },
  ];
};

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { tournamentId } = params;
  if (!tournamentId) throw redirect("/admin");

  const isDev = isDevAuthenticated(request);
  const { client: supabase } = createWebClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isDev) throw redirect("/login");

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any;

  // 1. Ambil data turnamen
  const { data: tournament } = await db
    .from("tournaments")
    .select("id, nama, slug, format, status, organizer_id")
    .eq("id", tournamentId)
    .single();

  if (!tournament) {
    throw new Response("Turnamen tidak ditemukan", { status: 404 });
  }

  // 2. Cek hak akses staf/panitia (Bypass jika Developer God Mode)
  let userRole = isDev ? "owner" : (user && tournament.organizer_id === user.id ? "owner" : null);

  if (!userRole && user) {
    const { data: staff } = await db
      .from("tournament_staff")
      .select("role")
      .eq("tournament_id", tournamentId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (staff) {
      userRole = staff.role;
    }
  }

  if (!userRole) {
    throw redirect("/dashboard");
  }

  // 3. Ambil daftar sponsor untuk turnamen ini
  const { data: sponsors } = await db
    .from("tournament_sponsors")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

  const isOwnerOrAdmin = userRole === "owner" || userRole === "admin";

  return {
    tournamentId,
    tournament,
    role: userRole,
    isOwnerOrAdmin,
    sponsors: (sponsors || []) as Sponsor[],
  };
}

export default function AdminTournamentSponsorRoute() {
  const { tournamentId, tournament, role, isOwnerOrAdmin, sponsors } =
    useLoaderData<typeof loader>();

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Unified Tab Bar & Header Konteks Turnamen */}
      <TournamentAdminNav
        tournamentId={tournamentId}
        tournamentName={tournament.nama}
        format={tournament.format}
        slug={tournament.slug}
        status={tournament.status}
        role={role}
      />

      {/* Jendela Pengaturan & Manajemen Sponsor */}
      <SponsorManagementClient
        tournamentId={tournamentId}
        tournamentName={tournament.nama}
        initialSponsors={sponsors}
        isOwnerOrAdmin={isOwnerOrAdmin}
      />
    </div>
  );
}
