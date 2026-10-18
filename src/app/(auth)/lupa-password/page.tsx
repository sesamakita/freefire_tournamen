"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, KeyRound, ArrowLeft, CheckCircle2 } from "lucide-react";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validations/auth";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [sentEmail, setSentEmail] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);

  const supabase = createClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: "onBlur",
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    try {
      setIsSubmitting(true);
      setServerError(null);

      const redirectUrl = typeof window !== "undefined"
        ? `${window.location.origin}/login`
        : undefined;

      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: redirectUrl,
      });

      if (error) {
        setServerError(error.message || "Gagal mengirim email pemulihan.");
        toast.error("Gagal mengirim email pemulihan.");
        return;
      }

      setSentEmail(data.email);
      setIsSuccess(true);
      toast.success("Tautan pemulihan berhasil dikirim.");
    } catch (err: unknown) {
      console.error("Forgot password unexpected error:", err);
      setServerError("Terjadi kesalahan pada sistem. Silakan coba lagi.");
      toast.error("Terjadi kesalahan sistem.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="space-y-6 text-center py-2">
        <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto text-emerald-400">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Email Pemulihan Terkirim</h2>
          <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
            Kami telah mengirim instruksi reset kata sandi ke{" "}
            <span className="font-semibold text-zinc-200">{sentEmail}</span>.
            Silakan periksa kotak masuk atau folder spam email Anda.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/login"
            className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Kembali ke Halaman Masuk
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-white tracking-tight">
          Lupa Kata Sandi?
        </h2>
        <p className="text-xs text-zinc-400 mt-1">
          Masukkan email terdaftar Anda untuk menerima tautan reset kata sandi
        </p>
      </div>

      {serverError && (
        <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-sm shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Mengirim Tautan...</span>
            </>
          ) : (
            <>
              <KeyRound className="w-4 h-4" />
              <span>Kirim Tautan Reset</span>
            </>
          )}
        </button>
      </form>

      <div className="pt-3 border-t border-zinc-800 text-center">
        <Link
          href="/login"
          className="text-xs text-zinc-400 hover:text-zinc-200 font-medium inline-flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Ingat kata sandi? Masuk di sini
        </Link>
      </div>
    </div>
  );
}

