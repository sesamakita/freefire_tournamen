import { useLoaderData } from "react-router";
import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { createAdminClient } from "@/lib/supabase/admin";
import TickerOverlayClient from "@/app/overlay/[tournamentId]/ticker/TickerOverlayClient";

export const meta: MetaFunction = () => {
  return [
    { title: "Match Ticker HUD — OBS Overlay Arena Tempur" },
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
    .select("id, nama, slug, format, live_title, is_live")
    .eq("id", tournamentId)
    .maybeSingle();

  if (!tournament) {
    throw new Response("Turnamen tidak ditemukan", { status: 404 });
  }

  const { data: sponsors } = await db
    .from("tournament_sponsors")
    .select("id, name, logo_url, tier")
    .eq("tournament_id", tournamentId)
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  return { tournament, sponsors: sponsors || [] };
}

export default function TickerOverlayPage() {
  const { tournament, sponsors } = useLoaderData<typeof loader>();
  return <TickerOverlayClient tournament={tournament} initialSponsors={sponsors} />;
}
