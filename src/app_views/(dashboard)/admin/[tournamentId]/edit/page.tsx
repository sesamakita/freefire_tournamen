"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Trophy,
  ArrowLeft,
  Loader2,
  Save,
  AlertCircle,
  ExternalLink,
  BookOpen,
  Settings2,
  FileText,
  Calendar,
  Users,
  CreditCard,
  ShieldAlert,
  Shield,
  Eye,
  Edit3,
  Radio,
  Copy,
  Check,
} from "lucide-react";
import { updateTournamentSchema, type UpdateTournamentInput } from "@/lib/validations/tournament";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import TournamentAdminNav from "@/components/TournamentAdminNav";

const SAMPLE_RULEBOOK_1V1 = `# 👑 RULEBOOK RESMI: KING OF BY ONE (1v1) ARENA TEMPUR

Format duel 1 lawan 1 sistem gugur (Single Elimination) murni menguji kecepatan mekanik tangan (fast gloo wall), akurasi aim, dan refleks jump-shot. Fair play adalah prioritas utama!

### ⚙️ 1. PENGATURAN RESMI CUSTOM ROOM (PANITIA)
* **Mode Pertandingan:** Clash Squad (1v1)
* **Skill Karakter:** NONAKTIF / MATI (No Skill)
* **Atribut Senjata (Gun Properties):** NONAKTIF / MATI (Murni Default / No Pay-to-Win)
* **Peluru Terbatas (Limited Ammo):** NONAKTIF / MATI (Gloo Wall & Peluru Tanpa Batas)
* **Koin Awal:** 1500 Koin
* **HP Darah:** 200 (Standar)
* **Jatuh Berdarah (Fall Damage):** YA
* **Airdrop & Kendaraan:** NONAKTIF / MATI

### 🔫 2. REGULASI SENJATA & ITEM
* **Senjata Wajib:** Shotgun 2 (M1887) & Desert Eagle (D.Eagle).
* **Gloo Wall (Es Kepal):** Bebas digunakan untuk pertahanan dan gocekan.
* ❌ **Dilarang:** Granat (Frag/Freeze/Flash), Rifle Otomatis (Scar/XM8), Sniper, Launcher/M79, Double Gun (Akimbo).
* ❌ **Anti-Stalling:** Dilarang kurung diri di es kepal lalu medkit menunggu zona menyusut. Duel harus aktif saling push.

### 🏆 3. FORMAT BABAK & SKOR
* **Babak 32 & 16 Besar:** First to 5 (FT5)
* **Perempat Final & Semifinal:** First to 7 (FT7)
* **Grand Final:** Best of 3 Matches (BO3) FT7

### ⏱️ 4. TATA TERTIB
1. Toleransi keterlambatan maksimal 5 menit sejak Room ID & Password dibagikan di web Arena Tempur.
2. Pemenang wajib screenshot hasil pertandingan untuk verifikasi skor di bagan.
3. Dilarang toxic/SARA di kolom chat room FF.`;

export default function EditTournamentPage() {
  const params = useParams();
  const router = useRouter();
  const tournamentId = params?.tournamentId as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [currentName, setCurrentName] = useState<string>("");
  const [currentStatus, setCurrentStatus] = useState<string>("");
  const [currentSlug, setCurrentSlug] = useState<string>("");
  const [deskripsiTab, setDeskripsiTab] = useState<"edit" | "preview">("edit");
  const [copiedId, setCopiedId] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<UpdateTournamentInput>({
    resolver: zodResolver(updateTournamentSchema),
    mode: "onBlur",
  });

  const selectedFormat = watch("format");
  const deskripsiValue = watch("deskripsi");

  // Fetch data turnamen
  useEffect(() => {
    const fetchTournament = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/tournaments/${tournamentId}`);
        const json = await res.json();

        if (!json.success || !json.data) {
          toast.error(json.error?.message || "Gagal mengambil data turnamen.");
          return;
        }

        const t = json.data;
        setCurrentName(t.nama || "");
        setCurrentStatus(t.status || "");
        setCurrentSlug(t.slug || "");

        reset({
          nama: t.nama,
          slug: t.slug,
          deskripsi: t.deskripsi || "",
          entry_fee: t.entry_fee,
          max_teams: t.max_teams,
          format: t.format || "battle_royale",
          max_rounds: t.max_rounds || 5,
          status: t.status,
          is_public: t.is_public ?? true,
          tgl_mulai: t.tgl_mulai ? t.tgl_mulai.split("T")[0] : "",
          tgl_selesai: t.tgl_selesai ? t.tgl_selesai.split("T")[0] : "",
        });
      } catch (err) {
        console.error("Gagal load turnamen:", err);
        toast.error("Gagal memuat data turnamen.");
      } finally {
        setIsLoading(false);
      }
    };

    if (tournamentId) {
      fetchTournament();
    }
  }, [tournamentId, reset]);

  // Handle Submit
  const onSubmit = async (data: UpdateTournamentInput) => {
    try {
      setIsSubmitting(true);
      setServerError(null);

      // Pastikan tipe data angka bersih sebelum dikirim ke API
      const payload = {
        ...data,
        entry_fee: Number(data.entry_fee ?? 0),
        max_teams: Number(data.max_teams ?? 32),
        max_rounds: Number(data.max_rounds ?? 5),
      };

      const res = await fetch(`/api/tournaments/${tournamentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!json.success) {
        setServerError(json.error?.message || "Gagal memperbarui turnamen.");
        toast.error(json.error?.message || "Gagal memperbarui turnamen.");
        return;
      }

      toast.success("Pengaturan turnamen berhasil disimpan!");
      if (json.data?.slug) {
        setCurrentSlug(json.data.slug);
      }
      router.refresh();
    } catch (err) {
      console.error("Update tournament error:", err);
      setServerError("Terjadi kesalahan jaringan atau server.");
      toast.error("Terjadi kesalahan sistem saat menyimpan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const applyRulebookTemplate = () => {
    if (deskripsiValue && deskripsiValue.trim().length > 0) {
      const confirmReplace = window.confirm(
        "Deskripsi yang ada saat ini akan ditimpa dengan Template Rulebook King of By One (1v1). Lanjutkan?"
      );
      if (!confirmReplace) return;
    }
    setValue("deskripsi", SAMPLE_RULEBOOK_1V1, { shouldDirty: true });
    toast.success("Template Rulebook 1v1 berhasil diterapkan ke kolom deskripsi!");
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-zinc-400">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-3" />
        <p className="text-xs">Memuat pengaturan turnamen...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Unified Tab Bar & Header Konteks Turnamen */}
      <TournamentAdminNav
        tournamentId={tournamentId}
        tournamentName={currentName}
        format={selectedFormat}
        slug={currentSlug}
        status={currentStatus}
      />

      {/* Header Halaman */}
      <div className="card-glow card-glow-hover p-6 rounded-2xl flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-zinc-950 shadow-lg shadow-amber-500/20">
            <Settings2 className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-2xl text-white font-bold tracking-tight">
              Edit Pengaturan Turnamen
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Kelola identitas, status pendaftaran, batas slot, dan deskripsi/aturan main
            </p>
            <div className="mt-2.5 inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] font-mono">
              <span className="text-zinc-500">ID Turnamen:</span>
              <span className="text-amber-400 font-semibold select-all">{tournamentId}</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(tournamentId);
                  setCopiedId(true);
                  toast.success("Tournament ID berhasil disalin!");
                  setTimeout(() => setCopiedId(false), 2000);
                }}
                className="ml-1 text-zinc-400 hover:text-white transition-colors"
                title="Salin Tournament ID"
              >
                {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {serverError && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      {/* Form Edit */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Seksi 1: Status & Visibilitas */}
        <div className="card-glow card-glow-hover p-6 rounded-2xl space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-zinc-800 pb-3">
            <ShieldAlert className="w-4 h-4 text-amber-500" />
            Status & Visibilitas Turnamen
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Status Siklus Turnamen <span className="text-red-400">*</span>
              </label>
              <select
                {...register("status")}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-medium focus:border-amber-500 focus:outline-none transition-colors"
              >
                <option value="draft">Draft (Belum Dipublikasikan)</option>
                <option value="open">Open (Pendaftaran Dibuka)</option>
                <option value="closed">Closed (Pendaftaran Ditutup)</option>
                <option value="running">Running (Turnamen Sedang Berlangsung)</option>
                <option value="done">Done (Turnamen Selesai)</option>
              </select>
              <p className="text-[11px] text-zinc-500 mt-1">
                Pilih <b>Open</b> agar pemain dapat mulai mendaftar dan membayar.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Visibilitas Publik
              </label>
              <div className="pt-2">
                <label className="relative inline-flex items-center cursor-pointer gap-2.5">
                  <input
                    type="checkbox"
                    {...register("is_public")}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  <span className="text-xs text-zinc-300">
                    Tampilkan turnamen di Halaman Jelajah Publik
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Seksi 2: Informasi Dasar */}
        <div className="card-glow card-glow-hover p-6 rounded-2xl space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-zinc-800 pb-3">
            <Trophy className="w-4 h-4 text-amber-500" />
            Informasi Dasar & Format
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Nama Turnamen <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                {...register("nama")}
                placeholder="Misal: Arena Tempur King of By One Season 1"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs placeholder:text-zinc-600 focus:border-amber-500 focus:outline-none transition-colors"
              />
              {errors.nama && (
                <p className="text-[11px] text-red-400 mt-1">{errors.nama.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Slug URL Turnamen <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                {...register("slug")}
                placeholder="misal: arena-tempur-by-one-s1"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-mono placeholder:text-zinc-600 focus:border-amber-500 focus:outline-none transition-colors"
              />
              {errors.slug && (
                <p className="text-[11px] text-red-400 mt-1">{errors.slug.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Format Turnamen <span className="text-red-400">*</span>
              </label>
              <select
                {...register("format")}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-medium focus:border-amber-500 focus:outline-none transition-colors"
              >
                <option value="lone_wolf_1v1">King of By One (1v1 Sistem Gugur)</option>
                <option value="clash_squad">Clash Squad (4v4)</option>
                <option value="battle_royale">Battle Royale (12 Tim)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Maksimal Ronde Pertandingan (First to X)
              </label>
              <input
                type="number"
                {...register("max_rounds", { valueAsNumber: true })}
                min={1}
                max={15}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:border-amber-500 focus:outline-none transition-colors"
              />
              <p className="text-[11px] text-zinc-500 mt-1">
                Standar By One: 5 ronde (FT5) atau 7 ronde (FT7).
              </p>
            </div>
          </div>
        </div>

        {/* Seksi 3: Slot Peserta & Biaya */}
        <div className="card-glow card-glow-hover p-6 rounded-2xl space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-zinc-800 pb-3">
            <Users className="w-4 h-4 text-amber-500" />
            Kapasitas Peserta & Biaya Pendaftaran
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Maksimal Peserta / Slot <span className="text-red-400">*</span>
              </label>
              <select
                {...register("max_teams", { valueAsNumber: true })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-medium focus:border-amber-500 focus:outline-none transition-colors"
              >
                <option value={16}>16 Peserta (4 Babak)</option>
                <option value={32}>32 Peserta (5 Babak - Standar Rekomendasi)</option>
                <option value={64}>64 Peserta (6 Babak)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Biaya Pendaftaran per Peserta (Rp) <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                {...register("entry_fee", { valueAsNumber: true })}
                min={0}
                placeholder="0"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:border-amber-500 focus:outline-none transition-colors"
              />
              <p className="text-[11px] text-zinc-500 mt-1">
                Isi 0 untuk turnamen gratis. Jika berbayar, peserta akan membayar via QRIS.
              </p>
            </div>
          </div>
        </div>

        {/* Seksi 4: Jadwal */}
        <div className="card-glow card-glow-hover p-6 rounded-2xl space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-zinc-800 pb-3">
            <Calendar className="w-4 h-4 text-amber-500" />
            Jadwal Pelaksanaan
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Tanggal Mulai <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                {...register("tgl_mulai")}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:border-amber-500 focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Tanggal Selesai <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                {...register("tgl_selesai")}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:border-amber-500 focus:outline-none transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Seksi 5: Deskripsi & Rulebook */}
        <div className="card-glow card-glow-hover p-6 rounded-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-500" />
              Deskripsi Turnamen & Aturan Main (Rulebook)
            </h2>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Tab Selector */}
              <div className="flex items-center rounded-lg bg-zinc-900 border border-zinc-800 p-0.5">
                <button
                  type="button"
                  onClick={() => setDeskripsiTab("edit")}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition-all ${
                    deskripsiTab === "edit"
                      ? "bg-zinc-800 text-white shadow-sm"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Tulis</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeskripsiTab("preview")}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition-all ${
                    deskripsiTab === "preview"
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-sm"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Pratinjau Tampilan</span>
                </button>
              </div>

              <button
                type="button"
                onClick={applyRulebookTemplate}
                className="text-xs px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                Template By One
              </button>
            </div>
          </div>

          <div>
            {deskripsiTab === "edit" ? (
              <textarea
                {...register("deskripsi")}
                rows={16}
                placeholder="Tuliskan deskripsi lengkap turnamen, aturan main, setting room FF, kontak panitia, dan hadiah turnamen..."
                className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-mono leading-relaxed placeholder:text-zinc-600 focus:border-amber-500 focus:outline-none transition-colors resize-y"
              />
            ) : (
              <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800 min-h-[300px] overflow-y-auto max-h-[600px]">
                <MarkdownRenderer content={deskripsiValue || ""} />
              </div>
            )}
            <p className="text-[11px] text-zinc-500 mt-1.5">
              Format teks menggunakan Markdown: <code>**teks tebal**</code>, <code># Judul Besar</code>, <code>* Poin daftar</code>. Klik tab <b>Pratinjau Tampilan</b> untuk melihat hasil jadinya secara langsung.
            </p>
          </div>
        </div>

        {/* Tombol Simpan Fixed / Bottom Bar */}
        <div className="card-glow card-glow-hover p-4 rounded-2xl flex items-center justify-between gap-4">
          <p className="text-xs text-zinc-400">
            {isDirty ? (
              <span className="text-amber-400 font-semibold">Ada perubahan yang belum disimpan</span>
            ) : (
              <span>Semua perubahan tersimpan</span>
            )}
          </p>

          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold transition-colors"
            >
              Batal
            </Link>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-xs shadow-md shadow-amber-500/20 inline-flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Simpan Perubahan</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
