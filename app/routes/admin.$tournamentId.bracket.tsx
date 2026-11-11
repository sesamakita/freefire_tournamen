import AdminBracketPage from "@/app/(dashboard)/admin/[tournamentId]/bracket/page";

export function meta() {
  return [
    { title: "Manajemen Bagan 1v1 — Arena Tempur" },
    { name: "description", content: "Kocok bagan eliminasi 1v1 Lone Wolf, atur Room ID, dan kelola skor pertandingan." },
  ];
}

export default function AdminBracketRoute() {
  return <AdminBracketPage />;
}
