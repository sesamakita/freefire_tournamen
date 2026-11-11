import { Link, useLoaderData, redirect } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { ArrowLeft, Radio, Trophy, Shield, ExternalLink } from "lucide-react";
import { createWebClient } from "@/lib/supabase/web";
import { createAdminClient } from "@/lib/supabase/admin";
import LiveControlClient from "@/app/(dashboard)/admin/[tournamentId]/live/LiveControlClient";
import TournamentAdminNav from "@/components/TournamentAdminNav";
import { isDevAuthenticated } from "@/lib/dev-auth";

export function meta() {
  return [
    { title: "Pusat Kontrol Siaran Live & OBS — Arena Tempur" },
    { name: "description", content: "Kelola status live streaming YouTube, TikTok, Facebook dan generator dynamic overlays OBS Studio." },
  ];
}

export async function loader({ params, request }: LoaderFunctionArgs) {
  const tournamentId = params.tournamentId;
  if (!tournamentId) throw new Response("Tournament ID required", { status: 400 });

  const isDev = isDevAuthenticated(request);
  const { client: supabase } = createWebClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isDev) throw redirect("/login");

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      intermission_match_number,
      direct_payment_info
    `)
    .eq("id", tournamentId)
    .maybeSingle();

  if (!tournament) throw new Response("Turnamen tidak ditemukan", { status: 404 });

  // 2. Otorisasi: Pastikan user adalah Organizer, Staff, atau Developer (God Mode)
  let isOrganizer = isDev;
  let isStaff = isDev;

  if (!isDev && user) {
    isOrganizer = tournament.organizer_id === user.id;
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
      throw redirect("/dashboard");
    }
  }

  // 3. Ambil data sponsor turnamen
  const { data: sponsors } = await db
    .from("tournament_sponsors")
    .select("id, name, logo_url, banner_url, tier, external_url, display_order, is_active")
    .eq("tournament_id", tournamentId)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

  return {
    tournament,
    tournamentId,
    role: isOrganizer ? "owner" : "panitia",
    sponsors: sponsors || [],
  };
}

export default function AdminLiveRoute() {
  const { tournament, tournamentId, role, sponsors } = useLoaderData<typeof loader>();

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Unified Tab Bar & Header Konteks Turnamen */}
      <TournamentAdminNav
        tournamentId={tournamentId}
        tournamentName={tournament.nama}
        format={tournament.format}
        slug={tournament.slug}
        status={tournament.status}
        role={role}
      />

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
      <LiveControlClient tournament={tournament} initialSponsors={sponsors} />
    </div>
  );
}
