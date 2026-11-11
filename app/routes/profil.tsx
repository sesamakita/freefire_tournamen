import { redirect, useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { createWebClient } from "@/lib/supabase/web";
import { ProfileClientView } from "@/app/(dashboard)/profil/ProfileClientView";

export function meta() {
  return [
    { title: "Profil & Keamanan Akun — Arena Tempur" },
    { name: "description", content: "Kelola data profil, kontak WhatsApp, dan kata sandi akun Anda di Arena Tempur." },
  ];
}

export async function loader({ request }: LoaderFunctionArgs) {
  const { client: supabase } = createWebClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw redirect("/login");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  // 1. Profil pengguna dari public.users
  const { data: profile } = await db
    .from("users")
    .select("nama, no_wa, email, created_at")
    .eq("id", user.id)
    .single();

  // 2. Cek peran staff turnamen
  const { data: staffRoles } = await db
    .from("tournament_staff")
    .select("role")
    .eq("user_id", user.id);

  // 3. Hitung partisipasi tim (sebagai kapten maupun anggota)
  const { count: captainCount } = await db
    .from("teams")
    .select("id", { count: "exact", head: true })
    .eq("kapten_user_id", user.id);

  const { count: memberCount } = await db
    .from("team_members")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const totalTeams = (captainCount || 0) + (memberCount || 0);

  return {
    user: {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
    },
    profile,
    staffRoles: staffRoles || [],
    teamsCount: totalTeams,
  };
}

export default function ProfilRoute() {
  const data = useLoaderData<typeof loader>();

  return (
    <div className="max-w-5xl mx-auto py-2">
      <ProfileClientView
        user={data.user}
        profile={data.profile}
        staffRoles={data.staffRoles}
        teamsCount={data.teamsCount}
      />
    </div>
  );
}
