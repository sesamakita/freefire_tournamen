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
  max_teams: z.number().min(2, "Minimal 2 tim/peserta.").max(64, "Maksimal 64 tim/peserta."),
  format: z.enum(["battle_royale", "lone_wolf_1v1", "clash_squad"]),
  max_rounds: z.number().min(1, "Minimal 1 ronde.").max(15, "Maksimal 15 ronde."),
  tgl_mulai: z.string().min(1, "Tanggal mulai wajib diisi."),
  tgl_selesai: z.string().min(1, "Tanggal selesai wajib diisi."),
  tier: z.enum(["free", "pro", "enterprise"]).default("free"),
  direct_payment_info: z.object({
    bank_name: z.string().optional().default(""),
    account_number: z.string().optional().default(""),
    account_holder: z.string().optional().default(""),
    qris_image_url: z.string().optional().default(""),
  }).optional(),
});

export type CreateTournamentInput = z.infer<typeof createTournamentSchema>;

/**
 * Validasi Edit / Update Turnamen
 */
export const updateTournamentSchema = z.object({
  nama: z
    .string()
    .trim()
    .min(3, "Nama turnamen minimal 3 karakter.")
    .max(100, "Nama turnamen maksimal 100 karakter.")
    .optional(),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]{3,60}$/, "Slug hanya boleh huruf kecil, angka, dan strip (-) 3–60 karakter.")
    .optional(),
  deskripsi: z.string().optional().nullable(),
  entry_fee: z.number().min(0, "Biaya pendaftaran tidak boleh negatif.").optional(),
  max_teams: z.number().min(2, "Minimal 2 tim/peserta.").max(64, "Maksimal 64 tim/peserta.").optional(),
  format: z.enum(["battle_royale", "lone_wolf_1v1", "clash_squad"]).optional(),
  max_rounds: z.number().min(1, "Minimal 1 ronde.").max(15, "Maksimal 15 ronde.").optional(),
  status: z.enum(["draft", "open", "closed", "running", "done"]).optional(),
  is_public: z.boolean().optional(),
  tgl_mulai: z.string().min(1, "Tanggal mulai wajib diisi.").optional(),
  tgl_selesai: z.string().min(1, "Tanggal selesai wajib diisi.").optional(),
  // Live Streaming & OBS Overlays Support
  is_live: z.boolean().optional(),
  live_platform: z.enum(["youtube", "tiktok", "facebook", "custom"]).optional(),
  live_stream_url: z.string().optional().nullable(),
  live_title: z.string().optional().nullable(),
  obs_token: z.string().optional().nullable(),
  tier: z.enum(["free", "pro", "enterprise"]).optional(),
  direct_payment_info: z.object({
    bank_name: z.string().optional().default(""),
    account_number: z.string().optional().default(""),
    account_holder: z.string().optional().default(""),
    qris_image_url: z.string().optional().default(""),
  }).optional(),
});

export type UpdateTournamentInput = z.infer<typeof updateTournamentSchema>;
