"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Shield,
  UserPlus,
  Mail,
  Phone,
  Trash2,
  Clock,
  CheckCircle2,
  Loader2,
  AlertCircle,
  MessageCircle,
  Sparkles,
  Users,
} from "lucide-react";

interface StaffItem {
  id: string;
  role: string;
  status?: string;
  created_at: string;
  users: {
    id: string;
    nama: string;
    email: string;
    no_wa: string;
  };
}

interface StaffManagementClientProps {
  tournamentId: string;
  tournamentName: string;
  currentUserId: string;
  myRole: string;
  initialStaff: StaffItem[];
}

export function StaffManagementClient({
  tournamentId,
  tournamentName,
  currentUserId,
  myRole,
  initialStaff,
}: StaffManagementClientProps) {
  const router = useRouter();
  const [staffList, setStaffList] = useState<StaffItem[]>(initialStaff);
  const [emailOrWa, setEmailOrWa] = useState("");
  const [selectedRole, setSelectedRole] = useState<"panitia" | "admin">("panitia");
  const [isSending, setIsSending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isOwner = myRole === "owner";

  // Kirim Undangan Staf Baru
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrWa.trim()) {
      toast.error("Masukkan alamat email atau nomor WhatsApp pengguna.");
      return;
    }

    try {
      setIsSending(true);

      const res = await fetch(`/api/tournaments/${tournamentId}/staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailOrWa: emailOrWa.trim(),
          role: selectedRole,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Gagal mengirimkan undangan.");
      }

      toast.success(json.message || "Undangan panitia berhasil dikirim!");
      setEmailOrWa("");
      router.refresh();

      // Refresh data staf lokal
      const updatedRes = await fetch(`/api/tournaments/${tournamentId}/staff`);
      const updatedJson = await updatedRes.json();
      if (updatedJson.success && updatedJson.data) {
        setStaffList(updatedJson.data);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      toast.error(msg);
    } finally {
      setIsSending(false);
    }
  };

  // Hapus / Copot Staf
  const handleDeleteStaff = async (staffId: string, staffName: string) => {
    const confirmDelete = window.confirm(
      `Apakah Anda yakin ingin membatalkan/mencopot ${staffName} dari kepanitiaan turnamen ini?`
    );
    if (!confirmDelete) return;

    try {
      setDeletingId(staffId);

      const res = await fetch(
        `/api/tournaments/${tournamentId}/staff?staffId=${staffId}`,
        { method: "DELETE" }
      );

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Gagal menghapus staf.");
      }

      toast.success(json.message || "Staf berhasil dihapus.");
      setStaffList((prev) => prev.filter((s) => s.id !== staffId));
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      toast.error(msg);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. Formulir Undang Panitia Baru */}
      <section className="card-glow card-glow-hover rounded-2xl p-6 sm:p-7 transition-all relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-zinc-800">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-display">
                Undang Pengguna Menjadi Panitia / Staf
              </h2>
              <p className="text-xs text-zinc-400">
                Kirim permintaan resmi kepada pengguna terdaftar. User dapat menerima atau menolak undangan di dashboard mereka.
              </p>
            </div>
          </div>

          <form onSubmit={handleInvite} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Input Email / No WA */}
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  Email atau Nomor WhatsApp Pengguna <span className="text-[#DA292A]">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                  <input
                    type="text"
                    value={emailOrWa}
                    onChange={(e) => setEmailOrWa(e.target.value)}
                    placeholder="Contoh: user@gmail.com atau 08123456789"
                    className="w-full h-11 pl-10 pr-4 rounded-xl bg-[#141416] border border-zinc-800 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors outline-none"
                  />
                </div>
                <p className="text-[11px] text-zinc-500">
                  Target pengguna harus sudah mendaftarkan akun di Arena Tempur.
                </p>
              </div>

              {/* Pilihan Peran */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Tugaskan Sebagai
                </label>
                <div className="grid grid-cols-2 gap-2 h-11">
                  <button
                    type="button"
                    onClick={() => setSelectedRole("panitia")}
                    className={`rounded-xl text-xs font-bold transition-all border ${
                      selectedRole === "panitia"
                        ? "bg-[#DA292A]/20 border-[#DA292A] text-white shadow-sm shadow-[#DA292A]/30"
                        : "bg-[#141416] border-zinc-800 text-zinc-400 hover:text-white"
                    }`}
                  >
                    Panitia / Wasit
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRole("admin")}
                    className={`rounded-xl text-xs font-bold transition-all border ${
                      selectedRole === "admin"
                        ? "bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm shadow-amber-500/20"
                        : "bg-[#141416] border-zinc-800 text-zinc-400 hover:text-white"
                    }`}
                  >
                    Admin
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSending || !emailOrWa.trim()}
                className="h-10 px-5 rounded-xl font-bold text-xs uppercase tracking-wider chamfer-btn bg-amber-500 hover:bg-amber-400 text-zinc-950 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Mengirim Undangan...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 stroke-[2.5]" />
                    Kirim Permintaan Jadi Panitia
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* 2. Daftar Panitia & Staf Saat Ini */}
      <section className="card-glow card-glow-hover rounded-2xl p-6 sm:p-7 transition-all space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-2 pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <Shield className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-bold text-white font-display">
              Staf Turnamen Terdaftar ({staffList.length})
            </h3>
          </div>
          <span className="text-xs text-zinc-400">
            Turnamen: <strong className="text-white">{tournamentName}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {staffList.map((st) => {
            const isSelf = st.users?.id === currentUserId;
            const isStaffOwner = st.role === "owner";
            const isPending = st.status === "pending";
            const cleanWa = st.users?.no_wa?.replace(/[^0-9]/g, "");
            const waLink = cleanWa
              ? `https://wa.me/${cleanWa.startsWith("0") ? "62" + cleanWa.slice(1) : cleanWa}`
              : null;

            return (
              <div
                key={st.id}
                className="card-glow card-glow-hover p-4 rounded-xl transition-all flex flex-col justify-between gap-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center font-black text-amber-500 text-sm shrink-0">
                      {st.users?.nama?.slice(0, 2).toUpperCase() || "US"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-white">
                          {st.users?.nama || "Pengguna"}
                        </p>
                        {isSelf && (
                          <span className="text-[10px] font-bold text-zinc-400 bg-zinc-800 px-1.5 py-0.2 rounded">
                            Anda
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 flex items-center gap-1.5 mt-0.5">
                        <Mail className="w-3 h-3 text-zinc-500" />
                        {st.users?.email}
                      </p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {isPending ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Menunggu User
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Aktif
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer Info & Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-zinc-800/60 text-xs text-zinc-400">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#DA292A]/10 text-[#EF3839] border border-[#DA292A]/20">
                      {st.role}
                    </span>

                    {waLink && (
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors"
                        title="Hubungi via WhatsApp"
                      >
                        <MessageCircle className="w-3 h-3" />
                        WA
                      </a>
                    )}
                  </div>

                  {/* Tombol Hapus (Hanya Owner yang bisa menghapus selain dirinya) */}
                  {isOwner && !isStaffOwner && (
                    <button
                      type="button"
                      disabled={deletingId === st.id}
                      onClick={() => handleDeleteStaff(st.id, st.users?.nama || "Staf")}
                      className="text-zinc-500 hover:text-red-400 p-1 rounded transition-colors disabled:opacity-50 cursor-pointer"
                      title={isPending ? "Batalkan Undangan" : "Copot Staf"}
                    >
                      {deletingId === st.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-red-400" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
