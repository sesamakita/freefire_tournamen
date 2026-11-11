"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { KeyRound, Lock, Eye, Copy, Check, Clock, Loader2, AlertCircle, Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface RoomCardProps {
  tournamentId: string;
  matchId: string;
  matchNama: string;
  jadwal: string;
  slotNumber?: number;
}

export default function RoomCard({
  tournamentId,
  matchId,
  matchNama,
  jadwal,
  slotNumber,
}: RoomCardProps) {
  const [roomData, setRoomData] = useState<{
    room_id: string;
    room_pass: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [hasCopied, setHasCopied] = useState(false);
  const [timeUntilOpen, setTimeUntilOpen] = useState<number | null>(null);

  const matchTime = new Date(jadwal).getTime();
  const openTime = matchTime - 15 * 60 * 1000; // T-15 menit

  // Timer countdown menuju T-15 menit
  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      const diff = Math.ceil((openTime - now) / 1000);
      setTimeUntilOpen(diff > 0 ? diff : 0);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [openTime]);

  // Request browser push notification permission on mount
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "default"
    ) {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // Notifikasi otomatis saat gerbang T-15 terbuka
  useEffect(() => {
    if (timeUntilOpen === 0 && !roomData) {
      if (
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        new Notification("🔔 Room ID Free Fire Dibuka!", {
          body: `Room ID untuk match ${matchNama} telah dibuka. Segera salin dan masuk custom room!`,
          icon: "/favicon.ico",
        });
      }
      toast.info(`Room ${matchNama} telah dibuka! Silakan ambil Room ID sekarang.`);
    }
  }, [timeUntilOpen, roomData, matchNama]);

  // Realtime subscription untuk mendeteksi rotasi room ID atau perubahan jadwal dari wasit
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`match-room-${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "matches",
          filter: `id=eq.${matchId}`,
        },
        (payload: any) => {
          if (payload.new) {
            toast.warning("Panitia telah memperbarui informasi Room ID / Jadwal Match!", {
              duration: 5000,
            });
            if (
              typeof window !== "undefined" &&
              "Notification" in window &&
              Notification.permission === "granted"
            ) {
              new Notification("⚠️ Update Room dari Wasit!", {
                body: `Wasit telah memperbarui data Room ID untuk match ${matchNama}.`,
                icon: "/favicon.ico",
              });
            }
            // Auto re-fetch jika room sudah pernah dibuka sebelumnya
            if (roomData) {
              fetchRoomId();
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, roomData, matchNama]);

  const fetchRoomId = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const res = await fetch(`/api/tournaments/${tournamentId}/matches/${matchId}/room`);
      const json = await res.json();

      if (!json.success) {
        setErrorMessage(json.error?.message || "Gagal mengambil Room ID.");
        toast.error(json.error?.message || "Gagal mengambil Room ID.");
        return;
      }

      setRoomData(json.data);
      toast.success("Room ID berhasil dibuka!");
    } catch (err) {
      console.error("Room fetch error:", err);
      setErrorMessage("Terjadi kesalahan jaringan.");
      toast.error("Terjadi kesalahan sistem.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setHasCopied(true);
      toast.success(`${field} berhasil disalin!`);
      setTimeout(() => setCopiedField(null), 2500);

      // Kirim Read Receipt / Acknowledgment ke panitia
      fetch(`/api/tournaments/${tournamentId}/matches/${matchId}/room/ack`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "copy" }),
      }).catch((err) => {
        console.warn("Gagal mengirim acknowledgment salin room:", err);
      });
    } catch (err) {
      console.error("Clipboard copy error:", err);
      toast.error("Gagal menyalin ke clipboard.");
    }
  };

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const isLocked = timeUntilOpen !== null && timeUntilOpen > 0;

  return (
    <div className="p-4 bg-zinc-950/80 border border-zinc-800 rounded-xl space-y-3">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
          <KeyRound className="w-3.5 h-3.5 text-amber-500" />
          Akses Room Pertandingan
        </span>
        {slotNumber && (
          <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-[11px]">
            Slot #{slotNumber}
          </span>
        )}
      </div>

      {errorMessage && (
        <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {roomData ? (
        /* Jika Room ID berhasil dibuka */
        <div className="p-3.5 bg-zinc-900 border border-amber-500/30 rounded-xl space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
              <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Room ID Free Fire</p>
              <div className="flex items-center justify-between mt-1">
                <span className="font-mono text-base sm:text-lg font-black text-white tracking-wider select-all">
                  {roomData.room_id}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(roomData.room_id, "Room ID")}
                  className="px-2 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
                  title="Salin Room ID"
                >
                  {copiedField === "Room ID" ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Disalin</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
              <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Password Room</p>
              <div className="flex items-center justify-between mt-1">
                <span className="font-mono text-base sm:text-lg font-black text-amber-400 tracking-wider select-all">
                  {roomData.room_pass}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(roomData.room_pass, "Password")}
                  className="px-2 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
                  title="Salin Password"
                >
                  {copiedField === "Password" ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Disalin</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 pt-2 border-t border-zinc-800/80 text-[11px]">
            <p className="text-zinc-400 italic">
              ⚠️ Masuk ke room game Free Fire dan pilih <strong>Slot #{slotNumber || "sesuai panitia"}</strong>. Dilarang menyebarkan Room ID ke tim lain.
            </p>
            {hasCopied ? (
              <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                <Check className="w-3 h-3" /> Siap di Wasit
              </span>
            ) : (
              <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px]">
                <Clock className="w-3 h-3" /> Salin untuk konfirmasi
              </span>
            )}
          </div>
        </div>
      ) : isLocked ? (
        /* Jika belum T-15 menit (Time-Gated BR-ROOM-05) */
        <div className="p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-xl space-y-2 text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs text-zinc-400">
            <Lock className="w-3.5 h-3.5 text-zinc-500" />
            <span>Room ID terkunci sampai T-15 menit</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <span className="font-mono text-base font-bold text-amber-400">
              Dibuka dalam {formatCountdown(timeUntilOpen)}
            </span>
          </div>
        </div>
      ) : (
        /* Jika sudah masuk T-15 menit */
        <button
          type="button"
          onClick={fetchRoomId}
          disabled={isLoading}
          className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-xs shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Membuka Room ID...</span>
            </>
          ) : (
            <>
              <Eye className="w-3.5 h-3.5" />
              <span>Buka Room ID & Password</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
