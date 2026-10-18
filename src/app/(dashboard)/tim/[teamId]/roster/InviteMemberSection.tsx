"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  UserPlus,
  Loader2,
  Copy,
  Check,
  Mail,
  AlertCircle,
  Share2,
} from "lucide-react";
import { inviteMemberSchema, type InviteMemberInput } from "@/lib/validations/team";

interface InviteMemberSectionProps {
  teamId: string;
  currentMemberCount: number;
  currentSubstituteCount: number;
  invitations: any[];
}

export default function InviteMemberSection({
  teamId,
  currentMemberCount,
  currentSubstituteCount,
  invitations,
}: InviteMemberSectionProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const isSubstituteDisabled = currentSubstituteCount >= 2;
  const isSlotsFull = currentMemberCount >= 6;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteMemberInput>({
    resolver: zodResolver(inviteMemberSchema),
    mode: "onBlur",
    defaultValues: {
      invited_email: "",
      ign: "",
      uid_game: "",
      role_tim: "rusher",
      is_substitute: false,
    },
  });

  const onSubmit = async (data: InviteMemberInput) => {
    try {
      setIsSubmitting(true);
      setServerError(null);

      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          team_id: teamId,
        }),
      });

      const result = await res.json();

      if (!result.success) {
        setServerError(result.error?.message || "Gagal mengirim undangan.");
        toast.error(result.error?.message || "Gagal mengundang pemain.");
        return;
      }

      toast.success(`Undangan untuk "${data.ign}" berhasil dibuat! Tautan siap dibagikan.`);
      reset();
      router.refresh();
    } catch (err) {
      console.error("Invite error:", err);
      setServerError("Terjadi kesalahan jaringan atau server.");
      toast.error("Terjadi kesalahan sistem.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (token: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const inviteUrl = `${origin}/tim/bergabung/${token}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedToken(token);
    toast.success("Tautan undangan berhasil disalin ke clipboard!");
    setTimeout(() => setCopiedToken(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Form Kirim Undangan Anggota Baru */}
      <div className="p-6 bg-zinc-900/60 border border-zinc-800 rounded-2xl space-y-4">
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-amber-500" />
            Undang Pemain Baru ke Roster (SCR-T07)
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Kirimkan undangan ke email pemain atau bagikan tautan bergabung secara langsung via WhatsApp.
          </p>
        </div>

        {serverError && (
          <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        {isSlotsFull ? (
          <div className="p-4 bg-zinc-800/60 rounded-xl text-xs text-zinc-400 text-center">
            Roster tim telah penuh (6/6 pemain). Tidak dapat menambah undangan lagi.
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Email Pemain */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Email Akun Pemain <span className="text-red-400">*</span>
                </label>
                <input
                  {...register("invited_email")}
                  type="email"
                  placeholder="pemain@gmail.com"
                  disabled={isSubmitting}
                  className={`w-full px-3.5 py-2.5 bg-zinc-950 border rounded-xl text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none transition-colors ${
                    errors.invited_email
                      ? "border-red-500/80 focus:border-red-500"
                      : "border-zinc-800 focus:border-amber-500"
                  }`}
                />
                {errors.invited_email && (
                  <p className="text-xs text-red-400 mt-1">
                    {errors.invited_email.message}
                  </p>
                )}
              </div>

              {/* IGN Pemain */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  IGN (In-Game Name) <span className="text-red-400">*</span>
                </label>
                <input
                  {...register("ign")}
                  type="text"
                  placeholder="Contoh: GRD・Sniper"
                  disabled={isSubmitting}
                  className={`w-full px-3.5 py-2.5 bg-zinc-950 border rounded-xl text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none transition-colors ${
                    errors.ign
                      ? "border-red-500/80 focus:border-red-500"
                      : "border-zinc-800 focus:border-amber-500"
                  }`}
                />
                {errors.ign && (
                  <p className="text-xs text-red-400 mt-1">{errors.ign.message}</p>
                )}
              </div>

              {/* UID Free Fire */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  UID Free Fire (8–12 Digit) <span className="text-red-400">*</span>
                </label>
                <input
                  {...register("uid_game")}
                  type="text"
                  placeholder="Contoh: 987654321"
                  disabled={isSubmitting}
                  className={`w-full px-3.5 py-2.5 bg-zinc-950 border rounded-xl text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none transition-colors ${
                    errors.uid_game
                      ? "border-red-500/80 focus:border-red-500"
                      : "border-zinc-800 focus:border-amber-500"
                  }`}
                />
                {errors.uid_game && (
                  <p className="text-xs text-red-400 mt-1">
                    {errors.uid_game.message}
                  </p>
                )}
              </div>

              {/* Peran Tim */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Peran di Tim <span className="text-red-400">*</span>
                </label>
                <select
                  {...register("role_tim")}
                  disabled={isSubmitting}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 focus:outline-none focus:border-amber-500 transition-colors"
                >
                  <option value="rusher">Rusher</option>
                  <option value="sniper">Sniper</option>
                  <option value="support">Support</option>
                  <option value="igl">IGL</option>
                  <option value="cadangan">Cadangan</option>
                </select>
                {errors.role_tim && (
                  <p className="text-xs text-red-400 mt-1">
                    {errors.role_tim.message}
                  </p>
                )}
              </div>
            </div>

            {/* Toggle Pemain Cadangan */}
            <div className="pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  {...register("is_substitute")}
                  type="checkbox"
                  disabled={isSubstituteDisabled || isSubmitting}
                  className="rounded border-zinc-700 bg-zinc-950 text-amber-500 focus:ring-amber-500 focus:ring-offset-zinc-900 disabled:opacity-40"
                />
                <span className="text-xs text-zinc-300">
                  Daftarkan sebagai Pemain Cadangan (Substitute)
                  {isSubstituteDisabled && " — Batas maksimal 2 cadangan telah tercapai"}
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-xs shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Membuat Undangan...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Kirim Undangan & Dapatkan Tautan</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>

      {/* Daftar Undangan yang Telah Terkirim */}
      {invitations && invitations.length > 0 && (
        <div className="p-6 bg-zinc-900/60 border border-zinc-800 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Mail className="w-4 h-4 text-zinc-400" />
              Riwayat Undangan Roster ({invitations.length})
            </h3>
          </div>

          <div className="divide-y divide-zinc-800/80">
            {invitations.map((inv: any) => {
              const isPending = inv.status === "pending";
              return (
                <div
                  key={inv.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{inv.ign}</span>
                      <span className="text-zinc-500">&bull;</span>
                      <span className="text-zinc-400">{inv.invited_email}</span>
                      {inv.is_substitute && (
                        <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[10px] font-bold">
                          Cadangan
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-0.5 font-mono">
                      UID: {inv.uid_game} &bull; Peran: {inv.role_tim}
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {/* Status Badge */}
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                        inv.status === "accepted"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : inv.status === "declined"
                          ? "bg-red-500/20 text-red-400"
                          : inv.status === "expired"
                          ? "bg-zinc-800 text-zinc-500"
                          : "bg-amber-500/20 text-amber-400"
                      }`}
                    >
                      {inv.status}
                    </span>

                    {/* Copy Link Button (Hanya jika pending) */}
                    {isPending && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(inv.token)}
                        className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Salin tautan bergabung untuk dibagikan via WhatsApp"
                      >
                        {copiedToken === inv.token ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400 font-bold">Tersalin</span>
                          </>
                        ) : (
                          <>
                            <Share2 className="w-3.5 h-3.5 text-amber-500" />
                            <span>Salin Link</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
