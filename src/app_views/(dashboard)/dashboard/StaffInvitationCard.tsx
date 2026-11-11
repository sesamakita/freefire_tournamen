"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShieldAlert, Check, X, Loader2, Sparkles } from "lucide-react";

export interface StaffInvitationItem {
  id: string;
  role: string;
  created_at: string;
  tournament: {
    id: string;
    nama: string;
    slug: string;
  };
}

export function StaffInvitationCard({
  invitations,
}: {
  invitations: StaffInvitationItem[];
}) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<"accept" | "decline" | null>(null);

  const handleRespond = async (staffId: string, action: "accept" | "decline") => {
    try {
      setLoadingId(staffId);
      setActionType(action);

      const res = await fetch("/api/tournaments/staff/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId, action }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal memproses tanggapan.");
      }

      if (action === "accept") {
        toast.success(data.message || "Undangan diterima! Selamat bertugas sebagai panitia.");
      } else {
        toast.info("Undangan panitia ditolak.");
      }

      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      toast.error(msg);
    } finally {
      setLoadingId(null);
      setActionType(null);
    }
  };

  if (!invitations || invitations.length === 0) return null;

  return (
    <div className="relative overflow-hidden p-5 sm:p-6 bg-gradient-to-r from-amber-950/40 via-[#18181C] to-red-950/30 border-2 border-amber-500/40 rounded-2xl shadow-xl shadow-amber-500/10 space-y-4 animate-in fade-in duration-300">
      {/* Top Banner Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5 text-amber-400">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-4 h-4 text-amber-400 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider font-display text-amber-300">
              Undangan Menjadi Staf / Panitia Turnamen
            </h3>
            <p className="text-[11px] text-zinc-400">
              Penyelenggara turnamen meminta Anda bergabung untuk bertugas di turnamen ini
            </p>
          </div>
        </div>

        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          {invitations.length} Menunggu Persetujuan
        </span>
      </div>

      {/* List of Pending Invitations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        {invitations.map((inv) => {
          const isLoading = loadingId === inv.id;

          return (
            <div
              key={inv.id}
              className="card-glow card-glow-hover p-4 rounded-xl transition-all flex flex-col justify-between gap-3"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#DA292A]/15 text-[#EF3839] border border-[#DA292A]/30">
                    Peran: {inv.role}
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    {new Date(inv.created_at).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white tracking-tight line-clamp-1">
                  {inv.tournament?.nama || "Turnamen Free Fire"}
                </h4>
                <p className="text-xs text-zinc-400 mt-1">
                  Anda akan memiliki wewenang untuk verifikasi tim, mengatur jadwal, dan menginput skor.
                </p>
              </div>

              {/* Action Buttons: Terima / Tolak */}
              <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/80">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleRespond(inv.id, "accept")}
                  className="flex-1 h-9 px-3 rounded-lg text-xs font-bold uppercase tracking-wider chamfer-btn bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/20"
                >
                  {isLoading && actionType === "accept" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      Terima
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleRespond(inv.id, "decline")}
                  className="h-9 px-3 rounded-lg text-xs font-bold uppercase tracking-wider bg-zinc-800/80 hover:bg-red-500/20 text-zinc-300 hover:text-red-400 border border-zinc-700 hover:border-red-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isLoading && actionType === "decline" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <X className="w-3.5 h-3.5" />
                      Tolak
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
