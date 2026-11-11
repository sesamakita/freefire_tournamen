"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Trophy,
  ArrowLeft,
  Swords,
  Loader2,
  Shuffle,
  CheckCircle2,
  AlertCircle,
  Key,
  X,
  ExternalLink,
  Settings2,
} from "lucide-react";
import TournamentBracketView, {
  type BracketMatch,
} from "@/components/bracket/TournamentBracketView";
import TournamentAdminNav from "@/components/TournamentAdminNav";

export default function AdminBracketPage() {
  const params = useParams();
  const router = useRouter();
  const tournamentId = params?.tournamentId as string;

  const [isLoading, setIsLoading] = useState(true);
  const [tournament, setTournament] = useState<any>(null);
  const [brackets, setBrackets] = useState<BracketMatch[]>([]);
  const [verifiedCount, setVerifiedCount] = useState(0);

  // Modal State
  const [selectedMatch, setSelectedMatch] = useState<BracketMatch | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<"score" | "room">("score");
  const [scoreP1, setScoreP1] = useState(5);
  const [scoreP2, setScoreP2] = useState(0);
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [roomId, setRoomId] = useState("");
  const [roomPass, setRoomPass] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Load Bracket & Tournament data
  const loadData = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/tournaments/${tournamentId}/bracket`);
      const json = await res.json();

      if (json.success) {
        setTournament(json.data.tournament);
        setBrackets(json.data.brackets || []);
        setVerifiedCount(json.data.verifiedCount ?? 0);
      } else {
        toast.error(json.error?.message || "Gagal memuat data bagan.");
      }
    } catch (err: any) {
      console.error("Gagal memuat data bagan:", err);
      toast.error(err?.message || "Gagal memuat data bagan turnamen.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (tournamentId) {
      loadData();
    }
  }, [tournamentId]);

  // Handle Generate Bracket
  const handleGenerateBracket = async () => {
    if (
      !confirm(
        `Generate bagan dengan ${verifiedCount} peserta terverifikasi? Jika bagan sudah ada sebelumnya, susunan pertandingan akan di-reset!`
      )
    ) {
      return;
    }

    try {
      setIsGenerating(true);
      const res = await fetch(`/api/tournaments/${tournamentId}/bracket`, {
        method: "POST",
      });
      const json = await res.json();

      if (!json.success) {
        toast.error(json.error?.message || "Gagal membuat bagan.");
        return;
      }

      toast.success(json.data.message || "Bagan berhasil disusun!");
      await loadData();
    } catch (err) {
      console.error("Generate error:", err);
      toast.error("Terjadi kesalahan sistem saat membuat bagan.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Buka modal saat match diklik
  const handleSelectMatch = (match: BracketMatch) => {
    setSelectedMatch(match);
    setScoreP1(match.score_p1 || 5);
    setScoreP2(match.score_p2 || 0);
    setScreenshotUrl(match.screenshot_url || "");
    setRoomId(match.room_id || "");
    setRoomPass(match.room_pass || "");
    setActiveModalTab("score");
  };

  // Submit Skor Match
  const handleSubmitScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMatch) return;

    if (scoreP1 === scoreP2) {
      toast.error("Skor tidak boleh seri! Dalam mode Lone Wolf harus ada pemenang.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(
        `/api/tournaments/${tournamentId}/bracket/${selectedMatch.id}/score`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            score_p1: Number(scoreP1),
            score_p2: Number(scoreP2),
            screenshot_url: screenshotUrl.trim() || null,
          }),
        }
      );

      const json = await res.json();

      if (!json.success) {
        toast.error(json.error?.message || "Gagal menyimpan skor.");
        return;
      }

      toast.success("Skor berhasil disimpan dan pemenang berhasil diloloskan!");
      setSelectedMatch(null);
      await loadData();
    } catch (err) {
      console.error("Submit score error:", err);
      toast.error("Gagal menyimpan skor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Room Match
  const handleSubmitRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMatch) return;

    if (!roomId.trim() || !roomPass.trim()) {
      toast.error("Room ID dan Password wajib diisi!");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(
        `/api/tournaments/${tournamentId}/bracket/${selectedMatch.id}/room`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            room_id: roomId.trim(),
            room_pass: roomPass.trim(),
          }),
        }
      );

      const json = await res.json();

      if (!json.success) {
        toast.error(json.error?.message || "Gagal mengatur room.");
        return;
      }

      toast.success("Room ID & Password berhasil disimpan!");
      setSelectedMatch(null);
      await loadData();
    } catch (err) {
      console.error("Submit room error:", err);
      toast.error("Gagal mengatur room.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-zinc-400">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-3" />
        <p className="text-xs">Memuat bagan turnamen...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Unified Tab Bar & Header Konteks Turnamen */}
      <TournamentAdminNav
        tournamentId={tournamentId}
        tournamentName={tournament?.nama}
        format={tournament?.format || "lone_wolf_1v1"}
        slug={tournament?.slug}
        status={tournament?.status}
      />

      {/* Header Turnamen & Aksi Seeding */}
      <div className="card-glow card-glow-hover bg-zinc-950 p-6 rounded-2xl border border-zinc-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider font-heading uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30">
              King of By One (1v1)
            </span>
            <span className="text-xs text-zinc-500">• First to 5 Rounds</span>
          </div>
          <h1 className="font-heading text-xl text-white font-bold tracking-tight">
            {tournament?.nama || "Kelola Bagan Pertandingan"}
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Peserta Terverifikasi:{" "}
            <span className="text-emerald-400 font-bold font-mono">
              {verifiedCount}
            </span>{" "}
            / {tournament?.max_teams || 32} Slot
          </p>
        </div>

        <button
          onClick={handleGenerateBracket}
          disabled={isGenerating || verifiedCount < 2}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isGenerating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Shuffle className="w-4 h-4" />
          )}
          {brackets.length > 0 ? "Kocok Ulang Bagan" : "Kocok & Buat Bagan"}
        </button>
      </div>

      {/* Visual Bracket */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
            Struktur Pohon Eliminasi (Klik Pertandingan untuk Input Skor/Room)
          </h2>
          <span className="text-[11px] text-zinc-500">
            Total Matches: {brackets.length}
          </span>
        </div>

        <TournamentBracketView
          brackets={brackets}
          isAdmin={true}
          onSelectMatch={handleSelectMatch}
        />
      </div>

      {/* Modal Input Skor / Atur Room */}
      {selectedMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="card-glow bg-zinc-950 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-5">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div>
                <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider">
                  {selectedMatch.round_name} • Match #{selectedMatch.match_number}
                </span>
                <h3 className="font-heading text-lg font-bold text-white mt-0.5">
                  Kelola Pertandingan 1v1
                </h3>
              </div>
              <button
                onClick={() => setSelectedMatch(null)}
                className="text-zinc-500 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Duel Header */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-zinc-900/60 rounded-xl border border-zinc-800/80 text-center">
              <div>
                <span className="text-[10px] text-zinc-500 uppercase">Player 1</span>
                <div className="text-sm font-bold text-white truncate mt-0.5">
                  {selectedMatch.player1?.nama || "Belum Ditentukan"}
                </div>
              </div>
              <div className="border-l border-zinc-800 pl-3">
                <span className="text-[10px] text-zinc-500 uppercase">Player 2</span>
                <div className="text-sm font-bold text-white truncate mt-0.5">
                  {selectedMatch.player2?.nama || "Belum Ditentukan"}
                </div>
              </div>
            </div>

            {/* Tab Pilihan: Input Skor vs Atur Room */}
            <div className="flex border-b border-zinc-800">
              <button
                type="button"
                onClick={() => setActiveModalTab("score")}
                className={`flex-1 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                  activeModalTab === "score"
                    ? "border-amber-500 text-amber-400"
                    : "border-transparent text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Input Skor (Pemenang)
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab("room")}
                className={`flex-1 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                  activeModalTab === "room"
                    ? "border-blue-500 text-blue-400"
                    : "border-transparent text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Atur Room ID & Pass
              </button>
            </div>

            {/* Tab 1: Form Input Skor */}
            {activeModalTab === "score" ? (
              <form onSubmit={handleSubmitScore} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">
                      Ronde Menang:{" "}
                      <span className="text-white font-bold">
                        {selectedMatch.player1?.nama || "P1"}
                      </span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="15"
                      value={scoreP1}
                      onChange={(e) => setScoreP1(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-center text-xl font-bold font-mono text-white focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">
                      Ronde Menang:{" "}
                      <span className="text-white font-bold">
                        {selectedMatch.player2?.nama || "P2"}
                      </span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="15"
                      value={scoreP2}
                      onChange={(e) => setScoreP2(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-center text-xl font-bold font-mono text-white focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">
                    URL Screenshot Hasil Pertandingan (Opsional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={screenshotUrl}
                    onChange={(e) => setScreenshotUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-300">
                  ⚡ Pemenang dengan skor ronde lebih tinggi otomatis dimajukan
                  ke babak berikutnya di bagan turnamen.
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedMatch(null)}
                    className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs uppercase tracking-wider rounded-xl transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? "Menyimpan..." : "Simpan & Loloskan Pemenang"}
                  </button>
                </div>
              </form>
            ) : (
              /* Tab 2: Form Atur Room ID & Password */
              <form onSubmit={handleSubmitRoom} className="space-y-4">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">
                    Room ID Free Fire <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 84920412"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">
                    Password Room <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 1234"
                    value={roomPass}
                    onChange={(e) => setRoomPass(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedMatch(null)}
                    className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? "Menyimpan..." : "Simpan & Buka Room"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
