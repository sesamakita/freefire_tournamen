"use client";

import { useState } from "react";
import { Link, useLocation } from "react-router";
import {
  Users,
  Trophy,
  Calendar,
  BarChart3,
  Radio,
  Shield,
  Settings2,
  ExternalLink,
  Megaphone,
  Copy,
  Check,
  ChevronRight,
  ArrowLeft,
  Sparkles,
} from "lucide-react";

interface Props {
  tournamentId: string;
  tournamentName?: string;
  format?: string;
  slug?: string;
  status?: string;
  role?: string;
}

export default function TournamentAdminNav({
  tournamentId,
  tournamentName,
  format = "lone_wolf_1v1",
  slug,
  status,
  role,
}: Props) {
  const location = useLocation();
  const pathname = location?.pathname || "";
  const [copiedId, setCopiedId] = useState(false);

  const isLoneWolf = format === "lone_wolf_1v1";

  const handleCopyId = () => {
    navigator.clipboard.writeText(tournamentId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const tabs = [
    {
      href: `/admin/${tournamentId}/verifikasi`,
      label: "Verifikasi Tim",
      icon: Users,
    },
    ...(isLoneWolf
      ? [
          {
            href: `/admin/${tournamentId}/bracket`,
            label: "Bagan Gugur 1v1",
            icon: Trophy,
          },
        ]
      : [
          {
            href: `/admin/${tournamentId}/match`,
            label: "Match & Room",
            icon: Calendar,
          },
          {
            href: `/admin/${tournamentId}/skor`,
            label: "Input Skor",
            icon: BarChart3,
          },
        ]),
    {
      href: `/admin/${tournamentId}/sponsor`,
      label: "Kelola Sponsor",
      icon: Megaphone,
      badge: "IKLAN",
      badgeColor: "amber",
    },
    {
      href: `/admin/${tournamentId}/live`,
      label: "Live Stream & OBS",
      icon: Radio,
      badge: "LIVE",
      badgeColor: "red",
    },
    {
      href: `/admin/${tournamentId}/panitia`,
      label: "Staf Panitia",
      icon: Shield,
    },
    {
      href: `/admin/${tournamentId}/edit`,
      label: "Pengaturan",
      icon: Settings2,
    },
  ];

  const getStatusBadge = (st?: string) => {
    switch (st) {
      case "open":
        return { label: "Pendaftaran Buka", bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" };
      case "closed":
        return { label: "Pendaftaran Ditutup", bg: "bg-zinc-800 text-zinc-300 border-zinc-700" };
      case "running":
        return { label: "Sedang Berlangsung", bg: "bg-blue-500/10 text-blue-400 border-blue-500/30" };
      case "done":
        return { label: "Turnamen Selesai", bg: "bg-purple-500/10 text-purple-400 border-purple-500/30" };
      default:
        return { label: "Draft", bg: "bg-amber-500/10 text-amber-400 border-amber-500/30" };
    }
  };

  const statusBadge = getStatusBadge(status);

  return (
    <div className="w-full space-y-4">
      {/* 1. Header Konteks Turnamen & Breadcrumbs */}
      <div className="card-glow p-3.5 sm:p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 backdrop-blur-md space-y-3">
        {/* Breadcrumb Bar */}
        <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-1.5 text-zinc-400 flex-wrap min-w-0">
            <Link to="/dashboard" className="hover:text-white transition-colors">
              Dashboard
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
            <Link to="/admin" className="hover:text-white transition-colors">
              Panel Panitia
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
            <span className="text-amber-400 font-bold truncate max-w-[150px] sm:max-w-xs">
              {tournamentName || "Detail Turnamen"}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start xs:self-auto">
            <Link
              to="/admin"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-400 hover:text-white transition-colors px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Ganti Turnamen</span>
            </Link>

            {slug && (
              <Link
                to={`/t/${slug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-400 hover:text-amber-300 transition-colors px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20"
              >
                <span>Halaman Publik</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            )}
          </div>
        </div>

        {/* Info Turnamen Utama */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2.5 border-t border-zinc-800/60">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30">
                {isLoneWolf ? "👑 King of By One (1v1)" : "🪂 Battle Royale"}
              </span>

              {status && (
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${statusBadge.bg}`}>
                  {statusBadge.label}
                </span>
              )}

              {role && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-zinc-900 border border-zinc-800 text-zinc-300">
                  Peran: <b className="text-amber-400">{role}</b>
                </span>
              )}
            </div>

            <h2 className="text-base sm:text-xl font-bold text-white tracking-tight flex items-center gap-2 truncate">
              <span className="truncate">{tournamentName || "Panel Manajemen Turnamen"}</span>
            </h2>
          </div>

          {/* Tournament ID Copy Pill */}
          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            <button
              type="button"
              onClick={handleCopyId}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-xs font-mono transition-all group cursor-pointer"
              title="Klik untuk menyalin Tournament ID"
            >
              <span className="text-[11px] text-zinc-500">ID:</span>
              <span className="text-zinc-300 text-[11px] max-w-[110px] sm:max-w-[160px] truncate">
                {tournamentId}
              </span>
              {copiedId ? (
                <span className="inline-flex items-center gap-1 text-emerald-400 text-[10px] font-sans font-bold">
                  <Check className="w-3.5 h-3.5" /> Disalin!
                </span>
              ) : (
                <Copy className="w-3.5 h-3.5 text-zinc-500 group-hover:text-amber-400 transition-colors" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 2. Unified Tab Bar Modul Panitia (Scrollable on Mobile) */}
      <div className="relative w-full">
        <div className="w-full flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none border-b border-zinc-800/80 -mx-1 px-1 sm:mx-0 sm:px-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = pathname === tab.href || pathname.startsWith(`${tab.href}/`);

            return (
              <Link
                key={tab.href}
                to={tab.href}
                className={`px-3 sm:px-3.5 py-2 rounded-xl inline-flex items-center gap-1.5 sm:gap-2 text-xs font-bold transition-all shrink-0 select-none ${
                  isActive
                    ? "bg-amber-500 text-zinc-950 font-black shadow-lg shadow-amber-500/25 border border-amber-400"
                    : "bg-zinc-900/90 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-850 hover:border-zinc-700"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isActive ? "text-zinc-950 stroke-[2.5]" : "text-zinc-400"}`} />
                <span className="whitespace-nowrap">{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider ${
                      isActive
                        ? "bg-zinc-950 text-white"
                        : tab.badgeColor === "red"
                        ? "bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse"
                        : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
