"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Edit3,
  Trash2,
  Loader2,
  X,
  Check,
  AlertTriangle,
  Shield,
  Settings,
} from "lucide-react";

interface TeamHeaderActionsProps {
  teamId: string;
  initialTeamName: string;
  initialLogoUrl?: string | null;
  tournamentName?: string;
  isCaptain: boolean;
  isStaff?: boolean;
  isTournamentClosed: boolean;
  redirectOnDelete?: boolean;
  iconOnly?: boolean;
}

export default function TeamHeaderActions({
  teamId,
  initialTeamName,
  initialLogoUrl,
  tournamentName,
  isCaptain,
  isStaff = false,
  isTournamentClosed,
  redirectOnDelete = true,
  iconOnly = true,
}: TeamHeaderActionsProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [teamName, setTeamName] = useState(initialTeamName);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newName, setNewName] = useState(initialTeamName);
  const [newLogoUrl, setNewLogoUrl] = useState(initialLogoUrl || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);


  const canManage = isCaptain || isStaff;
  const canDelete = canManage && (!isTournamentClosed || isStaff);

  const handleOpenEdit = () => {
    setNewName(teamName);
    setNewLogoUrl(initialLogoUrl || "");
    setEditError(null);
    setShowEditModal(true);
  };

  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newName.trim();

    if (cleanName.length < 3 || cleanName.length > 30) {
      setEditError("Nama tim minimal 3 karakter dan maksimal 30 karakter.");
      return;
    }

    if (!/^[a-zA-Z0-9 _\-]+$/.test(cleanName)) {
      setEditError(
        "Nama tim hanya boleh huruf, angka, spasi, tanda minus (-), dan underscore (_)."
      );
      return;
    }

    try {
      setIsSaving(true);
      setEditError(null);

      const res = await fetch(`/api/teams/${teamId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama: cleanName,
          logo_url: newLogoUrl.trim() || "",
        }),
      });

      const json = await res.json();

      if (!json.success) {
        const errorMsg = json.error?.message || "Gagal memperbarui data tim.";
        setEditError(errorMsg);
        toast.error(errorMsg);
        return;
      }

      toast.success(json.data?.message || "Nama tim berhasil diubah!");
      setTeamName(cleanName);
      setShowEditModal(false);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan internal";
      setEditError(msg);
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }

  };

  const handleDeleteTeam = async () => {
    const confirmed = window.confirm(
      `PERINGATAN: Apakah Anda yakin ingin menghapus / membubarkan tim "${teamName}"?\n\nSeluruh data pendaftaran, anggota roster, dan riwayat undangan akan dihapus secara permanen.`
    );
    if (!confirmed) return;

    try {
      setIsDeleting(true);

      const res = await fetch(`/api/teams/${teamId}`, {
        method: "DELETE",
      });

      const json = await res.json();

      if (!json.success) {
        toast.error(json.error?.message || "Gagal menghapus tim.");
        return;
      }

      toast.success(json.data?.message || `Tim "${teamName}" berhasil dihapus.`);

      if (redirectOnDelete) {
        router.push("/dashboard");
      } else {
        router.refresh();
      }
    } catch (err) {
      console.error("Delete team error:", err);
      toast.error("Terjadi kesalahan sistem saat menghapus tim.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!canManage) return null;

  return (
    <>
      <div className="flex items-center gap-1.5">
        {/* Tombol Edit Nama Tim */}
        <button
          type="button"
          onClick={handleOpenEdit}
          className={`${
            iconOnly ? "p-1.5" : "px-2.5 py-1.5"
          } rounded-lg bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 hover:border-zinc-700 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer`}
          title="Edit Nama Tim"
          aria-label="Edit Nama Tim"
        >
          <Edit3 className="w-3.5 h-3.5 text-amber-500" />
          {!iconOnly && <span>Edit Tim</span>}
        </button>

        {/* Tombol Hapus Tim */}
        {canDelete && (
          <button
            type="button"
            disabled={isDeleting}
            onClick={handleDeleteTeam}
            className={`${
              iconOnly ? "p-1.5" : "px-2.5 py-1.5"
            } rounded-lg bg-zinc-900/90 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 border border-zinc-800 hover:border-red-500/30 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer`}
            title="Bubarkan / Hapus Tim"
            aria-label="Bubarkan / Hapus Tim"
          >
            {isDeleting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
            {!iconOnly && <span>Hapus Tim</span>}
          </button>
        )}
      </div>

      {/* Modal Edit Nama Tim */}
      {mounted && showEditModal && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowEditModal(false);
          }}
        >
          <div className="relative w-full max-w-md p-6 rounded-2xl bg-[#141417] border border-zinc-700 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Edit Informasi Tim</h3>
                  <p className="text-[11px] text-zinc-400">
                    {tournamentName ? `Turnamen: ${tournamentName}` : "Ubah nama atau logo tim"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveTeam} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Nama Tim / Alias <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  disabled={isSaving}
                  autoFocus
                  placeholder="Contoh: GARUDA REBORN"
                  className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-700 focus:border-amber-500 rounded-xl text-sm text-white placeholder:text-zinc-500 focus:outline-none transition-colors"
                />
                <p className="text-[11px] text-zinc-500 mt-1">
                  Maksimal 30 karakter. Huruf, angka, spasi, minus, dan garis bawah.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  URL Logo Tim <span className="text-zinc-500">(Opsional)</span>
                </label>
                <input
                  type="url"
                  value={newLogoUrl}
                  onChange={(e) => setNewLogoUrl(e.target.value)}
                  disabled={isSaving}
                  placeholder="https://.../logo.png"
                  className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-700 focus:border-amber-500 rounded-xl text-sm text-white placeholder:text-zinc-500 focus:outline-none transition-colors"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-xs shadow-md shadow-amber-500/20 inline-flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Simpan Perubahan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

