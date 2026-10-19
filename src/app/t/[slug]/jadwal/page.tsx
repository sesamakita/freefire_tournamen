import { notFound } from "next/navigation";
import { Calendar, Clock, Users, Trophy } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function PublicSchedulePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const admin = createAdminClient();

  // 1. Ambil data turnamen
  const { data: tournament } = await admin
    .from("tournaments")
    .select("id, nama, slug")
    .eq("slug", slug)
    .single();

  if (!tournament) notFound();

  // 2. Ambil seluruh match turnamen beserta tim slot (Room ID & Pass di-exclude!)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any;
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
      match_teams (
        slot,
        team_id,
        teams:team_id (id, nama, logo_url)
      )
    `)
    .eq("tournament_id", tournament.id)
    .order("round", { ascending: true })
    .order("jadwal", { ascending: true });

  const allMatches = matches || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl text-white tracking-tight flex items-center gap-2">
          <Calendar className="w-5 h-5 text-amber-500" />
          Jadwal Pertandingan
        </h2>
        <p className="text-xs text-zinc-400 mt-0.5">
          Jadwal resmi dan susunan slot peserta pertandingan Free Fire Battle Royale
        </p>
      </div>

      <div className="space-y-4">
        {allMatches.length > 0 ? (
          allMatches.map((m: any) => {
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

            const slots = (m.match_teams || []).sort(
              (a: any, b: any) => a.slot - b.slot
            );

            return (
              <div
                key={m.id}
                className="card-glow p-6 rounded-2xl space-y-4"
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
                      <Clock className="w-3.5 h-3.5 text-zinc-500" />
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
                      {m.status}
                    </span>
                  </div>
                </div>

                {/* Plotting Slot Tim (Publik) */}
                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    Susunan Slot Tim Peserta ({slots.length} Tim):
                  </p>

                  {slots.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-xs">
                      {slots.map((s: any) => (
                        <div
                          key={s.slot}
                          className="p-2.5 bg-zinc-950 border border-zinc-800/80 rounded-xl flex items-center gap-2"
                        >
                          <span className="w-5 h-5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-bold flex items-center justify-center shrink-0">
                            #{s.slot}
                          </span>
                          <span className="font-semibold text-zinc-200 truncate">
                            {s.teams?.nama || "Tim"}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-500 italic">
                      Slot peserta belum di-plot oleh panitia.
                    </p>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center bg-zinc-900/40 border border-zinc-800 rounded-2xl space-y-2">
            <Clock className="w-8 h-8 text-zinc-500 mx-auto" />
            <p className="text-sm font-semibold text-zinc-300">Belum ada jadwal yang dirilis</p>
            <p className="text-xs text-zinc-500">Panitia sedang menyusun jadwal pertandingan.</p>
          </div>
        )}
      </div>
    </div>
  );
}
