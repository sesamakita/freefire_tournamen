import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Radio, Trophy, Shield, Settings2, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import LiveControlClient from "./LiveControlClient";

export const metadata = {
  title: "Pusat Kontrol Siaran Live & OBS — Arena Tempur",
  description: "Kelola status live streaming YouTube, TikTok, Facebook dan generator dynamic overlays OBS Studio.",
};

export default async function AdminLivePage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const admin = createAdminClient();
  const db = admin as any;

  // 1. Ambil data turnamen
  const { data: tournament } = await db
    .from("tournaments")
    .select(`
      id,
      nama,
      slug,
      format,
      status,
      organizer_id,
      is_live,
      live_platform,
      live_stream_url,
      live_title,
      obs_token,
      intermission_active,
      intermission_target_time,
      intermission_title,
      intermission_match_number
    `)
    .eq("id", tournamentId)
    .maybeSingle();

  if (!tournament) notFound();

  // 2. Otorisasi: Pastikan user adalah Organizer atau Staff
  const isOrganizer = tournament.organizer_id === user.id;
  let isStaff = false;

  if (!isOrganizer) {
    const { data: staff } = await db
      .from("tournament_staff")
      .select("role")
      .eq("tournament_id", tournamentId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (staff) {
      isStaff = true;
    }
  }

  if (!isOrganizer && !isStaff) {
    redirect("/dashboard");
  }

  // 3. Ambil data sponsor turnamen
  const { data: sponsors } = await db
    .from("tournament_sponsors")
    .select("id, name, logo_url, banner_url, tier, external_url, display_order, is_active")
    .eq("tournament_id", tournamentId)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Navigasi Atas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href={`/admin/${tournamentId}/edit`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Kembali ke Pengaturan Turnamen
        </Link>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/admin/${tournamentId}/panitia`}
            className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-all"
          >
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            Panitia
          </Link>

          {tournament.format === "lone_wolf_1v1" && (
            <Link
              href={`/admin/${tournamentId}/bracket`}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-all"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              Bagan Gugur
            </Link>
          )}

          <Link
            href={`/t/${tournament.slug}`}
            target="_blank"
            className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-all"
          >
            <span>Halaman Publik</span>
            <ExternalLink className="w-3 h-3 text-zinc-400" />
          </Link>
        </div>
      </div>

      {/* Header Halaman */}
      <div className="card-glow card-glow-hover p-6 rounded-2xl flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-red-600 to-rose-600 flex items-center justify-center text-white shadow-lg shadow-red-600/20">
            <Radio className="w-6 h-6 stroke-[2.2] animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl text-white font-bold tracking-tight">
              Pusat Kontrol Siaran Live & Overlays OBS
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Hubungkan siaran YouTube/TikTok/Facebook dan dapatkan URL grafik real-time untuk OBS Studio
            </p>
          </div>
        </div>
      </div>

      {/* Client Component */}
      <LiveControlClient tournament={tournament} initialSponsors={sponsors || []} />
    </div>
  );
}
