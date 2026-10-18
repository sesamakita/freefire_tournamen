/** API Error response dari server */
export interface ApiError {
  success: false
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}

/** API Success response dari server */
export interface ApiSuccess<T> {
  success: true
  data: T
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError

/** Error codes (dari FSD §8) */
export const ERROR_CODES = {
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_RATE_LIMITED: 'AUTH_RATE_LIMITED',
  AUTH_SESSION_EXPIRED: 'AUTH_SESSION_EXPIRED',
  FORBIDDEN_ROLE: 'FORBIDDEN_ROLE',
  TEAM_NAME_TAKEN: 'TEAM_NAME_TAKEN',
  TEAM_ALREADY_CAPTAIN: 'TEAM_ALREADY_CAPTAIN',
  TEAM_NOT_OPEN: 'TEAM_NOT_OPEN',
  ROSTER_LOCKED: 'ROSTER_LOCKED',
  ROSTER_UID_DUPLICATE: 'ROSTER_UID_DUPLICATE',
  ROSTER_MIN_MEMBERS: 'ROSTER_MIN_MEMBERS',
  ROOM_NOT_YET_AVAILABLE: 'ROOM_NOT_YET_AVAILABLE',
  ROOM_NOT_PARTICIPANT: 'ROOM_NOT_PARTICIPANT',
  SCORE_PLACEMENT_DUPLICATE: 'SCORE_PLACEMENT_DUPLICATE',
  SCORE_PLACEMENT_INCOMPLETE: 'SCORE_PLACEMENT_INCOMPLETE',
  SCORE_SCREENSHOT_REQUIRED: 'SCORE_SCREENSHOT_REQUIRED',
  SCORE_SELF_APPROVAL: 'SCORE_SELF_APPROVAL',
  SCORE_ALREADY_APPROVED: 'SCORE_ALREADY_APPROVED',
  DISPUTE_WINDOW_CLOSED: 'DISPUTE_WINDOW_CLOSED',
  UPLOAD_TOO_LARGE: 'UPLOAD_TOO_LARGE',
  UPLOAD_INVALID_TYPE: 'UPLOAD_INVALID_TYPE',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES]

/** Helper: buat error response standard */
export function apiError(
  code: ErrorCode,
  message: string,
  status: number,
  details?: Record<string, unknown>
): Response {
  const body: ApiError = {
    success: false,
    error: { code, message, ...(details ? { details } : {}) },
  }
  return Response.json(body, { status })
}

/** Helper: buat success response standard */
export function apiSuccess<T>(data: T, status = 200): Response {
  const body: ApiSuccess<T> = { success: true, data }
  return Response.json(body, { status })
}
