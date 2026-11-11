import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import TickerOverlayClient from "./TickerOverlayClient";

export const metadata = {
  title: "Match Ticker HUD — OBS Overlay Arena Tempur",
  robots: "noindex, nofollow",
};

export default async function TickerOverlayPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = await params;
  const admin = createAdminClient();
  const db = admin as any;

  const { data: tournament } = await db
    .from("tournaments")
    .select("id, nama, slug, format, live_title, is_live")
    .eq("id", tournamentId)
    .maybeSingle();

  if (!tournament) notFound();

  const { data: sponsors } = await db
    .from("tournament_sponsors")
    .select("id, name, logo_url, tier")
    .eq("tournament_id", tournamentId)
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  return <TickerOverlayClient tournament={tournament} initialSponsors={sponsors || []} />;
}
