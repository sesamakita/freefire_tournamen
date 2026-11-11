import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ tournamentId: string }>;
}

export default async function AdminTournamentDetailPage({ params }: PageProps) {
  const { tournamentId } = await params;
  redirect(`/admin/${tournamentId}/edit`);
}
