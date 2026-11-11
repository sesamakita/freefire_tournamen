import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Trophy, ArrowLeft, Loader2, PlusCircle, AlertCircle } from "lucide-react";
import { createTournamentSchema, type CreateTournamentInput } from "@/lib/validations/tournament";

export function meta() {
  return [
    { title: "Buka Turnamen Baru — Arena Tempur" },
    { name: "description", content: "Buka turnamen Free Fire baru dan mulai pendaftaran tim." },
  ];
}

export default function CreateTournamentRoute() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateTournamentInput>({
    resolver: zodResolver(createTournamentSchema),
    mode: "onBlur",
    defaultValues: {
      nama: "",
      slug: "",
      deskripsi: "",
      entry_fee: 10000,
      max_teams: 32,
      format: "lone_wolf_1v1",
      max_rounds: 5,
      tgl_mulai: new Date().toISOString().split("T")[0],
      tgl_selesai: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
    },
  });

  const selectedFormat = watch("format");

  // Auto-generate slug dari nama
  const handleNamaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setValue("nama", val);
    const generatedSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    setValue("slug", generatedSlug);
  };

  const onSubmit = async (data: CreateTournamentInput) => {
    try {
      setIsSubmitting(true);
      setServerError(null);

      const res = await fetch("/api/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!json.success) {
        setServerError(json.error?.message || "Gagal membuat turnamen.");
        toast.error(json.error?.message || "Gagal membuat turnamen.");
        return;
      }

      toast.success(`Turnamen "${data.nama}" berhasil dibuka untuk pendaftaran!`);
      navigate("/dashboard");
    } catch (err) {
      console.error("Create tournament error:", err);
      setServerError("Terjadi kesalahan jaringan atau server.");
      toast.error("Terjadi kesalahan sistem.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Kembali ke Dashboard
        </Link>
      </div>

      <div className="border-b border-zinc-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl text-white tracking-tight">
              Buka Turnamen Baru
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Siapkan turnamen Free Fire dan buka registrasi untuk tim peserta
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

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="card-glow card-glow-hover p-6 rounded-2xl space-y-4">
          {/* Format Turnamen */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-2">
              Model Turnamen <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`p-3.5 rounded-xl border flex flex-col gap-1 cursor-pointer transition-all ${
                  selectedFormat === "lone_wolf_1v1"
                    ? "bg-amber-500/10 border-amber-500 text-white shadow-lg shadow-amber-500/10"
                    : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-amber-400">King of By One (1v1)</span>
                  <input
                    type="radio"
                    value="lone_wolf_1v1"
                    {...register("format")}
                    className="accent-amber-500"
                  />
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Adu mekanik individu 1 lawan 1 di arena Lone Wolf. Sistem bagan gugur 32 slot (First to 5 Rounds). Pemain daftar solo.
                </p>
              </label>

              <label
                className={`p-3.5 rounded-xl border flex flex-col gap-1 cursor-pointer transition-all ${
                  selectedFormat === "battle_royale"
                    ? "bg-amber-500/10 border-amber-500 text-white shadow-lg shadow-amber-500/10"
                    : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-blue-400">Battle Royale (Squad)</span>
                  <input
                    type="radio"
                    value="battle_royale"
                    {...register("format")}
                    className="accent-blue-500"
                  />
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Format resmi 12 Tim (48 pemain) terjun ke Bermuda. Sistem tabel klasemen agregat poin placement & kill.
                </p>
              </label>
            </div>
          </div>

          {/* Nama Turnamen */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Nama Turnamen <span className="text-red-400">*</span>
            </label>
            <input
              {...register("nama")}
              onChange={handleNamaChange}
              type="text"
              placeholder="Contoh: Arena Tempur Free Fire Championship Season 1"
              disabled={isSubmitting}
              className={`w-full px-3.5 py-2.5 bg-zinc-950 border rounded-xl text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none transition-colors ${
                errors.nama ? "border-red-500/80 focus:border-red-500" : "border-zinc-800 focus:border-amber-500"
              }`}
            />
            {errors.nama && (
              <p className="text-xs text-red-400 mt-1">{errors.nama.message}</p>
            )}
          </div>

          {/* Slug URL */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Slug URL Publik <span className="text-red-400">*</span>
            </label>
            <div className="flex items-center">
              <span className="px-3.5 py-2.5 bg-zinc-900 border border-r-0 border-zinc-800 rounded-l-xl text-xs text-zinc-500 font-mono">
                /t/
              </span>
              <input
                {...register("slug")}
                type="text"
                placeholder="affc-s1"
                disabled={isSubmitting}
                className={`w-full px-3.5 py-2.5 bg-zinc-950 border rounded-r-xl text-sm font-mono text-zinc-100 placeholder:text-zinc-500 focus:outline-none transition-colors ${
                  errors.slug ? "border-red-500/80 focus:border-red-500" : "border-zinc-800 focus:border-amber-500"
                }`}
              />
            </div>
            {errors.slug && (
              <p className="text-xs text-red-400 mt-1">{errors.slug.message}</p>
            )}
          </div>

          {/* Deskripsi Turnamen */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Deskripsi Singkat / Aturan Khusus
            </label>
            <textarea
              {...register("deskripsi")}
              rows={3}
              placeholder="Tuliskan info format kualifikasi, jadwal technical meeting, atau hadiah..."
              disabled={isSubmitting}
              className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          {/* Biaya & Kapasitas Tim */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Biaya Pendaftaran (Rp) <span className="text-red-400">*</span>
              </label>
              <input
                {...register("entry_fee", { valueAsNumber: true })}
                type="number"
                min="0"
                step="5000"
                placeholder="0"
                disabled={isSubmitting}
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-amber-500 transition-colors"
              />
              <p className="text-[11px] text-zinc-500 mt-1">
                Isi 0 jika turnamen gratis (tim otomatis terverifikasi tanpa bayar).
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                {selectedFormat === "lone_wolf_1v1" ? "Maksimal Slot Solo (Bagan)" : "Maksimal Tim Peserta"} <span className="text-red-400">*</span>
              </label>
              <input
                {...register("max_teams", { valueAsNumber: true })}
                type="number"
                min="2"
                max="64"
                placeholder="32"
                disabled={isSubmitting}
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-amber-500 transition-colors"
              />
              <p className="text-[11px] text-zinc-500 mt-1">
                {selectedFormat === "lone_wolf_1v1" 
                  ? "Standar bagan eliminasi: 16 atau 32 peserta (First to 5 Rounds)." 
                  : "Standar Battle Royale: 12, 24, 32, atau 48 tim."}
              </p>
            </div>
          </div>

          {/* Tanggal Pelaksanaan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Tanggal Mulai Turnamen <span className="text-red-400">*</span>
              </label>
              <input
                {...register("tgl_mulai")}
                type="date"
                disabled={isSubmitting}
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Tanggal Selesai <span className="text-red-400">*</span>
              </label>
              <input
                {...register("tgl_selesai")}
                type="date"
                disabled={isSubmitting}
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>
          </div>

          {/* Paket Turnamen (Tiering Platform) */}
          <div className="pt-2 border-t border-zinc-800/80">
            <label className="block text-xs font-semibold text-zinc-300 mb-2">
              Pilih Paket Layanan Platform Arena Tempur <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950 hover:border-zinc-700 flex flex-col gap-1 cursor-pointer">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">Komunitas (Free)</span>
                  <input
                    type="radio"
                    value="free"
                    {...register("tier")}
                    defaultChecked
                    className="accent-amber-500"
                  />
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Bebas biaya sewa platform. Maksimal 12 tim (1 grup), sistem scoring standar, dan watermark resmi Arena Tempur.
                </p>
              </label>

              <label className="p-3.5 rounded-xl border border-amber-500/40 bg-amber-500/10 flex flex-col gap-1 cursor-pointer">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-amber-400">Pro Championship (Rekomendasi)</span>
                  <input
                    type="radio"
                    value="pro"
                    {...register("tier")}
                    className="accent-amber-500"
                  />
                </div>
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  Hingga 64 tim, OBS Studio Overlays Suite, Layar Jeda Iklan Sponsor (Intermission Carousel), dan AI Vision Scoreboard Scanner.
                </p>
              </label>
            </div>
          </div>

          {/* Rekening & QRIS Panitia (Direct Payment Tujuan Transfer Peserta) */}
          <div className="pt-2 border-t border-zinc-800/80 space-y-3">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Rekening Pembayaran Tiket Pendaftaran Panitia (Opsional)
              </h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Data ini akan ditampilkan kepada kapten tim saat mereka membayar tiket pendaftaran turnamen Anda.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                  Nama Bank / E-Wallet
                </label>
                <input
                  type="text"
                  placeholder="Contoh: BCA / Mandiri / DANA"
                  {...register("direct_payment_info.bank_name")}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                  Nomor Rekening / No HP
                </label>
                <input
                  type="text"
                  placeholder="1234567890"
                  {...register("direct_payment_info.account_number")}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                  Atas Nama Pemilik
                </label>
                <input
                  type="text"
                  placeholder="Nama Panitia"
                  {...register("direct_payment_info.account_holder")}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                URL Gambar Kode QRIS Panitia (Opsional)
              </label>
              <input
                type="url"
                placeholder="https://.../qris-panitia.png"
                {...register("direct_payment_info.qris_image_url")}
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-sm shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Membuka Turnamen...</span>
            </>
          ) : (
            <>
              <PlusCircle className="w-4 h-4" />
              <span>Buka Registrasi Turnamen Sekarang</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
