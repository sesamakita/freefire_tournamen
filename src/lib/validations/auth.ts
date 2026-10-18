import { z } from 'zod'

/**
 * Validasi Form Register (SCR-A02)
 * Mengacu pada FSD BR-AUTH-01..02 & §5.1
 */
export const registerSchema = z
  .object({
    nama: z
      .string()
      .trim()
      .min(2, 'Nama minimal 2 karakter.')
      .max(60, 'Nama maksimal 60 karakter.'),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email('Format email tidak valid.'),
    no_wa: z
      .string()
      .trim()
      .regex(/^(08|62)[0-9]{8,13}$/, 'Nomor WhatsApp tidak valid. Contoh: 08123456789.'),
    password: z
      .string()
      .min(8, 'Password minimal 8 karakter dan mengandung huruf serta angka.')
      .regex(/^(?=.*[A-Za-z])(?=.*\d)/, 'Password minimal 8 karakter dan mengandung huruf serta angka.'),
    konfirmasi_password: z.string(),
    setuju_sk: z.literal(true, {
      message: 'Anda harus menyetujui syarat & ketentuan.',
    }),
  })
  .refine((data) => data.password === data.konfirmasi_password, {
    message: 'Konfirmasi password tidak cocok.',
    path: ['konfirmasi_password'],
  })

export type RegisterInput = z.infer<typeof registerSchema>

/**
 * Validasi Form Login (SCR-A01)
 * Mengacu pada FSD BR-AUTH-01..02
 */
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Format email tidak valid.'),
  password: z
    .string()
    .min(1, 'Password wajib diisi.'),
  ingat_saya: z.boolean().optional(),
})

export type LoginInput = z.infer<typeof loginSchema>

/**
 * Validasi Form Lupa Password (SCR-A03)
 */
export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Format email tidak valid.'),
})

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
