import { redirect } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { createAdminClient } from "@/lib/supabase/admin";

export async function loader({ params }: LoaderFunctionArgs) {
  const { tournamentId } = params;
  if (!tournamentId) throw redirect("/admin");

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: tournament } = await (admin as any)
    .from("tournaments")
    .select("format, status")
    .eq("id", tournamentId)
    .maybeSingle();

  // 1. Lone Wolf 1v1
  if (tournament?.format === "lone_wolf_1v1") {
    if (tournament.status === "ongoing" || tournament.status === "completed") {
      throw redirect(`/admin/${tournamentId}/bracket`);
    }
    throw redirect(`/admin/${tournamentId}/verifikasi`);
  }

  // 2. Battle Royale / Default
  if (tournament?.status === "ongoing" || tournament?.status === "completed") {
    throw redirect(`/admin/${tournamentId}/match`);
  }
  throw redirect(`/admin/${tournamentId}/verifikasi`);
}

export default function AdminTournamentIndex() {
  return null;
}
