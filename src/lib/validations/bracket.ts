import { z } from "zod";

/**
 * Validasi Input Skor Pertandingan Lone Wolf (1v1)
 */
export const updateBracketScoreSchema = z.object({
  score_p1: z.number().min(0).max(15, "Skor maksimal 15 ronde."),
  score_p2: z.number().min(0).max(15, "Skor maksimal 15 ronde."),
  screenshot_url: z.string().url("Screenshot hasil pertandingan harus berupa URL valid.").optional().nullable(),
});

export type UpdateBracketScoreInput = z.infer<typeof updateBracketScoreSchema>;

/**
 * Validasi Pengaturan Room ID & Password untuk Match Lone Wolf
 */
export const updateBracketRoomSchema = z.object({
  room_id: z.string().trim().min(4, "Room ID minimal 4 karakter."),
  room_pass: z.string().trim().min(1, "Password Room wajib diisi."),
  jadwal: z.string().optional().nullable(),
});

export type UpdateBracketRoomInput = z.infer<typeof updateBracketRoomSchema>;
