// src/lib/dev-auth.ts
// Sistem Otorisasi Khusus Pengembang & Pemilik Platform (God Mode)

export const DEFAULT_DEV_KEY = "arenatempur-dev-2026";

export function getDevMasterKey(): string {
  return process.env.DEV_MASTER_KEY || DEFAULT_DEV_KEY;
}

export function isDevAuthenticated(request: Request): boolean {
  try {
    const cookieHeader = request.headers.get("cookie") || "";
    const cookies = Object.fromEntries(
      cookieHeader.split(";").map((c) => {
        const [k, ...v] = c.trim().split("=");
        return [k, decodeURIComponent(v.join("="))];
      })
    );

    const devKey = cookies["arenatempur_dev_key"];
    const expected = getDevMasterKey();

    if (devKey && devKey === expected) {
      return true;
    }

    const authHeader = request.headers.get("x-dev-key");
    if (authHeader && authHeader === expected) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}
