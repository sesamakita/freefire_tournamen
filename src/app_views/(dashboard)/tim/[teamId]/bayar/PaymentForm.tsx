"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  UploadCloud,
  CheckCircle2,
  Loader2,
  AlertCircle,
  QrCode,
  Sparkles,
  Clock,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface PaymentFormProps {
  teamId: string;
  isFree: boolean;
  entryFee?: number;
}

export default function PaymentForm({ teamId, isFree, entryFee = 0 }: PaymentFormProps) {
  const router = useRouter();
  const supabase = createClient();

  // Mode: "qris_auto" (default jika berbayar) atau "manual_upload"
  const [activeTab, setActiveTab] = useState<"qris_auto" | "manual_upload">("qris_auto");

  // State QRIS Otomatis
  const [isGeneratingQris, setIsGeneratingQris] = useState(false);
  const [qrisData, setQrisData] = useState<{
    qrCodeUrl: string;
    orderId: string;
    grossAmount: number;
    expiryTime: string;
  } | null>(null);
  const [isPaidSuccess, setIsPaidSuccess] = useState(false);

  // State Upload Manual
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Polling / Realtime listener untuk mengecek apakah tim sudah approved
  useEffect(() => {
    if (!teamId || isFree) return;

    // 1. Supabase Realtime subscription pada tabel teams
    const channel = supabase
      .channel(`team-status-${teamId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "teams",
          filter: `id=eq.${teamId}`,
        },
        (payload: any) => {
          if (payload.new?.verification_status === "approved") {
            setIsPaidSuccess(true);
            toast.success("Pembayaran terkonfirmasi otomatis! Tim Anda resmi terdaftar.");
          }
        }
      )
      .subscribe();

    // 2. Fallback polling setiap 4 detik saat QRIS aktif
    let interval: NodeJS.Timeout | null = null;
    if (qrisData && !isPaidSuccess) {
      interval = setInterval(async () => {
        const { data: team } = await supabase
          .from("teams")
          .select("verification_status")
          .eq("id", teamId)
          .single();

        if (team?.verification_status === "approved") {
          setIsPaidSuccess(true);
          toast.success("Pembayaran terkonfirmasi otomatis!");
          if (interval) clearInterval(interval);
        }
      }, 4000);
    }

    return () => {
      supabase.removeChannel(channel);
      if (interval) clearInterval(interval);
    };
  }, [teamId, isFree, qrisData, isPaidSuccess, supabase]);

  // Handler Buat QRIS Otomatis
  const handleGenerateQris = async () => {
    try {
      setIsGeneratingQris(true);
      setErrorMsg(null);

      const res = await fetch(`/api/teams/${teamId}/qris`, {
        method: "POST",
      });

      const json = await res.json();

      if (!json.success) {
        throw new Error(json.error?.message || "Gagal membuat kode QRIS.");
      }

      setQrisData({
        qrCodeUrl: json.data.qrCodeUrl,
        orderId: json.data.orderId,
        grossAmount: json.data.grossAmount,
        expiryTime: json.data.expiryTime,
      });

      toast.success("Kode QRIS dinamis berhasil dibuat! Silakan scan.");
    } catch (err: any) {
      console.error("Generate QRIS Error:", err);
      setErrorMsg(err.message || "Gagal terhubung ke Midtrans.");
      toast.error(err.message || "Gagal membuat transaksi QRIS.");
    } finally {
      setIsGeneratingQris(false);
    }
  };

  // Handler Upload Bukti Manual
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.size > 5 * 1024 * 1024) {
      setErrorMsg("Ukuran file maksimal 5 MB.");
      toast.error("Ukuran file terlalu besar (maksimal 5 MB).");
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowedTypes.includes(selectedFile.type)) {
      setErrorMsg("Format file harus JPG, PNG, WEBP, atau PDF.");
      toast.error("Format file tidak didukung.");
      return;
    }

    setErrorMsg(null);
    setFile(selectedFile);

    if (selectedFile.type.startsWith("image/")) {
      setPreviewUrl(URL.createObjectURL(selectedFile));
    } else {
      setPreviewUrl(null);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      let finalProofUrl = "FREE_TOURNAMENT";

      if (!isFree) {
        if (!file) {
          setErrorMsg("Silakan pilih file bukti transfer terlebih dahulu.");
          toast.error("Bukti transfer wajib diunggah.");
          setIsSubmitting(false);
          return;
        }

        const fileExt = file.name.split(".").pop();
        const fileName = `${teamId}_${Date.now()}.${fileExt}`;
        const filePath = `proofs/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("payments")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          setErrorMsg("Gagal mengunggah file ke storage: " + uploadError.message);
          toast.error("Gagal mengunggah bukti pembayaran.");
          setIsSubmitting(false);
          return;
        }

        const { data: urlData } = supabase.storage
          .from("payments")
          .getPublicUrl(filePath);

        finalProofUrl = urlData.publicUrl;
      }

      const res = await fetch(`/api/teams/${teamId}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payment_proof_url: finalProofUrl,
        }),
      });

      const json = await res.json();

      if (!json.success) {
        setErrorMsg(json.error?.message || "Gagal mengirim data verifikasi.");
        toast.error(json.error?.message || "Gagal mengirim data verifikasi.");
        return;
      }

      toast.success("Pendaftaran tim berhasil diajukan untuk verifikasi!");
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      console.error("Payment submit error:", err);
      setErrorMsg("Terjadi kesalahan jaringan atau server.");
      toast.error("Terjadi kesalahan sistem.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // TAMPILAN JIKA PEMBAYARAN SUDAH SUKSES LUNAS
  if (isPaidSuccess) {
    return (
      <div className="card-esports p-8 rounded-2xl text-center space-y-5 bg-carbon-mesh border-emerald-500/40">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <span className="text-[10px] font-mono font-bold uppercase text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
            TRANSAKSI SELESAI // LUNAS
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-white font-headline mt-2">
            PEMBAYARAN QRIS TERVERIFIKASI OTOMATIS!
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
            Sistem telah mengonfirmasi pembayaran turnamen Anda. Tim Anda resmi terdaftar dan slot telah terkunci.
          </p>
        </div>

        <button
          onClick={() => {
            router.push("/dashboard");
            router.refresh();
          }}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-zinc-950 font-bold text-xs sm:text-sm shadow-lg shadow-emerald-500/20 flex items-center gap-2 mx-auto cursor-pointer font-headline"
        >
          Masuk ke Dashboard Tim <ArrowRight className="w-4 h-4 stroke-[3]" />
        </button>
      </div>
    );
  }

  // TAMPILAN TURNAMEN GRATIS
  if (isFree) {
    return (
      <form onSubmit={handleManualSubmit} className="card-esports p-6 rounded-2xl space-y-4">
        <h3 className="text-sm text-white uppercase flex items-center gap-2 font-headline">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          Konfirmasi Pendaftaran Turnamen Gratis
        </h3>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Turnamen ini bebas biaya registrasi (Rp 0). Anda dapat langsung mengonfirmasi keikutsertaan tim untuk diverifikasi oleh panitia.
        </p>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-zinc-950 font-bold text-sm shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer font-headline"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Memproses Konfirmasi...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Konfirmasi Pendaftaran Tim Sekarang</span>
            </>
          )}
        </button>
      </form>
    );
  }

  // TAMPILAN TURNAMEN BERBAYAR: TAB QRIS OTOMATIS & MANUAL
  return (
    <div className="space-y-4">
      {/* Tab Switcher */}
      <div className="grid grid-cols-2 p-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab("qris_auto")}
          className={`py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === "qris_auto"
              ? "bg-amber-500 text-zinc-950 font-bold shadow-md shadow-amber-500/20"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>QRIS Otomatis (Instan)</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("manual_upload")}
          className={`py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === "manual_upload"
              ? "bg-amber-500 text-zinc-950 font-bold shadow-md shadow-amber-500/20"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span>Upload Bukti Manual</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* TAB 1: QRIS OTOMATIS (MIDTRANS) */}
      {activeTab === "qris_auto" && (
        <div className="card-esports p-6 rounded-2xl space-y-6 bg-carbon-mesh">
          <div className="hud-strip">
            <span className="font-mono text-[10px] text-zinc-400">// MIDTRANS_QRIS_DYNAMIC_GATEWAY</span>
            <span className="font-mono text-[10px] text-emerald-400 font-bold">[AUTO_SETTLEMENT]</span>
          </div>

          <div>
            <h3 className="text-base font-bold text-white font-headline flex items-center gap-2">
              <QrCode className="w-4 h-4 text-amber-500" />
              Bayar Instan dengan QRIS
            </h3>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Bisa di-scan menggunakan <strong>DANA</strong>, GoPay, OVO, ShopeePay, BCA Mobile, Livin Mandiri, BRImo, atau aplikasi bank apa pun. Status langsung lunas otomatis dalam hitungan detik.
            </p>
          </div>

          {!qrisData ? (
            <div className="text-center py-6 space-y-4 border border-dashed border-zinc-800 rounded-2xl p-6 bg-zinc-950/60">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto">
                <QrCode className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-zinc-300 font-bold">Nominal Pembayaran:</p>
                <p className="text-2xl font-black text-amber-400 font-mono mt-0.5">
                  Rp {entryFee.toLocaleString("id-ID")}
                </p>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Klik tombol di bawah untuk membuat kode QRIS khusus tim Anda.
                </p>
              </div>

              <button
                type="button"
                onClick={handleGenerateQris}
                disabled={isGeneratingQris}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-zinc-950 font-black text-xs sm:text-sm uppercase tracking-wider font-headline shadow-lg shadow-amber-500/20 inline-flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isGeneratingQris ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menghubungkan ke Midtrans...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Tampilkan Kode QRIS Sekarang</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Box QR Code */}
              <div className="p-6 rounded-2xl bg-zinc-950 border border-amber-500/40 text-center space-y-3 relative overflow-hidden shadow-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-mono font-bold animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  MENUNGGU PEMBAYARAN...
                </div>

                {/* Gambar QRIS */}
                <div className="bg-white p-3.5 rounded-xl max-w-[230px] mx-auto shadow-lg">
                  <img
                    src={qrisData.qrCodeUrl}
                    alt="Dynamic QRIS Midtrans"
                    className="w-full h-auto object-contain mx-auto"
                  />
                  <p className="text-[10px] text-zinc-800 font-bold tracking-wider uppercase mt-1">
                    QRIS RESMI NASIONAL
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-[11px] text-zinc-500 font-mono">NOMINAL TEPAT:</p>
                  <p className="text-2xl font-black text-amber-400 font-mono">
                    Rp {qrisData.grossAmount.toLocaleString("id-ID")}
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    Buka <strong>DANA</strong> atau aplikasi m-banking Anda &rarr; Scan QR di atas.
                  </p>
                </div>

                {/* Status Checker */}
                <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-center gap-2 text-xs text-zinc-400 font-mono">
                  <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                  <span>Sistem memantau mutasi secara otomatis...</span>
                </div>
              </div>

              {/* Supported Wallets Strip */}
              <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 text-center space-y-1.5">
                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                  DIDUKUNG OLEH SEMUA APLIKASI PEMBAYARAN:
                </p>
                <p className="text-xs font-semibold text-zinc-300">
                  DANA &bull; GoPay &bull; OVO &bull; ShopeePay &bull; LinkAja &bull; BCA &bull; Mandiri &bull; BRI &bull; BNI
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: UPLOAD BUKTI MANUAL */}
      {activeTab === "manual_upload" && (
        <form onSubmit={handleManualSubmit} className="card-esports p-6 rounded-2xl space-y-4">
          <h3 className="text-sm text-white uppercase flex items-center gap-2 font-headline">
            <UploadCloud className="w-4 h-4 text-amber-500" />
            Unggah Bukti Transfer Manual
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Gunakan opsi ini jika Anda melakukan transfer manual antar bank atau menyimpan bukti struk terpisah. Panitia akan memverifikasi secara manual dari dashboard.
          </p>

          <div className="border-2 border-dashed border-zinc-800 hover:border-amber-500/50 rounded-2xl p-6 text-center transition-colors">
            <input
              type="file"
              id="payment-proof-file"
              onChange={handleFileChange}
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
              disabled={isSubmitting}
            />
            <label
              htmlFor="payment-proof-file"
              className="cursor-pointer flex flex-col items-center justify-center space-y-2"
            >
              <div className="w-12 h-12 rounded-2xl bg-zinc-800 text-zinc-400 flex items-center justify-center">
                <UploadCloud className="w-6 h-6 text-amber-500" />
              </div>
              <p className="text-xs font-semibold text-white">
                {file ? file.name : "Klik untuk memilih file bukti transfer"}
              </p>
              <p className="text-[11px] text-zinc-500">
                Format JPG, PNG, WEBP, atau PDF (Maksimal 5 MB)
              </p>
            </label>
          </div>

          {previewUrl && (
            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-center">
              <p className="text-[11px] text-zinc-400 mb-2">Pratinjau Bukti Pembayaran:</p>
              <img
                src={previewUrl}
                alt="Pratinjau Bukti"
                className="max-h-56 mx-auto rounded-lg border border-zinc-800 object-contain"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !file}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-zinc-950 font-bold text-sm shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer font-headline"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Mengunggah Bukti...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Kirim Bukti Manual</span>
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
