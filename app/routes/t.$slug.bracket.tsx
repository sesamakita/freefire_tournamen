import { useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { Swords, Trophy, Users } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import TournamentBracketView, {
  type BracketMatch,
} from "@/components/bracket/TournamentBracketView";

export async function loader({ params }: LoaderFunctionArgs) {
  const { slug } = params;
  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any;

  const { data: tournament } = await db
    .from("tournaments")
    .select("id, nama, slug, format, max_rounds, max_teams, status")
    .eq("slug", slug)
    .single();

  if (!tournament) {
    throw new Response("Turnamen tidak ditemukan", { status: 404 });
  }

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

  return {
    tournament,
    bracketList,
  };
}

export default function PublicBracketPage() {
  const { tournament, bracketList } = useLoaderData<typeof loader>();

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="card-glow card-glow-hover bg-zinc-950 p-6 rounded-2xl border border-zinc-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider font-heading uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30">
              King of By One (1v1)
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-zinc-800 text-zinc-300">
              {tournament.max_teams} Kontestan
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide font-headline flex items-center gap-2.5">
            <Swords className="w-6 h-6 text-amber-500" />
            Bagan Gugur (Knockout Bracket)
          </h2>
          <p className="text-xs text-zinc-400 mt-1 max-w-xl">
            Sistem eliminasi tunggal format 1v1 Free Fire. Pemenang tiap duel langsung melaju ke babak berikutnya hingga Grand Final.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-right">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Total Match</p>
            <p className="text-lg font-black text-amber-400 font-mono">{bracketList.length}</p>
          </div>
          <div className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-right">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Total Ronde</p>
            <p className="text-lg font-black text-white font-mono">{tournament.max_rounds || 4}</p>
          </div>
        </div>
      </div>

      {/* Interactive Bracket Visualizer */}
      <div className="card-glow bg-zinc-950/70 p-4 sm:p-6 rounded-2xl border border-zinc-800/80">
        <TournamentBracketView
          brackets={bracketList}
          isAdmin={false}
        />
      </div>
    </div>
  );
}
