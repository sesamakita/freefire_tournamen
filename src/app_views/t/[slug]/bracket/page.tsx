import { notFound } from "next/navigation";
import { Swords, Trophy, Shield, Users } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import TournamentBracketView, {
  type BracketMatch,
} from "@/components/bracket/TournamentBracketView";

export default async function PublicBracketPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const admin = createAdminClient();
  const db = admin as any;

  const { data: tournament } = await db
    .from("tournaments")
    .select("id, nama, slug, format, max_rounds, max_teams, status")
    .eq("slug", slug)
    .single();

  if (!tournament) notFound();

  // Ambil bracket matches
  const { data: brackets } = await db
    .from("brackets")
    .select(`
      id,
      round_number,
      match_number,
      round_name,
      score_p1,
      score_p2,
      winner_id,
      next_bracket_id,
      next_slot,
      status,
      room_id,
      room_pass,
      jadwal,
      screenshot_url,
      player1:player1_id (id, nama, logo_url),
      player2:player2_id (id, nama, logo_url),
      winner:winner_id (id, nama)
    `)
    .eq("tournament_id", tournament.id)
    .order("round_number", { ascending: true })
    .order("match_number", { ascending: true });

  const bracketList: BracketMatch[] = (brackets as any) || [];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="card-glow card-glow-hover bg-zinc-950 p-6 rounded-2xl border border-zinc-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider font-heading uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30">
              King of By One (1v1)
            </span>
            <span className="text-xs text-zinc-500">
              • Sistem Gugur (First to 5 Rounds)
            </span>
          </div>
          <h1 className="font-heading text-xl text-white font-bold tracking-tight">
            Bagan Pertandingan Turnamen
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Pantau perjalanan para gladiator Free Fire dari babak 32 besar hingga Grand Final.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto px-4 py-2 bg-zinc-900/80 border border-zinc-800 rounded-xl text-xs">
          <Trophy className="w-4 h-4 text-amber-500" />
          <span className="text-zinc-300">
            Total Pertandingan:{" "}
            <strong className="text-white font-mono">{bracketList.length}</strong>
          </span>
        </div>
      </div>

      {/* Visual Bracket */}
      <div className="space-y-2">
        <TournamentBracketView brackets={bracketList} isAdmin={false} />
      </div>
    </div>
  );
}
