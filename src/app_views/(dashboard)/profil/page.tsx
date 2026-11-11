import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileClientView } from "./ProfileClientView";

export const metadata = {
  title: "Profil & Keamanan Akun — Arena Tempur",
  description: "Kelola data profil, kontak WhatsApp, dan kata sandi akun Anda di Arena Tempur.",
};

export default async function ProfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
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

  return (
    <div className="max-w-5xl mx-auto py-2">
      <ProfileClientView
        user={{
          id: user.id,
          email: user.email,
          created_at: user.created_at,
        }}
        profile={profile}
        staffRoles={staffRoles || []}
        teamsCount={totalTeams}
      />
    </div>
  );
}
