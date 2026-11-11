"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight, Play, Swords, Shield, Trophy, Wallet } from "lucide-react";

interface ApexHeroSectionProps {
  user: any;
}

export default function ApexHeroSection({ user }: ApexHeroSectionProps) {
  return (
    <section className="relative w-full bg-[#0B0B0E] overflow-hidden border-b border-zinc-900 select-none">
      {/* BACKGROUND ARTWORK & TACTICAL CRUSH OVERLAYS */}
      <div className="absolute inset-0 z-0">
        {/* Tactical Dark Cyber Esports Mesh Background */}
        <div className="absolute inset-0 bg-[#0B0B0E]">
          {/* Subtle tactical grid lines */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
          
          {/* Tactical radar glow / ambient lights */}
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-[#DA292A]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-10 left-10 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        </div>

        {/* Mobile Red & Dark Ambient Overlay (Mobile < 768px) */}
        <div className="md:hidden absolute inset-0 bg-gradient-to-b from-[#8B1415]/95 via-[#0B0B0E]/95 to-[#0B0B0E]" />

        {/* Desktop & Tablet Diagonal Crimson Red Split (Signature Apex / Esports Visual >= 768px) */}
        <div
          className="hidden md:block absolute inset-y-0 left-0 w-[82%] lg:w-[58%] xl:w-[52%] bg-gradient-to-br from-[#B51F20] via-[#8B1415] to-[#400A0A] opacity-95 transition-all"
          style={{
            clipPath: "polygon(0 0, 100% 0, 78% 100%, 0 100%)",
          }}
        >
          {/* Subtle tactical grunge/slash texture overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:12px_12px] opacity-40 mix-blend-overlay" />
          
          {/* Dark geometric vignette inside the red polygon */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent" />
          <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-black/40 to-transparent" />
        </div>

        {/* Ambient Dark Fallback & Readability Gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B0B0E] via-[#0B0B0E]/80 md:via-transparent to-black/40 pointer-events-none" />
        
        {/* Bottom subtle shadow transition into ribbon bar */}
        <div className="absolute inset-x-0 bottom-0 h-20 sm:h-28 bg-gradient-to-t from-[#0B0B0E] to-transparent pointer-events-none" />
        
        {/* Top edge subtle glow line */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#DA292A]/50 to-transparent pointer-events-none" />
      </div>

      {/* CONTENT CONTAINER (Aligns with Apex Legends Left Layout) */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-20 lg:py-28 min-h-[480px] sm:min-h-[540px] lg:min-h-[620px] flex flex-col justify-center">
        <div className="max-w-xl space-y-4 sm:space-y-6">
          
          {/* Top Stencil Title: ARENA TEMPUR */}
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-black/60 border border-white/20 backdrop-blur-md text-[10px] sm:text-xs font-mono font-bold tracking-widest uppercase text-white/90">
              <span className="w-2 h-2 rounded-full bg-[#DA292A] animate-ping" />
              <span>KOMUNITAS ESPORTS INDEPENDEN</span>
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl xl:text-8xl font-black tracking-tighter text-white uppercase font-sans leading-[0.92] drop-shadow-[0_8px_30px_rgba(0,0,0,0.9)]">
              ARENA TEMPUR
            </h1>

            {/* Tactical Underline Bar */}
            <div className="flex items-center gap-2 pt-0.5">
              <div className="h-1 w-8 sm:w-16 bg-white" />
              <span className="text-[10px] sm:text-xs font-black tracking-[0.25em] sm:tracking-[0.28em] text-white/90 uppercase font-sans truncate">
                BATTLE ROYALE TOURNAMENT ARENA
              </span>
              <div className="h-1 flex-1 max-w-[60px] bg-white/40" />
            </div>
          </div>

          {/* Sub-headline */}
          <h2 className="text-xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white uppercase font-sans leading-tight drop-shadow-md">
            BUKTIKAN SKILL. <br className="hidden xs:inline" />
            REBUT JUARA.
          </h2>

          {/* Body Paragraph */}
          <p className="text-xs sm:text-sm text-zinc-100/90 leading-relaxed max-w-md font-medium drop-shadow">
            Drop in. Squad up. Jadilah skuad terakhir yang bertahan di panggung turnamen komunitas. 
            Sistem operasi otomatis: Room ID terenkripsi T-15 menit, validasi Player ID anti-smurf, dan verifikasi klasemen ganda transparan.
          </p>

          {/* CTA Action Buttons: Full width on mobile, side-by-side on tablet/desktop */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2 w-full sm:w-auto">
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="w-full sm:w-auto px-6 sm:px-8 lg:px-9 py-3 sm:py-3.5 lg:py-4 bg-[#DA292A] hover:bg-[#EF3839] text-white font-black text-xs sm:text-sm uppercase tracking-widest transition-all duration-200 flex items-center justify-center gap-2 group shadow-xl shadow-[#DA292A]/40 active:scale-95 text-center"
                  style={{ clipPath: "polygon(0 0, 100% 0, 92% 100%, 0 100%)" }}
                >
                  <span>BUKA DASHBOARD</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform stroke-[3]" />
                </Link>

                <Link
                  href="/dompet"
                  className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-3.5 lg:py-4 bg-zinc-950/80 hover:bg-zinc-900 text-amber-400 font-black text-xs sm:text-sm uppercase tracking-widest border border-amber-500/30 hover:border-amber-400 backdrop-blur-md transition-all duration-200 flex items-center justify-center gap-2.5 active:scale-95 text-center"
                >
                  <Wallet className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>DOMPET SAYA</span>
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/register"
                  className="w-full sm:w-auto px-6 sm:px-8 lg:px-9 py-3 sm:py-3.5 lg:py-4 bg-[#DA292A] hover:bg-[#EF3839] text-white font-black text-xs sm:text-sm uppercase tracking-widest transition-all duration-200 flex items-center justify-center gap-2 group shadow-xl shadow-[#DA292A]/40 active:scale-95 text-center"
                  style={{ clipPath: "polygon(0 0, 100% 0, 92% 100%, 0 100%)" }}
                >
                  <span>DAFTAR SEKARANG</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform stroke-[3]" />
                </Link>

                <Link
                  href="/login"
                  className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-3.5 lg:py-4 bg-zinc-950/80 hover:bg-zinc-900 text-white font-black text-xs sm:text-sm uppercase tracking-widest border border-white/20 hover:border-white/50 backdrop-blur-md transition-all duration-200 flex items-center justify-center gap-2.5 active:scale-95 text-center"
                >
                  <span>LOGIN AKUN</span>
                  <Play className="w-3.5 h-3.5 fill-white text-white ml-0.5 shrink-0" />
                </Link>
              </>
            )}
          </div>
        </div>

        {/* CORNER TOURNAMENT BADGE (Bottom Right: Visible on Laptop & Desktop 1024px+) */}
        <div className="absolute bottom-6 right-6 sm:bottom-8 sm:right-8 z-20 hidden lg:flex items-center gap-4 bg-[#0B0B0E]/95 border-y border-r border-zinc-800 border-l-4 border-l-[#DA292A] px-5 py-3 shadow-2xl backdrop-blur-md">
          <div className="flex flex-col text-right">
            <span className="text-[10px] font-mono tracking-widest text-zinc-400 uppercase">
              SEASON 2026 // OPEN
            </span>
            <span className="text-xs sm:text-sm font-black text-white tracking-wider uppercase font-sans">
              BATTLE ROYALE SERIES
            </span>
          </div>
          <Link
            href="#tournaments"
            className="px-2.5 py-1.5 bg-[#DA292A]/20 hover:bg-[#DA292A] text-[#DA292A] hover:text-white text-[11px] font-black uppercase tracking-wider transition-colors flex items-center gap-1 rounded-sm group"
          >
            <span>LIHAT</span>
            <ChevronRight className="w-3.5 h-3.5 stroke-[3] group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
}
