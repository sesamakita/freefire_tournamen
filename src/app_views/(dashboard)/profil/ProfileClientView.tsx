"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  User,
  Mail,
  Phone,
  Lock,
  KeyRound,
  Shield,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  Calendar,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import {
  updateProfileSchema,
  updatePasswordSchema,
  type UpdateProfileInput,
  type UpdatePasswordInput,
} from "@/lib/validations/auth";
import { createClient } from "@/lib/supabase/client";

interface ProfileClientViewProps {
  user: {
    id: string;
    email?: string;
    created_at?: string;
  };
  profile: {
    nama: string;
    no_wa: string;
    email: string;
    created_at?: string;
  } | null;
  staffRoles: { role: string }[];
  teamsCount: number;
}

export function ProfileClientView({
  user,
  profile,
  staffRoles,
  teamsCount,
}: ProfileClientViewProps) {
  const router = useRouter();
  const supabase = createClient();

  // State for show/hide passwords
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Loading states
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Form Profile
  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    formState: { errors: profileErrors, isDirty: isProfileDirty },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      nama: profile?.nama || "",
      no_wa: profile?.no_wa || "",
    },
  });

  // Form Password
  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    reset: resetPasswordForm,
    formState: { errors: passwordErrors },
    watch: watchPassword,
  } = useForm<UpdatePasswordInput>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: {
      password_baru: "",
      konfirmasi_password: "",
    },
  });

  const newPasswordValue = watchPassword("password_baru") || "";
  const hasMinLength = newPasswordValue.length >= 8;
  const hasLetterAndNumber = /(?=.*[A-Za-z])(?=.*\d)/.test(newPasswordValue);

  // Submit Profile Changes
  const onSaveProfile = async (data: UpdateProfileInput) => {
    try {
      setIsSavingProfile(true);

      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Gagal memperbarui profil.");
      }

      toast.success("Profil berhasil diperbarui!");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      toast.error(msg);
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Submit Password Change
  const onUpdatePassword = async (data: UpdatePasswordInput) => {
    try {
      setIsUpdatingPassword(true);

      const { error } = await supabase.auth.updateUser({
        password: data.password_baru,
      });

      if (error) {
        throw new Error(error.message || "Gagal mengganti kata sandi.");
      }

      toast.success("Kata sandi berhasil diperbarui! Silakan gunakan sandi baru untuk login berikutnya.");
      resetPasswordForm();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      toast.error(msg);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Format Join Date
  const joinDate = user.created_at
    ? new Date(user.created_at).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Member Terdaftar";

  const isStaff = staffRoles && staffRoles.length > 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. Header & Identity Card */}
      <div className="card-glow card-glow-hover relative overflow-hidden rounded-2xl p-6 sm:p-8 transition-all">
        {/* Glow Accent */}
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-[#DA292A]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-[#DA292A] via-[#EF3839] to-transparent" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            {/* Avatar Circle with Logo Monogram */}
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#1A1A1E] border-2 border-[#DA292A]/50 flex items-center justify-center p-3 shadow-lg shadow-[#DA292A]/20 shrink-0">
              <Image
                src="/images/logo-monogram.svg"
                alt="Arena Tempur Avatar"
                width={56}
                height={56}
                className="w-full h-full object-contain"
              />
              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-[#121215] rounded-full" title="Online" />
            </div>

            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white truncate font-display">
                  {profile?.nama || user.email?.split("@")[0]}
                </h1>
                {isStaff ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#DA292A]/15 text-[#EF3839] border border-[#DA292A]/30">
                    <Shield className="w-3 h-3" />
                    Panitia / Wasit
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-zinc-800 text-zinc-300 border border-zinc-700">
                    <User className="w-3 h-3" />
                    Peserta Turnamen
                  </span>
                )}
              </div>

              <p className="text-xs sm:text-sm text-zinc-400 flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-zinc-500" />
                <span className="truncate">{user.email}</span>
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-1 text-[11px] text-zinc-500">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                  Bergabung sejak {joinDate}
                </span>
                <span className="text-zinc-700">•</span>
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  {teamsCount} Tim Terdaftar
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto border-t md:border-t-0 border-zinc-800 pt-4 md:pt-0">
            <div className="px-3.5 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-left">
              <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Status Keamanan</p>
              <p className="text-xs font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Terproteksi AES-256
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Grid Forms: Profil & Ganti Password */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* KIRI: Informasi Profil & Kontak */}
        <section className="card-glow card-glow-hover rounded-2xl p-6 sm:p-7 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 pb-5 border-b border-zinc-800/80">
              <div className="w-10 h-10 rounded-xl bg-[#DA292A]/10 border border-[#DA292A]/30 flex items-center justify-center text-[#EF3839]">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white font-display">Data Profil & Kontak</h2>
                <p className="text-xs text-zinc-400">Informasi identitas resmi akun dan koordinasi wasit</p>
              </div>
            </div>

            <form id="profile-form" onSubmit={handleSubmitProfile(onSaveProfile)} className="space-y-5 pt-6">
              {/* Nama Lengkap */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  Nama Lengkap <span className="text-[#DA292A]">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                  <input
                    type="text"
                    {...registerProfile("nama")}
                    placeholder="Masukkan nama lengkap Anda..."
                    className="w-full h-11 pl-10 pr-4 rounded-xl bg-[#18181C] border border-zinc-800 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-[#DA292A] focus:ring-1 focus:ring-[#DA292A]/40 transition-colors outline-none"
                  />
                </div>
                {profileErrors.nama && (
                  <p className="text-xs text-red-400 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {profileErrors.nama.message}
                  </p>
                )}
              </div>

              {/* Email (Read-Only) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                    Alamat Email
                  </label>
                  <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3" />
                    Terverifikasi
                  </span>
                </div>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 pointer-events-none" />
                  <input
                    type="email"
                    value={user.email || ""}
                    disabled
                    className="w-full h-11 pl-10 pr-4 rounded-xl bg-zinc-900/60 border border-zinc-800 text-sm text-zinc-500 cursor-not-allowed select-none"
                  />
                </div>
                <p className="text-[11px] text-zinc-500">
                  Email digunakan sebagai identitas login utama akun Anda.
                </p>
              </div>

              {/* Nomor WhatsApp */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  Nomor WhatsApp <span className="text-[#DA292A]">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                  <input
                    type="tel"
                    {...registerProfile("no_wa")}
                    placeholder="Contoh: 08123456789 atau 628123456789"
                    className="w-full h-11 pl-10 pr-4 rounded-xl bg-[#18181C] border border-zinc-800 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-[#DA292A] focus:ring-1 focus:ring-[#DA292A]/40 transition-colors outline-none"
                  />
                </div>
                {profileErrors.no_wa ? (
                  <p className="text-xs text-red-400 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {profileErrors.no_wa.message}
                  </p>
                ) : (
                  <p className="text-[11px] text-zinc-500">
                    Penting: Nomor ini digunakan panitia untuk koordinasi jadwal dan pembagian room darurat.
                  </p>
                )}
              </div>
            </form>
          </div>

          <div className="pt-6 border-t border-zinc-800/80 mt-6">
            <button
              type="submit"
              form="profile-form"
              disabled={isSavingProfile || !isProfileDirty}
              className="w-full h-11 px-5 rounded-xl font-bold text-xs uppercase tracking-wider chamfer-btn bg-[#DA292A] hover:bg-[#EF3839] text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#DA292A]/20"
            >
              {isSavingProfile ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Menyimpan Profil...
                </>
              ) : (
                "Simpan Perubahan Profil"
              )}
            </button>
          </div>
        </section>

        {/* KANAN: Ganti Kata Sandi */}
        <section className="card-glow card-glow-hover rounded-2xl p-6 sm:p-7 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 pb-5 border-b border-zinc-800/80">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white font-display">Ganti Kata Sandi</h2>
                <p className="text-xs text-zinc-400">Perbarui kata sandi untuk mengamankan akun Anda</p>
              </div>
            </div>

            <form id="password-form" onSubmit={handleSubmitPassword(onUpdatePassword)} className="space-y-5 pt-6">
              {/* Password Baru */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  Kata Sandi Baru <span className="text-[#DA292A]">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                  <input
                    type={showNewPassword ? "text" : "password"}
                    {...registerPassword("password_baru")}
                    placeholder="Minimal 8 karakter (huruf & angka)"
                    className="w-full h-11 pl-10 pr-11 rounded-xl bg-[#18181C] border border-zinc-800 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-[#DA292A] focus:ring-1 focus:ring-[#DA292A]/40 transition-colors outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200 transition-colors"
                    title={showNewPassword ? "Sembunyikan sandi" : "Lihat sandi"}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordErrors.password_baru && (
                  <p className="text-xs text-red-400 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {passwordErrors.password_baru.message}
                  </p>
                )}

                {/* Password Strength Checklist */}
                <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-1.5 mt-2">
                  <p className="text-[11px] font-bold text-zinc-400">Ketentuan Keamanan Sandi:</p>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={hasMinLength ? "text-emerald-400 font-bold flex items-center gap-1" : "text-zinc-500 flex items-center gap-1"}>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Minimal 8 Karakter
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={hasLetterAndNumber ? "text-emerald-400 font-bold flex items-center gap-1" : "text-zinc-500 flex items-center gap-1"}>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Kombinasi Huruf dan Angka
                    </span>
                  </div>
                </div>
              </div>

              {/* Konfirmasi Password Baru */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  Konfirmasi Kata Sandi Baru <span className="text-[#DA292A]">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    {...registerPassword("konfirmasi_password")}
                    placeholder="Ulangi kata sandi baru..."
                    className="w-full h-11 pl-10 pr-11 rounded-xl bg-[#18181C] border border-zinc-800 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-[#DA292A] focus:ring-1 focus:ring-[#DA292A]/40 transition-colors outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200 transition-colors"
                    title={showConfirmPassword ? "Sembunyikan sandi" : "Lihat sandi"}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordErrors.konfirmasi_password && (
                  <p className="text-xs text-red-400 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {passwordErrors.konfirmasi_password.message}
                  </p>
                )}
              </div>
            </form>
          </div>

          <div className="pt-6 border-t border-zinc-800/80 mt-6">
            <button
              type="submit"
              form="password-form"
              disabled={isUpdatingPassword}
              className="w-full h-11 px-5 rounded-xl font-bold text-xs uppercase tracking-wider chamfer-btn bg-[#18181C] hover:bg-zinc-800 text-white border border-zinc-700 hover:border-zinc-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              {isUpdatingPassword ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Memperbarui Sandi...
                </>
              ) : (
                "Perbarui Kata Sandi"
              )}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
