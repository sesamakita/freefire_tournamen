import Link from "next/link";
import { redirect } from "next/navigation";
import { Trophy, LogOut, Shield, Search, Bell, User } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SideNav } from "./SideNav";

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
    <div className="min-h-screen flex bg-transparent text-zinc-100">
      {/* Icon rail sidebar */}
      <SideNav isStaff={!!isStaff} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar: logo kiri, search tengah, aksi kanan */}
        <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/70 backdrop-blur-xl">
          <div className="h-16 px-4 sm:px-6 lg:px-8 flex items-center gap-4">
            {/* Brand */}
            <Link href="/dashboard" className="flex items-center gap-2.5 group shrink-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-md shadow-amber-500/30 group-hover:scale-105 transition-transform">
                <Trophy className="w-5 h-5 text-white stroke-[2.5]" />
              </div>
              <span className="hidden sm:inline text-xl font-black tracking-tight text-white uppercase font-headline">
                Arena<span className="text-amber-500">Ku</span>
              </span>
            </Link>

            {/* Search — terhubung ke halaman hasil pencarian /cari */}
            <form action="/cari" method="GET" className="hidden lg:flex flex-1 max-w-md mx-auto" role="search">
              <label className="relative w-full">
                <span className="sr-only">Cari turnamen atau tim</span>
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                <input
                  type="search"
                  name="q"
                  placeholder="Cari turnamen, tim, atau pemain…"
                  autoComplete="off"
                  className="w-full h-10 pl-10 pr-4 rounded-xl bg-zinc-900/70 border border-zinc-800
                             text-xs text-zinc-200 placeholder:text-zinc-500
                             focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/20
                             transition-colors outline-none"
                />
              </label>
            </form>

            {/* Aksi kanan */}
            <div className="flex items-center gap-2 ml-auto">
              {isStaff && (
                <Link
                  href="/admin"
                  className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                             text-[11px] font-bold uppercase tracking-wider
                             text-amber-300 bg-amber-500/10 border border-amber-500/30
                             hover:bg-amber-500/20 transition-colors"
                >
                  <Shield className="w-3.5 h-3.5" />
                  Panitia
                </Link>
              )}

              <button
                type="button"
                title="Notifikasi"
                aria-label="Notifikasi"
                className="w-9 h-9 flex items-center justify-center rounded-xl text-zinc-400
                           border border-zinc-800 bg-zinc-900/60
                           hover:text-white hover:border-amber-500/40 transition-colors cursor-pointer"
              >
                <Bell className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2.5 pl-2 ml-1 border-l border-zinc-800">
                <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-amber-400">
                  <User className="w-4 h-4" />
                </div>
                <div className="hidden sm:block text-left leading-none">
                  <p className="text-xs font-semibold text-white">
                    {profile?.nama || user.email?.split("@")[0]}
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-1">{user.email}</p>
                </div>
              </div>

              <form action="/api/auth/logout" method="POST">
                <button
                  type="submit"
                  title="Keluar"
                  aria-label="Keluar"
                  className="p-2 rounded-xl text-zinc-400 hover:text-red-400 hover:bg-red-500/10
                             border border-transparent hover:border-red-500/30 transition-all cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-zinc-900 py-6 text-center text-xs text-zinc-500">
          <p>&copy; 2026 ArenaKu — Sistem Administrasi Turnamen Battle Royale</p>
        </footer>
      </div>
    </div>
  );
}

