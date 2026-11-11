import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, apiSuccess, ERROR_CODES } from "@/types";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; teamId: string }> }
) {
  try {
    const { id: tournamentId, teamId } = await params;
    const admin = createAdminClient();

    // 1. Ambil data tim
    const { data: team, error: teamError } = await admin
      .from("teams")
      .select("id, tournament_id, nama, logo_url, kapten_user_id, created_at, users:kapten_user_id (nama)")
      .eq("id", teamId)
      .eq("tournament_id", tournamentId)
      .single();

    if (teamError || !team) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, "Tim tidak ditemukan pada turnamen ini.", 404);
    }

    // 2. Ambil roster pemain
    const { data: roster } = await admin
      .from("team_members")
      .select("id, ign, uid_game, role_tim, is_substitute, created_at")
      .eq("team_id", teamId)
      .order("is_substitute", { ascending: true })
      .order("created_at", { ascending: true });

    // 3. Ambil ringkasan performa dari view standings
    const { data: standing } = await admin
      .from("standings")
      .select("rank, matches_played, total_kills, total_points, best_placement")
      .eq("tournament_id", tournamentId)
      .eq("team_id", teamId)
      .maybeSingle();

    // 4. Ambil riwayat hasil pertandingan yang disetujui (Approved)
    const { data: rawResults } = await admin
      .from("results")
      .select(`
        id,
        match_id,
        placement,
        kills,
        points,
        submitted_at,
        matches:match_id (id, nama, round, grup, jadwal, status)
      `)
      .eq("team_id", teamId)
      .eq("status", "approved")
      .order("submitted_at", { ascending: true });

    const matchHistory = (rawResults || []).map((r: any) => ({
      id: r.id,
      match_id: r.match_id,
      match_nama: r.matches?.nama || "Match",
      round: r.matches?.round || 1,
      grup: r.matches?.grup || null,
      placement: r.placement,
      kills: r.kills,
      points: r.points,
      submitted_at: r.submitted_at,
    }));

    // 5. Kalkulasi statistik lanjutan & Lencana Prestasi (Gamification Badges)
    const matchesPlayed = Number(standing?.matches_played || matchHistory.length || 0);
    const totalKills = Number(standing?.total_kills || 0);
    const totalPoints = Number(standing?.total_points || 0);
    const booyahCount = matchHistory.filter((m) => m.placement === 1).length;
    const avgKills = matchesPlayed > 0 ? (totalKills / matchesPlayed).toFixed(1) : "0.0";
    const winRate = matchesPlayed > 0 ? Math.round((booyahCount / matchesPlayed) * 100) : 0;

    const badges: { id: string; name: string; icon: string; desc: string; rarity: "gold" | "purple" | "blue" }[] = [];

    if (standing?.rank === 1) {
      badges.push({
        id: "apex_leader",
        name: "Apex Leader",
        icon: "👑",
        desc: "Memuncaki klasemen turnamen",
        rarity: "gold",
      });
    }

    if (booyahCount >= 1) {
      badges.push({
        id: "booyah_king",
        name: "Booyah King",
        icon: "🏆",
        desc: `Mengoleksi ${booyahCount}x Booyah placement #1`,
        rarity: "gold",
      });
    }

    if (totalKills >= 10) {
      badges.push({
        id: "predator",
        name: "Apex Predator",
        icon: "🎯",
        desc: `Mencetak ${totalKills} total kills turnamen`,
        rarity: "purple",
      });
    }

    if (matchesPlayed >= 2 && matchHistory.every((m) => m.placement <= 4)) {
      badges.push({
        id: "iron_fortress",
        name: "Iron Fortress",
        icon: "🛡️",
        desc: "Selalu finis di posisi 4 besar setiap ronde",
        rarity: "purple",
      });
    }

    if (matchesPlayed > 0 && Number(avgKills) >= 3.5) {
      badges.push({
        id: "high_octane",
        name: "High Octane",
        icon: "⚡",
        desc: `Rata-rata kill tinggi (${avgKills} kill/match)`,
        rarity: "blue",
      });
    }

    return apiSuccess({
      team: {
        id: team.id,
        nama: team.nama,
        logo_url: team.logo_url,
        kapten_nama: (team.users as any)?.nama || "Kapten",
        created_at: team.created_at,
      },
      summary: {
        rank: standing?.rank || null,
        matches_played: matchesPlayed,
        total_points: totalPoints,
        total_kills: totalKills,
        booyah_count: booyahCount,
        win_rate: winRate,
        avg_kills: avgKills,
        best_placement: standing?.best_placement || (matchHistory.length > 0 ? Math.min(...matchHistory.map((m) => m.placement)) : null),
      },
      roster: roster || [],
      match_history: matchHistory,
      badges,
    });
  } catch (err: unknown) {
    console.error("GET /teams/[teamId]/stats error:", err);
    return apiError(ERROR_CODES.INTERNAL_ERROR, "Terjadi kesalahan server saat memuat statistik tim.", 500);
  }
}
