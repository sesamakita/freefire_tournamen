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
  Bot,
  Sparkles,
  AlertTriangle,
  Eye,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { calculatePoints } from "@/lib/points";

interface ScoreManagementClientProps {
  tournamentId: string;
  matches: any[];
  currentUserId: string;
  isOwnerOrAdmin: boolean;
  tournament?: any;
  topStandings?: any[];
}

export default function ScoreManagementClient({
  tournamentId,
  matches,
  currentUserId,
  isOwnerOrAdmin,
  tournament,
  topStandings,
}: ScoreManagementClientProps) {
  const router = useRouter();

  // State untuk Modal & Eksekusi Pembagian Hadiah (Disbursement)
  const [showDisburseModal, setShowDisburseModal] = useState(false);
  const [isDisbursing, setIsDisbursing] = useState(false);

  const prizePool = Number(tournament?.prize_pool || 0);
  const distribution = (tournament?.prize_distribution as Record<string, number>) || {
    "1": 0.5,
    "2": 0.3,
    "3": 0.2,
  };
  const isDisbursed = Boolean(tournament?.prizes_disbursed_at);

  const handleDisbursePrizes = async () => {
    try {
      setIsDisbursing(true);
      const res = await fetch(`/api/tournaments/${tournamentId}/disburse-prizes`, {
        method: "POST",
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error?.message || "Gagal membagikan hadiah.");
        return;
      }
      toast.success(json.data?.message || "Hadiah berhasil dibagikan ke dompet para pemenang!");
      setShowDisburseModal(false);
      router.refresh();
    } catch (err) {
      console.error("Disburse error:", err);
      toast.error("Terjadi kesalahan sistem.");
    } finally {
      setIsDisbursing(false);
    }
  };

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

  // State untuk AI Scoreboard Reader
  const [isScanningAI, setIsScanningAI] = useState(false);
  const [aiFilledTeamIds, setAiFilledTeamIds] = useState<string[]>([]);
  const [aiUncertainTeamIds, setAiUncertainTeamIds] = useState<string[]>([]);
  const [aiNotes, setAiNotes] = useState<{ [teamId: string]: string }>({});
  const [aiScanStatus, setAiScanStatus] = useState<{
    confidence: number;
    warnings: string[];
    errors: string[];
    isMock: boolean;
  } | null>(null);

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
    // Jika panitia mengedit manual, hapus status warning/uncertain untuk tim ini
    if (aiUncertainTeamIds.includes(teamId)) {
      setAiUncertainTeamIds((prev) => prev.filter((id) => id !== teamId));
    }

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
    // Reset AI status on new file
    setAiScanStatus(null);
    setAiFilledTeamIds([]);
    setAiUncertainTeamIds([]);
    setAiNotes({});
  };

  const handleScanWithAI = async () => {
    if (!screenshotFile) {
      toast.error("Pilih file screenshot terlebih dahulu sebelum membaca dengan AI.");
      return;
    }

    if (matchTeams.length === 0) {
      toast.error("Belum ada tim yang di-plot ke match ini.");
      return;
    }

    try {
      setIsScanningAI(true);

      // Konversi file ke base64
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const res = reader.result as string;
          resolve(res);
        };
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(screenshotFile);
      });

      const res = await fetch("/api/ai/read-scoreboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tournament_id: tournamentId,
          match_id: selectedMatchId,
          image_base64: base64Data,
          mime_type: screenshotFile.type,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Gagal memproses pembacaan AI.");
      }

      const { validation, isMock } = json.data;
      const recognizedTeams = validation.teams || [];

      // Pre-fill skor ke form state
      const newScores: { [teamId: string]: { placement: number; kills: number } } = { ...scores };
      const filledIds: string[] = [];
      const uncertainIds: string[] = [];
      const notesMap: { [teamId: string]: string } = {};

      recognizedTeams.forEach((t: any) => {
        newScores[t.team_id] = {
          placement: t.rank,
          kills: t.kills,
        };
        filledIds.push(t.team_id);
        if (!t.terbaca || t.match_confidence < 0.75) {
          uncertainIds.push(t.team_id);
        }
        if (t.catatan) {
          notesMap[t.team_id] = t.catatan;
        }
      });

      setScores(newScores);
      setAiFilledTeamIds(filledIds);
      setAiUncertainTeamIds(uncertainIds);
      setAiNotes(notesMap);
      setAiScanStatus({
        confidence: validation.overallConfidence,
        warnings: validation.warnings || [],
        errors: validation.errors || [],
        isMock,
      });

      if (uncertainIds.length > 0) {
        toast.warning(
          `🤖 Skor berhasil diekstrak AI (${filledIds.length} tim). Ditemukan ${uncertainIds.length} tim yang perlu diperiksa manual.`,
          { duration: 5000 }
        );
      } else {
        toast.success(
          `🤖 AI berhasil mengisi formulir untuk ${filledIds.length} tim. Silakan periksa kembali kecocokan angka sebelum submit.`,
          { duration: 4000 }
        );
      }
    } catch (err: any) {
      console.error("AI Scan Error:", err);
      toast.error(err.message || "Gagal membaca screenshot dengan AI.");
    } finally {
      setIsScanningAI(false);
    }
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
            {/* Kartu Manajemen Distribusi Hadiah (Prize Pool) */}
      <div className="card-glow p-5 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-950/20 via-zinc-950 to-zinc-950 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-bold text-white tracking-tight">
              Prize Pool & Distribusi Hadiah Turnamen
            </h3>
            {isDisbursed ? (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[11px] flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Sudah Dibagikan
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[11px]">
                {prizePool > 0 ? "Siap Dibagikan" : "Prize Pool Rp 0"}
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400">
            Total Hadiah:{" "}
            <strong className="text-white font-mono text-sm">
              Rp {prizePool.toLocaleString("id-ID")}
            </strong>
            {tournament?.prizes_disbursed_at && (
              <span className="text-zinc-500 ml-2">
                &bull; Dibagikan pada:{" "}
                {new Date(tournament.prizes_disbursed_at).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                WIB
              </span>
            )}
          </p>
        </div>

        {isOwnerOrAdmin && (
          <div>
            {isDisbursed ? (
              <div className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Status Turnamen Selesai</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowDisburseModal(true)}
                disabled={prizePool <= 0 || (topStandings || []).length === 0}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-xs shadow-md shadow-amber-500/20 inline-flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trophy className="w-4 h-4" />
                <span>Sahkan Juara & Bagikan Hadiah</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Selector Match */}
      <div className="card-glow card-glow-hover p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
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
        <div className="card-glow card-glow-hover p-6 rounded-2xl space-y-4">
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
        <form onSubmit={handleSubmitScores} className="card-glow card-glow-hover p-6 rounded-2xl space-y-6">
          <div>
            <h3 className="text-sm text-white uppercase flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              Input Hasil Pertandingan (SCR-S01)
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Masukkan ranking penempatan (Placement) dan jumlah Kills untuk tiap tim peserta. Poin dihitung otomatis server-side.
            </p>
          </div>

          {/* Upload Screenshot & AI Scoreboard Reader */}
          <div className="p-5 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="block text-xs font-semibold text-zinc-300">
                Unggah Bukti Screenshot Scoreboard Pertandingan <span className="text-red-400">*</span>
              </label>
              <span className="text-[11px] text-zinc-500">Maks. 5 MB (PNG / JPG / WEBP)</span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <input
                type="file"
                accept="image/*"
                onChange={handleScreenshotChange}
                className="flex-1 text-xs text-zinc-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-zinc-800 file:text-zinc-200 hover:file:bg-zinc-700 cursor-pointer"
                required
              />

              {/* Tombol Ekstrak Skor AI */}
              <button
                type="button"
                onClick={handleScanWithAI}
                disabled={!screenshotFile || isScanningAI || matchTeams.length === 0}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-xs shadow-md shadow-amber-500/20 inline-flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
              >
                {isScanningAI ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
                    <span>Menganalisis Gambar...</span>
                  </>
                ) : (
                  <>
                    <Bot className="w-4 h-4 text-zinc-950" />
                    <span>Ekstrak Skor via AI</span>
                  </>
                )}
              </button>
            </div>

            {/* Preview Screenshot & Status AI */}
            {screenshotPreview && (
              <div className="pt-2 border-t border-zinc-800/80 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400 font-medium">Pratinjau Screenshot:</span>
                  <a
                    href={screenshotPreview}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-400 hover:text-amber-300 inline-flex items-center gap-1 font-semibold"
                  >
                    Perbesar Gambar <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <img
                  src={screenshotPreview}
                  alt="Preview Screenshot"
                  className="max-h-48 rounded-xl border border-zinc-800 object-contain bg-black/40"
                />
              </div>
            )}

            {/* Banner Status Hasil AI */}
            {aiScanStatus && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 font-bold text-amber-400">
                    <Sparkles className="w-4 h-4" />
                    Hasil Pembacaan AI Diterapkan
                  </span>
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                    Confidence: {Math.round(aiScanStatus.confidence * 100)}%
                    {aiScanStatus.isMock ? " (Mode Demo)" : ""}
                  </span>
                </div>

                <p className="text-zinc-300 text-[11px]">
                  Nilai ranking dan kills telah diisi otomatis. <strong>Panitia wajib memeriksa</strong> kesesuaian nilai sebelum mengirim hasil ke sistem.
                </p>

                {aiScanStatus.warnings.length > 0 && (
                  <div className="space-y-1 pt-1 border-t border-amber-500/20">
                    {aiScanStatus.warnings.map((w, i) => (
                      <p key={i} className="text-amber-300/90 text-[11px] flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        {w}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tabel Input Penempatan & Kills */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="font-semibold text-zinc-300">Rincian Skor Tiap Tim:</span>
              <span className="text-[10px] text-zinc-500 sm:hidden">Geser tabel jika terpotong &rarr;</span>
            </div>

            <div className="overflow-x-auto pb-2 scrollbar-thin">
              <div className="min-w-[500px] sm:min-w-0 space-y-2">
                <div className="grid grid-cols-12 gap-2 text-[11px] font-bold uppercase text-zinc-400 w-full px-3 py-1 bg-zinc-950/60 rounded-lg border border-zinc-800/60">
                  <span className="col-span-5">Tim Peserta (Slot)</span>
                  <span className="col-span-3 text-center">Placement (1–12)</span>
                  <span className="col-span-2 text-center">Kills</span>
                  <span className="col-span-2 text-right">Poin Estimasi</span>
                </div>

                {matchTeams.map((mt: any, idx: number) => {
                  const teamId = mt.team_id;
                  const currentEntry = scores[teamId] || {
                    placement: idx + 1,
                    kills: 0,
                  };
                  const previewPoints = calculatePoints(currentEntry.placement, currentEntry.kills);
                  const isAiFilled = aiFilledTeamIds.includes(teamId);
                  const isAiUncertain = aiUncertainTeamIds.includes(teamId);
                  const note = aiNotes[teamId];

                  return (
                    <div
                      key={teamId}
                      className={`grid grid-cols-12 gap-2 items-center p-3 rounded-xl text-xs transition-all ${
                        isAiUncertain
                          ? "bg-red-500/10 border border-red-500/40"
                          : isAiFilled
                          ? "bg-amber-500/5 border border-amber-500/30"
                          : "bg-zinc-950 border border-zinc-800"
                      }`}
                    >
                      <div className="col-span-5 space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-white truncate max-w-[140px] sm:max-w-none">{mt.teams?.nama}</span>
                          {isAiUncertain ? (
                            <span
                              title={note || "Perlu cek manual"}
                              className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30 shrink-0"
                            >
                              <AlertTriangle className="w-3 h-3 text-red-400" />
                              Cek Ulang
                            </span>
                          ) : isAiFilled ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                              <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                              AI
                            </span>
                          ) : null}
                        </div>
                        <span className="text-zinc-500 text-[11px] block font-mono">Slot #{mt.slot}</span>
                        {note && (
                          <span className="text-[10px] text-amber-400/80 block italic">{note}</span>
                        )}
                      </div>

                      <div className="col-span-3">
                        <select
                          value={currentEntry.placement}
                          onChange={(e) =>
                            handleScoreChange(teamId, "placement", parseInt(e.target.value, 10))
                          }
                          className={`w-full px-2 py-1.5 rounded-lg text-xs text-center font-bold text-white ${
                            isAiFilled
                              ? "bg-amber-950/40 border border-amber-500/40 text-amber-200"
                              : "bg-zinc-900 border border-zinc-800"
                          }`}
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
                          className={`w-full px-2 py-1.5 rounded-lg text-xs text-center font-mono font-bold text-white ${
                            isAiFilled
                              ? "bg-amber-950/40 border border-amber-500/40 text-amber-200"
                              : "bg-zinc-900 border border-zinc-800"
                          }`}
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

      {/* Modal Konfirmasi Pembagian Hadiah */}
      {showDisburseModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl max-h-[85vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-base text-white font-bold flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  Konfirmasi Pengesahan & Pembagian Hadiah
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Total Prize Pool: <strong className="text-white">Rp {prizePool.toLocaleString("id-ID")}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDisburseModal(false)}
                className="text-zinc-500 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p className="text-zinc-300 font-semibold">Pratinjau Penerima Hadiah Berdasarkan Klasemen Akhir:</p>
              <div className="space-y-2">
                {Object.entries(distribution).map(([rankStr, ratioOrAmount]) => {
                  const rankNum = parseInt(rankStr, 10);
                  const ratio = Number(ratioOrAmount);
                  const amount = ratio <= 1.0 ? Math.round(prizePool * ratio) : Math.round(ratio);
                  const standing = (topStandings || []).find((s: any) => s.rank === rankNum);

                  return (
                    <div
                      key={rankStr}
                      className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between"
                    >
                      <div className="space-y-0.5">
                        <span className="font-bold text-amber-400">Peringkat #{rankNum}</span>
                        <p className="font-semibold text-white">
                          {standing ? standing.team_nama : "(Tim belum ditentukan / belum ada data)"}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-emerald-400 text-sm">
                          Rp {amount.toLocaleString("id-ID")}
                        </span>
                        <p className="text-[10px] text-zinc-500">
                          {ratio <= 1.0 ? `${Math.round(ratio * 100)}% dari pool` : "Nominal tetap"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-[11px] space-y-1">
                <p className="font-bold">⚠️ Perhatian Pengesahan Final:</p>
                <p>
                  Dana hadiah akan <strong>langsung dikreditkan secara atomik</strong> ke dompet akun kapten tim masing-masing. Status turnamen akan ditutup menjadi <strong>Selesai (Done)</strong> dan tidak dapat diubah kembali.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setShowDisburseModal(false)}
                className="px-3 py-1.5 text-zinc-400 hover:text-white text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDisbursePrizes}
                disabled={isDisbursing}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDisbursing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Mentransfer ke Dompet...</span>
                  </>
                ) : (
                  <>
                    <Trophy className="w-3.5 h-3.5" />
                    <span>Sahkan & Bagikan Sekarang</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
