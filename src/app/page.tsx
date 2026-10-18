import Link from "next/link";
import {
  Trophy,
  Shield,
  KeyRound,
  CheckCircle2,
  Users,
  Flame,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col justify-between selection:bg-amber-500 selection:text-black relative overflow-hidden">
      {/* Decorative ambient gradients */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[450px] bg-amber-500/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute top-1/2 -right-40 w-[500px] h-[500px] bg-orange-600/10 blur-[160px] rounded-full pointer-events-none" />

      {/* Header */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/70 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
              <Trophy className="w-5 h-5 text-zinc-950 stroke-[2.5]" />
            </div>
            <span className="text-2xl font-black tracking-tight text-white uppercase italic font-headline">
              Arena<span className="text-amber-500">Ku</span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors"
            >
              Masuk
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-xs sm:text-sm shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              Daftar Sekarang
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 z-10 text-center flex flex-col items-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider mb-8">
          <Flame className="w-4 h-4" />
          Platform Turnamen Free Fire Battle Royale
        </div>

        {/* Title */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight uppercase leading-[1.05] max-w-4xl">
          Turnamen Rapi, <br />
          <span className="bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 bg-clip-text text-transparent">
            Tanpa Drama Skor
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-sm sm:text-lg text-zinc-400 max-w-2xl mt-6 leading-relaxed">
          Gantikan Google Sheets dan WhatsApp yang berantakan. Distribusi Room ID aman tepat waktu,
          skor terverifikasi dual-approval, dan klasemen live transparan.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 mt-10 w-full sm:w-auto">
          <Link
            href="/register"
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-zinc-950 font-black text-sm uppercase tracking-wide shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            Daftar Tim Sekarang <ArrowRight className="w-4 h-4 stroke-[3]" />
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800 font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            Masuk ke Dashboard
          </Link>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 text-left w-full max-w-5xl">
          {/* Card 1 */}
          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Room ID Anti Bocor</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Room ID & Password hanya bisa dibuka oleh kapten peserta match yang sah, tepat 15 menit sebelum pertandingan dimulai.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Dual Approval Skor</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Panitia menginput placement & kills dengan bukti screenshot, admin berbeda memverifikasi. Skor tidak bisa dimanipulasi sepihak.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Roster & UID Unik</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Sistem otomatis menolak pemain ganda di turnamen yang sama. Seluruh pemain terdaftar resmi dengan akun mandiri.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-8 text-center text-xs text-zinc-500">
        <p>&copy; 2026 ArenaKu — Platform Turnamen Free Fire Battle Royale.</p>
      </footer>
    </div>
  );
}

