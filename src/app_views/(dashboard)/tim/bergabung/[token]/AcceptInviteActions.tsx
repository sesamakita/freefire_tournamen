"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X, Loader2, AlertTriangle } from "lucide-react";

interface AcceptInviteActionsProps {
  token: string;
  invitedEmail: string;
  userEmail: string;
}

export default function AcceptInviteActions({
  token,
  invitedEmail,
  userEmail,
}: AcceptInviteActionsProps) {
  const router = useRouter();
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const isEmailDifferent =
    invitedEmail.toLowerCase().trim() !== userEmail.toLowerCase().trim();

  const handleAccept = async () => {
    try {
      setIsAccepting(true);
      setServerError(null);

      const res = await fetch(`/api/invitations/${token}/accept`, {
        method: "POST",
      });

      const json = await res.json();

      if (!json.success) {
        setServerError(json.error?.message || "Gagal menerima undangan.");
        toast.error(json.error?.message || "Gagal menerima undangan.");
        return;
      }

      toast.success(json.data?.message || "Selamat! Anda resmi bergabung.");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      console.error("Accept error:", err);
      setServerError("Terjadi kesalahan jaringan atau server.");
      toast.error("Terjadi kesalahan sistem.");
    } finally {
      setIsAccepting(false);
    }
  };

  const handleDecline = async () => {
    const confirmDecline = window.confirm("Apakah Anda yakin ingin menolak undangan tim ini?");
    if (!confirmDecline) return;

    try {
      setIsDeclining(true);
      setServerError(null);

      const res = await fetch(`/api/invitations/${token}/decline`, {
        method: "POST",
      });

      const json = await res.json();

      if (!json.success) {
        setServerError(json.error?.message || "Gagal menolak undangan.");
        toast.error(json.error?.message || "Gagal menolak undangan.");
        return;
      }

      toast.info("Undangan telah ditolak.");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      console.error("Decline error:", err);
      setServerError("Terjadi kesalahan jaringan atau server.");
      toast.error("Terjadi kesalahan sistem.");
    } finally {
      setIsDeclining(false);
    }
  };

  return (
    <div className="space-y-4 pt-2">
      {/* Peringatan jika login dengan email berbeda */}
      {isEmailDifferent && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Perhatian Email Berbeda:</p>
            <p className="text-[11px] text-amber-200/80 mt-0.5">
              Undangan dikirim untuk <span className="font-mono underline">{invitedEmail}</span>,
              tetapi Anda saat ini masuk sebagai <span className="font-mono underline">{userEmail}</span>.
              Jika Anda tetap melanjutkan, akun Anda yang sekarang akan didaftarkan ke tim ini.
            </p>
          </div>
        </div>
      )}

      {serverError && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400">
          {serverError}
        </div>
      )}

      {/* Tombol Terima & Tolak */}
      <div className="flex flex-col gap-2.5">
        <button
          type="button"
          onClick={handleAccept}
          disabled={isAccepting || isDeclining}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-zinc-950 font-bold text-sm shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isAccepting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Memproses...</span>
            </>
          ) : (
            <>
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Terima & Resmi Bergabung</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleDecline}
          disabled={isAccepting || isDeclining}
          className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-red-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {isDeclining ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Menolak...</span>
            </>
          ) : (
            <>
              <X className="w-3.5 h-3.5" />
              <span>Tolak Undangan</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
