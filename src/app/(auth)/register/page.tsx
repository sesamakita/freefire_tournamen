"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, UserPlus, ArrowRight } from "lucide-react";
import { registerSchema, type RegisterInput } from "@/lib/validations/auth";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const supabase = createClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    mode: "onBlur",
    defaultValues: {
      nama: "",
      email: "",
      no_wa: "",
      password: "",
      konfirmasi_password: "",
    },
  });

  const onSubmit = async (data: RegisterInput) => {
    try {
      setIsSubmitting(true);
      setServerError(null);

      // Panggil Supabase signUp
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            nama: data.nama,
            no_wa: data.no_wa,
          },
        },
      });

      if (authError) {
        if (
          authError.message.toLowerCase().includes("already registered") ||
          authError.message.toLowerCase().includes("unique constraint") ||
          authError.status === 422
        ) {
          setServerError("Email sudah terdaftar. Coba masuk atau gunakan email lain.");
          toast.error("Email sudah terdaftar.");
        } else {
          setServerError(authError.message || "Gagal membuat akun. Silakan coba lagi.");
          toast.error("Terjadi kesalahan pada registrasi.");
        }
        return;
      }

      if (authData.user) {
        toast.success("Akun berhasil dibuat! Mengalihkan ke dashboard...");
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err: unknown) {
      console.error("Register unexpected error:", err);
      setServerError("Terjadi kesalahan pada sistem. Silakan coba lagi.");
      toast.error("Terjadi kesalahan sistem.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl text-white tracking-tight">
          Buat Akun ArenaKu
        </h2>
        <p className="text-xs text-zinc-400 mt-1">
          Daftar sebagai kapten atau anggota tim turnamen Free Fire
        </p>
      </div>

      {serverError && (
        <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Nama Lengkap */}
        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
            Nama Lengkap <span className="text-red-400">*</span>
          </label>
          <input
            {...register("nama")}
            type="text"
            placeholder="Contoh: Budi Santoso"
            disabled={isSubmitting}
            className={`w-full px-3.5 py-2.5 bg-zinc-950 border rounded-xl text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none transition-colors ${
              errors.nama
                ? "border-red-500/80 focus:border-red-500"
                : "border-zinc-800 focus:border-amber-500"
            }`}
          />
          {errors.nama && (
            <p className="text-xs text-red-400 mt-1">{errors.nama.message}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
            Email <span className="text-red-400">*</span>
          </label>
          <input
            {...register("email")}
            type="email"
            placeholder="kapten@gmail.com"
            disabled={isSubmitting}
            className={`w-full px-3.5 py-2.5 bg-zinc-950 border rounded-xl text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none transition-colors ${
              errors.email
                ? "border-red-500/80 focus:border-red-500"
                : "border-zinc-800 focus:border-amber-500"
            }`}
          />
          {errors.email && (
            <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>
          )}
        </div>

        {/* No WhatsApp */}
        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
            No. WhatsApp Aktif <span className="text-red-400">*</span>
          </label>
          <input
            {...register("no_wa")}
            type="tel"
            placeholder="081234567890"
            disabled={isSubmitting}
            className={`w-full px-3.5 py-2.5 bg-zinc-950 border rounded-xl text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none transition-colors ${
              errors.no_wa
                ? "border-red-500/80 focus:border-red-500"
                : "border-zinc-800 focus:border-amber-500"
            }`}
          />
          {errors.no_wa ? (
            <p className="text-xs text-red-400 mt-1">{errors.no_wa.message}</p>
          ) : (
            <p className="text-[11px] text-zinc-500 mt-1">
              Dipakai panitia untuk konfirmasi darurat jadwal / room.
            </p>
          )}
        </div>

        {/* Password */}
        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
            Password <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <input
              {...register("password")}
              type={showPassword ? "text" : "password"}
              placeholder="Minimal 8 karakter (huruf & angka)"
              disabled={isSubmitting}
              className={`w-full px-3.5 py-2.5 pr-10 bg-zinc-950 border rounded-xl text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none transition-colors ${
                errors.password
                  ? "border-red-500/80 focus:border-red-500"
                  : "border-zinc-800 focus:border-amber-500"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>
          )}
        </div>

        {/* Konfirmasi Password */}
        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
            Konfirmasi Password <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <input
              {...register("konfirmasi_password")}
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Ketik ulang password"
              disabled={isSubmitting}
              className={`w-full px-3.5 py-2.5 pr-10 bg-zinc-950 border rounded-xl text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none transition-colors ${
                errors.konfirmasi_password
                  ? "border-red-500/80 focus:border-red-500"
                  : "border-zinc-800 focus:border-amber-500"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
              tabIndex={-1}
            >
              {showConfirmPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          {errors.konfirmasi_password && (
            <p className="text-xs text-red-400 mt-1">
              {errors.konfirmasi_password.message}
            </p>
          )}
        </div>

        {/* Syarat & Ketentuan */}
        <div className="pt-1">
          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              {...register("setuju_sk")}
              type="checkbox"
              className="mt-0.5 rounded border-zinc-700 bg-zinc-950 text-amber-500 focus:ring-amber-500 focus:ring-offset-zinc-900"
            />
            <span className="text-xs text-zinc-400 leading-snug">
              Saya menyetujui seluruh aturan turnamen, larangan cheat, dan aturan fair play ArenaKu.
            </span>
          </label>
          {errors.setuju_sk && (
            <p className="text-xs text-red-400 mt-1">{errors.setuju_sk.message}</p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-sm shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Mendaftarkan akun...</span>
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4" />
              <span>Daftar Sekarang</span>
            </>
          )}
        </button>
      </form>

      {/* Redirect ke Login */}
      <div className="pt-3 border-t border-zinc-800 text-center">
        <p className="text-xs text-zinc-400">
          Sudah memiliki akun ArenaKu?{" "}
          <Link
            href="/login"
            className="text-amber-400 hover:text-amber-300 font-semibold inline-flex items-center gap-1 transition-colors"
          >
            Masuk ke Akun <ArrowRight className="w-3 h-3" />
          </Link>
        </p>
      </div>
    </div>
  );
}

