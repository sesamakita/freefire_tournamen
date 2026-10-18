import { z } from "zod";

/**
 * Validasi Form Buat Tim (SCR-T01)
 * Mengacu pada FSD BR-TEAM-01..04
 */
export const createTeamSchema = z.object({
  tournament_id: z.string().uuid("Silakan pilih turnamen yang valid."),
  nama: z
    .string()
    .trim()
    .min(3, "Nama tim minimal 3 karakter.")
    .max(30, "Nama tim maksimal 30 karakter.")
    .regex(
      /^[a-zA-Z0-9 _\-]+$/,
      "Nama tim hanya boleh huruf, angka, spasi, tanda minus (-), dan underscore (_)."
    ),
  logo_url: z.string().url("URL logo tidak valid.").optional().or(z.literal("")),
  kapten_ign: z
    .string()
    .trim()
    .min(3, "IGN kapten minimal 3 karakter.")
    .max(20, "IGN kapten maksimal 20 karakter."),
  kapten_uid: z
    .string()
    .trim()
    .regex(/^[0-9]{8,12}$/, "UID Free Fire harus 8–12 digit angka."),
  kapten_role: z.enum(["rusher", "sniper", "support", "igl", "cadangan"], {
    message: "Pilih peran kapten di dalam tim.",
  }),
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;

/**
 * Validasi Undangan Anggota (SCR-T07)
 * Mengacu pada FSD BR-ROST-01..04 & SCR-T07
 */
export const inviteMemberSchema = z.object({
  invited_email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Format email pemain tidak valid."),
  ign: z
    .string()
    .trim()
    .min(3, "IGN minimal 3 karakter.")
    .max(20, "IGN maksimal 20 karakter."),
  uid_game: z
    .string()
    .trim()
    .regex(/^[0-9]{8,12}$/, "UID Free Fire harus 8–12 digit angka."),
  role_tim: z.enum(["rusher", "sniper", "support", "igl", "cadangan"], {
    message: "Pilih peran tim.",
  }),
  is_substitute: z.boolean(),
});

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
