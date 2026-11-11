import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

function getServiceRoleKey(): string {
  if (typeof process !== "undefined" && process.env) {
    if (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY !== "placeholder") {
      return process.env.SUPABASE_SERVICE_ROLE_KEY;
    }
  }

  // Fallback membaca dari .env.local jika berjalan di environment Node.js server
  try {
    if (typeof window === "undefined") {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require("node:fs");
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const path = require("node:path");
      const envPath = path.resolve(process.cwd(), ".env.local");
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, "utf8");
        const match = content.match(/SUPABASE_SERVICE_ROLE_KEY=([^\r\n]+)/);
        if (match && match[1]) {
          return match[1].trim();
        }
      }
    }
  } catch {
    // Ignore error
  }

  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";
}

function getSupabaseUrl(): string {
  if (typeof process !== "undefined" && process.env && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return process.env.NEXT_PUBLIC_SUPABASE_URL;
  }

  try {
    if (typeof window === "undefined") {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require("node:fs");
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const path = require("node:path");
      const envPath = path.resolve(process.cwd(), ".env.local");
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, "utf8");
        const match = content.match(/NEXT_PUBLIC_SUPABASE_URL=([^\r\n]+)/);
        if (match && match[1]) {
          return match[1].trim();
        }
      }
    }
  } catch {
    // Ignore error
  }

  return "https://wjeihkfdcoppnxlnoumj.supabase.co";
}

/**
 * Supabase Admin client dengan service_role key.
 * HANYA digunakan di server-side untuk operasi yang bypass RLS:
 * - Menulis ke audit_log
 * - Operasi admin sistem (migrasi, seed, dashboard panitia)
 * 
 * JANGAN pernah expose client ini ke browser.
 */
export function createAdminClient() {
  const supabaseUrl = getSupabaseUrl();
  const serviceRoleKey = getServiceRoleKey();

  return createClient<Database>(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
