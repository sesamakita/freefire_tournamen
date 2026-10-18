"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus,
  KeyRound,
  Users,
  Calendar,
  Clock,
  Loader2,
  Check,
  RotateCw,
  Trophy,
} from "lucide-react";

interface MatchManagementClientProps {
  tournamentId: string;
  matches: any[];
  approvedTeams: any[];
}

export default function MatchManagementClient({
  tournamentId,
  matches,
  approvedTeams,
}: MatchManagementClientProps) {
  const router = useRouter();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeRoomMatch, setActiveRoomMatch] = useState<any | null>(null);
  const [activeSlotMatch, setActiveSlotMatch] = useState<any | null>(null);

  // Form Buat Match
  const [namaMatch, setNamaMatch] = useState("");
  const [roundMatch, setRoundMatch] = useState(1);
  const [grupMatch, setGrupMatch] = useState("");
  const [jadwalMatch, setJadwalMatch] = useState("");
  const [isSubmittingMatch, setIsSubmittingMatch] = useState(false);

  // Form Atur Room
  const [roomId, setRoomId] = useState("");
  const [roomPass, setRoomPass] = useState("");
  const [rotasiAlasan, setRotasiAlasan] = useState("");
  const [isSubmittingRoom, setIsSubmittingRoom] = useState(false);

  // Form Slotting Tim (1..12)
  const [selectedSlots, setSelectedSlots] = useState<{ [slot: number]: string }>({});
  const [isSubmittingSlots, setIsSubmittingSlots] = useState(false);

  const handleCreateMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmittingMatch(true);
      const res = await fetch(`/api/tournaments/${tournamentId}/matches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama: namaMatch,
          round: roundMatch,
          grup: grupMatch || undefined,
          jadwal: new Date(jadwalMatch).toISOString(),
        }),
      });

      const json = await res.json();
      if (!json.success) {
        toast.error(json.error?.message || "Gagal membuat match.");
        return;
      }

      toast.success(`Match "${namaMatch}" berhasil dijadwalkan!`);
      setShowCreateModal(false);
      setNamaMatch("");
      setRoundMatch(1);
      setGrupMatch("");
      setJadwalMatch("");
      router.refresh();
    } catch (err) {
      console.error("Create match error:", err);
      toast.error("Terjadi kesalahan sistem.");
    } finally {
      setIsSubmittingMatch(false);
    }
  };

  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRoomMatch) return;

    try {
      setIsSubmittingRoom(true);
      const res = await fetch(
        `/api/tournaments/${tournamentId}/matches/${activeRoomMatch.id}/room`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            room_id: roomId,
            room_pass: roomPass,
            rotasi_alasan: rotasiAlasan || undefined,
          }),
        }
      );

      const json = await res.json();
      if (!json.success) {
        toast.error(json.error?.message || "Gagal menyimpan Room ID.");
        return;
      }

      toast.success(json.data?.message || "Room ID berhasil disimpan!");
      setActiveRoomMatch(null);
      setRoomId("");
      setRoomPass("");
      setRotasiAlasan("");
      router.refresh();
    } catch (err) {
      console.error("Save room error:", err);
      toast.error("Terjadi kesalahan sistem.");
    } finally {
      setIsSubmittingRoom(false);
    }
  };

  const openSlottingModal = (match: any) => {
    setActiveSlotMatch(match);
    const existing: { [slot: number]: string } = {};
    (match.match_teams || []).forEach((mt: any) => {
      existing[mt.slot] = mt.team_id;
    });
    setSelectedSlots(existing);
  };

  const handleSaveSlots = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSlotMatch) return;

    const slotsArray = Object.entries(selectedSlots)
      .filter(([_, teamId]) => Boolean(teamId))
      .map(([slotStr, teamId]) => ({
        slot: parseInt(slotStr, 10),
        team_id: teamId,
      }));

    if (slotsArray.length === 0) {
      toast.error("Pilih minimal 1 tim ke dalam slot.");
      return;
    }

    try {
      setIsSubmittingSlots(true);
      const res = await fetch(
        `/api/tournaments/${tournamentId}/matches/${activeSlotMatch.id}/slots`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slots: slotsArray }),
        }
      );

      const json = await res.json();
      if (!json.success) {
        toast.error(json.error?.message || "Gagal menyimpan slotting tim.");
        return;
      }

      toast.success(json.data?.message || "Slotting peserta berhasil disimpan!");
      setActiveSlotMatch(null);
      router.refresh();
    } catch (err) {
      console.error("Save slots error:", err);
      toast.error("Terjadi kesalahan sistem.");
    } finally {
      setIsSubmittingSlots(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Calendar className="w-4 h-4 text-amber-500" />
          Daftar Match Pertandingan ({matches.length})
        </h2>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-xs shadow-md shadow-amber-500/20 inline-flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Match Baru</span>
        </button>
      </div>

      {/* Matches Grid / Table */}
      <div className="space-y-4">
        {matches.map((m: any) => {
          const slottedCount = m.match_teams?.length || 0;
          return (
            <div
              key={m.id}
              className="p-5 bg-zinc-900/80 border border-zinc-800 rounded-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-base text-white tracking-tight">
                    {m.nama}
                  </h3>
                  <span className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] font-semibold text-zinc-300">
                    Round {m.round}
                  </span>
                  {m.grup && (
                    <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-semibold">
                      {m.grup}
                    </span>
                  )}
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                      m.status === "selesai"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : m.status === "ongoing"
                        ? "bg-amber-500/20 text-amber-400 animate-pulse"
                        : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {m.status}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-zinc-500" />
                  <span>
                    {new Date(m.jadwal).toLocaleDateString("id-ID", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    WIB
                  </span>
                  <span>&bull;</span>
                  <span className="text-amber-400 font-semibold">{slottedCount} / 12 Tim Ter-plot</span>
                </p>
                {m.room_id && (
                  <p className="text-[11px] text-zinc-400 font-mono mt-1">
                    Room: <span className="text-white font-bold">{m.room_id}</span> &bull; Pass: <span className="text-amber-400 font-bold">{m.room_pass}</span>
                  </p>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openSlottingModal(m)}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Plot Slot Tim ({slottedCount}/12)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveRoomMatch(m);
                    setRoomId(m.room_id || "");
                    setRoomPass(m.room_pass || "");
                  }}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-400 text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>{m.room_id ? "Rotasi Room ID" : "Set Room ID"}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal 1: Buat Match Baru */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Buat Match Pertandingan Baru</h3>
            <form onSubmit={handleCreateMatch} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Nama Match *</label>
                <input
                  type="text"
                  placeholder="Contoh: Match 1 - Map Bermuda"
                  value={namaMatch}
                  onChange={(e) => setNamaMatch(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Round *</label>
                  <input
                    type="number"
                    min={1}
                    value={roundMatch}
                    onChange={(e) => setRoundMatch(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100"
                    required
                  />
                </div>
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Grup (Opsional)</label>
                  <input
                    type="text"
                    placeholder="Grup A / Final"
                    value={grupMatch}
                    onChange={(e) => setGrupMatch(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Jadwal Pertandingan *</label>
                <input
                  type="datetime-local"
                  value={jadwalMatch}
                  onChange={(e) => setJadwalMatch(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 text-zinc-400 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingMatch}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold"
                >
                  {isSubmittingMatch ? "Menyimpan..." : "Simpan Match"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Atur / Rotasi Room ID (SCR-M02) */}
      {activeRoomMatch && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-500" />
                {activeRoomMatch.room_id ? "Rotasi Room ID" : "Atur Room ID & Password"}
              </h3>
              <p className="text-xs text-zinc-400 mt-1">Match: {activeRoomMatch.nama}</p>
            </div>

            <form onSubmit={handleSaveRoom} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Room ID *</label>
                <input
                  type="text"
                  placeholder="Contoh: 1234567"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Password Room *</label>
                <input
                  type="text"
                  placeholder="Contoh: FF2026"
                  value={roomPass}
                  onChange={(e) => setRoomPass(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 font-mono"
                  required
                />
              </div>

              {activeRoomMatch.room_id && (
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Alasan Rotasi Room (Audit Log)</label>
                  <input
                    type="text"
                    placeholder="Contoh: Terjadi kendala teknis / penyusup masuk"
                    value={rotasiAlasan}
                    onChange={(e) => setRotasiAlasan(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setActiveRoomMatch(null)}
                  className="px-3 py-1.5 text-zinc-400 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRoom}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold"
                >
                  {isSubmittingRoom ? "Menyimpan..." : "Simpan Room ID"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Slotting Tim (1..12) */}
      {activeSlotMatch && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-500" />
                Plotting Slot Peserta: {activeSlotMatch.nama}
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Pilih tim yang sudah disetujui (Approved) untuk menempati Slot 1 sampai 12.
              </p>
            </div>

            <form onSubmit={handleSaveSlots} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((slotNum) => (
                  <div key={slotNum} className="p-2 bg-zinc-950 border border-zinc-800 rounded-xl space-y-1">
                    <label className="text-[11px] font-bold text-amber-400">
                      Slot #{slotNum}
                    </label>
                    <select
                      value={selectedSlots[slotNum] || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedSlots((prev) => ({
                          ...prev,
                          [slotNum]: val,
                        }));
                      }}
                      className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200"
                    >
                      <option value="">-- Kosongkan Slot --</option>
                      {approvedTeams.map((team: any) => (
                        <option key={team.id} value={team.id}>
                          {team.nama}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setActiveSlotMatch(null)}
                  className="px-3 py-1.5 text-zinc-400 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSlots}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold"
                >
                  {isSubmittingSlots ? "Menyimpan Slot..." : "Simpan Slotting Tim"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
