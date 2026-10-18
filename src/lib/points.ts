/**
 * Hitung poin dari point_config turnamen.
 * Fungsi ini harus identik dengan trigger PostgreSQL calculate_points().
 * Dipakai untuk preview live di UI (client-side), bukan untuk nilai final.
 * Nilai final SELALU dihitung server/DB — ini hanya untuk UX.
 */

export interface PointConfig {
  placement_points: Record<string, number>
  kill_point: number
}

export function calculatePoints(
  placement: number,
  kills: number,
  config: PointConfig = DEFAULT_POINT_CONFIG
): number {
  const placementPts = config.placement_points[placement.toString()] ?? 0
  const killPts = kills * config.kill_point
  return placementPts + killPts
}

/**
 * Default point_config sesuai PRD §7.2
 */
export const DEFAULT_POINT_CONFIG: PointConfig = {
  placement_points: {
    '1': 12, '2': 9, '3': 8, '4': 7, '5': 6,
    '6': 5,  '7': 4, '8': 3, '9': 2, '10': 1,
  },
  kill_point: 1,
}

/**
 * Validasi point_config sebelum disimpan ke DB.
 */
export function validatePointConfig(config: unknown): config is PointConfig {
  if (typeof config !== 'object' || config === null) return false
  const c = config as Record<string, unknown>
  if (typeof c.kill_point !== 'number' || c.kill_point < 0) return false
  if (typeof c.placement_points !== 'object' || c.placement_points === null) return false
  return true
}
