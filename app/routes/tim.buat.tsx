import { useState } from "react";
import { Link, useNavigate, useLoaderData } from "react-router";
import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Trophy, Shield, Loader2, ArrowLeft, PlusCircle, AlertCircle } from "lucide-react";
import { createTeamSchema, type CreateTeamInput } from "@/lib/validations/team";
import { createAdminClient } from "@/lib/supabase/admin";

export const meta: MetaFunction = () => {
  return [
    { title: "Pendaftaran Tim Turnamen — Arena Tempur" },
  ];
};

interface TournamentOption {
  id: string;
  nama: string;
  entry_fee: number;
  max_teams: number;
  format?: string;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const preselectedTournamentId = url.searchParams.get("tournament") || "";

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any;

  const { data: tournaments } = await db
    .from("tournaments")
    .select("id, nama, entry_fee, max_teams, format, status")
    .eq("status", "open")
    .order("tgl_mulai", { ascending: true });

  return {
    tournaments: (tournaments || []) as TournamentOption[],
    preselectedTournamentId,
  };
}

export default function CreateTeamPage() {
  const { tournaments, preselectedTournamentId } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const initialTournamentId =
    preselectedTournamentId && tournaments.some((t) => t.id === preselectedTournamentId)
      ? preselectedTournamentId
      : tournaments.length > 0
      ? tournaments[0].id
      : "";

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CreateTeamInput>({
    resolver: zodResolver(createTeamSchema),
    mode: "onBlur",
    defaultValues: {
      tournament_id: initialTournamentId,
      nama: "",
      kapten_ign: "",
      kapten_uid: "",
      kapten_role: "igl",
      logo_url: "",
    },
  });

  const selectedTournamentId = watch("tournament_id");
  const selectedTournament = tournaments.find((t) => t.id === selectedTournamentId);
  const isLoneWolf = selectedTournament?.format === "lone_wolf_1v1";

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

      if (isLoneWolf) {
        if (selectedTournament?.entry_fee && selectedTournament.entry_fee > 0) {
          toast.success("Pendaftaran 1v1 berhasil dibuat! Silakan selesaikan pembayaran QRIS.");
          navigate(`/tim/${result.data.team_id}/bayar`);
        } else {
          toast.success("Pendaftaran 1v1 berhasil dan langsung terverifikasi!");
          navigate("/dashboard");
        }
      } else {
        toast.success(`Tim "${data.nama}" berhasil dibuat! Silakan kelola roster tim.`);
        navigate(`/tim/${result.data.team_id}/roster`);
      }
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
          to="/dashboard"
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
            <h1 className="text-2xl text-white tracking-tight font-headline">
              Pendaftaran Tim Turnamen
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Daftarkan tim Anda dan tentukan susunan kapten
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
      {tournaments.length === 0 ? (
        <div className="p-8 text-center bg-zinc-900/40 border border-zinc-800 rounded-2xl space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base text-white font-headline">Belum Ada Turnamen yang Dibuka</h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1">
              Saat ini belum ada turnamen yang membuka pendaftaran tim. Silakan buat turnamen baru jika Anda adalah penyelenggara.
            </p>
          </div>
          <Link
            to="/admin/turnamen/buat"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-zinc-950 text-xs font-bold shadow-md shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            Buat Turnamen Baru
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Bagian 1: Informasi Tim & Turnamen */}
          <div className="card-glow card-glow-hover p-6 rounded-2xl space-y-4">
            <h2 className="text-sm text-white uppercase flex items-center gap-2 font-headline">
              <Shield className="w-4 h-4 text-amber-500" />
              {isLoneWolf ? "1. Turnamen & Identitas Peserta Solo" : "1. Turnamen & Identitas Tim"}
            </h2>

            {/* Pilihan Turnamen */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Pilih Turnamen <span className="text-red-400">*</span>
              </label>
              <select
                {...register("tournament_id")}
                disabled={isSubmitting}
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 focus:outline-none focus:border-amber-500 transition-colors"
              >
                {tournaments.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nama} — {t.format === "lone_wolf_1v1" ? "[1v1 Lone Wolf]" : "[Squad BR]"} — Biaya: {t.entry_fee === 0 ? "Gratis" : `Rp ${t.entry_fee.toLocaleString("id-ID")}`} (Maks {t.max_teams} Peserta)
                  </option>
                ))}
              </select>
              {errors.tournament_id && (
                <p className="text-xs text-red-400 mt-1">{errors.tournament_id.message}</p>
              )}
            </div>

            {/* Nama Tim / Nama Peserta */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                {isLoneWolf ? "Nama Peserta / Alias Duel" : "Nama Tim"} <span className="text-red-400">*</span>
              </label>
              <input
                {...register("nama")}
                type="text"
                placeholder={isLoneWolf ? "Contoh: Budi Headshot" : "Contoh: GARUDA ESPORTS"}
                disabled={isSubmitting}
                className={`w-full px-3.5 py-2.5 bg-zinc-950 border rounded-xl text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none transition-colors ${
                  errors.nama
                    ? "border-red-500/80 focus:border-red-500"
                    : "border-zinc-800 focus:border-amber-500"
                }`}
              />
              {errors.nama ? (
                <p className="text-xs text-red-400 mt-1">{errors.nama.message}</p>
              ) : (
                <p className="text-[11px] text-zinc-500 mt-1">
                  {isLoneWolf
                    ? "Nama yang akan tertera pada bagan pohon eliminasi 1v1 (3–30 karakter)."
                    : "Nama tim harus unik dan tidak boleh sama dengan tim lain di turnamen ini (3–30 karakter)."}
                </p>
              )}
            </div>

            {/* Logo Tim / Avatar */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                {isLoneWolf ? "URL Avatar / Foto Profil (Opsional)" : "URL Logo Tim (Opsional)"}
              </label>
              <input
                {...register("logo_url")}
                type="url"
                placeholder="https://..."
                disabled={isSubmitting}
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>
          </div>

          {/* Bagian 2: Data Pemain / Kapten */}
          <div className="card-glow card-glow-hover p-6 rounded-2xl space-y-4">
            <h2 className="text-sm text-white uppercase flex items-center gap-2 font-headline">
              <Trophy className="w-4 h-4 text-amber-500" />
              {isLoneWolf ? "2. Data Akun Game Pemain" : "2. Data Game Kapten (Pemain 1 / Inti)"}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* IGN */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  IGN (In-Game Name FF) <span className="text-red-400">*</span>
                </label>
                <input
                  {...register("kapten_ign")}
                  type="text"
                  placeholder="Contoh: GRD・King"
                  disabled={isSubmitting}
                  className={`w-full px-3.5 py-2.5 bg-zinc-950 border rounded-xl text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none transition-colors ${
                    errors.kapten_ign
                      ? "border-red-500/80 focus:border-red-500"
                      : "border-zinc-800 focus:border-amber-500"
                  }`}
                />
                {errors.kapten_ign && (
                  <p className="text-xs text-red-400 mt-1">{errors.kapten_ign.message}</p>
                )}
              </div>

              {/* Game Player UID */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Game Player UID <span className="text-red-400">*</span>
                </label>
                <input
                  {...register("kapten_uid")}
                  type="text"
                  placeholder="Contoh: 123456789"
                  disabled={isSubmitting}
                  className={`w-full px-3.5 py-2.5 bg-zinc-950 border rounded-xl text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none transition-colors ${
                    errors.kapten_uid
                      ? "border-red-500/80 focus:border-red-500"
                      : "border-zinc-800 focus:border-amber-500"
                  }`}
                />
                {errors.kapten_uid ? (
                  <p className="text-xs text-red-400 mt-1">{errors.kapten_uid.message}</p>
                ) : (
                  <p className="text-[11px] text-zinc-500 mt-1">
                    8–12 digit angka Game Player ID. Wajib akurat.
                  </p>
                )}
              </div>
            </div>

            {/* Peran Tim */}
            {!isLoneWolf && (
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Peran Game Kapten <span className="text-red-400">*</span>
                </label>
                <select
                  {...register("kapten_role")}
                  disabled={isSubmitting}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 focus:outline-none focus:border-amber-500 transition-colors capitalize"
                >
                  <option value="igl">In-Game Leader (IGL / Kapten)</option>
                  <option value="rusher">Rusher (Garis Depan)</option>
                  <option value="sniper">Sniper (Jarak Jauh)</option>
                  <option value="support">Support (Pendukung)</option>
                </select>
                {errors.kapten_role && (
                  <p className="text-xs text-red-400 mt-1">{errors.kapten_role.message}</p>
                )}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-sm shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Mendaftarkan {isLoneWolf ? "Peserta Solo..." : "Tim..."}</span>
              </>
            ) : (
              <>
                <PlusCircle className="w-4 h-4" />
                <span>
                  {isLoneWolf
                    ? "Daftar Duel 1v1 & Lanjutkan"
                    : "Simpan Tim & Lanjut Kelola Roster"}
                </span>
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
