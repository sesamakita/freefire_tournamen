'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database.types'

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null

/**
 * Supabase client untuk Client Components di browser.
 * Singleton pattern agar tidak buat client baru setiap render & aman di Vite/Next.
 */
export function createClient() {
  if (browserClient) return browserClient

  const env =
    typeof process !== 'undefined' && process.env
      ? process.env
      : ((import.meta as any).env || {})

  const supabaseUrl =
    env.NEXT_PUBLIC_SUPABASE_URL ||
    (typeof window !== 'undefined' && (window as any).__ENV?.NEXT_PUBLIC_SUPABASE_URL) ||
    'https://placeholder.supabase.co'

  const supabaseAnonKey =
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    (typeof window !== 'undefined' && (window as any).__ENV?.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
    'placeholder'

  browserClient = createBrowserClient<Database>(
    supabaseUrl,
    supabaseAnonKey
  )

  return browserClient
}
