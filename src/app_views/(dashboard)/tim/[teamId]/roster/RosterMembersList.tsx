"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Users,
  Edit2,
  Trash2,
  Loader2,
  X,
  Check,
  Shield,
  AlertCircle,
  UserCheck,
} from "lucide-react";

export interface RosterMemberItem {
  id: string;
  user_id: string;
  ign: string;
  uid_game: string;
  role_tim: string;
  is_substitute: boolean;
  created_at: string;
  users?: {
    nama?: string;
    email?: string;
  };
}

interface RosterMembersListProps {
  teamId: string;
  captainUserId: string;
  currentUserId: string;
  isCaptain: boolean;
  isStaff?: boolean;
  isTournamentClosed: boolean;
  isLoneWolf: boolean;
  members: RosterMemberItem[];
}

export default function RosterMembersList({
  teamId,
  captainUserId,
  currentUserId,
  isCaptain,
  isStaff = false,
  isTournamentClosed,
  isLoneWolf,
  members: initialMembers,
}: RosterMembersListProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [members, setMembers] = useState<RosterMemberItem[]>(initialMembers);
  const [editingMember, setEditingMember] = useState<RosterMemberItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);


  // Form Edit State
  const [editIgn, setEditIgn] = useState("");
  const [editUid, setEditUid] = useState("");
  const [editRole, setEditRole] = useState("rusher");
  const [editIsSubstitute, setEditIsSubstitute] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const openEditModal = (member: RosterMemberItem) => {
    setEditingMember(member);
    setEditIgn(member.ign);
    setEditUid(member.uid_game);
    setEditRole(member.role_tim || "rusher");
    setEditIsSubstitute(Boolean(member.is_substitute));
    setEditError(null);
  };

  const closeEditModal = () => {
    setEditingMember(null);
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;

    // Client-side validations
    const cleanIgn = editIgn.trim();
    const cleanUid = editUid.trim();

    if (cleanIgn.length < 3 || cleanIgn.length > 20) {
      setEditError("IGN minimal 3 karakter dan maksimal 20 karakter.");
      return;
    }

    if (!/^[0-9]{8,12}$/.test(cleanUid)) {
      setEditError("Game Player UID harus 8–12 digit angka.");
      return;
    }

    try {
      setIsSaving(true);
      setEditError(null);

      const res = await fetch(`/api/teams/${teamId}/members/${editingMember.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ign: cleanIgn,
          uid_game: cleanUid,
          role_tim: isLoneWolf ? "rusher" : editRole,
          is_substitute: isLoneWolf ? false : editIsSubstitute,
        }),
      });

      const json = await res.json();

      if (!json.success) {
        const errorMsg = json.error?.message || "Gagal memperbarui data pemain.";
        setEditError(errorMsg);
        toast.error(errorMsg);
        return;
      }

      toast.success(json.data?.message || "Data peserta berhasil diperbarui!");

      // Update data di state lokal
      setMembers((prev) =>
        prev.map((m) =>
          m.id === editingMember.id
            ? {
                ...m,
                ign: cleanIgn,
                uid_game: cleanUid,
                role_tim: isLoneWolf ? "rusher" : editRole,
                is_substitute: isLoneWolf ? false : editIsSubstitute,
              }
            : m
        )
      );

      closeEditModal();
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan internal";
      setEditError(msg);
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }

  };

  const handleDeleteMember = async (member: RosterMemberItem) => {
    const confirmed = window.confirm(
      `Apakah Anda yakin ingin mengeluarkan "${member.ign}" (UID: ${member.uid_game}) dari tim? Slot roster akan kembali terbuka.`
    );
    if (!confirmed) return;

    try {
      setDeletingId(member.id);

      const res = await fetch(`/api/teams/${teamId}/members/${member.id}`, {
        method: "DELETE",
      });

      const json = await res.json();

      if (!json.success) {
        toast.error(json.error?.message || "Gagal mengeluarkan pemain.");
        return;
      }

      toast.success(json.data?.message || `Pemain "${member.ign}" berhasil dikeluarkan.`);

      // Hapus dari state lokal
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
      router.refresh();
    } catch (err) {
      console.error("Delete member error:", err);
      toast.error("Terjadi kesalahan sistem saat mengeluarkan pemain.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <div className="card-glow card-glow-hover p-6 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm text-white uppercase flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-500" />
            {isLoneWolf ? "Profil Peserta 1v1" : "Susunan Roster Tim"}
          </h2>
          <span className="text-xs text-zinc-400">
            {isLoneWolf ? "Duel Solo" : `${members.length} Pemain Terdaftar`}
          </span>
        </div>

        <div className="divide-y divide-zinc-800/80">
          {members.map((member, index) => {
            const isMemberCaptain = member.user_id === captainUserId;
            const isCurrentUsersMember = member.user_id === currentUserId;
            const canEdit =
              !isTournamentClosed && (isCaptain || isCurrentUsersMember || isStaff);
            const canDelete =
              !isTournamentClosed &&
              (isCaptain || isStaff) &&
              !isMemberCaptain;

            return (
              <div
                key={member.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400 shrink-0">
                    #{index + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-white tracking-tight">
                        {member.ign}
                      </p>
                      {isLoneWolf ? (
                        <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[11px] font-bold">
                          Fighter 1v1
                        </span>
                      ) : (
                        <>
                          {isMemberCaptain && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[11px] font-bold">
                              Kapten
                            </span>
                          )}
                          {member.is_substitute && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[11px] font-bold">
                              Cadangan
                            </span>
                          )}
                        </>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      UID FF:{" "}
                      <span className="text-zinc-300 font-mono font-semibold">
                        {member.uid_game}
                      </span>{" "}
                      &bull; Akun: {member.users?.nama || member.users?.email || "-"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  {/* Role Badge */}
                  <div className="text-xs">
                    {isLoneWolf ? (
                      <span className="px-2.5 py-1 rounded-md bg-blue-500/10 border border-blue-500/30 text-blue-400 font-semibold uppercase tracking-wider text-[11px]">
                        Solo Duel
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-md bg-zinc-800 text-zinc-300 font-semibold uppercase tracking-wider text-[11px]">
                        {member.role_tim}
                      </span>
                    )}
                  </div>

                  {/* Tombol Aksi: Edit & Keluarkan */}
                  <div className="flex items-center gap-1.5 ml-2">
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => openEditModal(member)}
                        className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700/60 hover:border-zinc-600 transition-colors cursor-pointer"
                        title="Edit Data Peserta (IGN & UID FF)"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {canDelete && (
                      <button
                        type="button"
                        disabled={deletingId === member.id}
                        onClick={() => handleDeleteMember(member)}
                        className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 border border-zinc-700/60 hover:border-red-500/30 transition-colors disabled:opacity-50 cursor-pointer"
                        title="Keluarkan peserta ini dari tim"
                      >
                        {deletingId === member.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal Edit Peserta via createPortal */}
      {mounted && editingMember && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeEditModal();
          }}
        >
          <div className="relative w-full max-w-md p-6 rounded-2xl bg-[#141417] border border-zinc-700 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Edit Data Peserta</h3>
                  <p className="text-[11px] text-zinc-400">
                    Perbarui nama in-game (IGN) atau nomor Game Player UID
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-4">
              {/* IGN */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  IGN (In-Game Name) <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={editIgn}
                  onChange={(e) => setEditIgn(e.target.value)}
                  disabled={isSaving}
                  autoFocus
                  placeholder="Contoh: GRD・Sniper"
                  className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-700 focus:border-amber-500 rounded-xl text-sm text-white placeholder:text-zinc-500 focus:outline-none transition-colors"
                />
              </div>

              {/* Game Player UID */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Game Player UID (8–12 Digit) <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={editUid}
                  onChange={(e) => setEditUid(e.target.value)}
                  disabled={isSaving}
                  placeholder="Contoh: 123456789"
                  className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-700 focus:border-amber-500 rounded-xl text-sm text-white font-mono placeholder:text-zinc-500 focus:outline-none transition-colors"
                />
              </div>

              {/* Role & Cadangan (Khusus Battle Royale) */}
              {!isLoneWolf && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Peran di Tim
                    </label>
                    <select
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value)}
                      disabled={isSaving}
                      className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-700 focus:border-amber-500 rounded-xl text-sm text-white focus:outline-none transition-colors"
                    >
                      <option value="rusher">Rusher</option>
                      <option value="sniper">Sniper</option>
                      <option value="support">Support</option>
                      <option value="igl">IGL</option>
                      <option value="cadangan">Cadangan</option>
                    </select>
                  </div>

                  {editingMember.user_id !== captainUserId && (
                    <div className="pt-1">
                      <label className="flex items-center gap-2.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={editIsSubstitute}
                          onChange={(e) => setEditIsSubstitute(e.target.checked)}
                          disabled={isSaving}
                          className="rounded border-zinc-700 bg-zinc-900 text-amber-500 focus:ring-amber-500"
                        />
                        <span className="text-xs text-zinc-300">
                          Jadikan sebagai Pemain Cadangan (Substitute)
                        </span>
                      </label>
                    </div>
                  )}
                </>
              )}

              {/* Tombol Aksi Modal */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={closeEditModal}
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

