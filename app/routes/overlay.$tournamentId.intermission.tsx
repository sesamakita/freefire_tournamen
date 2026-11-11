// app/routes/overlay.$tournamentId.intermission.tsx
import { useLoaderData } from "react-router";
import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { createAdminClient } from "@/lib/supabase/admin";
import IntermissionOverlayClient from "@/app/overlay/[tournamentId]/intermission/IntermissionOverlayClient";

export const meta: MetaFunction = () => {
  return [
    { title: "Commercial Break & Intermission — OBS Overlay Arena Tempur" },
    { name: "robots", content: "noindex, nofollow" },
  ];
};

export async function loader({ params }: LoaderFunctionArgs) {
  const { tournamentId } = params;
  if (!tournamentId) {
    throw new Response("Tournament ID diperlukan", { status: 400 });
  }

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
      live_title,
      intermission_active,
      intermission_target_time,
      intermission_title,
      intermission_match_number
    `)
    .eq("id", tournamentId)
    .maybeSingle();

  if (!tournament) {
    throw new Response("Turnamen tidak ditemukan", { status: 404 });
  }

  // 2. Ambil sponsor aktif
  const { data: sponsors } = await db
    .from("tournament_sponsors")
    .select("id, name, logo_url, banner_url, tier, external_url, display_order")
    .eq("tournament_id", tournamentId)
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

  return {
    tournament,
    sponsors: sponsors || [],
  };
}

export default function IntermissionOverlayRoute() {
  const { tournament, sponsors } = useLoaderData<typeof loader>();
  return (
    <IntermissionOverlayClient
      tournament={tournament}
      initialSponsors={sponsors}
    />
  );
}
