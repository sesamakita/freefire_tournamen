"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, LogIn, ArrowRight } from "lucide-react";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next") || "/dashboard";

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const supabase = createClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
    defaultValues: {
      email: "",
      password: "",
      ingat_saya: true,
    },
  });

  const onSubmit = async (data: LoginInput) => {
    try {
      setIsSubmitting(true);
      setServerError(null);

      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });

      if (authError) {
        const errorMsg = authError.message.toLowerCase();
        if (
          errorMsg.includes("invalid login credentials") ||
          errorMsg.includes("invalid credentials")
        ) {
          setServerError("Email atau password salah.");
          toast.error("Email atau password salah.");
        } else if (
          errorMsg.includes("rate limit") ||
          authError.status === 429
        ) {
          setServerError("Terlalu banyak percobaan. Coba lagi dalam 15 menit.");
          toast.error("Terlalu banyak percobaan login.");
        } else {
          setServerError(authError.message || "Gagal masuk. Silakan coba lagi.");
          toast.error("Gagal melakukan login.");
        }
        return;
      }

      if (authData.user) {
        toast.success("Berhasil masuk! Mengalihkan...");
        router.push(nextUrl);
        router.refresh();
      }
    } catch (err: unknown) {
      console.error("Login unexpected error:", err);
      setServerError("Terjadi kesalahan pada sistem. Silakan coba lagi.");
      toast.error("Terjadi kesalahan sistem.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-white tracking-tight">
          Masuk ke Akun Anda
        </h2>
        <p className="text-xs text-zinc-400 mt-1">
          Akses jadwal pertandingan, Room ID, skor, dan status tim
        </p>
      </div>

      {serverError && (
        <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Email */}
        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
            Email Terdaftar <span className="text-red-400">*</span>
          </label>
          <input
            {...register("email")}
            type="email"
            placeholder="kapten@gmail.com"
            disabled={isSubmitting}
            className={`w-full px-3.5 py-2.5 bg-zinc-950 border rounded-xl text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none transition-colors ${
              errors.email
                ? "border-red-500/80 focus:border-red-500"
                : "border-zinc-800 focus:border-amber-500"
            }`}
          />
          {errors.email && (
            <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-zinc-300">
              Password <span className="text-red-400">*</span>
            </label>
            <Link
              href="/lupa-password"
              className="text-xs text-amber-500 hover:text-amber-400 transition-colors"
            >
              Lupa password?
            </Link>
          </div>
          <div className="relative">
            <input
              {...register("password")}
              type={showPassword ? "text" : "password"}
              placeholder="Masukkan password"
              disabled={isSubmitting}
              className={`w-full px-3.5 py-2.5 pr-10 bg-zinc-950 border rounded-xl text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none transition-colors ${
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

        {/* Ingat Saya */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              {...register("ingat_saya")}
              type="checkbox"
              className="rounded border-zinc-700 bg-zinc-950 text-amber-500 focus:ring-amber-500 focus:ring-offset-zinc-900"
            />
            <span className="text-xs text-zinc-400">Ingat sesi saya (30 hari)</span>
          </label>
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
              <span>Memverifikasi...</span>
            </>
          ) : (
            <>
              <LogIn className="w-4 h-4" />
              <span>Masuk Sekarang</span>
            </>
          )}
        </button>
      </form>

      {/* Redirect ke Register */}
      <div className="pt-3 border-t border-zinc-800 text-center">
        <p className="text-xs text-zinc-400">
          Belum punya akun ArenaKu?{" "}
          <Link
            href="/register"
            className="text-amber-400 hover:text-amber-300 font-semibold inline-flex items-center gap-1 transition-colors"
          >
            Daftar Gratis <ArrowRight className="w-3 h-3" />
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="py-12 flex justify-center items-center">
          <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

