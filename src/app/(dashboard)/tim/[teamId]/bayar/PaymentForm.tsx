"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UploadCloud, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface PaymentFormProps {
  teamId: string;
  isFree: boolean;
}

export default function PaymentForm({ teamId, isFree }: PaymentFormProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const supabase = createClient();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Cek ukuran file (maks 5MB)
    if (selectedFile.size > 5 * 1024 * 1024) {
      setErrorMsg("Ukuran file maksimal 5 MB.");
      toast.error("Ukuran file terlalu besar (maksimal 5 MB).");
      return;
    }

    // Cek format (JPG/PNG/WEBP/PDF)
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

  const handleSubmit = async (e: React.FormEvent) => {
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

        // Upload ke Supabase Storage (bucket payments)
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
          console.error("Storage upload error:", uploadError);
          setErrorMsg("Gagal mengunggah file ke storage: " + uploadError.message);
          toast.error("Gagal mengunggah bukti pembayaran.");
          setIsSubmitting(false);
          return;
        }

        // Ambil URL file
        const { data: urlData } = supabase.storage
          .from("payments")
          .getPublicUrl(filePath);

        finalProofUrl = urlData.publicUrl;
      }

      // Submit ke endpoint API
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
    } catch (err) {
      console.error("Payment submit error:", err);
      setErrorMsg("Terjadi kesalahan jaringan atau server.");
      toast.error("Terjadi kesalahan sistem.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 bg-zinc-900/60 border border-zinc-800 rounded-2xl space-y-4">
      <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
        <UploadCloud className="w-4 h-4 text-amber-500" />
        {isFree ? "Pengajuan Verifikasi Tim" : "Unggah Bukti Transfer"}
      </h3>

      {errorMsg && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {!isFree ? (
        <div className="space-y-4">
          {/* File Upload Zone */}
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

          {/* Pratinjau Gambar */}
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
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-zinc-950 font-bold text-sm shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Mengunggah & Mengirimkan...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Kirim Bukti & Ajukan Verifikasi</span>
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-zinc-400">
            Karena turnamen ini bebas biaya pendaftaran, Anda dapat langsung mengajukan tim Anda ke antrean verifikasi panitia.
          </p>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-zinc-950 font-bold text-sm shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memproses...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Konfirmasi Pendaftaran Tim Sekarang</span>
              </>
            )}
          </button>
        </div>
      )}
    </form>
  );
}
