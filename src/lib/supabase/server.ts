import { AsyncLocalStorage } from 'node:async_hooks';
import { createServerClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr';
import type { Database } from '@/types/database.types';

/**
 * Context storage untuk menyimpan request aktif pada runtime React Router v7 / Vite.
 */
export const requestContext = new AsyncLocalStorage<{
  request: Request;
  responseHeaders?: Headers;
}>();

/**
 * Supabase client universal:
 * 1. Jika dijalankan di React Router v7, membaca cookies langsung dari context request.
 * 2. Jika dijalankan di Next.js, fallback menggunakan cookies() dari next/headers.
 */
export async function createClient(explicitRequest?: Request) {
  const store = requestContext.getStore();
  const req = explicitRequest || store?.request;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

  if (req) {
    return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return parseCookieHeader(req.headers.get('Cookie') ?? '');
        },
        setAll(cookiesToSet) {
          if (store?.responseHeaders) {
            cookiesToSet.forEach(({ name, value, options }) => {
              store.responseHeaders!.append('Set-Cookie', serializeCookieHeader(name, value, options));
            });
          }
        },
      },
    });
  }

  // Fallback ke next/headers jika ada
  try {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll dipanggil dari Server Component
          }
        },
      },
    });
  } catch {
    // Default fallback jika tanpa context
    return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {},
      },
    });
  }
}
