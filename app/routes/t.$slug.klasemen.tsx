import { useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { createAdminClient } from "@/lib/supabase/admin";
import PublicStandingsClient from "@/app/t/[slug]/klasemen/PublicStandingsClient";

export async function loader({ params }: LoaderFunctionArgs) {
  const { slug } = params;
  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any;

  // 1. Ambil data turnamen & prize pool
  const { data: tournament } = await db
    .from("tournaments")
    .select("id, nama, slug, prize_pool, prize_distribution")
    .eq("slug", slug)
    .single();

  if (!tournament) {
    throw new Response("Turnamen tidak ditemukan", { status: 404 });
  }

  // 2. Query view standings
  const { data: standings } = await db
    .from("standings")
    .select("*")
    .eq("tournament_id", tournament.id)
    .order("rank", { ascending: true });

  const allStandings = (standings || []).map((s: any) => ({
    team_id: s.team_id,
    tournament_id: s.tournament_id,
    team_nama: s.team_nama,
    logo_url: s.logo_url,
    matches_played: Number(s.matches_played || 0),
    total_kills: Number(s.total_kills || 0),
    total_points: Number(s.total_points || 0),
    best_placement: s.best_placement ? Number(s.best_placement) : null,
    rank: Number(s.rank || 0),
  }));

  return {
    tournament,
    allStandings,
  };
}

export default function PublicStandingsRoute() {
  const { tournament, allStandings } = useLoaderData<typeof loader>();

  return (
    <PublicStandingsClient
      tournamentId={tournament.id}
      tournamentNama={tournament.nama}
      standings={allStandings}
      prizePool={Number(tournament.prize_pool || 0)}
      prizeDistribution={tournament.prize_distribution as Record<string, number> | undefined}
    />
  );
}
