import { z } from "zod";

/**
 * Validasi Input Skor Pertandingan oleh Panitia (SCR-S01)
 * Mengacu pada FSD BR-SCR-01..13
 */
export const teamScoreEntrySchema = z.object({
  team_id: z.string().uuid("Team ID tidak valid."),
  placement: z
    .number()
    .int()
    .min(1, "Placement minimal 1.")
    .max(25, "Placement maksimal 25."),
  kills: z
    .number()
    .int()
    .min(0, "Kills tidak boleh negatif.")
    .max(40, "Kills maksimal 40."),
});

export const submitScoresSchema = z
  .object({
    screenshot_url: z.string().url("Bukti screenshot scoreboard wajib diunggah."),
    results: z
      .array(teamScoreEntrySchema)
      .min(1, "Minimal sertakan 1 hasil tim."),
  })
  .refine(
    (data) => {
      const placements = data.results.map((r) => r.placement);
      const uniquePlacements = new Set(placements);
      return uniquePlacements.size === placements.length;
    },
    {
      message: "Setiap tim harus memiliki ranking/placement yang berbeda (tidak boleh ada placement ganda).",
      path: ["results"],
    }
  );

export type SubmitScoresInput = z.infer<typeof submitScoresSchema>;

/**
 * Validasi Verifikasi / Persetujuan Skor oleh Admin (SCR-S02)
 */
export const verifyScoreSchema = z.object({
  action: z.enum(["approve", "reject"], {
    message: "Aksi harus 'approve' atau 'reject'.",
  }),
  reason: z.string().trim().optional(),
});

export type VerifyScoreInput = z.infer<typeof verifyScoreSchema>;
