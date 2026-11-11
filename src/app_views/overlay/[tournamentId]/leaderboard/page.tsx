import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import LeaderboardOverlayClient from "./LeaderboardOverlayClient";

export const metadata = {
  title: "Leaderboard HUD — OBS Overlay Arena Tempur",
  robots: "noindex, nofollow",
};

export default async function LeaderboardOverlayPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = await params;
  const admin = createAdminClient();
  const db = admin as any;

  const { data: tournament } = await db
    .from("tournaments")
    .select("id, nama, slug, format, live_title")
    .eq("id", tournamentId)
    .maybeSingle();

  if (!tournament) notFound();

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
