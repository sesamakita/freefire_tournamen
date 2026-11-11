import EditTournamentPage from "@/app/(dashboard)/admin/[tournamentId]/edit/page";

export function meta() {
  return [
    { title: "Pengaturan Turnamen — Arena Tempur" },
    { name: "description", content: "Kelola pengaturan, format, dan informasi turnamen Free Fire." },
  ];
}

export default function AdminTournamentEditRoute() {
  return <EditTournamentPage />;
}
