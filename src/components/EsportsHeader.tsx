"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Swords, User, LogIn } from "lucide-react";

interface EsportsHeaderProps {
  user?: any;
}

export default function EsportsHeader({ user }: EsportsHeaderProps) {
  return (
    <header className="fixed top-0 inset-x-0 z-50 w-full bg-[#0B0B0E]/95 backdrop-blur-xl border-b border-zinc-800/80 shadow-xl shadow-black/60 transition-all">
      {/* Laser Top Accent Line (Red Cyberpunk Line) */}
      <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#DA292A] to-transparent" />

      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-2 sm:gap-4">
        {/* Kiri: Logo Resmi ARENA TEMPUR */}
        <Link href="/" className="flex items-center gap-2 sm:gap-3.5 group shrink-0">
          <Image
            src="/images/logo-arenatempur.svg"
            alt="ARENA TEMPUR"
            width={240}
            height={38}
            priority
            className="h-5 sm:h-7 md:h-8 lg:h-9 max-w-[135px] sm:max-w-none w-auto object-contain transition-transform group-hover:scale-105"
          />
        </Link>

        {/* Kanan: Hanya Masuk dan Gabung Squad */}
        <div className="flex items-center gap-1.5 sm:gap-4 shrink-0">
          {user ? (
            <Link
              href="/dashboard"
              className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs font-bold tracking-wider uppercase text-zinc-300 hover:text-white hover:bg-[#141416] border border-zinc-800 transition-colors flex items-center gap-1.5 sm:gap-2 shrink-0"
            >
              <User className="w-3.5 h-3.5 text-[#DA292A]" />
              <span>DASHBOARD</span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="px-2 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold tracking-wider sm:tracking-widest uppercase text-zinc-300 hover:text-white transition-colors flex items-center gap-1 sm:gap-1.5 shrink-0"
            >
              <LogIn className="w-3.5 h-3.5 text-[#DA292A] sm:hidden" />
              <span>MASUK</span>
            </Link>
          )}

          {/* Tombol Utama Poligonal (Chamfered Corner) - GABUNG SQUAD */}
          <Link
            href={user ? "/tim/buat" : "/register"}
            className="relative px-3 sm:px-6 py-1.5 sm:py-2.5 bg-gradient-to-r from-[#DA292A] via-[#EF3839] to-[#DA292A] text-white font-extrabold text-[10px] sm:text-xs tracking-wider sm:tracking-widest uppercase chamfer-btn shadow-lg shadow-[#DA292A]/30 hover:shadow-[#DA292A]/60 hover:brightness-110 active:scale-95 transition-all flex items-center gap-1 sm:gap-2 cursor-pointer border-t border-white/20 shrink-0"
          >
            <Swords className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{user ? "DAFTAR TURNAMEN" : "GABUNG SQUAD"}</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
