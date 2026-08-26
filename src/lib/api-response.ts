import { NextResponse } from 'next/server'

export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'UNPROCESSABLE_ENTITY'
  | 'INTERNAL_ERROR'
  | 'BAD_REQUEST'

export interface ApiErrorResponse {
  error: {
    code: ApiErrorCode
    message: string
    details?: unknown
  }
}

export interface ApiSuccessResponse<T> {
  data: T
  meta?: {
    nextCursor?: string | null
    hasMore?: boolean
    total?: number
  }
}

export function apiSuccess<T>(
  data: T,
  meta?: { nextCursor?: string | null; hasMore?: boolean; total?: number },
  status = 200,
  headers?: Record<string, string>
) {
  const body: ApiSuccessResponse<T> = { data }
  if (meta !== undefined) {
    body.meta = meta
  }
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      ...headers,
    },
  })
}

export function apiError(
  code: ApiErrorCode,
  message: string,
  status: number,
  details?: unknown,
  headers?: Record<string, string>
) {
  const body: ApiErrorResponse = {
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    },
  }
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      ...headers,
    },
  })
}

export function encodeCursor(offset: number): string {
  return Buffer.from(JSON.stringify({ offset })).toString('base64url')
}

export function decodeCursor(cursor?: string | null): number {
  if (!cursor) return 0
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8')
    const parsed = JSON.parse(raw)
    if (typeof parsed.offset === 'number' && parsed.offset >= 0) {
      return parsed.offset
    }
  } catch {
    // Ignore invalid cursor and fallback to offset 0
  }
  return 0
}
