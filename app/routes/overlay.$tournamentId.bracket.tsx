import { useLoaderData } from "react-router";
import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { createAdminClient } from "@/lib/supabase/admin";
import BracketOverlayClient from "@/app/overlay/[tournamentId]/bracket/BracketOverlayClient";

export const meta: MetaFunction = () => {
  return [
    { title: "1v1 Duel HUD — OBS Overlay Arena Tempur" },
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
    .select("id, nama, slug, format")
    .eq("id", tournamentId)
    .maybeSingle();

  if (!tournament) {
    throw new Response("Turnamen tidak ditemukan", { status: 404 });
  }

  return { tournament };
}

export default function BracketOverlayPage() {
  const { tournament } = useLoaderData<typeof loader>();

  return (
    <BracketOverlayClient
      tournamentId={tournament.id}
      tournamentNama={tournament.nama}
    />
  );
}
