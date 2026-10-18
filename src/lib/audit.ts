import { createAdminClient } from '@/lib/supabase/admin'
import type { Json } from '@/types/database.types'

type AuditAction =
  | 'team.approve' | 'team.reject' | 'team.create_manual'
  | 'roster.update' | 'roster.lock_override'
  | 'member.joined' | 'member.removed'
  | 'payment.verify' | 'payment.reject'
  | 'match.create' | 'match.update' | 'match.status_change'
  | 'room.set' | 'room.rotate' | 'room.view'
  | 'score.submit' | 'score.approve' | 'score.reject' | 'score.recalculate'
  | 'dispute.submit' | 'dispute.upheld' | 'dispute.rejected'
  | 'tournament.status_change' | 'tournament.point_config_change'
  | 'user.role_change'

interface AuditEntry {
  tournamentId?: string
  actorId: string
  action: AuditAction
  entity: string
  entityId: string
  before?: Json | null
  after?: Json | null
  reason?: string
  ip?: string
  userAgent?: string
}

/**
 * Tulis satu entri ke audit_log.
 * Selalu gunakan admin client agar bypass RLS.
 * Tabel audit_log tidak punya UPDATE/DELETE policy — append-only.
 */
export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  const admin = createAdminClient()

  const { error } = await admin.from('audit_log').insert({
    tournament_id: entry.tournamentId ?? null,
    actor_id: entry.actorId,
    action: entry.action,
    entity: entry.entity,
    entity_id: entry.entityId,
    before_data: entry.before ?? null,
    after_data: entry.after ?? null,
    reason: entry.reason ?? null,
    ip: entry.ip ?? null,
    user_agent: entry.userAgent ?? null,
  })

  if (error) {
    // Audit log harus selalu berhasil — jika gagal, log ke console tapi jangan throw
    // (jangan sampai kegagalan audit membatalkan operasi bisnis)
    console.error('[AUDIT] Failed to write audit log:', error, entry)
  }
}

/**
 * Helper untuk mengekstrak IP dan User-Agent dari Next.js request headers.
 */
export function getRequestMeta(request: Request) {
  return {
    ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? request.headers.get('x-real-ip')
      ?? 'unknown',
    userAgent: request.headers.get('user-agent') ?? 'unknown',
  }
}
