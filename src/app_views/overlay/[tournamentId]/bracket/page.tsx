import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import BracketOverlayClient from "./BracketOverlayClient";

export const metadata = {
  title: "1v1 Duel HUD — OBS Overlay Arena Tempur",
  robots: "noindex, nofollow",
};

export default async function BracketOverlayPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = await params;
  const admin = createAdminClient();
  const db = admin as any;

  const { data: tournament } = await db
    .from("tournaments")
    .select("id, nama, slug, format")
    .eq("id", tournamentId)
    .maybeSingle();

  if (!tournament) notFound();

  return (
    <BracketOverlayClient
      tournamentId={tournament.id}
      tournamentNama={tournament.nama}
    />
  );
}
