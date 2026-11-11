import { Link, Outlet, useLoaderData, redirect } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { Trophy, LogOut, Shield, Search, Bell, User, Home, PlusCircle, Wallet } from "lucide-react";
import { createWebClient } from "@/lib/supabase/web";
import { createClient } from "@/lib/supabase/client";
import { SideNav } from "@/app/(dashboard)/SideNav";

export async function loader({ request }: LoaderFunctionArgs) {
  const { client: supabase } = createWebClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw redirect("/login");
  }

  // Ambil profil user
  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  // Cek apakah user adalah staff turnamen aktif
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: staffRoles } = await (supabase as any)
    .from("tournament_staff")
    .select("role, status")
    .eq("user_id", user.id);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activeStaff = staffRoles?.filter(
    (s: any) => !s.status || s.status === "accepted"
  );
  const isStaff = !!(activeStaff && activeStaff.length > 0);

  return { user, profile, isStaff };
}

export default function DashboardLayout() {
  const { user, profile, isStaff } = useLoaderData<typeof loader>();

  const handleLogout = async () => {
    try {
      const clientSupabase = createClient();
      await clientSupabase.auth.signOut();
    } catch (err) {
      console.warn("Client signOut:", err);
    }
    // Hard redirect to logout endpoint to clear all HTTP cookies and refresh page state
    window.location.href = "/api/auth/logout";
  };

  return (
    <div className="min-h-screen flex bg-transparent text-zinc-100">
      {/* Icon rail sidebar */}
      <SideNav isStaff={!!isStaff} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-[#0B0B0E]/90 backdrop-blur-xl">
          <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#DA292A] to-transparent" />

          <div className="h-16 px-4 sm:px-6 lg:px-8 flex items-center gap-4">
            <Link to="/dashboard" className="flex items-center gap-2.5 group shrink-0">
              <img
                src="/images/logo-arenatempur.svg"
                alt="ARENA TEMPUR"
                className="h-6 sm:h-7 w-auto object-contain transition-transform group-hover:scale-105"
              />
            </Link>

            {/* Search */}
            <form action="/cari" method="GET" className="hidden lg:flex flex-1 max-w-md mx-auto" role="search">
              <label className="relative w-full">
                <span className="sr-only">Cari turnamen atau tim</span>
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                <input
                  type="search"
                  name="q"
                  placeholder="Cari turnamen, tim, atau pemain…"
                  autoComplete="off"
                  className="w-full h-10 pl-10 pr-4 rounded-xl bg-[#141416] border border-zinc-800
                             text-xs text-zinc-200 placeholder:text-zinc-500
                             focus:border-[#DA292A] focus:ring-1 focus:ring-[#DA292A]/30
                             transition-colors outline-none"
                />
              </label>
            </form>

            {/* Aksi kanan */}
            <div className="flex items-center gap-2.5 ml-auto">
              {isStaff && (
                <Link
                  to="/admin"
                  className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 chamfer-btn
                             text-[11px] font-bold uppercase tracking-wider
                             text-[#EF3839] bg-[#DA292A]/10 border border-[#DA292A]/30
                             hover:bg-[#DA292A]/20 transition-colors shadow-sm shadow-[#DA292A]/20"
                >
                  <Shield className="w-3.5 h-3.5" />
                  Portal Panitia
                </Link>
              )}

              <button
                type="button"
                title="Notifikasi"
                aria-label="Notifikasi"
                className="w-9 h-9 flex items-center justify-center rounded-xl text-zinc-400
                           border border-zinc-800 bg-[#141416]
                           hover:text-white hover:border-[#DA292A]/50 transition-colors cursor-pointer"
              >
                <Bell className="w-4 h-4" />
              </button>

              <Link
                to="/profil"
                className="flex items-center gap-2.5 pl-2 ml-1 border-l border-zinc-800 group hover:opacity-90 transition-opacity"
                title="Buka Pengaturan Profil & Ganti Password"
              >
                <div className="w-8 h-8 rounded-full bg-[#141416] border border-zinc-700 group-hover:border-[#DA292A] flex items-center justify-center text-[#DA292A] transition-colors">
                  <User className="w-4 h-4" />
                </div>
                <div className="hidden sm:block text-left leading-none">
                  <p className="text-xs font-bold text-white group-hover:text-[#DA292A] transition-colors">
                    {profile?.nama || user.email?.split("@")[0]}
                  </p>
                  <p className="text-[11px] text-[#8E8E93] mt-1">{user.email}</p>
                </div>
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                title="Keluar"
                aria-label="Keluar"
                className="p-2 rounded-xl text-zinc-400 hover:text-red-400 hover:bg-red-500/10
                           border border-transparent hover:border-red-500/30 transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-24 md:pb-8">
          <Outlet context={{ user, profile, isStaff }} />
        </main>

        {/* Footer */}
        <footer className="border-t border-zinc-900 py-6 text-center text-xs text-zinc-500 mb-16 md:mb-0">
          <p>&copy; 2026 Arena Tempur — Sistem Administrasi Turnamen Battle Royale</p>
        </footer>

        {/* Mobile Bottom Navigation Bar */}
        <nav
          aria-label="Navigasi Bawah Mobile"
          className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-[#0B0B0E]/95 backdrop-blur-xl border-t border-zinc-800/80 px-3 py-2 flex items-center justify-around shadow-2xl"
        >
          <Link
            to="/dashboard"
            className="flex flex-col items-center gap-1 p-1.5 text-zinc-400 hover:text-white transition-colors"
          >
            <Home className="w-5 h-5 text-zinc-300" />
            <span className="text-[10px] font-bold tracking-tight">Dashboard</span>
          </Link>

          <Link
            to="/dompet"
            className="flex flex-col items-center gap-1 p-1.5 text-zinc-400 hover:text-white transition-colors"
          >
            <Wallet className="w-5 h-5 text-amber-500" />
            <span className="text-[10px] font-bold tracking-tight">Dompet</span>
          </Link>

          <Link
            to="/tim/buat"
            className="flex flex-col items-center gap-1 p-1.5 text-zinc-400 hover:text-white transition-colors"
          >
            <PlusCircle className="w-5 h-5 text-zinc-300" />
            <span className="text-[10px] font-bold tracking-tight">Daftar Tim</span>
          </Link>

          {isStaff && (
            <Link
              to="/admin"
              className="flex flex-col items-center gap-1 p-1.5 text-[#DA292A] hover:text-[#EF3839] transition-colors"
            >
              <Shield className="w-5 h-5" />
              <span className="text-[10px] font-bold tracking-tight">Panitia</span>
            </Link>
          )}

          <Link
            to="/profil"
            className="flex flex-col items-center gap-1 p-1.5 text-zinc-400 hover:text-white transition-colors"
          >
            <User className="w-5 h-5 text-zinc-300" />
            <span className="text-[10px] font-bold tracking-tight">Profil</span>
          </Link>

          <Link
            to="/"
            className="flex flex-col items-center gap-1 p-1.5 text-zinc-400 hover:text-white transition-colors"
          >
            <Trophy className="w-5 h-5 text-amber-500" />
            <span className="text-[10px] font-bold tracking-tight">Beranda</span>
          </Link>
        </nav>
      </div>
    </div>
  );
}
