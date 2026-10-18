import Link from "next/link";
import { redirect } from "next/navigation";
import { Trophy, LogOut, User, PlusCircle, Shield, Home } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Ambil profil user dari public.users
  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  // Cek apakah user adalah staff turnamen (admin/panitia)
  const { data: staffRoles } = await supabase
    .from("tournament_staff")
    .select("role")
    .eq("user_id", user.id);

  const isStaff = (staffRoles && staffRoles.length > 0);

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col text-zinc-100">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
                <Trophy className="w-5 h-5 text-zinc-950 stroke-[2.5]" />
              </div>
              <span className="text-xl font-black tracking-tight text-white uppercase italic">
                Arena<span className="text-amber-500">Ku</span>
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              <Link
                href="/dashboard"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors flex items-center gap-1.5"
              >
                <Home className="w-4 h-4 text-amber-500" />
                Dashboard
              </Link>
              <Link
                href="/tim/buat"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors flex items-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4 text-zinc-400" />
                Daftar Tim
              </Link>
              {isStaff && (
                <Link
                  href="/admin"
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-colors flex items-center gap-1.5"
                >
                  <Shield className="w-4 h-4" />
                  Panel Panitia
                </Link>
              )}
            </nav>
          </div>

          {/* User profile & logout */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 pl-2">
              <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300">
                <User className="w-4 h-4" />
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-white leading-none">
                  {profile?.nama || user.email?.split("@")[0]}
                </p>
                <p className="text-[11px] text-zinc-500 leading-none mt-1">
                  {user.email}
                </p>
              </div>
            </div>

            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                title="Keluar"
                className="p-2 rounded-xl text-zinc-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-6 text-center text-xs text-zinc-600">
        <p>&copy; 2026 ArenaKu — Sistem Administrasi Turnamen Battle Royale</p>
      </footer>
    </div>
  );
}

