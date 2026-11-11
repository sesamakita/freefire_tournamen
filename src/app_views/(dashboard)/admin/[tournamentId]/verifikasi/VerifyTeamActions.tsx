"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X, Loader2 } from "lucide-react";

interface VerifyTeamActionsProps {
  tournamentId: string;
  teamId: string;
  teamNama: string;
}

export default function VerifyTeamActions({
  tournamentId,
  teamId,
  teamNama,
}: VerifyTeamActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const handleApprove = async () => {
    const confirmApprove = window.confirm(`Setujui tim "${teamNama}" untuk bertanding di turnamen?`);
    if (!confirmApprove) return;

    try {
      setIsLoading(true);
      const res = await fetch(`/api/tournaments/${tournamentId}/teams/${teamId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });

      const json = await res.json();
      if (!json.success) {
        toast.error(json.error?.message || "Gagal menyetujui tim.");
        return;
      }

      toast.success(json.data?.message || `Tim "${teamNama}" disetujui!`);
      router.refresh();
    } catch (err) {
      console.error("Approve error:", err);
      toast.error("Terjadi kesalahan sistem.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rejectReason.trim().length < 10) {
      toast.error("Alasan penolakan minimal 10 karakter.");
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch(`/api/tournaments/${tournamentId}/teams/${teamId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", reason: rejectReason }),
      });

      const json = await res.json();
      if (!json.success) {
        toast.error(json.error?.message || "Gagal menolak tim.");
        return;
      }

      toast.info(`Tim "${teamNama}" telah ditolak.`);
      setShowRejectModal(false);
      setRejectReason("");
      router.refresh();
    } catch (err) {
      console.error("Reject error:", err);
      toast.error("Terjadi kesalahan sistem.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleApprove}
          disabled={isLoading}
          className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs inline-flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          )}
          <span>Setujui</span>
        </button>

        <button
          type="button"
          onClick={() => setShowRejectModal(true)}
          disabled={isLoading}
          className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-red-500/20 text-zinc-300 hover:text-red-400 font-bold text-xs inline-flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
          <span>Tolak</span>
        </button>
      </div>

      {/* Modal Alasan Penolakan */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base text-white">
              Tolak Pendaftaran Tim: {teamNama}
            </h3>
            <p className="text-xs text-zinc-400">
              Kapten tim akan menerima pesan alasan ini di dashboard mereka agar dapat melakukan perbaikan.
            </p>

            <form onSubmit={handleReject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Alasan Penolakan (Minimal 10 Karakter) <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                  placeholder="Contoh: Bukti transfer tidak terbaca / nominal tidak sesuai / UID salah."
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-red-500 transition-colors"
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  disabled={isLoading}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isLoading || rejectReason.trim().length < 10}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Kirim Penolakan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
