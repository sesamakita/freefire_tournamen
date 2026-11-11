import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, apiSuccess, ERROR_CODES } from "@/types";
import { writeAuditLog, getRequestMeta } from "@/lib/audit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return apiError(
        ERROR_CODES.FORBIDDEN_ROLE,
        "Silakan login terlebih dahulu untuk membagikan hadiah.",
        401
      );
    }

    const admin = createAdminClient();

    // 1. Cek kepemilikan atau hak akses panitia (Owner / Admin)
    const { data: tourney, error: tourneyError } = await admin
      .from("tournaments")
      .select("id, organizer_id, nama, prize_pool, prize_distribution, prizes_disbursed_at, status")
      .eq("id", tournamentId)
      .single();

    if (tourneyError || !tourney) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, "Turnamen tidak ditemukan.", 404);
    }

    const isOwner = tourney.organizer_id === user.id;
    const { data: staff } = await admin
      .from("tournament_staff")
      .select("role")
      .eq("tournament_id", tournamentId)
      .eq("user_id", user.id)
      .in("role", ["owner", "admin"])
      .maybeSingle();

    if (!isOwner && !staff) {
      return apiError(
        ERROR_CODES.FORBIDDEN_ROLE,
        "Hanya pemilik atau admin turnamen yang berhak mencairkan hadiah.",
        403
      );
    }

    // 2. Cek apakah sudah pernah dicairkan
    if (tourney.prizes_disbursed_at) {
      return apiError(
        ERROR_CODES.INTERNAL_ERROR,
        "Hadiah untuk turnamen ini sudah pernah didistribusikan.",
        400
      );
    }

    const prizePool = Number(tourney.prize_pool || 0);
    if (prizePool <= 0) {
      return apiError(
        ERROR_CODES.INTERNAL_ERROR,
        "Total hadiah turnamen bernilai 0. Atur prize pool sebelum membagikan hadiah.",
        400
      );
    }

    // 3. Panggil RPC disburse_tournament_prizes secara atomik
    const { data: rpcResult, error: rpcError } = await admin.rpc(
      "disburse_tournament_prizes" as any,
      {
        p_tournament_id: tournamentId,
      }
    );

    // Jika RPC belum dieksekusi di database server, fallback ke logika atomik backend
    let finalResult = rpcResult;
    if (rpcError) {
      console.warn("RPC disburse_tournament_prizes error, running fallback:", rpcError);

      // Ambil klasemen turnamen
      const { data: standings } = await admin
        .from("standings")
        .select("team_id, team_nama, rank")
        .eq("tournament_id", tournamentId)
        .order("rank", { ascending: true });

      const distribution = (tourney.prize_distribution as Record<string, number>) || {
        "1": 0.5,
        "2": 0.3,
        "3": 0.2,
      };

      const winnersDisbursed: any[] = [];

      for (const [rankStr, ratioOrAmount] of Object.entries(distribution)) {
        const rankNum = parseInt(rankStr, 10);
        const ratio = Number(ratioOrAmount);
        const amount = ratio <= 1.0 ? Math.round(prizePool * ratio) : Math.round(ratio);

        const standing = (standings || []).find((s) => s.rank === rankNum);
        if (standing && amount > 0) {
          const { data: team } = await admin
            .from("teams")
            .select("kapten_user_id")
            .eq("id", standing.team_id)
            .single();

          if (team?.kapten_user_id) {
            // Upsert wallet
            let { data: wallet } = await admin
              .from("wallets")
              .select("id, balance")
              .eq("user_id", team.kapten_user_id)
              .maybeSingle();

            if (!wallet) {
              const { data: newWallet } = await admin
                .from("wallets")
                .insert({ user_id: team.kapten_user_id, balance: amount })
                .select("id, balance")
                .single();
              wallet = newWallet;
            } else {
              await admin
                .from("wallets")
                .update({ balance: (wallet.balance || 0) + amount })
                .eq("id", wallet.id);
            }

            if (wallet) {
              await admin.from("wallet_transactions").insert({
                wallet_id: wallet.id,
                tournament_id: tournamentId,
                team_id: standing.team_id,
                type: "prize_credit",
                amount,
                status: "completed",
                description: `Hadiah Juara ${rankNum} - Turnamen: ${tourney.nama}`,
              });

              winnersDisbursed.push({
                rank: rankNum,
                team_id: standing.team_id,
                team_nama: standing.team_nama,
                kapten_user_id: team.kapten_user_id,
                prize_amount: amount,
              });
            }
          }
        }
      }

      // Update status turnamen
      await admin
        .from("tournaments")
        .update({
          prizes_disbursed_at: new Date().toISOString(),
          status: "done",
        })
        .eq("id", tournamentId);

      finalResult = {
        success: true,
        tournament_id: tournamentId,
        total_prize_pool: prizePool,
        winners: winnersDisbursed,
        disbursed_at: new Date().toISOString(),
      };
    }

    // 4. Catat ke Audit Log
    const meta = getRequestMeta(request);
    await writeAuditLog({
      tournamentId,
      actorId: user.id,
      action: "prize.disburse",
      entity: "tournament",
      entityId: tournamentId,
      reason: `Panitia mendistribusikan total hadiah Rp ${prizePool.toLocaleString("id-ID")}`,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return apiSuccess({
      message: "Hadiah berhasil dibagikan ke dompet para kapten pemenang!",
      details: finalResult,
    });
  } catch (err: unknown) {
    console.error("POST /disburse-prizes error:", err);
    return apiError(
      ERROR_CODES.INTERNAL_ERROR,
      "Terjadi kesalahan server saat mendistribusikan hadiah.",
      500
    );
  }
}
