import { useLoaderData } from "react-router";
import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { createAdminClient } from "@/lib/supabase/admin";
import LeaderboardOverlayClient from "@/app/overlay/[tournamentId]/leaderboard/LeaderboardOverlayClient";

export const meta: MetaFunction = () => {
  return [
    { title: "Leaderboard HUD — OBS Overlay Arena Tempur" },
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

  const { data: tournament } = await db
    .from("tournaments")
    .select("id, nama, slug, format, live_title")
    .eq("id", tournamentId)
    .maybeSingle();

  if (!tournament) {
    throw new Response("Turnamen tidak ditemukan", { status: 404 });
  }

  return { tournament };
}

export default function LeaderboardOverlayPage() {
  const { tournament } = useLoaderData<typeof loader>();

  return (
    <LeaderboardOverlayClient
      tournamentId={tournament.id}
      initialTournament={{
        nama: tournament.nama,
        format: tournament.format,
        live_title: tournament.live_title,
      }}
    />
  );
}
