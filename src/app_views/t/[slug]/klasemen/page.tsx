import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import PublicStandingsClient from "./PublicStandingsClient";

export default async function PublicStandingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const admin = createAdminClient();

  // 1. Ambil data turnamen & prize pool
  const { data: tournament } = await admin
    .from("tournaments")
    .select("id, nama, slug, prize_pool, prize_distribution")
    .eq("slug", slug)
    .single();

  if (!tournament) notFound();

  // 2. Query view standings
  const { data: standings } = await admin
    .from("standings")
    .select("*")
    .eq("tournament_id", tournament.id)
    .order("rank", { ascending: true });

  const allStandings = (standings || []).map((s) => ({
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
