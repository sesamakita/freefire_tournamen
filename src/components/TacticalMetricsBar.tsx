"use client";

import React from "react";
import { Shield } from "lucide-react";

export default function TacticalMetricsBar() {
  const metrics = [
    {
      badge: "12",
      badgeColor: "text-amber-400 border-amber-500/30 bg-amber-500/10",
      title: "Tim per Match",
      desc: "Slot presisi 1–12",
    },
    {
      badge: "T-15",
      badgeColor: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
      title: "Room Terkunci",
      desc: "Anti-bocor ke pihak luar",
    },
    {
      badge: "2x",
      badgeColor: "text-orange-400 border-orange-500/30 bg-orange-500/10",
      title: "Verifikasi Ganda",
      desc: "Panitia input, admin verifikasi",
    },
    {
      badge: "UID",
      badgeColor: "text-blue-400 border-blue-500/30 bg-blue-500/10",
      title: "Anti-Smurf",
      desc: "Tolak akun ganda otomatis",
    },
    {
      badge: "Rp",
      badgeColor: "text-amber-300 border-amber-400/40 bg-amber-500/15",
      title: "Hadiah Otomatis",
      desc: "Langsung cair ke dompet",
    },
  ];

  return (
    <div className="relative w-full bg-[#0B0B0E] border-y border-[#DA292A]/50 shadow-lg shadow-black/80 overflow-hidden">
      {/* Top subtle red neon beam */}
      <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-[#DA292A] to-transparent opacity-80" />

      <div className="flex items-stretch overflow-x-auto no-scrollbar scroll-smooth snap-x">
        {/* Sisi Kiri: Red Angled Polygon Badge (Sesuai Style Acuan) */}
        <div
          className="shrink-0 bg-gradient-to-r from-[#DA292A] via-[#EF3839] to-[#DA292A] text-white flex items-center justify-center pl-3.5 sm:pl-5 pr-6 sm:pr-8 py-2.5 sm:py-3.5 select-none relative group"
          style={{
            clipPath: "polygon(0 0, 100% 0, 78% 100%, 0 100%)",
          }}
        >
          <div className="flex flex-col items-center justify-center text-center leading-none tracking-tight">
            <span className="text-[8px] sm:text-[9px] font-black tracking-widest uppercase text-white/95">
              STANDAR
            </span>
            <div className="my-0.5 sm:my-1 flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white stroke-[2.5]" />
            </div>
            <span className="text-[8px] sm:text-[9px] font-black tracking-widest uppercase text-white/95">
              SISTEM
            </span>
          </div>
        </div>

        {/* Sisi Kanan: Data Asli (12 Tim, T-15, 2x Verifikasi, UID Anti-Smurf) dengan Divider Vertikal */}
        <div className="flex-1 grid grid-cols-2 md:grid-cols-4 divide-x divide-zinc-800/80 min-w-[500px] md:min-w-0">
          {metrics.map((item) => (
            <div
              key={item.title}
              className="snap-start flex items-center gap-2.5 sm:gap-3.5 px-3.5 sm:px-5 py-2.5 sm:py-3.5 hover:bg-zinc-900/40 transition-colors group cursor-default"
            >
              <div
                className={`w-8 h-8 sm:w-9 sm:h-9 shrink-0 rounded-md border flex items-center justify-center font-mono text-[11px] sm:text-xs font-black tracking-wider transition-transform group-hover:scale-105 shadow-inner ${item.badgeColor}`}
              >
                {item.badge}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] sm:text-xs font-bold text-white uppercase tracking-wider group-hover:text-white transition-colors truncate font-sans">
                  {item.title}
                </p>
                <p className="text-[10px] sm:text-[11px] text-zinc-400 tracking-tight truncate">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile scroll hint gradient */}
      <div className="md:hidden pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#0B0B0E] to-transparent z-10" />

      {/* Bottom subtle red neon beam */}
      <div className="absolute bottom-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-[#DA292A]/40 to-transparent" />
    </div>
  );
}
