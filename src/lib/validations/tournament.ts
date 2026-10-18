import { z } from "zod";

/**
 * Validasi Buat Turnamen Baru
 */
export const createTournamentSchema = z.object({
  nama: z
    .string()
    .trim()
    .min(3, "Nama turnamen minimal 3 karakter.")
    .max(100, "Nama turnamen maksimal 100 karakter."),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]{3,60}$/, "Slug hanya boleh huruf kecil, angka, dan strip (-) 3–60 karakter."),
  deskripsi: z.string().optional(),
  entry_fee: z.number().min(0, "Biaya pendaftaran tidak boleh negatif."),
  max_teams: z.number().min(2, "Minimal 2 tim.").max(64, "Maksimal 64 tim."),
  tgl_mulai: z.string().min(1, "Tanggal mulai wajib diisi."),
  tgl_selesai: z.string().min(1, "Tanggal selesai wajib diisi."),
});

export type CreateTournamentInput = z.infer<typeof createTournamentSchema>;
