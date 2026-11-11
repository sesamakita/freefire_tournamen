import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, apiSuccess, ERROR_CODES } from "@/types";
import { writeAuditLog, getRequestMeta } from "@/lib/audit";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const ROUND_NAMES: Record<number, string> = {
  1: "Babak 32 Besar",
  2: "Babak 16 Besar",
  3: "Perempat Final",
  4: "Semifinal",
  5: "Grand Final",
};

/**
 * GET /api/tournaments/[id]/bracket
 * Mengambil seluruh struktur bagan (bracket tree) turnamen
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id: tournamentId } = await params;
    const admin = createAdminClient();
    const db = admin as any;

    // 1. Ambil data turnamen
    const { data: tournament, error: tournError } = await db
      .from("tournaments")
      .select("id, nama, slug, format, max_rounds, max_teams, status")
      .eq("id", tournamentId)
      .single();

    if (tournError || !tournament) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, "Turnamen tidak ditemukan.", 404);
    }

    // 2. Ambil data bracket
    const { data: brackets, error: bracketError } = await db
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
      .eq("tournament_id", tournamentId)
      .order("round_number", { ascending: true })
      .order("match_number", { ascending: true });

    if (bracketError) {
      if (bracketError.code === "42P01" || bracketError.message?.includes("does not exist")) {
        return apiError(
          ERROR_CODES.INTERNAL_ERROR,
          "Tabel 'brackets' belum ada di database Supabase. Silakan jalankan query migrasi brackets di SQL Editor Supabase.",
          500
        );
      }
      return apiError(ERROR_CODES.INTERNAL_ERROR, bracketError.message, 500);
    }

    // 3. Ambil jumlah peserta terverifikasi
    const { count: verifiedCount } = await db
      .from("teams")
      .select("id", { count: "exact", head: true })
      .eq("tournament_id", tournamentId)
      .eq("verification_status", "approved");

    return apiSuccess({
      tournament,
      brackets: brackets || [],
      verifiedCount: verifiedCount || 0,
    });
  } catch (err: unknown) {
    console.error("GET /api/tournaments/[id]/bracket error:", err);
    return apiError(ERROR_CODES.INTERNAL_ERROR, "Gagal memuat bagan turnamen.", 500);
  }
}

/**
 * POST /api/tournaments/[id]/bracket
 * Generate/Kocok bagan turnamen sistem gugur (Single Elimination Tree 32 Slot)
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id: tournamentId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return apiError(ERROR_CODES.FORBIDDEN_ROLE, "Silakan login terlebih dahulu.", 401);
    }

    const admin = createAdminClient();
    const db = admin as any;

    // 1. Cek hak akses staf
    const { data: isStaff } = await db
      .from("tournament_staff")
      .select("role")
      .eq("tournament_id", tournamentId)
      .eq("user_id", user.id)
      .maybeSingle();

    const { data: isOrganizer } = await db
      .from("tournaments")
      .select("organizer_id, format, status")
      .eq("id", tournamentId)
      .single();

    if (!isOrganizer || (isOrganizer.organizer_id !== user.id && !isStaff)) {
      return apiError(ERROR_CODES.FORBIDDEN_ROLE, "Hanya panitia yang berhak membuat bagan pertandingan.", 403);
    }

    // 2. Ambil seluruh peserta terverifikasi (approved)
    const { data: teams, error: teamsError } = await db
      .from("teams")
      .select("id, nama")
      .eq("tournament_id", tournamentId)
      .eq("verification_status", "approved");

    if (teamsError || !teams || teams.length < 2) {
      return apiError(
        ERROR_CODES.INTERNAL_ERROR,
        `Minimal harus ada 2 peserta terverifikasi untuk membuat bagan. Saat ini: ${teams?.length || 0}.`,
        400
      );
    }

    // Hapus bagan lama jika ada
    await db.from("brackets").delete().eq("tournament_id", tournamentId);

    // Hitung jumlah babak (total rounds). Misal 32 pemain -> 5 babak (16 -> 8 -> 4 -> 2 -> 1)
    // Jika jumlah tim < 32, kita pad hingga 32 dengan sistem Bye atau sesuaikan kelipatan 2 (16 / 32)
    const totalSlots = teams.length <= 16 ? 16 : 32;
    const totalRounds = totalSlots === 16 ? 4 : 5;

    // Kocok urutan peserta (Random Fisher-Yates Shuffle)
    const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);

    // Langkah A: Buat seluruh node pertandingan dari Ronde Terakhir (Final) mundur ke Ronde 1
    // Map untuk menyimpan created bracket ID berdasarkan `${roundNumber}_${matchNumber}`
    const nodeMap = new Map<string, string>();

    for (let r = totalRounds; r >= 1; r--) {
      const matchesInRound = Math.pow(2, totalRounds - r);
      const roundName = totalSlots === 16 
        ? (r === 4 ? "Grand Final" : r === 3 ? "Semifinal" : r === 2 ? "Perempat Final" : "Babak 16 Besar")
        : (ROUND_NAMES[r] || `Babak ${r}`);

      for (let m = 1; m <= matchesInRound; m++) {
        // Tentukan next_bracket_id dan next_slot jika bukan final
        let nextBracketId: string | null = null;
        let nextSlot: number | null = null;

        if (r < totalRounds) {
          const nextMatchNum = Math.ceil(m / 2);
          nextBracketId = nodeMap.get(`${r + 1}_${nextMatchNum}`) || null;
          nextSlot = m % 2 === 1 ? 1 : 2;
        }

        // Untuk Ronde 1, pasangkan peserta
        let p1Id: string | null = null;
        let p2Id: string | null = null;
        let initialStatus = "pending";

        if (r === 1) {
          const p1Index = (m - 1) * 2;
          const p2Index = p1Index + 1;
          p1Id = shuffledTeams[p1Index]?.id || null;
          p2Id = shuffledTeams[p2Index]?.id || null;
          initialStatus = p1Id && p2Id ? "ready" : "pending";
        }

        const { data: createdNode, error: insertNodeError } = await db
          .from("brackets")
          .insert({
            tournament_id: tournamentId,
            round_number: r,
            match_number: m,
            round_name: roundName,
            player1_id: p1Id,
            player2_id: p2Id,
            next_bracket_id: nextBracketId,
            next_slot: nextSlot,
            status: initialStatus,
          })
          .select("id")
          .single();

        if (insertNodeError || !createdNode) {
          console.error("Failed to insert bracket node:", insertNodeError);
          return apiError(ERROR_CODES.INTERNAL_ERROR, "Gagal menyusun bagan pertandingan.", 500);
        }

        nodeMap.set(`${r}_${m}`, createdNode.id);
      }
    }

    // Catat ke Audit Log
    const meta = getRequestMeta(request);
    await writeAuditLog({
      tournamentId,
      actorId: user.id,
      action: "bracket.generate",
      entity: "brackets",
      entityId: tournamentId,
      after: { totalSlots, totalRounds, participantsCount: teams.length },
      reason: "Bagan sistem gugur berhasil di-generate secara otomatis",
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return apiSuccess({
      message: `Bagan pertandingan dengan ${totalSlots} slot (${totalRounds} babak) berhasil disusun!`,
      totalSlots,
      totalRounds,
    });
  } catch (err: unknown) {
    console.error("POST /api/tournaments/[id]/bracket error:", err);
    return apiError(ERROR_CODES.INTERNAL_ERROR, "Terjadi kesalahan server saat menyusun bagan.", 500);
  }
}
