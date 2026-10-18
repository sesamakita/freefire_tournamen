import { z } from "zod";

/**
 * Validasi Form Buat Match Baru (SCR-M01)
 */
export const createMatchSchema = z.object({
  nama: z
    .string()
    .trim()
    .min(3, "Nama match minimal 3 karakter.")
    .max(60, "Nama match maksimal 60 karakter."),
  round: z.coerce.number().int().min(1, "Round minimal 1."),
  grup: z.string().trim().max(30).optional().or(z.literal("")),
  jadwal: z.string().min(1, "Jadwal pertandingan wajib diisi."),
});

export type CreateMatchInput = z.infer<typeof createMatchSchema>;

/**
 * Validasi Atur / Rotasi Room ID (SCR-M02)
 */
export const setRoomSchema = z.object({
  room_id: z
    .string()
    .trim()
    .min(3, "Room ID minimal 3 karakter.")
    .max(30, "Room ID maksimal 30 karakter."),
  room_pass: z
    .string()
    .trim()
    .min(1, "Password Room wajib diisi.")
    .max(30, "Password Room maksimal 30 karakter."),
  rotasi_alasan: z.string().trim().optional(),
});

export type SetRoomInput = z.infer<typeof setRoomSchema>;

/**
 * Validasi Plotting Tim ke Slot Match (SCR-M01)
 */
export const plotMatchTeamsSchema = z.object({
  slots: z.array(
    z.object({
      team_id: z.string().uuid("Team ID tidak valid."),
      slot: z.number().int().min(1, "Slot minimal 1.").max(12, "Slot maksimal 12 untuk Free Fire."),
    })
  ).min(1, "Minimal pilih 1 tim untuk dimasukkan ke match."),
});

export type PlotMatchTeamsInput = z.infer<typeof plotMatchTeamsSchema>;
