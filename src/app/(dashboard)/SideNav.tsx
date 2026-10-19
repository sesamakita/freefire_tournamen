"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PlusCircle, Shield, Trophy, Swords, BarChart3 } from "lucide-react";
import { clsx } from "clsx";

type Item = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  staffOnly?: boolean;
};

const ITEMS: Item[] = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/tim/buat", label: "Daftar Tim", icon: PlusCircle },
  { href: "/admin", label: "Panel Panitia", icon: Shield, staffOnly: true },
];

export function SideNav({ isStaff }: { isStaff: boolean }) {
  const pathname = usePathname();
  const items = ITEMS.filter((i) => !i.staffOnly || isStaff);

  return (
    <nav
      aria-label="Navigasi utama"
      className="hidden md:flex flex-col items-center gap-2 w-[76px] shrink-0 py-6
                 border-r border-zinc-800/70 bg-zinc-900/40 backdrop-blur-md"
    >
      {items.map((item) => {
        const active =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            aria-label={item.label}
            aria-current={active ? "page" : undefined}
            className={clsx(
              "relative w-11 h-11 flex items-center justify-center rounded-xl transition-all",
              active
                ? "bg-amber-500/15 text-amber-400 border border-amber-500/40 glow-blue"
                : "text-zinc-500 border border-transparent hover:text-white hover:bg-zinc-800/60 hover:border-zinc-700"
            )}
          >
            <Icon className="w-5 h-5" />
            {active && (
              <span className="absolute -left-[14px] top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-full bg-amber-400 shadow-[0_0_12px_rgba(77,163,255,0.9)]" />
            )}
          </Link>
        );
      })}

      <div className="mt-auto flex flex-col items-center gap-2 text-zinc-500">
        <Trophy className="w-4 h-4" />
        <span className="text-[11px] font-bold tracking-widest rotate-180 [writing-mode:vertical-rl]">
          ARENAKU
        </span>
      </div>
    </nav>
  );
}
