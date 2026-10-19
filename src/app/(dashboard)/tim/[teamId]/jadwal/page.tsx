import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Calendar, Trophy, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import RoomCard from "./RoomCard";

export default async function TeamSchedulePage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any;

  // 1. Ambil data tim & turnamen
  const { data: team } = await db
    .from("teams")
    .select(`
      *,
      tournaments:tournament_id (id, nama, slug, status)
    `)
    .eq("id", teamId)
    .single();

  if (!team) notFound();

  // 2. Ambil seluruh match di turnamen ini
  const { data: matches } = await db
    .from("matches")
    .select(`
      id,
      tournament_id,
      nama,
      round,
      grup,
      jadwal,
      status,
      match_teams (slot, team_id)
    `)
    .eq("tournament_id", team.tournament_id)
    .order("jadwal", { ascending: true });

  const allMatches = matches || [];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link
          href={`/tim/${teamId}/roster`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Kembali ke Roster Tim
        </Link>
      </div>

      {/* Header */}
      <div className="card-glow p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-500">
            {team.tournaments?.nama}
          </span>
          <h1 className="text-3xl text-white tracking-tight mt-0.5">
            Jadwal Pertandingan: {team.nama}
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Pantau jadwal bertanding tim Anda dan akses Room ID saat waktu match tiba
          </p>
        </div>
      </div>

      {/* List Matches */}
      <div className="space-y-4">
        {allMatches.length > 0 ? (
          allMatches.map((m: any) => {
            const teamSlot = m.match_teams?.find((mt: any) => mt.team_id === teamId);
            const isSlotted = !!teamSlot;

            const dateStr = new Date(m.jadwal).toLocaleDateString("id-ID", {
              weekday: "long",
              day: "numeric",
              month: "short",
              year: "numeric",
            });
            const timeStr = new Date(m.jadwal).toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div
                key={m.id}
                className={`p-6 rounded-2xl border transition-all space-y-4 ${
                  isSlotted
                    ? "bg-zinc-900/90 border-zinc-700/80 shadow-lg"
                    : "bg-zinc-900/40 border-zinc-800/60 opacity-75"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-zinc-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base text-white tracking-tight">
                        {m.nama}
                      </h3>
                      <span className="px-2 py-0.5 rounded bg-zinc-800 text-[11px] font-semibold text-zinc-300">
                        Round {m.round}
                      </span>
                      {m.grup && (
                        <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[11px] font-semibold">
                          {m.grup}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 mt-1 flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                      <span>{dateStr} &bull; Pukul {timeStr} WIB</span>
                    </p>
                  </div>

                  <div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold capitalize ${
                        m.status === "selesai"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : m.status === "ongoing"
                          ? "bg-amber-500/20 text-amber-400 animate-pulse"
                          : "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      Status: {m.status}
                    </span>
                  </div>
                </div>

                {/* Room ID Section */}
                {isSlotted ? (
                  <RoomCard
                    tournamentId={team.tournament_id}
                    matchId={m.id}
                    matchNama={m.nama}
                    jadwal={m.jadwal}
                    slotNumber={teamSlot?.slot}
                  />
                ) : (
                  <p className="text-xs text-zinc-500 italic">
                    Tim Anda belum dijadwalkan bertanding pada match ini oleh panitia.
                  </p>
                )}
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center bg-zinc-900/40 border border-zinc-800 rounded-2xl space-y-2">
            <Clock className="w-8 h-8 text-zinc-500 mx-auto" />
            <p className="text-sm font-semibold text-zinc-300">Belum ada match yang dijadwalkan</p>
            <p className="text-xs text-zinc-500">Panitia turnamen belum mempublikasikan jadwal pertandingan.</p>
          </div>
        )}
      </div>
    </div>
  );
}
