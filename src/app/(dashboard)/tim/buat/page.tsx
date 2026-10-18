"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Trophy, Shield, Loader2, ArrowLeft, PlusCircle, AlertCircle } from "lucide-react";
import { createTeamSchema, type CreateTeamInput } from "@/lib/validations/team";

interface TournamentOption {
  id: string;
  nama: string;
  entry_fee: number;
  max_teams: number;
}

export default function CreateTeamPage() {
  const router = useRouter();
  const [tournaments, setTournaments] = useState<TournamentOption[]>([]);
  const [isLoadingTournaments, setIsLoadingTournaments] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CreateTeamInput>({
    resolver: zodResolver(createTeamSchema),
    mode: "onBlur",
    defaultValues: {
      nama: "",
      kapten_ign: "",
      kapten_uid: "",
      kapten_role: "igl",
      logo_url: "",
    },
  });

  // Ambil daftar turnamen yang statusnya open
  useEffect(() => {
    async function loadTournaments() {
      try {
        setIsLoadingTournaments(true);
        const res = await fetch("/api/tournaments");
        const json = await res.json();
        if (json.success && json.data) {
          const openList = json.data.filter((t: any) => t.status === "open");
          setTournaments(openList);
          if (openList.length > 0) {
            setValue("tournament_id", openList[0].id);
          }
        }
      } catch (err) {
        console.error("Gagal memuat turnamen:", err);
      } finally {
        setIsLoadingTournaments(false);
      }
    }

    loadTournaments();
  }, [setValue]);

  const onSubmit = async (data: CreateTeamInput) => {
    try {
      setIsSubmitting(true);
      setServerError(null);

      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!result.success) {
        setServerError(result.error?.message || "Gagal membuat tim.");
        toast.error(result.error?.message || "Gagal mendaftarkan tim.");
        return;
      }

      toast.success(`Tim "${data.nama}" berhasil dibuat! Silakan kelola roster tim.`);
      router.push(`/tim/${result.data.team_id}/roster`);
    } catch (err) {
      console.error("Submit team error:", err);
      setServerError("Terjadi kesalahan jaringan atau server.");
      toast.error("Terjadi kesalahan sistem.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Tombol kembali */}
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Kembali ke Dashboard
        </Link>
      </div>

      {/* Header */}
      <div className="border-b border-zinc-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Pendaftaran Tim Turnamen
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Daftarkan tim Free Fire Anda dan tentukan susunan kapten
            </p>
          </div>
        </div>
      </div>

      {serverError && (
        <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      {/* Jika belum ada turnamen yang open */}
      {!isLoadingTournaments && tournaments.length === 0 ? (
        <div className="p-8 text-center bg-zinc-900/40 border border-zinc-800 rounded-2xl space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Belum Ada Turnamen yang Dibuka</h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1">
              Saat ini belum ada turnamen yang membuka pendaftaran tim. Silakan buat turnamen baru jika Anda adalah penyelenggara.
            </p>
          </div>
          <Link
            href="/admin/turnamen/buat"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-zinc-950 text-xs font-bold shadow-md shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            Buat Turnamen Baru
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Bagian 1: Informasi Tim & Turnamen */}
          <div className="p-6 bg-zinc-900/60 border border-zinc-800 rounded-2xl space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-500" />
              1. Turnamen & Identitas Tim
            </h2>

            {/* Pilihan Turnamen */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Pilih Turnamen <span className="text-red-400">*</span>
              </label>
              <select
                {...register("tournament_id")}
                disabled={isLoadingTournaments || isSubmitting}
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 focus:outline-none focus:border-amber-500 transition-colors"
              >
                {tournaments.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nama} — Biaya: {t.entry_fee === 0 ? "Gratis" : `Rp ${t.entry_fee.toLocaleString("id-ID")}`} (Maks {t.max_teams} Tim)
                  </option>
                ))}
              </select>
              {errors.tournament_id && (
                <p className="text-xs text-red-400 mt-1">{errors.tournament_id.message}</p>
              )}
            </div>

            {/* Nama Tim */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Nama Tim <span className="text-red-400">*</span>
              </label>
              <input
                {...register("nama")}
                type="text"
                placeholder="Contoh: GARUDA ESPORTS"
                disabled={isSubmitting}
                className={`w-full px-3.5 py-2.5 bg-zinc-950 border rounded-xl text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none transition-colors ${
                  errors.nama
                    ? "border-red-500/80 focus:border-red-500"
                    : "border-zinc-800 focus:border-amber-500"
                }`}
              />
              {errors.nama ? (
                <p className="text-xs text-red-400 mt-1">{errors.nama.message}</p>
              ) : (
                <p className="text-[11px] text-zinc-500 mt-1">
                  Nama tim harus unik dan tidak boleh sama dengan tim lain di turnamen ini (3–30 karakter).
                </p>
              )}
            </div>

            {/* Logo Tim (Opsional) */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                URL Logo Tim (Opsional)
              </label>
              <input
                {...register("logo_url")}
                type="url"
                placeholder="https://..."
                disabled={isSubmitting}
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>
          </div>

          {/* Bagian 2: Data Kapten di Roster */}
          <div className="p-6 bg-zinc-900/60 border border-zinc-800 rounded-2xl space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              2. Data Game Kapten (Pemain 1 / Inti)
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* IGN Kapten */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  IGN (In-Game Name) <span className="text-red-400">*</span>
                </label>
                <input
                  {...register("kapten_ign")}
                  type="text"
                  placeholder="Contoh: GRD・Captain"
                  disabled={isSubmitting}
                  className={`w-full px-3.5 py-2.5 bg-zinc-950 border rounded-xl text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none transition-colors ${
                    errors.kapten_ign
                      ? "border-red-500/80 focus:border-red-500"
                      : "border-zinc-800 focus:border-amber-500"
                  }`}
                />
                {errors.kapten_ign && (
                  <p className="text-xs text-red-400 mt-1">{errors.kapten_ign.message}</p>
                )}
              </div>

              {/* UID Free Fire */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  UID Free Fire <span className="text-red-400">*</span>
                </label>
                <input
                  {...register("kapten_uid")}
                  type="text"
                  placeholder="Contoh: 123456789"
                  disabled={isSubmitting}
                  className={`w-full px-3.5 py-2.5 bg-zinc-950 border rounded-xl text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none transition-colors ${
                    errors.kapten_uid
                      ? "border-red-500/80 focus:border-red-500"
                      : "border-zinc-800 focus:border-amber-500"
                  }`}
                />
                {errors.kapten_uid ? (
                  <p className="text-xs text-red-400 mt-1">{errors.kapten_uid.message}</p>
                ) : (
                  <p className="text-[11px] text-zinc-500 mt-1">
                    8–12 digit angka. Wajib akurat untuk verifikasi panitia.
                  </p>
                )}
              </div>
            </div>

            {/* Peran Tim */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Peran Kapten di Game <span className="text-red-400">*</span>
              </label>
              <select
                {...register("kapten_role")}
                disabled={isSubmitting}
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 focus:outline-none focus:border-amber-500 transition-colors"
              >
                <option value="igl">IGL (In-Game Leader)</option>
                <option value="rusher">Rusher</option>
                <option value="sniper">Sniper</option>
                <option value="support">Support</option>
                <option value="cadangan">Cadangan</option>
              </select>
              {errors.kapten_role && (
                <p className="text-xs text-red-400 mt-1">{errors.kapten_role.message}</p>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || isLoadingTournaments}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-sm shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Mendaftarkan Tim...</span>
              </>
            ) : (
              <>
                <PlusCircle className="w-4 h-4" />
                <span>Simpan Tim & Lanjut Kelola Roster</span>
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
