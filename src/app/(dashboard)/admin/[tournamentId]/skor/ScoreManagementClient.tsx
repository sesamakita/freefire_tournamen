"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Trophy,
  UploadCloud,
  CheckCircle2,
  XCircle,
  Loader2,
  ShieldAlert,
  ExternalLink,
  Save,
  Check,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { calculatePoints } from "@/lib/points";

interface ScoreManagementClientProps {
  tournamentId: string;
  matches: any[];
  currentUserId: string;
  isOwnerOrAdmin: boolean;
}

export default function ScoreManagementClient({
  tournamentId,
  matches,
  currentUserId,
  isOwnerOrAdmin,
}: ScoreManagementClientProps) {
  const router = useRouter();
  const [selectedMatchId, setSelectedMatchId] = useState(
    matches.length > 0 ? matches[0].id : ""
  );

  const selectedMatch = matches.find((m) => m.id === selectedMatchId);
  const matchTeams = selectedMatch?.match_teams || [];
  const existingResults = selectedMatch?.results || [];

  // State untuk form input skor
  const [scores, setScores] = useState<{
    [teamId: string]: { placement: number; kills: number };
  }>({});
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State untuk dual approval
  const [isVerifying, setIsVerifying] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);

  const supabase = createClient();

  const handleScoreChange = (
    teamId: string,
    field: "placement" | "kills",
    val: number
  ) => {
    setScores((prev) => ({
      ...prev,
      [teamId]: {
        placement: field === "placement" ? val : prev[teamId]?.placement || 1,
        kills: field === "kills" ? val : prev[teamId]?.kills || 0,
      },
    }));
  };

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran screenshot maksimal 5 MB.");
      return;
    }

    setScreenshotFile(file);
    setScreenshotPreview(URL.createObjectURL(file));
  };

  const handleSubmitScores = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!screenshotFile) {
      toast.error("Wajib mengunggah screenshot papan skor akhir pertandingan.");
      return;
    }

    if (matchTeams.length === 0) {
      toast.error("Belum ada tim yang di-plot ke match ini.");
      return;
    }

    // Susun array results
    const resultsArray = matchTeams.map((mt: any, index: number) => {
      const entry = scores[mt.team_id] || {
        placement: index + 1,
        kills: 0,
      };
      return {
        team_id: mt.team_id,
        placement: entry.placement,
        kills: entry.kills,
      };
    });

    // Cek duplikasi placement
    const placements = resultsArray.map((r: any) => r.placement);
    const uniquePlacements = new Set(placements);
    if (uniquePlacements.size !== placements.length) {
      toast.error("Placement tidak boleh ada yang kembar. Setiap tim harus memiliki ranking yang berbeda.");
      return;
    }

    try {
      setIsSubmitting(true);

      // 1. Upload screenshot ke bucket screenshots
      const fileExt = screenshotFile.name.split(".").pop();
      const filePath = `${tournamentId}/${selectedMatchId}_${Date.now()}.${fileExt}`;

      const { error: uploadErr } = await supabase.storage
        .from("screenshots")
        .upload(filePath, screenshotFile);

      if (uploadErr) {
        toast.error("Gagal mengunggah screenshot: " + uploadErr.message);
        setIsSubmitting(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("screenshots")
        .getPublicUrl(filePath);

      // 2. Submit ke API results
      const res = await fetch(
        `/api/tournaments/${tournamentId}/matches/${selectedMatchId}/results`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            screenshot_url: urlData.publicUrl,
            results: resultsArray,
          }),
        }
      );

      const json = await res.json();
      if (!json.success) {
        toast.error(json.error?.message || "Gagal menyimpan skor.");
        return;
      }

      toast.success("Skor berhasil disubmit dan menunggu verifikasi Admin!");
      router.refresh();
    } catch (err) {
      console.error("Score submit error:", err);
      toast.error("Terjadi kesalahan sistem.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveScores = async () => {
    const confirmApprove = window.confirm("Setujui skor match ini dan perbarui klasemen secara resmi?");
    if (!confirmApprove) return;

    try {
      setIsVerifying(true);
      const res = await fetch(
        `/api/tournaments/${tournamentId}/matches/${selectedMatchId}/results/verify`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "approve" }),
        }
      );

      const json = await res.json();
      if (!json.success) {
        toast.error(json.error?.message || "Gagal menyetujui skor.");
        return;
      }

      toast.success(json.data?.message || "Skor disetujui! Klasemen terupdate.");
      router.refresh();
    } catch (err) {
      console.error("Approve score error:", err);
      toast.error("Terjadi kesalahan sistem.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRejectScores = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rejectReason.trim().length < 10) {
      toast.error("Alasan penolakan minimal 10 karakter.");
      return;
    }

    try {
      setIsVerifying(true);
      const res = await fetch(
        `/api/tournaments/${tournamentId}/matches/${selectedMatchId}/results/verify`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "reject", reason: rejectReason }),
        }
      );

      const json = await res.json();
      if (!json.success) {
        toast.error(json.error?.message || "Gagal menolak skor.");
        return;
      }

      toast.info(json.data?.message || "Skor telah ditolak.");
      setShowRejectModal(false);
      setRejectReason("");
      router.refresh();
    } catch (err) {
      console.error("Reject score error:", err);
      toast.error("Terjadi kesalahan sistem.");
    } finally {
      setIsVerifying(false);
    }
  };

  const pendingResult = existingResults.find((r: any) => r.status === "pending");
  const isPending = !!pendingResult;
  const isApproved = existingResults.some((r: any) => r.status === "approved");
  const isSubmitter = pendingResult?.submitted_by === currentUserId;

  return (
    <div className="space-y-6">
      {/* Selector Match */}
      <div className="card-glow p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <label className="text-xs font-bold text-zinc-300">Pilih Match yang Diatur:</label>
        <select
          value={selectedMatchId}
          onChange={(e) => setSelectedMatchId(e.target.value)}
          className="px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
        >
          {matches.map((m: any) => (
            <option key={m.id} value={m.id}>
              {m.nama} (Round {m.round}) &mdash; Status: {m.status}
            </option>
          ))}
        </select>
      </div>

      {/* Bagian 1: Verifikasi Dual-Approval (Jika Ada Skor Pending) */}
      {isPending && (
        <div className="p-6 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded">
                Menunggu Verifikasi Dual-Control (SCR-S02)
              </span>
              <h3 className="text-base text-white mt-1">
                Hasil Pertandingan Menunggu Persetujuan Admin
              </h3>
              <p className="text-xs text-zinc-400">
                Di-submit oleh: <strong className="text-zinc-200">{pendingResult.submitter?.nama || "Panitia"}</strong> ({pendingResult.submitter?.email})
              </p>
            </div>

            {/* Tombol Approval atau Peringatan SoD */}
            {isSubmitter ? (
              <div className="p-3 bg-zinc-900/90 border border-zinc-700 rounded-xl flex items-center gap-2 text-xs text-amber-300">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  <strong>Dual Control Guard:</strong> Anda adalah penginput skor ini. Persetujuan harus dilakukan oleh Admin lain.
                </span>
              </div>
            ) : isOwnerOrAdmin ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleApproveScores}
                  disabled={isVerifying}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs inline-flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
                >
                  {isVerifying ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  )}
                  <span>Setujui Skor Resmi</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowRejectModal(true)}
                  disabled={isVerifying}
                  className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-red-500/20 text-zinc-300 hover:text-red-400 font-bold text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Tolak Skor</span>
                </button>
              </div>
            ) : (
              <span className="text-xs text-zinc-400 italic">Hanya Admin/Owner yang dapat menyetujui skor.</span>
            )}
          </div>

          {/* Screenshot Preview */}
          {pendingResult.screenshot_url && (
            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-400">Bukti Screenshot Scoreboard:</span>
                <a
                  href={pendingResult.screenshot_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-400 hover:text-amber-300 inline-flex items-center gap-1 font-semibold"
                >
                  Buka Gambar Penuh <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <img
                src={pendingResult.screenshot_url}
                alt="Scoreboard"
                className="max-h-52 mx-auto rounded-lg border border-zinc-800 object-contain"
              />
            </div>
          )}
        </div>
      )}

      {/* Bagian 2: Hasil Skor Resmi (Approved) */}
      {isApproved && (
        <div className="card-glow p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm text-white uppercase flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Skor Resmi Pertandingan Ini (Telah Disetujui)
            </h3>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[11px] font-bold">
              Match Selesai
            </span>
          </div>

          <div className="divide-y divide-zinc-800/80 text-xs">
            {existingResults.map((r: any) => (
              <div key={r.id} className="py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center font-bold text-white text-[11px]">
                    #{r.placement}
                  </span>
                  <span className="font-bold text-white">{r.teams?.nama}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-zinc-400">{r.kills} Kills</span>
                  <span className="font-bold text-amber-400">{r.points} Poin</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bagian 3: Form Input Skor Baru (SCR-S01) */}
      {!isApproved && (
        <form onSubmit={handleSubmitScores} className="card-glow p-6 rounded-2xl space-y-6">
          <div>
            <h3 className="text-sm text-white uppercase flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              Input Hasil Pertandingan (SCR-S01)
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Masukkan ranking penempatan (Placement) dan jumlah Kills untuk tiap tim peserta. Poin dihitung otomatis server-side.
            </p>
          </div>

          {/* Upload Screenshot */}
          <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-3">
            <label className="block text-xs font-semibold text-zinc-300">
              Unggah Bukti Screenshot Scoreboard Pertandingan <span className="text-red-400">*</span>
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleScreenshotChange}
              className="text-xs text-zinc-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-zinc-800 file:text-zinc-200 hover:file:bg-zinc-700 cursor-pointer"
              required
            />
            {screenshotPreview && (
              <img
                src={screenshotPreview}
                alt="Preview"
                className="max-h-40 rounded-lg border border-zinc-800 object-contain"
              />
            )}
          </div>

          {/* Tabel Input Penempatan & Kills */}
          <div className="space-y-3">
            <div className="grid grid-cols-12 gap-2 text-[11px] font-bold uppercase text-zinc-400 px-3 py-1">
              <span className="col-span-5">Tim Peserta (Slot)</span>
              <span className="col-span-3 text-center">Placement (1–12)</span>
              <span className="col-span-2 text-center">Kills</span>
              <span className="col-span-2 text-right">Poin Estimasi</span>
            </div>

            <div className="space-y-2">
              {matchTeams.map((mt: any, idx: number) => {
                const teamId = mt.team_id;
                const currentEntry = scores[teamId] || {
                  placement: idx + 1,
                  kills: 0,
                };
                const previewPoints = calculatePoints(currentEntry.placement, currentEntry.kills);

                return (
                  <div
                    key={teamId}
                    className="grid grid-cols-12 gap-2 items-center p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs"
                  >
                    <div className="col-span-5">
                      <span className="font-bold text-white">{mt.teams?.nama}</span>
                      <span className="text-zinc-500 text-[11px] block">Slot #{mt.slot}</span>
                    </div>

                    <div className="col-span-3">
                      <select
                        value={currentEntry.placement}
                        onChange={(e) =>
                          handleScoreChange(teamId, "placement", parseInt(e.target.value, 10))
                        }
                        className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-center text-white"
                      >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((p) => (
                          <option key={p} value={p}>
                            #{p}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-2">
                      <input
                        type="number"
                        min={0}
                        max={40}
                        value={currentEntry.kills}
                        onChange={(e) =>
                          handleScoreChange(teamId, "kills", parseInt(e.target.value, 10) || 0)
                        }
                        className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-center text-white font-mono"
                      />
                    </div>

                    <div className="col-span-2 text-right">
                      <span className="font-black text-amber-400 font-mono text-sm">
                        {previewPoints}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || matchTeams.length === 0}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-sm shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Mengirim Hasil Skor...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Submit Skor Pertandingan (Kirim ke Admin)</span>
              </>
            )}
          </button>
        </form>
      )}

      {/* Modal Tolak Skor */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base text-white">Tolak Hasil Skor Pertandingan</h3>
            <p className="text-xs text-zinc-400">
              Tuliskan alasan penolakan agar panitia yang menginput dapat mengunggah atau memperbaiki skor yang benar.
            </p>

            <form onSubmit={handleRejectScores} className="space-y-4 text-xs">
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                placeholder="Contoh: Screenshot buram / kills tim Garuda tidak sesuai screenshot (tertulis 8 bukan 5)."
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white"
                required
              />

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="px-3 py-1.5 text-zinc-400 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isVerifying || rejectReason.trim().length < 10}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold disabled:opacity-50"
                >
                  {isVerifying ? "Memproses..." : "Kirim Penolakan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
