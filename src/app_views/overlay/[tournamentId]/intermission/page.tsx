import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import IntermissionOverlayClient from "./IntermissionOverlayClient";

export const metadata = {
  title: "Commercial Break & Intermission Overlay — OBS Arena Tempur",
  robots: "noindex, nofollow",
};

export default async function IntermissionOverlayPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = await params;
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
      live_title,
      intermission_active,
      intermission_target_time,
      intermission_title,
      intermission_match_number
    `)
    .eq("id", tournamentId)
    .maybeSingle();

  if (!tournament) notFound();

  // 2. Ambil sponsor aktif
  const { data: sponsors } = await db
    .from("tournament_sponsors")
    .select("id, name, logo_url, banner_url, tier, external_url, display_order")
    .eq("tournament_id", tournamentId)
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

  return (
    <IntermissionOverlayClient
      tournament={tournament}
      initialSponsors={sponsors || []}
    />
  );
}
