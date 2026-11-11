// src/lib/supabase/web.ts
import { createServerClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr'
import type { Database } from '@/types/database.types'

/**
 * Supabase client standar untuk React Router v7 loader, action, dan API Resource Routes.
 * Menerima Web Standard Request dan mengembalikan client beserta responseHeaders yang termutasi.
 */
export function createWebClient(request: Request, responseHeaders: Headers = new Headers()) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'

  const client = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return parseCookieHeader(request.headers.get('Cookie') ?? '')
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          responseHeaders.append('Set-Cookie', serializeCookieHeader(name, value, options))
        })
      },
    },
  })

  return { client, responseHeaders }
}
